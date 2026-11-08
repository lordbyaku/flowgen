import { describe, expect, it, vi } from 'vitest';
import { AIRouter } from '@/ai/router/aiRouter';
import { ProviderError, type AIProvider, type AIRequest } from '@/ai/providers/aiProvider';
import { RouterError } from '@/ai/router/errors';
import { isEligible, selectKey, earliestCooldownEnd } from '@/ai/router/keyManager';
import { applyCooldown, resetCooldown } from '@/ai/router/cooldownManager';
import { classifyError } from '@/ai/router/errorClassifier';
import { withRetry } from '@/ai/router/retryHandler';
import { buildUsageLog } from '@/ai/router/usageTracker';
import type { KeyAccess } from '@/vault/vaultStore';
import type { LocalKey, UsageLog, VaultMeta } from '@/types';
import { COOLDOWN_STEPS_SEC } from '@/config/constants';
import { makeKey, makeMeta } from './helpers';

const NOW = 1_000_000;
const req: AIRequest = { task: 'concepts', systemPrompt: 's', userPrompt: 'u', temperature: 0, maxOutputTokens: 10 };

function harness(keys: LocalKey[], meta: VaultMeta, generate: AIProvider['generate']) {
  const state = { keys: keys.map((k) => ({ ...k })), meta: { ...meta } };
  const logs: UsageLog[] = [];
  const access: KeyAccess = {
    isUnlocked: () => true,
    listKeys: async () => state.keys.map((k) => ({ ...k })),
    getMeta: async () => state.meta,
    saveMeta: async (m) => {
      state.meta = m;
    },
    patchKey: async (id, patch) => {
      state.keys = state.keys.map((k) => (k.id === id ? { ...k, ...patch } : k));
    },
    withPlainKey: async (id, fn) => fn(`plain-${id}`),
    touch: () => undefined,
  };
  const gen = vi.fn(generate);
  const provider: AIProvider = { generate: gen, validateKey: vi.fn(), listModels: vi.fn() };
  const sleep = vi.fn(async () => undefined);
  const router = new AIRouter({ provider, keys: access, usage: { add: async (l) => void logs.push(l) }, now: () => NOW, sleep, random: () => 0 });
  return { router, state, logs, gen, sleep };
}

const ok = async () => ({ text: '{}', model: 'm', httpStatus: 200, latencyMs: 5, inputTokens: 1, outputTokens: 2 });
const http = (s: number, extra: Partial<ConstructorParameters<typeof ProviderError>[2]> = {}) => async () => {
  throw new ProviderError('http', `HTTP ${s}`, { httpStatus: s, ...extra });
};

describe('keyManager (22.4)', () => {
  const keys = [makeKey({ id: 'a', priority: 0 }), makeKey({ id: 'b', priority: 1 }), makeKey({ id: 'c', priority: 2 })];
  it('round robin berurutan dengan kursor', () => {
    const order: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 4; i++) {
      const k = selectKey(keys, makeMeta({ rrCursor: cursor }), NOW)!;
      order.push(k.id);
      cursor = k.id;
    }
    expect(order).toEqual(['a', 'b', 'c', 'a']);
  });
  it('melewati nonaktif, invalid, model_unavailable, dan cooldown key', () => {
    const ks = [
      makeKey({ id: 'a', enabled: false }),
      makeKey({ id: 'b', status: 'invalid_key' }),
      makeKey({ id: 'c', cooldownUntil: NOW + 1000 }),
      makeKey({ id: 'd', status: 'model_unavailable' }),
      makeKey({ id: 'e', priority: 9 }),
    ];
    expect(selectKey(ks, makeMeta(), NOW)!.id).toBe('e');
  });
  it('cooldown per project: semua key project sama ikut dilewati', () => {
    const ks = [makeKey({ id: 'a', projectId: 'P1' }), makeKey({ id: 'b', projectId: 'P1', priority: 1 }), makeKey({ id: 'c', projectId: 'P2', priority: 2 })];
    const meta = makeMeta({ projectCooldowns: { P1: { until: NOW + 5000, level: 0 } } });
    expect(isEligible(ks[0], meta, NOW)).toBe(false);
    expect(isEligible(ks[1], meta, NOW)).toBe(false);
    expect(selectKey(ks, meta, NOW)!.id).toBe('c');
  });
  it('priority dan single', () => {
    expect(selectKey(keys, makeMeta({ routing: 'priority', rrCursor: 'a' }), NOW)!.id).toBe('a');
    expect(selectKey(keys, makeMeta({ routing: 'single', singleKeyId: 'c' }), NOW)!.id).toBe('c');
    expect(selectKey(keys, makeMeta({ routing: 'single', singleKeyId: 'zzz' }), NOW)).toBeNull();
  });
  it('earliestCooldownEnd', () => {
    const ks = [makeKey({ id: 'a', projectId: 'P1' }), makeKey({ id: 'b', projectId: 'P2', cooldownUntil: NOW + 3000 })];
    const meta = makeMeta({ projectCooldowns: { P1: { until: NOW + 9000, level: 0 } } });
    expect(earliestCooldownEnd(ks, meta, NOW)).toBe(NOW + 3000);
  });
});

describe('cooldownManager', () => {
  it('level naik bertahap per 429 berturut-turut, reset setelah sukses', () => {
    let m = makeMeta();
    const levels: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = applyCooldown(m, 'P', { daily: false, now: NOW });
      m = r.meta;
      levels.push(m.projectCooldowns.P.level);
      if (i === 0) expect(r.until).toBe(NOW + COOLDOWN_STEPS_SEC[0] * 1000);
    }
    expect(levels).toEqual([0, 1, 2, 3, 3, 3]);
    expect(resetCooldown(m, 'P').projectCooldowns.P).toBeUndefined();
  });
  it('retryDelay provider menjadi batas bawah', () => {
    expect(applyCooldown(makeMeta(), 'P', { daily: false, retryDelaySec: 500, now: NOW }).until).toBe(NOW + 500_000);
  });
  it('kuota harian sampai tengah malam Pacific', () => {
    const r = applyCooldown(makeMeta(), 'P', { daily: true, now: Date.UTC(2026, 10, 8, 12) });
    expect(r.until).toBe(Date.UTC(2026, 10, 9, 8));
  });
});

describe('errorClassifier (22.3)', () => {
  it.each([
    [400, 'validation'],
    [401, 'auth'],
    [403, 'auth'],
    [404, 'model_not_found'],
    [429, 'rate_limit'],
    [500, 'server'],
    [503, 'server'],
  ])('HTTP %i -> %s', (s, code) => expect(classifyError(new ProviderError('http', 'x', { httpStatus: s })).code).toBe(code));
  it('kelas lain', () => {
    expect(classifyError(new ProviderError('http', 'x', { httpStatus: 429, quotaDaily: true })).code).toBe('quota_daily');
    expect(classifyError(new ProviderError('network', 'x')).code).toBe('network');
    expect(classifyError(new ProviderError('timeout', 'x')).code).toBe('network');
    expect(classifyError(new ProviderError('blocked', 'x')).code).toBe('blocked');
    expect(classifyError(new ProviderError('truncated', 'x')).code).toBe('truncated');
    expect(classifyError(new ProviderError('aborted', 'x')).code).toBe('aborted');
  });
});

describe('retryHandler', () => {
  it('maksimal N retry, tidak pernah loop tak terbatas', async () => {
    const fn = vi.fn(async () => {
      throw new Error('x');
    });
    await expect(withRetry(fn, { retries: 2, shouldRetry: () => true, sleep: async () => undefined })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
    const fn2 = vi.fn(async () => {
      throw new Error('x');
    });
    await expect(withRetry(fn2, { retries: 999, shouldRetry: () => true, sleep: async () => undefined })).rejects.toThrow();
    expect(fn2).toHaveBeenCalledTimes(6); // dibatasi keras 5 retry
  });
});

describe('aiRouter (22.5)', () => {
  it('sukses: usage tercatat, status connected, kursor diperbarui', async () => {
    const h = harness([makeKey({ id: 'a', status: 'not_tested' })], makeMeta(), ok);
    const r = await h.router.run(req);
    expect(r.keyId).toBe('a');
    expect(h.logs).toHaveLength(1);
    expect(h.logs[0].ok).toBe(true);
    expect(h.state.keys[0].status).toBe('connected');
    expect(h.state.meta.rrCursor).toBe('a');
  });

  it('429: cooldown per project, TIDAK pindah key otomatis, satu panggilan saja', async () => {
    const keys = [makeKey({ id: 'a', projectId: 'P1' }), makeKey({ id: 'b', projectId: 'P1', priority: 1 }), makeKey({ id: 'c', projectId: 'P2', priority: 2 })];
    const h = harness(keys, makeMeta(), http(429, { retryDelaySec: 10 }));
    const e = (await h.router.run(req).catch((x) => x)) as RouterError;
    expect(e.code).toBe('rate_limit');
    expect(e.appError.message).toMatch(/Batas permintaan tercapai pada project P1/);
    expect(e.appError.retryAt).toBe(NOW + COOLDOWN_STEPS_SEC[0] * 1000);
    expect(h.gen).toHaveBeenCalledTimes(1);
    expect(h.state.meta.projectCooldowns.P1).toBeDefined();
    expect(h.state.keys[0].status).toBe('rate_limited');
    // request berikutnya otomatis melewati project P1
    h.gen.mockImplementation(ok);
    const r = await h.router.run(req);
    expect(r.keyId).toBe('c');
  });

  it('kuota harian -> quota_exhausted', async () => {
    const h = harness([makeKey({ id: 'a' })], makeMeta(), http(429, { quotaDaily: true }));
    const e = (await h.router.run(req).catch((x) => x)) as RouterError;
    expect(e.code).toBe('quota_daily');
    expect(h.state.keys[0].status).toBe('quota_exhausted');
  });

  it('500/503: retry terbatas (MAX_RETRIES_TRANSIENT=2) pada key yang sama, lalu gagal', async () => {
    const h = harness([makeKey({ id: 'a' }), makeKey({ id: 'b', priority: 1 })], makeMeta(), http(503));
    const e = (await h.router.run(req).catch((x) => x)) as RouterError;
    expect(e.code).toBe('server');
    expect(h.gen).toHaveBeenCalledTimes(3);
    expect(new Set(h.gen.mock.calls.map((c) => c[0]))).toEqual(new Set(['plain-a']));
    expect(h.logs).toHaveLength(3);
    expect(h.sleep).toHaveBeenCalledTimes(2);
  });

  it('retry sukses setelah error jaringan', async () => {
    let n = 0;
    const h = harness([makeKey({ id: 'a' })], makeMeta(), async () => {
      if (n++ === 0) throw new ProviderError('network', 'x');
      return ok();
    });
    expect((await h.router.run(req)).keyId).toBe('a');
    expect(h.gen).toHaveBeenCalledTimes(2);
  });

  it('400 tidak diulang; 401 menandai key invalid', async () => {
    const h = harness([makeKey({ id: 'a' })], makeMeta(), http(400));
    expect(((await h.router.run(req).catch((x) => x)) as RouterError).code).toBe('validation');
    expect(h.gen).toHaveBeenCalledTimes(1);
    const h2 = harness([makeKey({ id: 'a' })], makeMeta(), http(401));
    await h2.router.run(req).catch(() => undefined);
    expect(h2.state.keys[0].status).toBe('invalid_key');
    // tanpa key eligible -> NoEligibleKeyError
    const e = (await h2.router.run(req).catch((x) => x)) as RouterError;
    expect(e.code).toBe('no_eligible_key');
  });

  it('404 menandai model_unavailable tanpa diulang', async () => {
    const h = harness([makeKey({ id: 'a' })], makeMeta(), http(404));
    await h.router.run(req).catch(() => undefined);
    expect(h.gen).toHaveBeenCalledTimes(1);
    expect(h.state.keys[0].status).toBe('model_unavailable');
  });

  it('tanpa key -> pesan belum ada key; semua cooldown -> pesan waktu', async () => {
    const h = harness([], makeMeta(), ok);
    expect(((await h.router.run(req).catch((x) => x)) as RouterError).appError.message).toMatch(/Belum ada API key/);
    const h2 = harness([makeKey({ id: 'a', cooldownUntil: NOW + 60_000 })], makeMeta(), ok);
    const e = (await h2.router.run(req).catch((x) => x)) as RouterError;
    expect(e.appError.message).toMatch(/Semua key sedang dalam jeda/);
    expect(e.appError.retryAt).toBe(NOW + 60_000);
  });

  it('abort tidak memberi penalti ke key', async () => {
    const h = harness([makeKey({ id: 'a', consecutiveErrors: 0 })], makeMeta(), async () => {
      throw new ProviderError('aborted', 'x');
    });
    expect(((await h.router.run(req).catch((x) => x)) as RouterError).code).toBe('aborted');
    expect(h.state.keys[0].consecutiveErrors).toBe(0);
    expect(h.state.keys[0].status).toBe('connected');
  });

  it('antrean global: satu request aktif pada satu waktu', async () => {
    let active = 0;
    let maxActive = 0;
    const h = harness([makeKey({ id: 'a' })], makeMeta(), async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return ok();
    });
    await Promise.all([h.router.run(req), h.router.run(req), h.router.run(req)]);
    expect(maxActive).toBe(1);
  });

  it('sukses mereset cooldown project', async () => {
    const h = harness([makeKey({ id: 'a', projectId: 'P' })], makeMeta({ projectCooldowns: { P: { until: NOW - 1, level: 2 } } }), ok);
    await h.router.run(req);
    expect(h.state.meta.projectCooldowns.P).toBeUndefined();
  });

  it('usage log tidak memuat key dan memakai estimasi bila token tidak ada', () => {
    const l = buildUsageLog({ requestId: 'r', ts: 1, keyLabel: 'K', model: 'm', task: 'concepts', promptText: 'abcdefgh', ok: false, latencyMs: 1 });
    expect(l.estimated).toBe(true);
    expect(l.inputTokens).toBe(2);
  });
});
