import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Clapperboard, FolderKanban, Lightbulb, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Alert, Progress } from '@/components/ui/misc';
import { formatRelative } from '@/lib/format';
import { listSimpleVideos } from '@/data/simpleRepo';
import { useAuthStore } from '@/stores/authStore';
import { useVaultStore } from '@/vault/vaultStore';
import type { SimpleVideo } from '@/types';

const TOOLS = [
  { to: '/simple/video', icon: Clapperboard, title: 'Ide → Video Omni', body: 'Ketik ide, dapat prompt per klip siap tempel di Google Flow.' },
  { to: '/simple/ideas', icon: Lightbulb, title: 'Ide Konten', body: 'Bingung mau posting apa? Dapat 10 ide siap jadi video.' },
  { to: '/simple/fix', icon: Wand2, title: 'Perbaiki Hasil', body: 'Video tidak sesuai? Dapat prompt baru atau instruksi edit Omni.' },
  { to: '/guide', icon: BookOpen, title: 'Panduan', body: 'Cara memakai prompt di Flow sampai video jadi di CapCut.' },
  { to: '/dashboard', icon: FolderKanban, title: 'Studio lengkap', body: 'Untuk iklan detail: brief, naskah, storyboard, CapCut, posting.' },
] as const;

export default function SimpleHome() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { status, keys } = useVaultStore();
  const navigate = useNavigate();
  const [idea, setIdea] = React.useState('');
  const [recent, setRecent] = React.useState<SimpleVideo[] | null>(null);

  React.useEffect(() => {
    if (uid)
      void listSimpleVideos(uid, 12)
        .then(setRecent)
        .catch(() => setRecent([]));
  }, [uid]);

  const noKey = status === 'uninitialized' || keys.length === 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="page-title">Punya ide video?</h1>
        <p className="text-sm text-muted-foreground">Tulis saja seperti bercerita. AI mengubahnya menjadi prompt Gemini Omni per klip yang siap ditempel di Google Flow.</p>
        {noKey && (
          <Alert
            variant="info"
            title="Siapkan API key Gemini dulu (sekali saja, gratis)"
            action={
              <Button asChild size="sm">
                <Link to="/provider">Siapkan</Link>
              </Button>
            }
          >
            Key dipakai untuk semua fitur AI dan ikut di semua device bila memilih "Tersimpan di akun".
          </Alert>
        )}
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/simple/video?idea=${encodeURIComponent(idea.trim())}`);
          }}
        >
          <Textarea
            rows={3}
            value={idea}
            maxLength={1500}
            onChange={(e) => setIdea(e.target.value)}
            aria-label="Ide video"
            placeholder="mis. Anak kos kelaparan tengah malam, membuka kulkas kosong, lalu tersenyum menemukan mie instan terakhir."
          />
          <Button type="submit" disabled={idea.trim().length < 10}>
            <Sparkles /> Lanjut atur durasi & buat prompt
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Alat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ to, icon: Icon, title, body }) => (
            <Link key={to} to={to} className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/40">
                <CardContent className="flex h-full flex-col gap-2 pt-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">{title}</p>
                  <p className="flex-1 text-sm text-muted-foreground">{body}</p>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    Buka <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Karya terbaru</h2>
        {recent === null ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada. Tulis ide di atas untuk mulai.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {recent.map((v) => {
              const done = v.clips.filter((c) => c.done).length;
              return (
                <li key={v.id}>
                  <Link to={`/simple/video/${v.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.clips.length} klip · {v.input.aspectRatio} · {formatRelative(v.updatedAt)}
                      </p>
                    </div>
                    <div className="w-24">
                      <Progress value={(done / Math.max(1, v.clips.length)) * 100} label="Klip selesai" />
                    </div>
                    <span className="w-10 text-right text-xs text-muted-foreground">
                      {done}/{v.clips.length}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
