import { Link } from 'react-router-dom';
import { Megaphone, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/misc';
import { AiErrorPanel } from '@/components/common/AiStatus';
import { CopyButton } from '@/components/common/CopyButton';
import { CostHint } from '@/components/common/CostHint';
import { EmptyState } from '@/components/common/states';
import { LABELS } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { getBrand } from '@/data/brandRepo';
import { captionWithHashtags, publishText } from '@/domain/publish';
import { useAiAction } from '@/features/shared/useAiAction';
import { useAuthStore } from '@/stores/authStore';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useProjectStore } from '@/stores/projectStore';
import type { PublishPlatform } from '@/types';

function PlatformPack({ p }: { p: PublishPlatform }) {
  return (
    <div className="space-y-3">
      {p.title && (
        <div className="flex items-start gap-2 rounded-md border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Judul</p>
            <p className="font-medium">{p.title}</p>
          </div>
          <CopyButton label="Salin" getText={() => p.title} />
        </div>
      )}
      {p.captions.map((c, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Caption {i + 1}</Badge>
            {c.style && <span className="text-xs text-muted-foreground">{c.style}</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm">{c.text}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Salin caption + hashtag" getText={() => captionWithHashtags(c.text, p.hashtags)} />
            <CopyButton label="Caption saja" variant="ghost" getText={() => c.text} />
          </div>
        </div>
      ))}
      {p.hashtags.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Hashtag ({p.hashtags.length})</p>
            <CopyButton label="Salin" getText={() => p.hashtags.join(' ')} />
          </div>
          <p className="text-sm text-primary">{p.hashtags.join(' ')}</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {p.coverTexts.length > 0 && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Teks cover / thumbnail</p>
            <ul className="space-y-1">
              {p.coverTexts.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 font-semibold">“{t}”</span>
                  <CopyButton label="Salin" getText={() => t} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.pinnedComment && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Komentar pin</p>
              <CopyButton label="Salin" getText={() => p.pinnedComment} />
            </div>
            <p className="text-sm">{p.pinnedComment}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublishPage() {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const setDoc = useProjectStore((s) => s.setDoc);
  const uid = useAuthStore((s) => s.user?.uid);
  const running = useAiStatusStore((s) => s.running);
  const run = useAiAction();
  const pack = docs.publish;
  const scenes = docs.scenes?.items ?? [];
  const concept = docs.creative?.concepts.find((c) => c.id === docs.creative?.selectedConceptId) ?? null;

  const generate = async () => {
    const brand = uid && project.brief.project.brandId ? await getBrand(uid, project.brief.project.brandId) : null;
    const r = await run('publish_pack', (opts) =>
      aiService.generatePublishPack({ brief: project.brief, brand, concept, script: docs.script, scenes }, opts),
    );
    if (!r) return;
    setDoc('publish', r);
    toast.success('Paket posting dibuat');
  };

  if (!docs.script)
    return (
      <EmptyState
        icon={Megaphone}
        title="Naskah belum ada"
        description="Paket posting disusun dari naskah, konsep, dan teks overlay."
        action={
          <Button asChild>
            <Link to={`/projects/${project.id}/script`}>Ke Naskah</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Posting</h2>
          <p className="text-sm text-muted-foreground">Caption, hashtag, judul, teks cover, dan komentar pin per platform. Salin saat mengunggah.</p>
          <CostHint est={aiService.estimate('publish', { brief: project.brief, concept, scenes, script: docs.script })} />
        </div>
        <div className="flex flex-wrap gap-2">
          {pack && <CopyButton label="Salin semua" getText={() => publishText(pack)} />}
          <Button onClick={generate} disabled={!!running} loading={running === 'publish_pack'} variant={pack ? 'outline' : 'default'}>
            {pack ? <RefreshCw /> : <Sparkles />} {pack ? 'Buat ulang' : 'Buat paket posting'}
          </Button>
        </div>
      </div>
      <AiErrorPanel onRetry={generate} />

      {pack ? (
        <Card>
          <CardHeader>
            <CardTitle>Paket caption</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={pack.platforms[0]?.platform}>
              {pack.platforms.length > 1 && (
                <TabsList className="flex-wrap">
                  {pack.platforms.map((p) => (
                    <TabsTrigger key={p.platform} value={p.platform}>
                      {LABELS.platform[p.platform]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}
              {pack.platforms.map((p) => (
                <TabsContent key={p.platform} value={p.platform} className={pack.platforms.length > 1 ? undefined : 'mt-0'}>
                  <PlatformPack p={p} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="info" title="Belum ada paket posting">
          Satu panggilan AI untuk semua platform di brief ({project.brief.project.platforms.map((p) => LABELS.platform[p]).join(', ') || 'TikTok'}).
        </Alert>
      )}

      {pack && pack.postingTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tips posting</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {pack.postingTips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
