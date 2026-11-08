import * as React from 'react';
import { BookMarked, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CopyButton } from '@/components/common/CopyButton';
import { Field } from '@/components/common/Field';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/common/states';
import { PromptSnippetSchema } from '@/schemas/project.schema';
import { createSnippet, deleteSnippet, listSnippets, updateSnippet, type SnippetInput } from '@/data/templateRepo';
import { useAuthStore } from '@/stores/authStore';
import type { PromptSnippet } from '@/types';
import { SNIPPET_CATEGORY_LABEL } from './categories';

const FormSchema = PromptSnippetSchema.pick({ title: true, category: true, text: true });

function SnippetDialog({ snippet, open, onOpenChange, onSaved }: { snippet: PromptSnippet | null; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const { register, handleSubmit, reset, formState } = useForm<SnippetInput>({ resolver: zodResolver(FormSchema) });
  React.useEffect(() => {
    if (open) reset(snippet ? { title: snippet.title, category: snippet.category, text: snippet.text } : { title: '', category: 'camera', text: '' });
  }, [open, snippet, reset]);
  const submit = handleSubmit(async (v) => {
    if (!uid) return;
    if (snippet) await updateSnippet(uid, snippet.id, v);
    else await createSnippet(uid, v);
    toast.success('Potongan disimpan');
    onSaved();
    onOpenChange(false);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{snippet ? 'Edit potongan' : 'Potongan prompt baru'}</DialogTitle>
          </DialogHeader>
          <Field id="sn-title" label="Judul" level="W" error={formState.errors.title?.message}>
            <Input id="sn-title" {...register('title')} placeholder="mis. Slow dolly-in close-up" />
          </Field>
          <Field id="sn-cat" label="Kategori">
            <Select id="sn-cat" {...register('category')}>
              {Object.entries(SNIPPET_CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="sn-text" label="Isi (Inggris)" level="W" error={formState.errors.text?.message}>
            <Textarea id="sn-text" className="prose-prompt min-h-32" {...register('text')} placeholder="Slow dolly-in from medium to close-up, 35mm lens, shallow depth of field." />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LibraryPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [items, setItems] = React.useState<PromptSnippet[] | null>(null);
  const [error, setError] = React.useState(false);
  const [edit, setEdit] = React.useState<PromptSnippet | null>(null);
  const [open, setOpen] = React.useState(false);
  const [del, setDel] = React.useState<PromptSnippet | null>(null);
  const [cat, setCat] = React.useState('');

  const load = React.useCallback(async () => {
    if (!uid) return;
    setError(false);
    try {
      setItems(await listSnippets(uid));
    } catch {
      setError(true);
    }
  }, [uid]);
  React.useEffect(() => {
    void load();
  }, [load]);

  const shown = (items ?? []).filter((s) => !cat || s.category === cat);

  return (
    <div>
      <PageHeader
        title="Prompt Library"
        description="Potongan prompt milik Anda (kamera, cahaya, gaya) untuk disisipkan ke prompt scene."
        actions={
          <Button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            <Plus /> Potongan baru
          </Button>
        }
      />
      <Select value={cat} onChange={(e) => setCat(e.target.value)} className="mb-4 w-48" aria-label="Filter kategori">
        <option value="">Semua kategori</option>
        {Object.entries(SNIPPET_CATEGORY_LABEL).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      {error ? (
        <ErrorState description="Gagal memuat library." onRetry={load} />
      ) : items === null ? (
        <LoadingState />
      ) : shown.length === 0 ? (
        <EmptyState icon={BookMarked} title="Library kosong" description="Simpan potongan yang sering dipakai, lalu sisipkan dari halaman Prompt." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-medium">{s.title}</p>
                  <Badge variant="secondary">{SNIPPET_CATEGORY_LABEL[s.category]}</Badge>
                </div>
                <p className="prose-prompt rounded-md bg-muted p-2">{s.text}</p>
                <div className="flex gap-1">
                  <CopyButton getText={() => s.text} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEdit(s);
                      setOpen(true);
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDel(s)}>
                    <Trash2 /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <SnippetDialog snippet={edit} open={open} onOpenChange={setOpen} onSaved={load} />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title={`Hapus "${del?.title}"?`}
        destructive
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!uid || !del) return;
          await deleteSnippet(uid, del.id);
          void load();
        }}
      />
    </div>
  );
}
