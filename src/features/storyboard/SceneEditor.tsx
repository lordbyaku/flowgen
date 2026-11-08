import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, Copy, GripVertical, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { MAX_SCENE_SEC, MIN_SCENE_SEC } from '@/config/constants';
import { sceneWordBudget } from '@/domain/wordBudget';
import { countWords, cn } from '@/lib/utils';
import type { CharacterBible, Scene, ScriptLanguage } from '@/types';

const TEXT_FIELDS: { key: keyof Scene; label: string; multiline?: boolean; en?: boolean }[] = [
  { key: 'purpose', label: 'Tujuan scene' },
  { key: 'visualDescription', label: 'Deskripsi visual', multiline: true, en: true },
  { key: 'characterAction', label: 'Aksi karakter', multiline: true, en: true },
  { key: 'environment', label: 'Lingkungan', en: true },
  { key: 'shot', label: 'Shot', en: true },
  { key: 'cameraMovement', label: 'Gerakan kamera', en: true },
  { key: 'lighting', label: 'Pencahayaan', en: true },
  { key: 'transition', label: 'Transisi' },
  { key: 'voiceOver', label: 'Voice-over', multiline: true },
  { key: 'dialogue', label: 'Dialog', multiline: true },
  { key: 'sfxAmbient', label: 'SFX / ambient' },
  { key: 'textOverlay', label: 'Teks overlay (untuk CapCut)' },
];

export function SceneEditor({
  scene,
  index,
  total,
  lang,
  characters,
  onChange,
  onMove,
  onDelete,
  onDuplicate,
  onRegen,
  sortable = true,
}: {
  scene: Scene;
  index: number;
  total: number;
  lang: ScriptLanguage;
  characters: CharacterBible[];
  onChange: (s: Scene) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRegen: () => void;
  sortable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id, disabled: !sortable });
  const budget = sceneWordBudget(scene.durationSec, lang);
  const voWords = countWords(scene.voiceOver);
  const tooLong = scene.durationSec > MAX_SCENE_SEC;
  const tooShort = scene.durationSec < MIN_SCENE_SEC;
  const set = <K extends keyof Scene>(k: K, v: Scene[K]) => onChange({ ...scene, [k]: v, updatedAt: Date.now() });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('overflow-hidden', isDragging && 'z-10 shadow-lg ring-2 ring-primary', scene.approved && 'border-success/50')}
    >
      <div className="flex flex-wrap items-center gap-2 p-3">
        {sortable && (
          <button
            type="button"
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={`Seret untuk mengurutkan scene ${index + 1} (Spasi lalu panah untuk keyboard)`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
        <Input
          value={scene.title}
          onChange={(e) => set('title', e.target.value)}
          className="h-8 min-w-0 flex-1 basis-40 font-medium"
          aria-label={`Judul scene ${index + 1}`}
        />
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={MIN_SCENE_SEC}
            max={MAX_SCENE_SEC}
            value={scene.durationSec}
            onChange={(e) => set('durationSec', Math.max(1, Math.round(Number(e.target.value) || 1)))}
            className={cn('h-8 w-16', (tooLong || tooShort) && 'border-destructive')}
            aria-label={`Durasi scene ${index + 1} (detik)`}
            aria-invalid={tooLong || tooShort}
          />
          <span className="text-xs text-muted-foreground">dtk</span>
        </div>
        {tooLong && <Badge variant="destructive">&gt; {MAX_SCENE_SEC} dtk</Badge>}
        {scene.approved && (
          <Badge variant="success">
            <CheckCircle2 /> Approved
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Naikkan scene">
            <ArrowUp />
          </Button>
          <Button size="icon" variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Turunkan scene">
            <ArrowDown />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDuplicate} aria-label="Duplikat scene">
            <Copy />
          </Button>
          <Button size="icon" variant="ghost" onClick={onRegen} aria-label="Regenerate scene">
            <RefreshCw />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Hapus scene">
            <Trash2 />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Tutup detail' : 'Buka detail'}>
            {open ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </div>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="block w-full px-4 pb-3 text-left text-sm text-muted-foreground hover:text-foreground">
          <span className="line-clamp-2">{scene.visualDescription || scene.purpose || 'Klik untuk mengisi detail scene…'}</span>
          {scene.voiceOver && <span className="mt-1 line-clamp-1 italic">VO: “{scene.voiceOver}”</span>}
        </button>
      )}
      {open && (
        <div className="grid gap-3 border-t p-4 md:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <label key={f.key} className={cn('space-y-1 text-sm', f.multiline && 'md:col-span-2')}>
              <span className="flex items-center gap-2 font-medium">
                {f.label}
                {f.en && <span className="text-[10px] font-normal text-muted-foreground">EN</span>}
                {f.key === 'voiceOver' && (
                  <span className={cn('text-xs font-normal', voWords > budget ? 'text-destructive' : 'text-muted-foreground')}>
                    {voWords}/{budget} kata
                  </span>
                )}
              </span>
              {f.multiline ? (
                <Textarea value={String(scene[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value as never)} />
              ) : (
                <Input value={String(scene[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value as never)} />
              )}
            </label>
          ))}
          {characters.length > 0 && (
            <fieldset className="space-y-1 text-sm md:col-span-2">
              <legend className="font-medium">Karakter di scene ini</legend>
              <div className="flex flex-wrap gap-3">
                {characters.map((c) => (
                  <label key={c.id} className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={scene.characterIds.includes(c.id)}
                      onChange={(e) =>
                        set('characterIds', e.target.checked ? [...scene.characterIds, c.id] : scene.characterIds.filter((x) => x !== c.id))
                      }
                    />
                    {c.name || c.id}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="md:col-span-2">
            <Button variant={scene.approved ? 'outline' : 'secondary'} size="sm" onClick={() => set('approved', !scene.approved)}>
              <CheckCircle2 /> {scene.approved ? 'Batalkan approve' : 'Approve scene'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
