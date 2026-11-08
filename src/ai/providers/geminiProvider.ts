// Satu-satunya tempat fetch ke Gemini. Detail REST [VERIFIKASI] — bila API berubah, ubah hanya file ini.
import { GEMINI_BASE_URL, KEY_TEST_MAX_OUTPUT_TOKENS, REQUEST_TIMEOUT_MS, THINKING_BUDGET } from '@/config/constants';
import { redactSecrets } from '@/ai/sanitize';
import { ProviderError, type AIProvider, type AIRequest, type AIResponse, type KeyValidationResult } from './aiProvider';

type FetchFn = typeof fetch;

interface GeminiErrorBody {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    details?: { '@type'?: string; retryDelay?: string; violations?: { quotaId?: string; quotaMetric?: string }[] }[];
  };
}

interface GeminiGenerateBody {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function parseRetryDelay(s?: string): number | undefined {
  if (!s) return undefined;
  const m = /^([\d.]+)s$/.exec(s.trim());
  return m ? Math.ceil(Number(m[1])) : undefined;
}

async function toHttpError(res: Response, apiKey: string, latencyMs: number): Promise<ProviderError> {
  let body: GeminiErrorBody = {};
  try {
    body = (await res.json()) as GeminiErrorBody;
  } catch {
    /* body bukan JSON */
  }
  const details = body.error?.details ?? [];
  const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'));
  const quotaIds = details.flatMap((d) => d.violations ?? []).map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`);
  const rawMsg = body.error?.message ?? res.statusText ?? `HTTP ${res.status}`;
  const quotaDaily = res.status === 429 && /per[ _-]?day|PerDay|daily/i.test([rawMsg, ...quotaIds].join(' '));
  return new ProviderError('http', redactSecrets(rawMsg, [apiKey]).slice(0, 500), {
    httpStatus: res.status,
    apiStatus: body.error?.status,
    retryDelaySec: parseRetryDelay(retryInfo?.retryDelay),
    quotaDaily,
    latencyMs,
  });
}

function linkSignals(external?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  let timedOut = false;
  const t = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const onAbort = () => ctrl.abort();
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(t);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

export function createGeminiProvider(fetchFn: FetchFn = (...a) => fetch(...a), baseUrl = GEMINI_BASE_URL): AIProvider {
  async function call(apiKey: string, url: string, init: RequestInit, signal?: AbortSignal) {
    const linked = linkSignals(signal);
    const t0 = now();
    try {
      const res = await fetchFn(url, {
        ...init,
        signal: linked.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      });
      return { res, latencyMs: Math.round(now() - t0) };
    } catch (e) {
      const latencyMs = Math.round(now() - t0);
      if (linked.timedOut()) throw new ProviderError('timeout', 'Permintaan melewati batas waktu.', { latencyMs });
      if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError'))
        throw new ProviderError('aborted', 'Dibatalkan pengguna.', { latencyMs });
      throw new ProviderError('network', 'Gagal terhubung ke Gemini.', { latencyMs });
    } finally {
      linked.cleanup();
    }
  }

  return {
    async generate(apiKey: string, model: string, req: AIRequest): Promise<AIResponse> {
      const thinking = thinkingConfigFor(model);
      const parts: Record<string, unknown>[] = [];
      for (const img of req.images ?? []) {
        parts.push({ text: img.label });
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
      parts.push({ text: req.userPrompt });
      const buildBody = (withThinking: boolean) => ({
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        generationConfig: {
          temperature: req.temperature,
          maxOutputTokens: req.maxOutputTokens,
          ...(req.responseSchema
            ? { responseMimeType: 'application/json', responseSchema: req.responseSchema }
            : {}),
          ...(withThinking && thinking ? { thinkingConfig: thinking } : {}),
        },
      });
      const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
      let { res, latencyMs } = await call(apiKey, url, { method: 'POST', body: JSON.stringify(buildBody(true)) }, req.signal);
      if (!res.ok && res.status === 400 && thinking) {
        // Model menolak thinkingConfig: ulangi SEKALI tanpa konfigurasi tersebut.
        const err = await toHttpError(res.clone(), apiKey, latencyMs);
        if (/thinking/i.test(err.message)) {
          ({ res, latencyMs } = await call(apiKey, url, { method: 'POST', body: JSON.stringify(buildBody(false)) }, req.signal));
        }
      }
      if (!res.ok) throw await toHttpError(res, apiKey, latencyMs);
      const json = (await res.json()) as GeminiGenerateBody;
      const cand = json.candidates?.[0];
      if (json.promptFeedback?.blockReason || !cand) {
        throw new ProviderError('blocked', `Diblokir: ${json.promptFeedback?.blockReason ?? 'tanpa kandidat'}`, {
          httpStatus: res.status,
          latencyMs,
        });
      }
      const text = (cand.content?.parts ?? []).map((p) => p.text ?? '').join('');
      if (cand.finishReason === 'MAX_TOKENS') {
        throw new ProviderError('truncated', 'Output terpotong (MAX_TOKENS).', {
          httpStatus: res.status,
          latencyMs,
          partialText: text,
        });
      }
      if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') {
        throw new ProviderError('blocked', `Diblokir: ${cand.finishReason}`, { httpStatus: res.status, latencyMs });
      }
      return {
        text,
        model: json.modelVersion ?? model,
        inputTokens: json.usageMetadata?.promptTokenCount,
        outputTokens: json.usageMetadata?.candidatesTokenCount,
        finishReason: cand.finishReason,
        httpStatus: res.status,
        latencyMs,
      };
    },

    async validateKey(apiKey: string, model: string): Promise<KeyValidationResult> {
      try {
        const { res, latencyMs } = await call(apiKey, `${baseUrl}/models/${encodeURIComponent(model)}`, {
          method: 'GET',
        });
        if (res.ok) return { status: 'connected', httpStatus: 200, message: 'Terhubung.' };
        const err = await toHttpError(res, apiKey, latencyMs);
        if (res.status === 404) return { status: 'model_unavailable', httpStatus: 404, message: 'Model tidak tersedia.' };
        if (res.status === 400 || res.status === 401 || res.status === 403)
          return { status: 'invalid_key', httpStatus: res.status, message: 'Key tidak valid atau tidak berizin.' };
        if (res.status === 429)
          return {
            status: err.quotaDaily ? 'quota_exhausted' : 'rate_limited',
            httpStatus: 429,
            message: 'Batas permintaan tercapai.',
          };
        return { status: 'network_error', httpStatus: res.status, message: err.message };
      } catch (e) {
        return { status: 'network_error', message: e instanceof ProviderError ? e.message : 'Gagal terhubung.' };
      }
    },

    async listModels(apiKey: string): Promise<string[]> {
      const { res, latencyMs } = await call(apiKey, `${baseUrl}/models?pageSize=100`, { method: 'GET' });
      if (!res.ok) throw await toHttpError(res, apiKey, latencyMs);
      const json = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      return (json.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        .sort();
    },
  };
}

/**
 * Konfigurasi "thinking" per keluarga model [VERIFIKASI]. Token berpikir ikut menghabiskan
 * maxOutputTokens, sehingga output JSON panjang bisa terpotong. Tugas kita terstruktur, jadi
 * budget berpikir dibuat minimal.
 */
export function thinkingConfigFor(model: string): Record<string, unknown> | undefined {
  const m = model.toLowerCase();
  if (/gemini-2\.5-pro/.test(m)) return { thinkingBudget: THINKING_BUDGET.pro };
  if (/gemini-2\.5-flash/.test(m)) return { thinkingBudget: THINKING_BUDGET.flash };
  if (/gemini-3/.test(m)) return { thinkingLevel: THINKING_BUDGET.gemini3Level };
  return undefined;
}

/** Tes Generate: satu request kecil (maks 8 token output). */
export function keyTestRequest(): AIRequest {
  return {
    task: 'key_test',
    systemPrompt: 'Reply with the single word OK.',
    userPrompt: 'Ping',
    temperature: 0,
    maxOutputTokens: KEY_TEST_MAX_OUTPUT_TOKENS,
  };
}

export const geminiProvider = createGeminiProvider();
