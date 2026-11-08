import * as React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/states';
import { listSnippets } from '@/data/templateRepo';
import { useAuthStore } from '@/stores/authStore';
import type { PromptSnippet } from '@/types';
import { SNIPPET_CATEGORY_LABEL } from '@/features/library/categories';

/** Pilih potongan dari Prompt Library untuk disisipkan ke prompt. */
export function SnippetPicker({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (s: PromptSnippet) => void }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const [items, setItems] = React.useState<PromptSnippet[] | null>(null);
  React.useEffect(() => {
    if (open && uid) void listSnippets(uid).then(setItems).catch(() => setItems([]));
  }, [open, uid]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sisipkan dari Prompt Library</DialogTitle>
          <DialogDescription>Potongan ditambahkan di akhir prompt Standard.</DialogDescription>
        </DialogHeader>
        {items === null ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Library masih kosong.{' '}
            <Link className="text-primary underline" to="/library">
              Buat potongan
            </Link>
          </p>
        ) : (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full rounded-md border p-3 text-left hover:bg-muted"
                  onClick={() => {
                    onPick(s);
                    onOpenChange(false);
                  }}
                >
                  <p className="flex items-center gap-2 font-medium">
                    {s.title} <Badge variant="secondary">{SNIPPET_CATEGORY_LABEL[s.category]}</Badge>
                  </p>
                  <p className="prose-prompt mt-1 line-clamp-2 text-xs text-muted-foreground">{s.text}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
