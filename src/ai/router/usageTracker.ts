import type { AiTask, UsageLog } from '@/types';

export interface UsageSink {
  add(log: UsageLog): Promise<void>;
  trim?(nowMs: number): Promise<void>;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildUsageLog(p: {
  requestId: string;
  ts: number;
  keyLabel: string;
  model: string;
  task: AiTask;
  promptText: string;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
  httpStatus?: number;
  ok: boolean;
  latencyMs: number;
  errorCode?: string;
}): UsageLog {
  const estimated = p.inputTokens === undefined || (p.ok && p.outputTokens === undefined);
  return {
    requestId: p.requestId,
    ts: p.ts,
    keyLabel: p.keyLabel,
    model: p.model,
    task: p.task,
    inputTokens: p.inputTokens ?? estimateTokens(p.promptText),
    outputTokens: p.outputTokens ?? (p.outputText !== undefined ? estimateTokens(p.outputText) : 0),
    estimated,
    httpStatus: p.httpStatus,
    ok: p.ok,
    latencyMs: p.latencyMs,
    errorCode: p.errorCode,
  };
}

export { countToday, summarizeByKey, type UsageSummary } from '@/domain/usageStats';
