// Satu-satunya pintu AI dari UI. Setiap fungsi mengembalikan Result<T, AppError> dan tidak melempar.
import { geminiProvider, keyTestRequest } from '@/ai/providers/geminiProvider';
import type { AIProvider } from '@/ai/providers/aiProvider';
import { AIRouter } from '@/ai/router/aiRouter';
import { classifyError } from '@/ai/router/errorClassifier';
import { RouterError } from '@/ai/router/errors';
import { buildUsageLog } from '@/ai/router/usageTracker';
import { structuredCall } from '@/ai/json/structuredCall';
import { buildBriefAssistCall, filterAssistQuestions } from '@/ai/director/briefAssistCall';
import { buildConceptCall, toConceptRound } from '@/ai/director/conceptCall';
import { buildScriptStoryboardCall, mapScriptStoryboard } from '@/ai/director/scriptStoryboardCall';
import { applyPromptItems, buildScenePromptBatches } from '@/ai/director/scenePromptCall';
import { applySceneRegen, buildSceneRegenCall } from '@/ai/director/sceneRegenCall';
import { MSG, messageFor } from '@/ai/messages';
import { computeCompleteness } from '@/domain/completeness';
import { buildTimelineFromScenes } from '@/domain/exporters/capcutGuide';
import { newRequestId } from '@/lib/ids';
import type {
  AppError,
  BiblesDoc,
  Brand,
  Brief,
  BriefAssistQuestion,
  CapcutGuide,
  Concept,
  ConceptRound,
  KeyStatus,
  ProgressFn,
  Result,
  Scene,
  ScriptDoc,
} from '@/types';
import { usageStore, vaultKeyAccess, type KeyAccess } from '@/vault/vaultStore';

export interface CallOptions {
  signal?: AbortSignal;
  onProgress?: ProgressFn;
}

export interface ScenePromptsResult {
  scenes: Scene[];
  capcut: CapcutGuide | null;
  /** Diisi bila sebagian batch gagal; batch yang sukses tetap dipakai. */
  partialError?: AppError;
}

function toAppError(err: unknown): AppError {
  if (err instanceof RouterError) return err.appError;
  const c = classifyError(err);
  return { code: c.code, message: messageFor(c.code), httpStatus: c.httpStatus };
}

async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

function guardBrief(brief: Brief): AppError | null {
  const c = computeCompleteness(brief);
  if (c.blockers.length > 0)
    return { code: 'brief_incomplete', message: `${MSG.briefIncomplete} Kosong: ${c.blockers.map((b) => b.label).join(', ')}.` };
  return null;
}

export function createAiService(deps: { provider: AIProvider; keys: KeyAccess; router: AIRouter; now?: () => number }) {
  const { provider, keys, router } = deps;
  const now = deps.now ?? Date.now;

  return {
    get busy() {
      return router.busy;
    },

    briefAssist(brief: Brief, opts: CallOptions = {}): Promise<Result<BriefAssistQuestion[]>> {
      return safe(async () => {
        const call = buildBriefAssistCall(brief);
        const { data } = await structuredCall(router, { ...call, ...opts });
        return filterAssistQuestions(data, brief);
      });
    },

    generateConcepts(brief: Brief, brand: Brand | null, opts: CallOptions = {}): Promise<Result<ConceptRound>> {
      const blocked = guardBrief(brief);
      if (blocked) return Promise.resolve({ ok: false, error: blocked });
      return safe(async () => {
        const { data } = await structuredCall(router, { ...buildConceptCall(brief, brand), ...opts });
        return toConceptRound(data, brief, now());
      });
    },

    generateScriptStoryboard(
      brief: Brief,
      concept: Concept,
      brand: Brand | null,
      opts: CallOptions = {},
    ): Promise<Result<{ script: ScriptDoc; scenes: Scene[]; bibles: BiblesDoc; assumptions: string[] }>> {
      const blocked = guardBrief(brief);
      if (blocked) return Promise.resolve({ ok: false, error: blocked });
      return safe(async () => {
        const { targetCount: _t, ...call } = buildScriptStoryboardCall(brief, concept, brand);
        const { data } = await structuredCall(router, { ...call, ...opts });
        return mapScriptStoryboard(data, brief, now());
      });
    },

    /** Prompt per scene + panduan CapCut. Scene yang sudah di-approve dan sudah punya prompt tidak disentuh. */
    async generateScenePrompts(
      input: { brief: Brief; scenes: Scene[]; bibles: BiblesDoc; onlySceneIds?: string[] },
      opts: CallOptions = {},
    ): Promise<Result<ScenePromptsResult>> {
      const { brief, bibles } = input;
      let scenes = input.scenes;
      const targets = scenes.filter((s) =>
        input.onlySceneIds ? input.onlySceneIds.includes(s.id) : !(s.approved && s.flowPrompts.standard.trim()),
      );
      if (targets.length === 0)
        return { ok: false, error: { code: 'validation', message: 'Semua scene sudah di-approve. Batalkan approve untuk membuat ulang.' } };
      const batches = buildScenePromptBatches(brief, scenes, targets, bibles);
      let capcut: CapcutGuide | null = null;
      for (const [i, b] of batches.entries()) {
        opts.onProgress?.('requesting', `Batch ${i + 1}/${batches.length}`);
        try {
          const { data } = await structuredCall(router, { ...b.call, ...opts });
          const items = data.prompts.filter((p) => b.sceneIds.includes(p.sceneId));
          scenes = applyPromptItems(scenes, items, brief, now());
          if ('capcut' in data && data.capcut) {
            capcut = { ...data.capcut, timeline: data.capcut.timeline.length ? data.capcut.timeline : buildTimelineFromScenes(scenes) };
          }
        } catch (err) {
          const error = toAppError(err);
          if (i === 0) return { ok: false, error };
          return { ok: true, value: { scenes, capcut, partialError: error } };
        }
      }
      return { ok: true, value: { scenes, capcut } };
    },

    /** Regenerasi satu scene; scene lain tidak diubah. */
    regenerateScene(
      input: { brief: Brief; scenes: Scene[]; bibles: BiblesDoc },
      sceneId: string,
      instruction?: string,
      opts: CallOptions = {},
    ): Promise<Result<Scene[]>> {
      return safe(async () => {
        const call = buildSceneRegenCall(input.brief, input.scenes, sceneId, input.bibles, instruction);
        const { data } = await structuredCall(router, { ...call, ...opts });
        return applySceneRegen(input.scenes, sceneId, data, input.brief, now());
      });
    },

    /** Tes koneksi: GET models/{model}. */
    testKey(keyId: string): Promise<Result<{ status: KeyStatus; message: string }>> {
      return safe(async () => {
        const key = (await keys.listKeys()).find((k) => k.id === keyId);
        if (!key) throw new RouterError({ code: 'unknown', message: 'Key tidak ditemukan.' });
        const t0 = now();
        const r = await keys.withPlainKey(keyId, (apiKey) => provider.validateKey(apiKey, key.model));
        await usageStore
          .add(
            buildUsageLog({
              requestId: newRequestId(),
              ts: t0,
              keyLabel: key.label,
              model: key.model,
              task: 'key_test',
              promptText: '',
              outputText: '',
              httpStatus: r.httpStatus,
              ok: r.status === 'connected',
              latencyMs: now() - t0,
              errorCode: r.status === 'connected' ? undefined : r.status,
            }),
          )
          .catch(() => undefined);
        await keys.patchKey(keyId, {
          status: r.status,
          lastTestedAt: now(),
          consecutiveErrors: r.status === 'connected' ? 0 : key.consecutiveErrors + 1,
          lastError: r.status === 'connected' ? undefined : r.status,
        });
        return { status: r.status, message: r.message };
      });
    },

    /** Tes Generate: satu request kecil lewat router (maks 8 token). */
    testGenerate(keyId: string): Promise<Result<{ text: string; latencyMs: number }>> {
      return safe(async () => {
        try {
          const r = await router.runWithKey(keyId, keyTestRequest());
          return { text: r.text, latencyMs: r.latencyMs };
        } catch (err) {
          // Model "thinking" dapat menghabiskan 8 token: tetap dianggap terhubung.
          if (err instanceof RouterError && err.code === 'truncated') return { text: '(terpotong — key berfungsi)', latencyMs: 0 };
          throw err;
        }
      });
    },

    listModels(keyId: string): Promise<Result<string[]>> {
      return safe(async () => keys.withPlainKey(keyId, (apiKey) => provider.listModels(apiKey)));
    },
  };
}

const router = new AIRouter({ provider: geminiProvider, keys: vaultKeyAccess, usage: usageStore });

export const aiService = createAiService({ provider: geminiProvider, keys: vaultKeyAccess, router });
export type AiService = ReturnType<typeof createAiService>;
