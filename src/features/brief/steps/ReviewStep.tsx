import * as React from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, LevelBadge } from '@/components/common/Field';
import { LABELS } from '@/config/enums';
import { applicableFields, isFieldFilled } from '@/domain/completeness';
import { saveTemplate } from '@/data/templateRepo';
import { useAuthStore } from '@/stores/authStore';
import { getPath } from '@/lib/utils';
import { useBrands } from '@/features/brands/useBrands';
import { useBrief, useSetBrief } from '../fields';

const STEP_TITLES = ['Project & Platform', 'Produk', 'Audiens & Pesan', 'Strategi Kreatif', 'Gaya Visual', 'Karakter', 'Lokasi & Props', 'Audio & Output'];

const ENUM_LABELS: Record<string, Record<string, string>> = {
  'project.objective': LABELS.objective,
  'project.platforms': LABELS.platform,
  'project.scriptLanguage': LABELS.scriptLanguage,
  'product.type': LABELS.productType,
  'audience.gender': LABELS.gender,
  'audience.awareness': LABELS.awareness,
  'audience.speechStyle': LABELS.speechStyle,
  'strategy.angles': LABELS.angle,
  'strategy.hookStyles': LABELS.hookStyle,
  'visual.realism': LABELS.realism,
  'visual.style': LABELS.creativeStyle,
  'visual.tone': LABELS.tone,
  'visual.pacing': LABELS.pacing,
  'visual.grading': LABELS.grading,
  'visual.cameraStyles': LABELS.cameraStyle,
  'visual.lens': LABELS.lens,
  'visual.depthOfField': LABELS.dof,
  'visual.lighting': LABELS.lighting,
  'visual.dominantShots': LABELS.shot,
  'visual.transitions': LABELS.transition,
  'location.indoorOutdoor': LABELS.indoorOutdoor,
  'location.timeOfDay': LABELS.timeOfDay,
  'location.extras': LABELS.extras,
  'audio.voStyle': LABELS.voStyle,
  'output.variants': LABELS.variant,
  'output.promptLength': LABELS.promptLength,
  'output.flowMode': LABELS.flowMode,
};

function display(path: string, v: unknown, brandName?: string): string {
  if (path === 'project.brandId') return brandName ?? '';
  const map = ENUM_LABELS[path];
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? (map?.[x] ?? x) : typeof x === 'object' && x && 'url' in x ? String((x as { url?: string }).url ?? 'gambar lokal') : String(x)))
      .join(', ');
  }
  if (typeof v === 'string') return map?.[v] ?? v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  return '';
}

function SaveTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const brief = useBrief();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Simpan sebagai Brief Template</DialogTitle>
        </DialogHeader>
        <Field id="tpl-name" label="Nama template" level="W">
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Template promo kuliner" />
        </Field>
        <Field id="tpl-desc" label="Deskripsi">
          <Textarea id="tpl-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!name.trim()}
            loading={busy}
            onClick={async () => {
              if (!uid) return;
              setBusy(true);
              try {
                await saveTemplate(uid, { name: name.trim(), description: desc.trim(), brief });
                toast.success('Template disimpan. Pakai saat membuat project baru.');
                onOpenChange(false);
              } catch {
                toast.error('Gagal menyimpan template.');
              } finally {
                setBusy(false);
              }
            }}
          >
            Simpan template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewStep({ projectId }: { projectId: string }) {
  const brief = useBrief();
  const set = useSetBrief();
  const { brands } = useBrands();
  const [tplOpen, setTplOpen] = React.useState(false);
  const fields = applicableFields(brief);
  const brandName = brands.find((b) => b.id === brief.project.brandId)?.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Review — Ringkasan Brief</h2>
          <p className="text-sm text-muted-foreground">Inilah yang dikirim ke AI. Klik Edit untuk mengubah langkah terkait.</p>
        </div>
        <Button variant="outline" onClick={() => setTplOpen(true)}>
          <LayoutTemplate /> Simpan sebagai template
        </Button>
      </div>
      {STEP_TITLES.map((title, i) => {
        const step = i + 1;
        const rows = fields.filter((f) => f.step === step);
        return (
          <Card key={title}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>
                {step}. {title}
              </CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link to={`/projects/${projectId}/brief?step=${step}`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {step === 6 && (brief.characters.mode === 'no_people' || brief.characters.mode === 'hands_only') ? (
                <p className="text-sm">{LABELS.characterMode[brief.characters.mode]}</p>
              ) : (
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {rows
                    .filter((f) => f.path !== 'characters.list')
                    .map((f) => {
                      const filled = isFieldFilled(brief, f);
                      const v = display(f.path, getPath(brief, f.path), brandName);
                      return (
                        <div key={f.path} className="min-w-0">
                          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <LevelBadge level={f.level} /> {f.label}
                          </dt>
                          <dd className={filled ? 'break-words' : 'italic text-destructive/80'}>{filled ? v || '✓' : 'belum diisi'}</dd>
                        </div>
                      );
                    })}
                </dl>
              )}
            </CardContent>
          </Card>
        );
      })}
      <Card>
        <CardHeader>
          <CardTitle>Catatan tambahan untuk AI</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={brief.output.extraNotes ?? ''}
            onChange={(e) => set('output.extraNotes', e.target.value)}
            placeholder="Catatan bebas, mis. hindari warna merah karena identik dengan kompetitor."
            aria-label="Catatan tambahan untuk AI"
          />
        </CardContent>
      </Card>
      <SaveTemplateDialog open={tplOpen} onOpenChange={setTplOpen} />
    </div>
  );
}
