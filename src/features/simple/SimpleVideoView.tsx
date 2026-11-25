import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, Progress } from '@/components/ui/misc';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CopyButton } from '@/components/common/CopyButton';
import { ErrorState, LoadingState, PageHeader } from '@/components/common/states';
import { LABELS } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { deleteSimpleVideo, getSimpleVideo, saveSimpleVideo } from '@/data/simpleRepo';
import { finalizeClipPrompt, simpleAllText } from '@/domain/simpleVideo';
import { useAuthStore } from '@/stores/authStore';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useAiAction } from '@/features/shared/useAiAction';
import type { SimpleClip, SimpleVideo } from '@/types';
import { FixPanel } from './FixPanel';

function DoneBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ClipCard({ clip, index, usesAssets, onChange }: { clip: SimpleClip; index: number; usesAssets: boolean; onChange: (c: SimpleClip) => void }) {
  const [fixOpen, setFixOpen] = React.useState(false);
  return (
    <Card className={clip.done ? 'opacity-70' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Badge variant="muted">Klip {index + 1}</Badge>
          <span className="flex-1">{clip.title}</span>
          <Badge variant="outline">{clip.durationSec} dtk</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">{clip.prompt}</p>
        {clip.speech && <p className="text-sm text-muted-foreground">Ucapan: “{clip.speech}”</p>}
        {clip.editInstruction && (
          <div className="space-y-1 rounded-md border p-2 text-sm">
            <p className="font-medium">Instruksi edit Omni terakhir</p>
            <p className="whitespace-pre-wrap font-mono text-xs">{clip.editInstruction}</p>
            <CopyButton getText={() => clip.editInstruction ?? ''} label="Salin instruksi edit" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton getText={() => clip.prompt} label="Salin prompt" size="default" />
          <Button variant="ghost" size="sm" onClick={() => setFixOpen((o) => !o)} aria-expanded={fixOpen}>
            <Wand2 /> Hasil tidak sesuai?
          </Button>
          <div className="ml-auto">
            <DoneBox checked={clip.done} onChange={(done) => onChange({ ...clip, done })} label="Sudah dibuat di Flow" />
          </div>
        </div>
        {fixOpen && (
          <FixPanel
            prompt={clip.prompt}
            usesAssets={usesAssets}
            onEditInstruction={(editInstruction) => onChange({ ...clip, editInstruction })}
            onUsePrompt={(p) => {
              onChange({ ...clip, prompt: p, done: false });
              setFixOpen(false);
              toast.success('Prompt klip diganti. Salin lalu render ulang di Flow.');
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function SimpleVideoView() {
  const { id } = useParams();
  const uid = useAuthStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const run = useAiAction();
  const running = useAiStatusStore((s) => s.running);
  const [video, setVideo] = React.useState<SimpleVideo | null | undefined>(undefined);
  const [error, setError] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [redo, setRedo] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!uid || !id) return;
    setError(false);
    try {
      setVideo(await getSimpleVideo(uid, id));
    } catch {
      setError(true);
    }
  }, [uid, id]);
  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState description="Gagal memuat hasil." onRetry={load} />;
  if (video === undefined) return <LoadingState />;
  if (video === null) return <ErrorState description="Hasil tidak ditemukan atau sudah dihapus." />;

  const update = async (next: SimpleVideo) => {
    setVideo(next);
    if (!uid) return;
    try {
      setVideo(await saveSimpleVideo(uid, next));
    } catch {
      toast.error('Gagal menyimpan perubahan.');
    }
  };

  const regenerate = async () => {
    const v = await run('simple_video', (opts) => aiService.simpleVideo(video.input, opts));
    if (v) await update({ ...v, id: video.id, createdAt: video.createdAt });
  };

  const usesAssets = video.input.useAssets && video.assets.length > 0;
  const done = video.clips.filter((c) => c.done).length;
  const ratio = video.input.aspectRatio;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={video.title}
        description={video.summary}
        actions={
          <div className="flex flex-wrap gap-2">
            <CopyButton getText={() => simpleAllText(video)} label="Salin semua" />
            <Button variant="outline" size="sm" onClick={() => setRedo(true)} disabled={!!running} loading={running === 'simple_video'}>
              <RefreshCw /> Buat ulang
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDel(true)} aria-label="Hapus hasil">
              <Trash2 />
            </Button>
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{video.clips.reduce((a, c) => a + c.durationSec, 0)} dtk</Badge>
        <Badge variant="outline">{ratio}</Badge>
        <Badge variant="outline">{LABELS.simpleStyle[video.input.style]}</Badge>
        <Badge variant="outline">{LABELS.simpleSpeech[video.input.speech]}</Badge>
      </div>
      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ide awal</summary>
        <p className="mt-2 whitespace-pre-wrap">{video.input.idea}</p>
      </details>

      {usesAssets && (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 1 — Buat aset di Flow</CardTitle>
            <CardDescription>
              Salin setiap prompt, buat gambarnya di Flow, lalu simpan sebagai aset (Ingredients) dengan nama yang <strong>persis sama</strong>. Lampirkan aset ini saat membuat
              setiap klip agar wajah dan produk tidak berubah.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {video.assets.map((a, i) => (
              <div key={`${a.name}-${i}`} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="muted">{LABELS.simpleAssetKind[a.kind]}</Badge>
                  <span className="font-medium">Nama aset: {a.name}</span>
                </div>
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-mono text-xs">{a.imagePrompt}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton getText={() => a.imagePrompt} label="Salin prompt gambar" />
                  <CopyButton getText={() => a.name} label="Salin nama" variant="ghost" />
                  <div className="ml-auto">
                    <DoneBox
                      checked={a.done}
                      label="Sudah dibuat"
                      onChange={(d) => void update({ ...video, assets: video.assets.map((x, j) => (j === i ? { ...x, done: d } : x)) })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{usesAssets ? 'Langkah 2 — Buat klip berurutan' : 'Buat klip berurutan'}</h2>
          <span className="text-sm text-muted-foreground">
            {done}/{video.clips.length} selesai
          </span>
        </div>
        <Progress value={(done / Math.max(1, video.clips.length)) * 100} label="Klip selesai" />
        <p className="text-sm text-muted-foreground">
          Di Flow pilih model Omni, {usesAssets ? 'lampirkan aset yang disebut di prompt, ' : ''}tempel prompt, atur durasi sesuai klip, lalu generate. Coba 360p dulu untuk hemat
          kredit.
        </p>
      </div>
      {video.clips.map((c, i) => (
        <ClipCard
          key={c.id}
          clip={c}
          index={i}
          usesAssets={usesAssets}
          onChange={(next) =>
            void update({
              ...video,
              clips: video.clips.map((x) => (x.id === c.id ? { ...next, prompt: next.prompt === c.prompt ? c.prompt : finalizeClipPrompt(next.prompt, ratio) } : x)),
            })
          }
        />
      ))}

      {video.tips.length > 0 && (
        <Alert variant="info" title="Tips untuk video ini">
          <ul className="list-disc space-y-1 pl-5">
            {video.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Alert>
      )}
      {done === video.clips.length && (
        <Alert variant="success" title="Semua klip selesai">
          Unduh klipnya, lalu gabungkan di CapCut sesuai urutan. Lihat <Link to="/guide#capcut" className="underline">Panduan</Link>.
        </Alert>
      )}

      <ConfirmDialog
        open={redo}
        onOpenChange={setRedo}
        title="Buat ulang semua prompt?"
        description="Prompt dan status klip saat ini akan diganti hasil baru dari ide yang sama."
        confirmLabel="Buat ulang"
        onConfirm={regenerate}
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title="Hapus hasil ini?"
        destructive
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!uid) return;
          await deleteSimpleVideo(uid, video.id);
          toast.success('Hasil dihapus');
          navigate('/');
        }}
      />
    </div>
  );
}
