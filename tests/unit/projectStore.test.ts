import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBrief, makeScene } from './helpers';

const saveProjectDoc = vi.fn(async () => ({ trimmed: false }));
const updateProject = vi.fn(async () => 1);

vi.mock('@/data/projectRepo', () => ({
  getProject: vi.fn(async () => ({
    ok: true,
    project: {
      id: 'p1',
      schemaVersion: 1,
      name: 'X',
      brandId: 'b',
      status: 'draft',
      brief: makeBrief(),
      completeness: 50,
      step: 1,
      stage: 'brief',
      lintDisabled: [],
      createdAt: 1,
      updatedAt: 1,
    },
  })),
  getProjectDocs: vi.fn(async () => ({ docs: { creative: null, script: null, bibles: null, scenes: null, capcut: null }, invalid: [] })),
  subscribeProject: vi.fn(() => () => undefined),
  saveProjectDoc: (...a: unknown[]) => saveProjectDoc(...(a as [])),
  updateProject: (...a: unknown[]) => updateProject(...(a as [])),
}));

const { useProjectStore, _resetProjectStoreTimers } = await import('@/stores/projectStore');

beforeEach(async () => {
  vi.useFakeTimers();
  saveProjectDoc.mockClear();
  updateProject.mockClear();
  _resetProjectStoreTimers();
  useProjectStore.setState({ projectId: null, project: null, dirtyDocs: new Set(), dirtyFields: new Set() });
  await useProjectStore.getState().load('u1', 'p1');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Autosave (25.3)', () => {
  it('debounce dan hanya menulis dokumen yang berubah', async () => {
    const st = useProjectStore.getState();
    st.updateScenes(() => [makeScene()]);
    st.updateScenes((s) => s.map((x) => ({ ...x, title: 'Baru' })));
    expect(saveProjectDoc).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1600);
    expect(saveProjectDoc).toHaveBeenCalledTimes(1);
    expect((saveProjectDoc.mock.calls[0] as unknown[])[2]).toBe('scenes');
    // patch project hanya memuat updatedAt (tidak ada field project yang berubah)
    const patch = (updateProject.mock.calls[0] as unknown[])[2] as Record<string, unknown>;
    expect(Object.keys(patch)).toEqual(['updatedAt']);
    expect(useProjectStore.getState().saveStatus).toBe('saved');
  });

  it('perubahan brief hanya menulis field brief terkait', async () => {
    useProjectStore.getState().updateBrief((b) => ({ ...b, product: { ...b.product, name: 'Baru' } }));
    await vi.advanceTimersByTimeAsync(1600);
    expect(saveProjectDoc).not.toHaveBeenCalled();
    const patch = (updateProject.mock.calls[0] as unknown[])[2] as Record<string, unknown>;
    expect(Object.keys(patch).sort()).toEqual(['brandId', 'brief', 'completeness', 'name', 'updatedAt']);
  });

  it('cadangan saat tab ditutup dipulihkan dan disimpan saat project dimuat lagi', async () => {
    useProjectStore.getState().updateBrief((b) => ({ ...b, product: { ...b.product, name: 'Belum tersimpan' } }));
    useProjectStore.getState().backupPending();
    expect(localStorage.getItem('avps-pending-p1')).toContain('Belum tersimpan');
    // simulasi tab ditutup sebelum autosave
    _resetProjectStoreTimers();
    useProjectStore.setState({ projectId: null, project: null, dirtyDocs: new Set(), dirtyFields: new Set() });
    updateProject.mockClear();
    await useProjectStore.getState().load('u1', 'p1');
    expect(useProjectStore.getState().restoredBackup).toBe(true);
    expect(useProjectStore.getState().project!.brief.product.name).toBe('Belum tersimpan');
    await vi.advanceTimersByTimeAsync(1600);
    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('avps-pending-p1')).toBeNull();
  });

  it('gagal simpan tidak menghapus perubahan lokal dan bisa dicoba lagi', async () => {
    updateProject.mockRejectedValueOnce(new Error('offline'));
    useProjectStore.getState().patchProject({ status: 'in_progress' });
    await vi.advanceTimersByTimeAsync(1600);
    expect(useProjectStore.getState().saveStatus).toBe('error');
    expect(useProjectStore.getState().project!.status).toBe('in_progress');
    expect(useProjectStore.getState().dirtyFields.has('status')).toBe(true);
    expect(await useProjectStore.getState().flush()).toBe(true);
    expect(useProjectStore.getState().saveStatus).toBe('saved');
  });
});
