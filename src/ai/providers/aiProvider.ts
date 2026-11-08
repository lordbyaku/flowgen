import type { AiTask, KeyStatus } from '@/types';

export interface AIRequest {
  task: AiTask;
  systemPrompt: string;
  userPrompt: string;
  /** Hasil toGeminiSchema. */
  responseSchema?: object;
  temperature: number;
  maxOutputTokens: number;
  signal?: AbortSignal;
  /** Gambar referensi (multimodal). Label disisipkan sebagai teks sebelum tiap gambar. */
  images?: AIImage[];
}

export interface AIImage {
  label: string;
  mimeType: string;
  /** base64 tanpa prefiks data: */
  data: string;
}

export interface AIResponse {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  httpStatus: number;
  latencyMs: number;
}

export interface KeyValidationResult {
  status: KeyStatus;
  httpStatus?: number;
  message: string;
}

export interface AIProvider {
  generate(apiKey: string, model: string, req: AIRequest): Promise<AIResponse>;
  validateKey(apiKey: string, model: string): Promise<KeyValidationResult>;
  listModels(apiKey: string): Promise<string[]>;
}

export type ProviderErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'blocked' | 'truncated';

/** Error dari provider. Pesan SUDAH disanitasi; tidak pernah memuat header atau key. */
export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly httpStatus?: number;
  readonly apiStatus?: string;
  readonly retryDelaySec?: number;
  readonly quotaDaily: boolean;
  readonly latencyMs: number;
  readonly partialText?: string;

  constructor(
    kind: ProviderErrorKind,
    message: string,
    opts: {
      httpStatus?: number;
      apiStatus?: string;
      retryDelaySec?: number;
      quotaDaily?: boolean;
      latencyMs?: number;
      partialText?: string;
    } = {},
  ) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.httpStatus = opts.httpStatus;
    this.apiStatus = opts.apiStatus;
    this.retryDelaySec = opts.retryDelaySec;
    this.quotaDaily = opts.quotaDaily ?? false;
    this.latencyMs = opts.latencyMs ?? 0;
    this.partialText = opts.partialText;
  }
}
