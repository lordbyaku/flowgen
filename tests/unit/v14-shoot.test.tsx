import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { buildAssets } from '@/domain/assets';
import { buildShootQueue, firstPending, nextPending } from '@/domain/shootQueue';
import ShootPage from '@/features/tracker/ShootPage';
import { useProjectStore } from '@/stores/projectStore';
import type { HooksDoc, Project, Scene } from '@/types';
import { GOOD_PROMPT, makeBibles, makeBrief, makeScene } from './helpers';

const flowBrief = () => makeBrief({ output: { characterRef: 'flow_assets' } });
const scenes = (): Scene[] => [
  makeScene({ id: 'a', order: 0, title: 'Hook', flowPrompts: { standard: GOOD_PROMPT }, tracker: 'clip_generated' }),
  makeScene({ id: 'b', order: 1, title: 'Masalah', flowPrompts: { standard: GOOD_PROMPT }, tracker: 'prompt_ready', textOverlay: 'Rugi?' }),
];
const hooks: HooksDoc = {
  baseSceneId: 'a',
  items: [
    {
      id: 'h1',
      hookStyle: 'question',
      title: 'Tanya',
      visualDescription: '',
      characterAction: '',
      voiceOver: '',
      textOverlay: '',
      flowPrompt: 'Hook prompt',
      negativePrompt: 'text',
      rationale: '',
      tracker: 'prompt_ready',
      updatedAt: 0,
    },
  ],
  updatedAt: 0,
};

describe('Antrean Mode Produksi (v1.4)', () => {
  it('mode aset Flow: aset → scene → varian hook; status selesai dari aset/tracker', () => {
    const assets = buildAssets(flowBrief(), makeBibles(), scenes(), null, 1);
    assets.characters[0].done = true;
    const q = buildShootQueue(flowBrief(), { scenes: scenes(), assets, hooks });
    expect(q[0].key).toBe('char:char_1');
    expect(q[0].copies.map((c) => c.label)).toEqual(['Seluruh badan', 'Close-up wajah']);
    const groups = q.map((x) => x.group);
    expect(groups.indexOf('scene')).toBeGreaterThan(groups.lastIndexOf('asset'));
    expect(groups.at(-1)).toBe('hook');
    expect(q.find((x) => x.key === 'scene:a')?.done).toBe(true);
    expect(q.find((x) => x.key === 'scene:b')?.context).toContain('Overlay (CapCut): Rugi?');
    expect(firstPending(q)).toBe(1);
  });

  it('mode deskripsi: tanpa aset; mode frame: gambar frame disalin sebelum prompt video', () => {
    const brief = makeBrief({ output: { flowMode: 'frames' } });
    const s = [makeScene({ id: 'a', flowPrompts: { standard: GOOD_PROMPT }, framePrompts: { start: 'Start still', end: 'End still' } })];
    const q = buildShootQueue(brief, { scenes: s, assets: null, hooks: null });
    expect(q).toHaveLength(1);
    expect(q[0].copies.map((c) => c.label)).toEqual(['Frame awal (gambar)', 'Frame akhir (gambar)', 'Prompt video']);
    expect(q[0].copies[2].text).toContain('Avoid:');
  });

  it('nextPending berputar dan null bila semua selesai', () => {
    const q = buildShootQueue(makeBrief(), { scenes: scenes(), assets: null, hooks });
    expect(nextPending(q, 1)).toBe(2);
    expect(nextPending(q, 2)).toBe(1);
    expect(nextPending(q.map((x) => ({ ...x, done: true })), 0)).toBeNull();
  });
});

describe('Halaman Mode Produksi', () => {
  it('membuka item pertama yang belum selesai; "Sudah dibuat" menandai klip dan lanjut', async () => {
    const project = {
      id: 'p1', schemaVersion: 1, name: 'P', brandId: '', status: 'draft', brief: makeBrief(), completeness: 0, step: 1,
      stage: 'production', lintDisabled: [], performance: [], createdAt: 1, updatedAt: 1,
    } as Project;
    useProjectStore.setState({
      project,
      projectId: 'p1',
      uid: 'demo-user',
      docs: { creative: null, script: null, bibles: makeBibles(), scenes: { items: scenes(), updatedAt: 1 }, capcut: null, assets: null, publish: null, hooks },
    });
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/shoot']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="*" element={<ShootPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );
    expect(await screen.findByText('Scene 2: Masalah')).toBeInTheDocument();
    expect(screen.getByText('2/3 · 1 selesai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sudah dibuat di Flow/ }));
    expect(useProjectStore.getState().docs.scenes?.items.find((s) => s.id === 'b')?.tracker).toBe('clip_generated');
    expect(await screen.findByText('Hook A: Tanya')).toBeInTheDocument();
  });
});
