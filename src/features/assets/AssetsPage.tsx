import * as React from 'react';
import { Link } from 'react-router-dom';
import { Box, CheckCircle2, Download, Link2, MapPin, RefreshCw, RotateCcw, Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Alert, Progress } from '@/components/ui/misc';
import { CopyButton } from '@/components/common/CopyButton';
import { EmptyState } from '@/components/common/states';
import { LABELS } from '@/config/enums';
import { assetsProgress, assetsText, buildAssets, buildCharacterPrompts, buildLocationPrompt, buildProductPrompt, characterRefOf } from '@/domain/assets';
import { useProjectStore } from '@/stores/projectStore';
import { previewStore } from '@/vault/vaultStore';
import { cn } from '@/lib/utils';
import type { AssetsDoc, ReferenceImage } from '@/types';

/** Gambar referensi dari brief: unduh (file lokal) atau buka (URL) untuk diunggah ke Flow. */
function RefImages({ images }: { images: ReferenceImage[] }) {
  if (images.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Gambar referensi dari brief — unggah ke Flow sebagai acuan:</p>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) =>
          img.kind === 'local' && img.localId ? (
            <Button
              key={img.id}
              size="sm"
              variant="outline"
              onClick={async () => {
                const url = await previewStore.getUrl(img.localId!);
                if (!url) return toast.error('Gambar tidak ditemukan di browser ini.');
                const a = document.createElement('a');
                a.href = url;
                a.download = img.note || `referensi-${i + 1}.jpg`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download /> {img.note || `Gambar ${i + 1}`}
            </Button>
          ) : img.url ? (
            <Button key={img.id} size="sm" variant="outline" asChild>
              <a href={img.url} target="_blank" rel="noreferrer noopener">
                <Link2 /> {img.note || `Gambar ${i + 1}`}
              </a>
            </Button>
          ) : null,
        )}
      </div>
    </div>
  );
}

function PromptBox({
  label,
  value,
  onChange,
  onReset,
  edited,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onReset?: () => void;
  edited?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex gap-1">
          {edited && onReset && (
            <Button size="sm" variant="ghost" onClick={onReset} title="Kembalikan ke prompt otomatis dari Bible">
              <RotateCcw /> Otomatis
            </Button>
          )}
          <CopyButton label="Salin" getText={() => value} />
        </div>
      </div>
      <Textarea className="prose-prompt min-h-28 text-xs" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
}

function DoneToggle({ done, onChange }: { done: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1 text-sm', done && 'border-success/50 bg-success/10 text-success')}>
      <input type="checkbox" checked={done} onChange={(e) => onChange(e.target.checked)} />
      {done ? 'Sudah dibuat di Flow' : 'Tandai sudah dibuat di Flow'}
    </label>
  );
}

function FlowNameField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block space-y-1 text-sm">
      <span className="font-medium">Nama di Flow</span>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Nama persis seperti di Flow" />
      <span className="text-xs text-muted-foreground">Prompt scene menyebut nama ini apa adanya. Samakan dengan nama aset di Flow.</span>
    </label>
  );
}

export default function AssetsPage() {
  const project = useProjectStore((s) => s.project)!;
  const bibles = useProjectStore((s) => s.docs.bibles);
  const scenesDoc = useProjectStore((s) => s.docs.scenes);
  const assets = useProjectStore((s) => s.docs.assets);
  const setDoc = useProjectStore((s) => s.setDoc);
  const patchBrief = useProjectStore((s) => s.updateBrief);
  const brief = project.brief;
  const scenes = React.useMemo(() => scenesDoc?.items ?? [], [scenesDoc]);
  const mode = characterRefOf(brief);

  const rebuild = React.useCallback(
    (prev: AssetsDoc | null) => {
      if (!bibles) return;
      setDoc('assets', buildAssets(brief, bibles, scenes, prev, Date.now()));
    },
    [bibles, brief, scenes, setDoc],
  );

  // Pertama kali dibuka: susun prompt aset otomatis dari Bible (tanpa panggilan AI).
  React.useEffect(() => {
    if (bibles && !assets) rebuild(null);
  }, [bibles, assets, rebuild]);

  if (!bibles) {
    return (
      <EmptyState
        icon={UserRound}
        title="Character & Visual Bible belum ada"
        description="Prompt karakter dan tempat disusun dari Bible. Buat naskah & storyboard dulu."
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/script`}>Ke Naskah</Link>
          </Button>
        }
      />
    );
  }
  if (!assets) return null;

  const update = (patch: Partial<AssetsDoc>) => setDoc('assets', { ...assets, ...patch, updatedAt: Date.now() });
  const prog = assetsProgress(assets);
  const briefChar = (id: string) => {
    const m = /^char_(\d+)$/.exec(id);
    return m ? brief.characters.list[Number(m[1]) - 1] : undefined;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Karakter & Tempat</h2>
          <p className="text-sm text-muted-foreground">Buat aset ini DULU di Google Flow, baru prompt scene (story). Urutan: karakter → tempat → produk.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="Salin semua prompt aset" getText={() => assetsText(assets)} />
          <Button variant="outline" size="sm" onClick={() => rebuild(assets)} title="Susun ulang dari Bible; nama di Flow, status, dan prompt yang sudah diedit tetap">
            <RefreshCw /> Perbarui dari Bible
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex justify-between text-sm">
            <span>Aset dibuat di Flow</span>
            <span className="font-semibold">
              {prog.done}/{prog.total}
            </span>
          </div>
          <Progress value={prog.total ? (100 * prog.done) / prog.total : 0} label="Aset dibuat di Flow" />
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Untuk tiap karakter: buat/unggah gambar referensi di Flow memakai prompt di bawah (atau gambar dari brief), lalu simpan sebagai karakter dengan nama yang sama.</li>
            <li>Lakukan hal yang sama untuk tempat dan produk.</li>
            <li>
              Buka{' '}
              <Link to={`/projects/${project.id}/prompts`} className="text-primary underline">
                Prompt
              </Link>{' '}
              dan buat prompt scene: prompt akan menyebut nama aset, bukan deskripsi panjang.
            </li>
          </ol>
        </CardContent>
      </Card>

      {mode !== 'flow_assets' && (
        <Alert
          variant="warning"
          title="Prompt scene masih memakai deskripsi lengkap"
          action={
            <Button size="sm" onClick={() => patchBrief((b) => ({ ...b, output: { ...b.output, characterRef: 'flow_assets' } }))}>
              Pakai nama aset Flow
            </Button>
          }
        >
          Mode saat ini: {LABELS.characterRef.description}. Aktifkan "{LABELS.characterRef.flow_assets}" agar prompt scene lebih pendek dan memakai karakter yang sudah dibuat di Flow. Setelah itu buat ulang prompt scene.
        </Alert>
      )}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <UserRound className="h-4 w-4" /> 1. Karakter ({assets.characters.length})
        </h3>
        {assets.characters.length === 0 && <p className="text-sm text-muted-foreground">Tanpa karakter (produk saja).</p>}
        {assets.characters.map((c) => {
          const bible = bibles.characters.find((b) => b.id === c.id);
          const setChar = (patch: Partial<typeof c>) => update({ characters: assets.characters.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) });
          return (
            <Card key={c.id} className={cn(c.done && 'border-success/50')}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  {c.name || c.id}
                  {c.done && (
                    <Badge variant="success">
                      <CheckCircle2 /> Siap
                    </Badge>
                  )}
                </CardTitle>
                <DoneToggle done={c.done} onChange={(done) => setChar({ done })} />
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="space-y-3">
                  <FlowNameField id={`fn-${c.id}`} value={c.flowName} onChange={(flowName) => setChar({ flowName })} />
                  <RefImages images={briefChar(c.id)?.referenceImages ?? bible?.referenceImages ?? []} />
                </div>
                <div className="space-y-3">
                  <PromptBox
                    label="Prompt gambar referensi — seluruh badan"
                    value={c.fullBodyPrompt}
                    edited={c.edited}
                    onChange={(fullBodyPrompt) => setChar({ fullBodyPrompt, edited: true })}
                    onReset={bible ? () => setChar({ ...buildCharacterPrompts(bible, bibles.visual), edited: false }) : undefined}
                  />
                  <PromptBox
                    label="Prompt gambar referensi — close-up wajah"
                    value={c.closeUpPrompt}
                    edited={c.edited}
                    onChange={(closeUpPrompt) => setChar({ closeUpPrompt, edited: true })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <MapPin className="h-4 w-4" /> 2. Tempat ({assets.locations.length})
        </h3>
        {assets.locations.map((l) => {
          const setLoc = (patch: Partial<typeof l>) => update({ locations: assets.locations.map((x) => (x.id === l.id ? { ...x, ...patch } : x)) });
          return (
            <Card key={l.id} className={cn(l.done && 'border-success/50')}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle>{l.name}</CardTitle>
                <DoneToggle done={l.done} onChange={(done) => setLoc({ done })} />
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="space-y-3">
                  <FlowNameField id={`fn-${l.id}`} value={l.flowName} onChange={(flowName) => setLoc({ flowName })} />
                  <p className="text-xs text-muted-foreground">Dipakai scene dengan lingkungan: {l.description}</p>
                </div>
                <PromptBox
                  label="Prompt gambar referensi tempat (tanpa orang)"
                  value={l.prompt}
                  edited={l.edited}
                  onChange={(prompt) => setLoc({ prompt, edited: true })}
                  onReset={() => setLoc({ prompt: buildLocationPrompt(l.description, brief, bibles.visual), edited: false })}
                />
              </CardContent>
            </Card>
          );
        })}
      </section>

      {assets.product && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Box className="h-4 w-4" /> 3. Produk
          </h3>
          <Card className={cn(assets.product.done && 'border-success/50')}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle>{assets.product.name}</CardTitle>
              <DoneToggle done={assets.product.done} onChange={(done) => update({ product: { ...assets.product!, done } })} />
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="space-y-3">
                <FlowNameField id="fn-product" value={assets.product.flowName} onChange={(flowName) => update({ product: { ...assets.product!, flowName } })} />
                <RefImages images={brief.product.referenceImages} />
              </div>
              <PromptBox
                label="Prompt gambar referensi produk"
                value={assets.product.prompt}
                edited={assets.product.edited}
                onChange={(prompt) => update({ product: { ...assets.product!, prompt, edited: true } })}
                onReset={() => update({ product: { ...assets.product!, prompt: buildProductPrompt(brief.product.name, bibles.visual, brief), edited: false } })}
              />
            </CardContent>
          </Card>
        </section>
      )}

      <div className="flex justify-end">
        <Button asChild>
          <Link to={`/projects/${project.id}/prompts`}>
            <Sparkles /> Lanjut ke prompt scene
          </Link>
        </Button>
      </div>
    </div>
  );
}
