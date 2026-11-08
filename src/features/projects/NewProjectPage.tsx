import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, LayoutTemplate, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { Field } from '@/components/common/Field';
import { LoadingState, PageHeader } from '@/components/common/states';
import { BRIEF_PRESETS, createEmptyBrief } from '@/config/presets';
import { createProject } from '@/data/projectRepo';
import { deleteTemplate, listTemplates } from '@/data/templateRepo';
import { deepMerge, cn } from '@/lib/utils';
import type { Brief, BriefTemplate } from '@/types';
import { useBrands } from '@/features/brands/useBrands';

type Source = { kind: 'blank' } | { kind: 'preset'; id: string } | { kind: 'template'; id: string };

export default function NewProjectPage() {
  const { brands, loading, uid } = useBrands();
  const navigate = useNavigate();
  const [source, setSource] = React.useState<Source>({ kind: 'blank' });
  const [name, setName] = React.useState('');
  const [brandId, setBrandId] = React.useState('');
  const [templates, setTemplates] = React.useState<BriefTemplate[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (uid) void listTemplates(uid).then(setTemplates).catch(() => setTemplates([]));
  }, [uid]);

  React.useEffect(() => {
    if (!brandId && brands.length) setBrandId(brands[0].id);
  }, [brands, brandId]);

  const buildBrief = (): Brief => {
    const base = createEmptyBrief();
    if (source.kind === 'preset') {
      const p = BRIEF_PRESETS.find((x) => x.id === source.id);
      return p ? deepMerge(base, p.values) : base;
    }
    if (source.kind === 'template') {
      const t = templates.find((x) => x.id === source.id);
      return t ? structuredClone(t.brief) : base;
    }
    return base;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setBusy(true);
    try {
      const brief = buildBrief();
      const finalName = name.trim() || brief.project.name || 'Project baru';
      const p = await createProject(uid, {
        name: finalName,
        brandId,
        brief,
        presetId: source.kind === 'preset' ? source.id : undefined,
      });
      toast.success('Project dibuat');
      navigate(`/projects/${p.id}/brief?step=1`);
    } catch {
      toast.error('Gagal membuat project.');
    } finally {
      setBusy(false);
    }
  };

  const tile = (active: boolean) =>
    cn('rounded-lg border p-3 text-left transition-colors', active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted');

  if (loading) return <LoadingState />;

  return (
    <form onSubmit={submit}>
      <PageHeader title="Project baru" description="Pilih preset atau mulai dari brief kosong. Preset hanya mengisi default yang bisa diubah." />
      {brands.length === 0 && (
        <Alert
          variant="warning"
          title="Belum ada brand"
          className="mb-4"
          action={
            <Button asChild size="sm">
              <Link to="/brands/new">Buat brand</Link>
            </Button>
          }
        >
          Brand wajib dipilih di brief. Anda tetap bisa membuat project dan memilih brand nanti.
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Mulai dari
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Sumber brief">
              <button type="button" role="radio" aria-checked={source.kind === 'blank'} className={tile(source.kind === 'blank')} onClick={() => setSource({ kind: 'blank' })}>
                <p className="flex items-center gap-2 font-medium">
                  <FilePlus2 className="h-4 w-4" /> Brief kosong
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Isi semua dari awal.</p>
              </button>
              {BRIEF_PRESETS.map((p) => {
                const active = source.kind === 'preset' && source.id === p.id;
                return (
                  <button type="button" role="radio" aria-checked={active} key={p.id} className={tile(active)} onClick={() => setSource({ kind: 'preset', id: p.id })}>
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
          {templates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" /> Brief Template saya
                </CardTitle>
                <CardDescription>Template disimpan dari brief project sebelumnya.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {templates.map((t) => {
                  const active = source.kind === 'template' && source.id === t.id;
                  return (
                    <div key={t.id} className={cn(tile(active), 'flex items-start gap-2')}>
                      <button type="button" className="min-w-0 flex-1 text-left" aria-pressed={active} onClick={() => setSource({ kind: 'template', id: t.id })}>
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description || t.brief.product.name || 'Tanpa deskripsi'}</p>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Hapus template ${t.name}`}
                        onClick={async () => {
                          if (!uid) return;
                          await deleteTemplate(uid, t.id);
                          setTemplates((x) => x.filter((y) => y.id !== t.id));
                          if (active) setSource({ kind: 'blank' });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardContent className="space-y-4 pt-4">
            <Field id="np-name" label="Nama project" level="W" hint="Bisa diubah nanti di Langkah 1">
              <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Promo Kopi Susu Juli" />
            </Field>
            <Field id="np-brand" label="Brand" level="W">
              <Select id="np-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">— Pilih nanti —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" className="w-full" loading={busy}>
              Buat & isi brief
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
