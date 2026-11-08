import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Clapperboard, Plus, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/misc';
import { AiErrorPanel } from '@/components/common/AiStatus';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/states';
import { EMPTY_VISUAL_BIBLE } from '@/schemas/bible.schema';
import { autoFixDurations, validateDurations } from '@/domain/duration';
import { createBlankScene, duplicateScene, moveItem } from '@/domain/sceneFactory';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import type { Scene } from '@/types';
import { SceneEditor } from './SceneEditor';
import { RegenDialog } from './RegenDialog';
import { CharacterBibleEditor, VisualBibleEditor } from './BibleEditors';

export function DurationBar({ scenes, target }: { scenes: Scene[]; target: number }) {
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const check = validateDurations(
    scenes.map((s) => s.durationSec),
    target,
  );
  const [suggest, setSuggest] = React.useState<number[] | null>(null);
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm', check.ok ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5')} role="status">
      <span className={cn('font-semibold', check.ok ? 'text-success' : 'text-destructive')}>
        Total {check.total} / {target} detik
      </span>
      {check.diff !== 0 && <span className="text-muted-foreground">({check.diff > 0 ? '+' : ''}{check.diff} dtk)</span>}
      {check.issues.length > 0 && <span className="text-destructive">{check.issues.map((i) => i.message).join(' · ')}</span>}
      {!check.ok && (
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            const fix = autoFixDurations(
              scenes.map((s) => s.durationSec),
              target,
            );
            if (!fix) toast.error('Tidak bisa diperbaiki otomatis: ubah jumlah scene.');
            else setSuggest(fix);
          }}
        >
          <Wand2 /> Saran perbaikan
        </Button>
      )}
      <ConfirmDialog
        open={!!suggest}
        onOpenChange={(v) => !v && setSuggest(null)}
        title="Terapkan saran durasi?"
        description={
          suggest && (
            <ul className="mt-2 space-y-1 text-sm">
              {scenes.map((s, i) => (
                <li key={s.id}>
                  Scene {i + 1}: {s.durationSec} → <strong>{suggest[i]}</strong> dtk
                </li>
              ))}
            </ul>
          )
        }
        confirmLabel="Terapkan"
        onConfirm={() => {
          if (suggest) updateScenes((cur) => cur.map((s, i) => ({ ...s, durationSec: suggest[i] ?? s.durationSec })));
          setSuggest(null);
        }}
      />
    </div>
  );
}

export default function StoryboardPage() {
  const project = useProjectStore((s) => s.project)!;
  const scenesDoc = useProjectStore((s) => s.docs.scenes);
  const bibles = useProjectStore((s) => s.docs.bibles);
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const setDoc = useProjectStore((s) => s.setDoc);
  const navigate = useNavigate();
  const [regen, setRegen] = React.useState<Scene | null>(null);
  const [toDelete, setToDelete] = React.useState<Scene | null>(null);
  const scenes = React.useMemo(() => [...(scenesDoc?.items ?? [])].sort((a, b) => a.order - b.order), [scenesDoc]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = scenes.findIndex((s) => s.id === e.active.id);
    const to = scenes.findIndex((s) => s.id === e.over!.id);
    updateScenes((cur) => moveItem([...cur].sort((a, b) => a.order - b.order), from, to));
  };

  if (!scenesDoc || scenes.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Storyboard belum ada"
        description="Storyboard dibuat bersama naskah (Panggilan AI 2). Anda juga bisa menyusun scene manual."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to={`/projects/${project.id}/script`}>Ke Naskah</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDoc('scenes', { items: [createBlankScene(0)], updatedAt: Date.now() });
                if (!bibles) setDoc('bibles', { characters: [], visual: EMPTY_VISUAL_BIBLE, updatedAt: Date.now() });
              }}
            >
              <Plus /> Scene manual
            </Button>
          </div>
        }
      />
    );
  }

  const biblesDoc = bibles ?? { characters: [], visual: EMPTY_VISUAL_BIBLE, updatedAt: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Storyboard</h2>
          <p className="text-sm text-muted-foreground">Edit, urutkan (seret atau tombol panah), regenerate per scene, lalu approve.</p>
        </div>
        <Button onClick={() => navigate(`/projects/${project.id}/prompts`)}>
          <Sparkles /> Lanjut ke Prompt
        </Button>
      </div>
      <AiErrorPanel />
      <Tabs defaultValue="scenes">
        <TabsList>
          <TabsTrigger value="scenes">Scene ({scenes.length})</TabsTrigger>
          <TabsTrigger value="characters">Character Bible</TabsTrigger>
          <TabsTrigger value="visual">Visual Bible</TabsTrigger>
        </TabsList>
        <TabsContent value="scenes" className="space-y-3">
          <DurationBar scenes={scenes} target={project.brief.project.durationSec} />
          {!bibles && (
            <Alert variant="warning" title="Bible belum ada">
              Regenerasi scene dan prompt membutuhkan Character/Visual Bible. Isi di tab Bible atau buat ulang dari Naskah.
            </Alert>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {scenes.map((s, i) => (
                  <SceneEditor
                    key={s.id}
                    scene={s}
                    index={i}
                    total={scenes.length}
                    lang={project.brief.project.scriptLanguage}
                    characters={biblesDoc.characters}
                    onChange={(ns) => updateScenes((cur) => cur.map((x) => (x.id === ns.id ? ns : x)))}
                    onMove={(dir) => updateScenes((cur) => moveItem([...cur].sort((a, b) => a.order - b.order), i, i + dir))}
                    onDuplicate={() =>
                      updateScenes((cur) => {
                        const sorted = [...cur].sort((a, b) => a.order - b.order);
                        sorted.splice(i + 1, 0, duplicateScene(s));
                        return sorted;
                      })
                    }
                    onDelete={() => setToDelete(s)}
                    onRegen={() => setRegen(s)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="outline" onClick={() => updateScenes((cur) => [...cur, createBlankScene(cur.length)])}>
            <Plus /> Tambah scene
          </Button>
        </TabsContent>
        <TabsContent value="characters">
          <CharacterBibleEditor bibles={biblesDoc} onChange={(b) => setDoc('bibles', b)} />
        </TabsContent>
        <TabsContent value="visual">
          <VisualBibleEditor bibles={biblesDoc} onChange={(b) => setDoc('bibles', b)} />
        </TabsContent>
      </Tabs>
      <RegenDialog scene={regen} onOpenChange={(v) => !v && setRegen(null)} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`Hapus "${toDelete?.title}"?`}
        description="Total durasi akan berubah; gunakan Saran perbaikan setelahnya."
        destructive
        confirmLabel="Hapus"
        onConfirm={() => {
          if (toDelete) updateScenes((cur) => cur.filter((x) => x.id !== toDelete.id));
        }}
      />
    </div>
  );
}
