import * as React from 'react';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_REF_IMAGES } from '@/config/constants';
import { newShortId } from '@/lib/ids';
import type { ReferenceImage } from '@/types';
import { previewStore } from '@/vault/vaultStore';

function LocalThumb({ localId }: { localId: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let revoked: string | null = null;
    void previewStore.getUrl(localId).then((u) => {
      revoked = u;
      setUrl(u);
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [localId]);
  if (!url) return <div className="grid h-16 w-16 place-items-center rounded bg-muted text-[10px] text-muted-foreground">tidak ada</div>;
  return <img src={url} alt="Pratinjau referensi" className="h-16 w-16 rounded object-cover" />;
}

/** Gambar referensi: URL atau file lokal (pratinjau di IndexedDB, tidak diunggah). */
export function ReferenceImages({ value, onChange }: { value: ReferenceImage[]; onChange: (v: ReferenceImage[]) => void }) {
  const [url, setUrl] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const full = value.length >= MAX_REF_IMAGES;

  const addUrl = () => {
    try {
      const u = new URL(url.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      onChange([...value, { id: newShortId(), kind: 'url', url: u.toString() }]);
      setUrl('');
    } catch {
      toast.error('URL tidak valid (harus http/https).');
    }
  };

  const addFile = async (f: File) => {
    const r = await previewStore.save(f);
    if (!r.ok) return toast.error(r.message);
    onChange([...value, { id: newShortId(), kind: 'local', localId: r.id, note: f.name }]);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((img) => (
            <li key={img.id} className="flex items-center gap-2 rounded-md border p-2">
              {img.kind === 'local' && img.localId ? (
                <LocalThumb localId={img.localId} />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded bg-muted">
                  <Link2 className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-xs text-muted-foreground">{img.kind === 'url' ? img.url : 'File lokal (hanya di browser ini)'}</p>
                <Input
                  value={img.note ?? ''}
                  placeholder="Catatan: apa yang ditiru dari gambar ini"
                  onChange={(e) => onChange(value.map((x) => (x.id === img.id ? { ...x, note: e.target.value } : x)))}
                  aria-label="Catatan gambar"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Hapus gambar"
                onClick={() => {
                  if (img.localId) void previewStore.remove(img.localId);
                  onChange(value.filter((x) => x.id !== img.id));
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          disabled={full}
          placeholder={full ? `Maksimal ${MAX_REF_IMAGES} gambar` : 'Tempel URL gambar https://…'}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          aria-label="URL gambar referensi"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={full || !url.trim()} onClick={addUrl}>
            <Link2 /> Tambah URL
          </Button>
          <Button type="button" variant="outline" disabled={full} onClick={() => fileRef.current?.click()}>
            <ImagePlus /> File
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length}/{MAX_REF_IMAGES} · File lokal maks 3 MB, tidak diunggah ke cloud penyimpanan; bila opsi di Langkah 8 aktif, file dibaca Gemini saat membuat Bible. Gambar URL hanya dicatat sebagai teks.
      </p>
    </div>
  );
}
