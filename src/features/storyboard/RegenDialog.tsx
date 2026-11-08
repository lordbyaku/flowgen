import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { toast } from 'sonner';
import { aiService } from '@/ai/aiService';
import { useAiAction } from '@/features/shared/useAiAction';
import { useProjectStore } from '@/stores/projectStore';
import type { Scene } from '@/types';

/** Dialog regenerasi satu scene (satu panggilan kecil). Scene lain tidak disentuh. */
export function RegenDialog({ scene, onOpenChange }: { scene: Scene | null; onOpenChange: (v: boolean) => void }) {
  const [instruction, setInstruction] = React.useState('');
  const run = useAiAction();
  React.useEffect(() => {
    if (!scene) setInstruction('');
  }, [scene]);

  const submit = async () => {
    const st = useProjectStore.getState();
    const project = st.project;
    const scenes = st.docs.scenes?.items ?? [];
    const bibles = st.docs.bibles;
    if (!project || !scene || !bibles) {
      toast.error('Storyboard dan Bible diperlukan untuk regenerasi.');
      return;
    }
    onOpenChange(false);
    const before = scenes.reduce((a, s) => a + s.durationSec, 0);
    const res = await run('scene_regen', (opts) =>
      aiService.regenerateScene({ brief: project.brief, scenes, bibles }, scene.id, instruction, opts),
    );
    if (!res) return;
    // Ambil hasil untuk scene ini saja dan gabungkan ke state TERKINI (scene lain tidak berubah).
    const fresh = res.find((s) => s.id === scene.id);
    if (!fresh) return;
    useProjectStore.getState().updateScenes((cur) => cur.map((s) => (s.id === scene.id ? fresh : s)));
    const after = before - scene.durationSec + fresh.durationSec;
    const target = project.brief.project.durationSec;
    if (after !== target) toast.warning(`Durasi scene berubah. Total sekarang ${after} dtk (target ${target}). Sesuaikan manual.`);
    else toast.success('Scene diregenerasi');
  };

  return (
    <Dialog open={!!scene} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate: {scene?.title}</DialogTitle>
          <DialogDescription>Hanya scene ini yang dibuat ulang. Versi lama disimpan di riwayat (maks 5).</DialogDescription>
        </DialogHeader>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Instruksi tambahan (opsional)</span>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="mis. Buat lebih dramatis, kamera low angle, tambahkan pelanggan tersenyum"
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit}>Regenerate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
