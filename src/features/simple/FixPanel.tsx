import * as React from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { CopyButton } from '@/components/common/CopyButton';
import { MultiToggle, optionsFrom } from '@/components/common/ToggleGroup';
import { LABELS } from '@/config/enums';
import { aiService } from '@/ai/aiService';
import { useAiStatusStore } from '@/stores/aiStatusStore';
import { useAiAction } from '@/features/shared/useAiAction';
import type { FlowIssue, SimpleFixOutput } from '@/types';

/** Perbaiki hasil Flow (v1.7): pilih masalah → prompt baru + instruksi edit Omni. */
export function FixPanel({
  prompt,
  usesAssets,
  onUsePrompt,
  onEditInstruction,
}: {
  prompt: string;
  usesAssets?: boolean;
  onUsePrompt?: (prompt: string) => void;
  onEditInstruction?: (text: string) => void;
}) {
  const run = useAiAction();
  const running = useAiStatusStore((s) => s.running);
  const [issues, setIssues] = React.useState<FlowIssue[]>([]);
  const [note, setNote] = React.useState('');
  const [out, setOut] = React.useState<SimpleFixOutput | null>(null);

  const canFix = prompt.trim().length > 0 && (issues.length > 0 || note.trim().length > 0);

  const fix = async () => {
    const r = await run('simple_fix', (opts) =>
      aiService.simpleFix({ prompt, issues: issues.length ? issues : ['other'], note, usesAssets }, opts),
    );
    if (r) {
      setOut(r);
      onEditInstruction?.(r.editInstruction);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Apa yang salah di videonya?</p>
      <MultiToggle options={optionsFrom(LABELS.flowIssue)} value={issues} onChange={setIssues} ariaLabel="Masalah hasil Flow" />
      <Textarea
        rows={2}
        value={note}
        maxLength={600}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan (opsional), mis. tangannya jadi enam jari saat menuang kopi"
        aria-label="Catatan masalah"
      />
      <Button size="sm" onClick={fix} disabled={!canFix || !!running} loading={running === 'simple_fix'}>
        <Wand2 /> Perbaiki
      </Button>
      {out && (
        <div className="space-y-3 border-t pt-3">
          {out.changes.length > 0 && (
            <ul className="list-disc pl-5 text-muted-foreground">
              {out.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          <div className="space-y-1">
            <p className="font-medium">Pilihan 1 — Render ulang dengan prompt baru</p>
            <p className="whitespace-pre-wrap rounded bg-card p-2 font-mono text-xs">{out.prompt}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton getText={() => out.prompt} label="Salin prompt baru" />
              {onUsePrompt && (
                <Button size="sm" variant="secondary" onClick={() => onUsePrompt(out.prompt)}>
                  Pakai prompt ini
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Pilihan 2 — Edit klip yang sudah jadi (Omni)</p>
            <p className="text-xs text-muted-foreground">Di Flow, buka klipnya, pilih edit, lalu tempel instruksi ini. Lebih hemat bila klip hampir benar.</p>
            <p className="whitespace-pre-wrap rounded bg-card p-2 font-mono text-xs">{out.editInstruction}</p>
            <CopyButton getText={() => out.editInstruction} label="Salin instruksi edit" />
          </div>
        </div>
      )}
    </div>
  );
}
