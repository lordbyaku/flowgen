import type { AIProvider, AIRequest, AIResponse } from '@/ai/providers/aiProvider';
import { MSG, messageFor } from '@/ai/messages';
import { newRequestId } from '@/lib/ids';
import { sleep as defaultSleep } from '@/lib/utils';
import type { LocalKey, ProgressFn } from '@/types';
import type { KeyAccess, KeyPatch } from '@/vault/vaultStore';
import { applyCooldown, resetCooldown } from './cooldownManager';
import { classifyError } from './errorClassifier';
import { NoEligibleKeyError, RateLimitedError, RouterError } from './errors';
import { earliestCooldownEnd, selectKey } from './keyManager';
import { withRetry } from './retryHandler';
import { buildUsageLog, type UsageSink } from './usageTracker';

export interface RouterDeps {
  provider: AIProvider;
  keys: KeyAccess;
  usage: UsageSink;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
}

export interface RoutedResponse extends AIResponse {
  keyId: string;
  keyLabel: string;
}

/**
 * AI Router: pemilihan key, retry terbatas, cooldown per project, usage log.
 * Antrean global: satu request aktif pada satu waktu.
 * Tidak ada pindah key otomatis saat 429 dan tidak ada loop retry tak terbatas.
 */
export class AIRouter {
  private tail: Promise<unknown> = Promise.resolve();
  private active = 0;
  private readonly now: () => number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;

  constructor(private readonly deps: RouterDeps) {
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? defaultSleep;
  }

  get busy(): boolean {
    return this.active > 0;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(
      () => fn(),
      () => fn(),
    );
    this.tail = run.catch(() => undefined);
    return run;
  }

  run(req: AIRequest, onProgress?: ProgressFn): Promise<RoutedResponse> {
    return this.enqueue(() => this.execute(req, onProgress));
  }

  /** Request memakai key tertentu (tes key). Tetap lewat antrean dan pencatatan usage. */
  runWithKey(keyId: string, req: AIRequest): Promise<RoutedResponse> {
    return this.enqueue(async () => {
      const key = (await this.deps.keys.listKeys()).find((k) => k.id === keyId);
      if (!key) throw new RouterError({ code: 'unknown', message: 'Key tidak ditemukan.' });
      return this.callWithKey(key, req);
    });
  }

  private validate(req: AIRequest) {
    if (!req.task) throw new RouterError({ code: 'validation', message: 'Task AI tidak valid.' });
    if (!req.systemPrompt.trim() || !req.userPrompt.trim())
      throw new RouterError({ code: 'validation', message: 'Prompt kosong.' });
    if (!this.deps.keys.isUnlocked()) throw new RouterError({ code: 'vault_locked', message: MSG.vaultLocked });
  }

  private async execute(req: AIRequest, onProgress?: ProgressFn): Promise<RoutedResponse> {
    this.validate(req);
    onProgress?.('selecting_key');
    const keys = await this.deps.keys.listKeys();
    const meta = await this.deps.keys.getMeta();
    if (!meta) throw new RouterError({ code: 'vault_locked', message: MSG.vaultLocked });
    const now = this.now();
    const key = selectKey(keys, meta, now);
    if (!key) {
      if (keys.length === 0) throw new NoEligibleKeyError(MSG.noKeys);
      const t = earliestCooldownEnd(keys, meta, now);
      throw new NoEligibleKeyError(t ? MSG.allCooldown(t) : MSG.noActive, t ?? undefined);
    }
    // Kursor diperbarui SAAT key dipilih agar key yang gagal tidak dipakai berulang.
    if (meta.routing === 'round_robin') await this.deps.keys.saveMeta({ ...meta, rrCursor: key.id });
    onProgress?.('requesting', key.label);
    return this.callWithKey(key, req);
  }

  private async callWithKey(key: LocalKey, req: AIRequest): Promise<RoutedResponse> {
    this.active++;
    this.deps.keys.touch();
    try {
      const res = await withRetry(
        async () => {
          const ts = this.now();
          try {
            const r = await this.deps.keys.withPlainKey(key.id, (apiKey) =>
              this.deps.provider.generate(apiKey, key.model, req),
            );
            await this.log(key, req, { ts, ok: true, res: r });
            return r;
          } catch (err) {
            if (err instanceof Error && err.message === 'vault_locked')
              throw new RouterError({ code: 'vault_locked', message: MSG.vaultLocked });
            const c = classifyError(err);
            await this.log(key, req, {
              ts,
              ok: false,
              httpStatus: c.httpStatus,
              errorCode: c.code,
              latencyMs: (err as { latencyMs?: number }).latencyMs ?? 0,
            });
            throw err;
          }
        },
        {
          shouldRetry: (err) => !(err instanceof RouterError) && classifyError(err).retryable,
          sleep: this.sleep,
          random: this.deps.random,
          signal: req.signal,
        },
      );
      await this.onSuccess(key);
      return { ...res, keyId: key.id, keyLabel: key.label };
    } catch (err) {
      if (err instanceof RouterError) throw err;
      throw await this.onFailure(key, err);
    } finally {
      this.active--;
    }
  }

  private async log(
    key: LocalKey,
    req: AIRequest,
    p: { ts: number; ok: boolean; res?: AIResponse; httpStatus?: number; errorCode?: string; latencyMs?: number },
  ) {
    try {
      await this.deps.usage.add(
        buildUsageLog({
          requestId: newRequestId(),
          ts: p.ts,
          keyLabel: key.label,
          model: key.model,
          task: req.task,
          promptText: req.systemPrompt + req.userPrompt,
          outputText: p.res?.text,
          inputTokens: p.res?.inputTokens,
          outputTokens: p.res?.outputTokens,
          httpStatus: p.res?.httpStatus ?? p.httpStatus,
          ok: p.ok,
          latencyMs: p.res?.latencyMs ?? p.latencyMs ?? 0,
          errorCode: p.errorCode,
        }),
      );
    } catch (e) {
      console.warn('Gagal mencatat usage lokal', e instanceof Error ? e.name : 'error');
    }
  }

  private async onSuccess(key: LocalKey) {
    await this.deps.keys.patchKey(key.id, {
      consecutiveErrors: 0,
      status: 'connected',
      lastUsedAt: this.now(),
      cooldownUntil: undefined,
      lastError: undefined,
    });
    const meta = await this.deps.keys.getMeta();
    if (meta && meta.projectCooldowns[key.projectId]) await this.deps.keys.saveMeta(resetCooldown(meta, key.projectId));
  }

  private async onFailure(key: LocalKey, err: unknown): Promise<RouterError> {
    const c = classifyError(err);
    const now = this.now();
    const base: KeyPatch = { lastUsedAt: now, lastError: c.code };
    switch (c.code) {
      case 'rate_limit':
      case 'quota_daily': {
        const meta = await this.deps.keys.getMeta();
        let until = now + 60_000;
        if (meta) {
          const r = applyCooldown(meta, key.projectId, {
            daily: c.code === 'quota_daily',
            retryDelaySec: c.retryDelaySec,
            now,
          });
          until = r.until;
          await this.deps.keys.saveMeta(r.meta);
        }
        await this.deps.keys.patchKey(key.id, {
          ...base,
          status: c.code === 'quota_daily' ? 'quota_exhausted' : 'rate_limited',
          cooldownUntil: until,
          consecutiveErrors: key.consecutiveErrors + 1,
        });
        return new RateLimitedError({
          code: c.code,
          httpStatus: 429,
          retryAt: until,
          projectLabel: key.projectId,
          message: c.code === 'quota_daily' ? MSG.quotaDaily(key.projectId) : MSG.rateLimited(key.projectId, until),
        });
      }
      case 'auth':
        await this.deps.keys.patchKey(key.id, {
          ...base,
          status: 'invalid_key',
          consecutiveErrors: key.consecutiveErrors + 1,
        });
        break;
      case 'model_not_found':
        await this.deps.keys.patchKey(key.id, { ...base, status: 'model_unavailable' });
        break;
      case 'network':
        await this.deps.keys.patchKey(key.id, {
          ...base,
          status: 'network_error',
          consecutiveErrors: key.consecutiveErrors + 1,
        });
        break;
      case 'server':
        await this.deps.keys.patchKey(key.id, { ...base, consecutiveErrors: key.consecutiveErrors + 1 });
        break;
      default:
        // validation/blocked/truncated/aborted: tanpa penalti ke key
        break;
    }
    const partial = (err as { partialText?: string }).partialText;
    return new RouterError({ code: c.code, httpStatus: c.httpStatus, message: messageFor(c.code), rawOutput: partial });
  }
}
