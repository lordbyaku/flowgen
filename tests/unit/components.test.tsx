import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { TooltipProvider } from '@/components/ui/tooltip';
import BriefWizard from '@/features/brief/BriefWizard';
import ProviderPage from '@/features/provider/ProviderPage';
import { SceneEditor } from '@/features/storyboard/SceneEditor';
import { createEmptyBrief } from '@/config/presets';
import { useProjectStore } from '@/stores/projectStore';
import { useVaultStore } from '@/vault/vaultStore';
import type { Project } from '@/types';
import { makeBrief, makeScene } from './helpers';

const FAKE_KEY = 'AIza' + 'Sy' + 'COMPCOMPCOMPCOMPCOMPCOMPCOMPCOMP5';

function setProject(brief = createEmptyBrief()) {
  const p: Project = {
    id: 'p1',
    schemaVersion: 1,
    name: '',
    brandId: '',
    status: 'draft',
    brief,
    completeness: 0,
    step: 1,
    stage: 'brief',
    lintDisabled: [],
    createdAt: 1,
    updatedAt: 1,
  };
  useProjectStore.setState({ project: p, projectId: 'p1', uid: 'demo-user' });
}

const wrap = (ui: React.ReactNode, path = '/') => (
  <TooltipProvider>
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  </TooltipProvider>
);

describe('Wizard Brief', () => {
  it('field W kosong memblokir tombol Buat Konsep', () => {
    setProject();
    render(wrap(<BriefWizard />, '/projects/p1/brief?step=1'));
    expect(screen.getByRole('heading', { name: /Langkah 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat Konsep/ })).toBeDisabled();
    expect(screen.getAllByText(/Field wajib kosong/).length).toBeGreaterThan(0);
  });
  it('brief lengkap mengaktifkan tombol Buat Konsep', () => {
    setProject(makeBrief());
    render(wrap(<BriefWizard />, '/projects/p1/brief?step=9'));
    expect(screen.getByRole('button', { name: /Buat Konsep/ })).toBeEnabled();
    expect(screen.getByText(/Review — Ringkasan Brief/)).toBeInTheDocument();
  });
});

describe('Editor Storyboard', () => {
  it('menandai scene lebih dari 8 detik', () => {
    const s = makeScene({ durationSec: 9 });
    render(
      <DndContext>
        <SortableContext items={[s.id]}>
          <SceneEditor scene={s} index={0} total={1} lang="id_casual" characters={[]} onChange={() => undefined} onMove={() => undefined} onDelete={() => undefined} onDuplicate={() => undefined} onRegen={() => undefined} />
        </SortableContext>
      </DndContext>,
    );
    expect(screen.getByText(/> 8 dtk/)).toBeInTheDocument();
    expect(screen.getByLabelText('Durasi scene 1 (detik)')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Provider Manager', () => {
  it('menampilkan banner keamanan dan ajakan setup saat belum ada vault', () => {
    useVaultStore.setState({ status: 'uninitialized', meta: null, keys: [] });
    render(wrap(<ProviderPage />));
    expect(screen.getByText(/Enkripsi ini tidak melindungi dari script berbahaya/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Siapkan vault/ }).length).toBeGreaterThan(0);
  });
  it('key tampil masked (last4), plaintext tidak ada di DOM', async () => {
    await useVaultStore.getState().setup({ mode: 'session' });
    await useVaultStore.getState().addKey({ label: 'Key Uji', projectId: 'ProjA', model: 'gemini-x', apiKey: FAKE_KEY });
    const { container } = render(wrap(<ProviderPage />));
    await waitFor(() => expect(screen.getByText('Key Uji')).toBeInTheDocument());
    expect(screen.getByText(`…${FAKE_KEY.slice(-4)}`)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(FAKE_KEY);
    expect(screen.getByText(/Round robin hanya membagi request — tidak menambah kuota/)).toBeInTheDocument();
  });
});
