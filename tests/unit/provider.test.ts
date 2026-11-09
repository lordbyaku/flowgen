import { describe, expect, it, vi } from 'vitest';
import { createGeminiProvider } from '@/ai/providers/geminiProvider';
import { ProviderError } from '@/ai/providers/aiProvider';
import { looksLikeGeminiKey, redactSecrets } from '@/ai/sanitize';

const KEY = 'AIza' + 'Sy' + 'PROVPROVPROVPROVPROVPROVPROVPROV7';
const req = { task: 'concepts' as const, systemPrompt: 'sys', userPrompt: 'user', temperature: 0.5, maxOutputTokens: 100, responseSchema: { type: 'OBJECT' } };

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
}

async function catchErr(p: Promise<unknown>): Promise<ProviderError> {
  try {
    await p;
  } catch (e) {
    return e as ProviderError;
  }
  throw new Error('tidak melempar');
}

describe('geminiProvider (P1-11)', () => {
  it('generate: parsing sukses, token, key di header bukan URL', async () => {
    const f = fakeFetch(200, {
      candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 22 },
    });
    const p = createGeminiProvider(f as unknown as typeof fetch, 'https://x.test/v1beta');
    const r = await p.generate(KEY, 'gemini-x', req);
    expect(r.text).toBe('{"a":1}');
    expect(r.inputTokens).toBe(11);
    expect(r.outputTokens).toBe(22);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe('https://x.test/v1beta/models/gemini-x:generateContent');
    expect(String(url)).not.toContain(KEY);
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    const body = JSON.parse(String(init!.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.systemInstruction.parts[0].text).toBe('sys');
  });

  it('finishReason MAX_TOKENS -> truncated', async () => {
    const p = createGeminiProvider(fakeFetch(200, { candidates: [{ content: { parts: [{ text: '{' }] }, finishReason: 'MAX_TOKENS' }] }) as unknown as typeof fetch);
    const e = await catchErr(p.generate(KEY, 'm', req));
    expect(e.kind).toBe('truncated');
    expect(e.partialText).toBe('{');
  });

  it('blockReason atau kandidat kosong -> blocked', async () => {
    const p1 = createGeminiProvider(fakeFetch(200, { promptFeedback: { blockReason: 'SAFETY' } }) as unknown as typeof fetch);
    expect((await catchErr(p1.generate(KEY, 'm', req))).kind).toBe('blocked');
    const p2 = createGeminiProvider(fakeFetch(200, { candidates: [] }) as unknown as typeof fetch);
    expect((await catchErr(p2.generate(KEY, 'm', req))).kind).toBe('blocked');
  });

  it('429 dengan RetryInfo dan kuota harian terpetakan', async () => {
    const body = {
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'Quota exceeded',
        details: [
          { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '37s' },
        ],
      },
    };
    const p = createGeminiProvider(fakeFetch(429, body) as unknown as typeof fetch);
    const e = await catchErr(p.generate(KEY, 'm', req));
    expect(e.httpStatus).toBe(429);
    expect(e.retryDelaySec).toBe(37);
    expect(e.quotaDaily).toBe(true);
  });

  it('pesan error disanitasi: key tidak bocor', async () => {
    const p = createGeminiProvider(fakeFetch(400, { error: { code: 400, message: `API key ${KEY} not valid. ?key=${KEY}` } }) as unknown as typeof fetch);
    const e = await catchErr(p.generate(KEY, 'm', req));
    expect(e.message).not.toContain(KEY);
    expect(e.message).toContain('[REDACTED]');
    expect(JSON.stringify(e)).not.toContain(KEY);
  });

  it('error jaringan -> network', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const p = createGeminiProvider(f as unknown as typeof fetch);
    expect((await catchErr(p.generate(KEY, 'm', req))).kind).toBe('network');
  });

  it('validateKey: 200 Connected, 400/403 Invalid, 404 Model Unavailable', async () => {
    const mk = (s: number) => createGeminiProvider(fakeFetch(s, s === 200 ? { name: 'models/m' } : { error: { code: s, message: 'x' } }) as unknown as typeof fetch);
    expect((await mk(200).validateKey(KEY, 'm')).status).toBe('connected');
    expect((await mk(400).validateKey(KEY, 'm')).status).toBe('invalid_key');
    expect((await mk(403).validateKey(KEY, 'm')).status).toBe('invalid_key');
    expect((await mk(404).validateKey(KEY, 'm')).status).toBe('model_unavailable');
    expect((await mk(429).validateKey(KEY, 'm')).status).toBe('rate_limited');
  });

  it('listModels: saring generateContent, buang awalan models/', async () => {
    const p = createGeminiProvider(
      fakeFetch(200, {
        models: [
          { name: 'models/gemini-b', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-a', supportedGenerationMethods: ['generateContent', 'countTokens'] },
        ],
      }) as unknown as typeof fetch,
    );
    expect(await p.listModels(KEY)).toEqual(['gemini-a', 'gemini-b']);
  });

  it('format key baru AQ.… dikenali dan disensor', () => {
    const NEW = 'AQ.' + 'NewFormatFake'.repeat(4);
    expect(looksLikeGeminiKey(NEW)).toBe(true);
    expect(looksLikeGeminiKey(KEY)).toBe(true);
    expect(looksLikeGeminiKey('kunci-asal')).toBe(false);
    expect(redactSecrets(`invalid key ${NEW}.`)).toBe('invalid key [REDACTED].');
  });

  it('pesan error dengan key format baru tidak bocor', async () => {
    const NEW = 'AQ.' + 'NewFormatFake'.repeat(4);
    const p = createGeminiProvider(fakeFetch(400, { error: { code: 400, message: `API key ${NEW} not valid` } }) as unknown as typeof fetch);
    const e = await catchErr(p.generate(NEW, 'm', req));
    expect(e.message).not.toContain(NEW);
    expect(e.message).toContain('[REDACTED]');
  });

  it('redactSecrets', () => {
    expect(redactSecrets(`x ${KEY} y`)).toBe('x [REDACTED] y');
    expect(redactSecrets('https://a?key=abc123&b=1')).toBe('https://a?key=[REDACTED]&b=1');
  });
});
