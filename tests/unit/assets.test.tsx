import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { assetsText, buildAssets, collectLocations, isFlowAssetsMode, locationForScene } from '@/domain/assets';
import { buildScenePromptBatches } from '@/ai/director/scenePromptCall';
import { buildSceneRegenCall } from '@/ai/director/sceneRegenCall';
import { applyLintFixes, lintScene, type LintContext } from '@/domain/linter';
import { toExportBundle } from '@/domain/exporters/bundle';
import { promptsTxt } from '@/domain/exporters/txt';
import { toMarkdown } from '@/domain/exporters/markdown';
import AssetsPage from '@/features/assets/AssetsPage';
import { useProjectStore } from '@/stores/projectStore';
import type { Project, Scene } from '@/types';
import { MASTER, makeBibles, makeBrief, makeScene } from './helpers';

const flowBrief = () => makeBrief({ output: { characterRef: 'flow_assets' } });
const scenes = (): Scene[] => [
  makeScene({ id: 'a', order: 0, environment: 'busy Indonesian warung with stocked shelves' }),
  makeScene({ id: 'b', order: 1, environment: 'front porch of the warung at the street side, motorbikes parked' }),
  makeScene({ id: 'c', order: 2, environment: 'busy Indonesian warung with stocked shelves' }),
];

describe('Aset Flow: karakter → tempat → produk', () => {
  it('membangun prompt karakter (seluruh badan + close-up), tempat tanpa orang, dan produk', () => {
    const a = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    expect(a.characters).toHaveLength(1);
    expect(a.characters[0].flowName).toBe('Bu Sari');
    expect(a.characters[0].fullBodyPrompt).toContain(MASTER);
    expect(a.characters[0].fullBodyPrompt).toMatch(/Full body/);
    expect(a.characters[0].closeUpPrompt).toMatch(/Close-up portrait/);
    expect(a.locations.length).toBeGreaterThanOrEqual(2);
    expect(a.locations[0].prompt).toMatch(/no people/i);
    expect(a.locations[0].prompt).toContain('Aspect ratio 9:16');
    expect(a.product?.prompt).toContain('Warungku-POS');
  });

  it('memperbarui dari Bible mempertahankan nama Flow, status, dan prompt yang diedit', () => {
    const first = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    const edited = {
      ...first,
      characters: first.characters.map((c) => ({ ...c, flowName: '@BuSari', done: true, edited: true, fullBodyPrompt: 'CUSTOM' })),
    };
    const bibles = makeBibles();
    bibles.characters[0].masterDescriptionEn = 'Changed description.';
    const next = buildAssets(flowBrief(), bibles, scenes(), edited, 2);
    expect(next.characters[0]).toMatchObject({ flowName: '@BuSari', done: true, fullBodyPrompt: 'CUSTOM' });
    const notEdited = buildAssets(flowBrief(), bibles, scenes(), first, 3);
    expect(notEdited.characters[0].fullBodyPrompt).toContain('Changed description.');
  });

  it('lokasi unik, lokasi utama pertama, maks 5; scene dicocokkan ke lokasi', () => {
    const locs = collectLocations(flowBrief(), makeBibles(), scenes());
    expect(locs[0].name).toBe('Warung');
    expect(locs.filter((l) => /porch/.test(l.description))).toHaveLength(1);
    const a = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    expect(locationForScene(scenes()[1], a)?.description).toMatch(/porch/);
  });

  it('urutan teks salin/ekspor: karakter → tempat → produk → scene', () => {
    const a = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    const t = assetsText(a);
    expect(t.indexOf('=== KARAKTER 1')).toBeLessThan(t.indexOf('=== TEMPAT 1'));
    expect(t.indexOf('=== TEMPAT 1')).toBeLessThan(t.indexOf('=== PRODUK'));
    const project = { id: 'p', schemaVersion: 1, name: 'P', brandId: '', status: 'draft', brief: flowBrief(), completeness: 0, step: 1, stage: 'prompts', lintDisabled: [], createdAt: 1, updatedAt: 1 } as Project;
    const bundle = toExportBundle(project, { creative: null, script: null, bibles: makeBibles(), scenes: { items: scenes(), updatedAt: 1 }, capcut: null, assets: a });
    const txt = promptsTxt(bundle);
    expect(txt.indexOf('=== KARAKTER 1')).toBeLessThan(txt.indexOf('=== SCENE 1'));
    const md = toMarkdown(bundle, ['assets', 'prompts']);
    expect(md.indexOf('## Prompt Aset Flow')).toBeLessThan(md.indexOf('## Prompt Google Flow'));
  });
});

describe('Prompt scene memakai nama aset Flow', () => {
  it('panggilan 3: menyebut nama Flow, tidak menempel MASTER DESCRIPTION', () => {
    const a = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    const prompt = buildScenePromptBatches(flowBrief(), scenes(), scenes(), makeBibles(), a)[0].call.userPrompt;
    expect(prompt).toContain('Flow name "Bu Sari"');
    expect(prompt).toContain('location asset:');
    expect(prompt).toContain('STORY SCENE using existing Flow assets');
    expect(prompt).not.toContain('MASTER DESCRIPTION');
    expect(prompt).toMatch(/Length: 40-90 words/);
  });
  it('mode deskripsi tetap memakai MASTER DESCRIPTION (perilaku lama)', () => {
    const desc = makeBrief({ output: { characterRef: 'description' } });
    const a = buildAssets(desc, makeBibles(), scenes(), null, 1);
    const prompt = buildScenePromptBatches(desc, scenes(), scenes(), makeBibles(), a)[0].call.userPrompt;
    expect(prompt).toContain('MASTER DESCRIPTION');
    expect(isFlowAssetsMode(desc, a)).toBe(false);
    // brief lama tanpa field characterRef = perilaku lama
    const legacy = makeBrief();
    delete (legacy.output as { characterRef?: string }).characterRef;
    expect(isFlowAssetsMode(legacy, a)).toBe(false);
  });
  it('regenerasi scene memakai aturan yang sama', () => {
    const a = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    const call = buildSceneRegenCall(flowBrief(), scenes(), 'b', makeBibles(), undefined, a);
    expect(call.userPrompt).toContain('Flow name "Bu Sari"');
    expect(call.userPrompt).not.toContain('MASTER DESCRIPTION');
  });
});

describe('Linter di mode aset Flow', () => {
  const a = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
  const ctx = (s: Scene): LintContext => ({ brief: flowBrief(), bibles: makeBibles(), scenes: [s], variant: 'standard', assets: a });
  const short = 'Bu Sari taps the Warungku-POS app to record a sale. Setting: Warung, morning rush with customers waiting at the counter. Medium shot, gentle push-in. Soft window light, cheerful mood. Visual style: Photorealistic UGC style with warm natural tones. Aspect ratio 9:16.';

  it('prompt pendek yang menyebut nama aset lolos L02/L03', () => {
    const s = makeScene({ characterIds: ['char_1'], flowPrompts: { standard: short } });
    const ids = lintScene(s, ctx(s)).map((i) => i.ruleId);
    expect(ids).not.toContain('L02');
    expect(ids).not.toContain('L03');
  });
  it('nama karakter/produk hilang terdeteksi dan bisa diperbaiki otomatis', () => {
    const s = makeScene({ characterIds: ['char_1'], flowPrompts: { standard: short.replace('Bu Sari', 'She').replace('Warungku-POS', 'the') } });
    const ids = lintScene(s, ctx(s)).map((i) => i.ruleId);
    expect(ids).toContain('L02');
    expect(ids).toContain('L03');
    const fixed = applyLintFixes(s, ctx(s), ['L02', 'L03']);
    const after = lintScene(fixed, ctx(fixed)).map((i) => i.ruleId);
    expect(after).not.toContain('L02');
    expect(after).not.toContain('L03');
  });
});

describe('Halaman Karakter & Tempat', () => {
  it('menyusun aset otomatis dari Bible dan menampilkan urutan karakter → tempat → produk', async () => {
    const project = { id: 'p1', schemaVersion: 1, name: 'P', brandId: '', status: 'draft', brief: flowBrief(), completeness: 0, step: 1, stage: 'prompts', lintDisabled: [], createdAt: 1, updatedAt: 1 } as Project;
    useProjectStore.setState({
      project,
      projectId: 'p1',
      uid: 'demo-user',
      docs: { creative: null, script: null, bibles: makeBibles(), scenes: { items: scenes(), updatedAt: 1 }, capcut: null, assets: null },
    });
    render(
      <TooltipProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="*" element={<AssetsPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );
    expect(await screen.findByText(/1\. Karakter/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Tempat/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Produk/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bu Sari')).toBeInTheDocument();
    expect(useProjectStore.getState().docs.assets?.characters).toHaveLength(1);
  });
});
