import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { ChipInput } from '@/components/common/ChipInput';
import { EmptyState } from '@/components/common/states';
import { newShortId } from '@/lib/ids';
import { countWords } from '@/lib/utils';
import type { BiblesDoc, CharacterBible, VisualBible } from '@/types';

const CHAR_FIELDS: { key: keyof CharacterBible; label: string }[] = [
  { key: 'name', label: 'Nama' },
  { key: 'genderPresentation', label: 'Gender presentation' },
  { key: 'approxAge', label: 'Usia' },
  { key: 'appearance', label: 'Penampilan' },
  { key: 'hair', label: 'Rambut / hijab' },
  { key: 'clothing', label: 'Pakaian' },
  { key: 'accessories', label: 'Aksesori' },
  { key: 'personality', label: 'Kepribadian' },
  { key: 'restrictions', label: 'Larangan' },
];

export function CharacterBibleEditor({ bibles, onChange }: { bibles: BiblesDoc; onChange: (b: BiblesDoc) => void }) {
  const setChar = (id: string, patch: Partial<CharacterBible>) =>
    onChange({ ...bibles, characters: bibles.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      {bibles.characters.length === 0 && <EmptyState title="Tanpa karakter" description="Project ini tidak memakai karakter (produk saja)." />}
      {bibles.characters.map((c) => {
        const words = countWords(c.masterDescriptionEn);
        return (
          <Card key={c.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>
                {c.name || c.id} <span className="font-mono text-xs text-muted-foreground">({c.id})</span>
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => onChange({ ...bibles, characters: bibles.characters.filter((x) => x.id !== c.id) })}>
                <Trash2 /> Hapus
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {CHAR_FIELDS.map((f) => (
                <label key={f.key} className="space-y-1 text-sm">
                  <span className="font-medium">{f.label}</span>
                  <Input value={String(c[f.key] ?? '')} onChange={(e) => setChar(c.id, { [f.key]: e.target.value })} />
                </label>
              ))}
              <label className="space-y-1 text-sm md:col-span-3">
                <span className="flex items-center gap-2 font-medium">
                  Character Master Description (EN)
                  <Badge variant={words >= 60 && words <= 120 ? 'success' : 'warning'}>{words} kata · target 60–120</Badge>
                </span>
                <Textarea className="min-h-28" value={c.masterDescriptionEn} onChange={(e) => setChar(c.id, { masterDescriptionEn: e.target.value })} />
                <span className="text-xs text-muted-foreground">Disisipkan LENGKAP ke setiap prompt scene yang memakai karakter ini.</span>
              </label>
              <div className="rounded-md bg-muted p-3 text-sm md:col-span-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Pratinjau</p>
                <p className="prose-prompt">{c.masterDescriptionEn || '—'}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Button
        variant="outline"
        onClick={() =>
          onChange({
            ...bibles,
            characters: [
              ...bibles.characters,
              {
                id: `char_${newShortId()}`,
                name: '',
                genderPresentation: '',
                approxAge: '',
                appearance: '',
                hair: '',
                clothing: '',
                accessories: '',
                personality: '',
                referenceImages: [],
                restrictions: '',
                masterDescriptionEn: '',
              },
            ],
          })
        }
      >
        <Plus /> Tambah karakter
      </Button>
    </div>
  );
}

const VIS_FIELDS: { key: Exclude<keyof VisualBible, 'palette'>; label: string; multiline?: boolean }[] = [
  { key: 'artDirection', label: 'Art direction', multiline: true },
  { key: 'lightingStyle', label: 'Gaya cahaya' },
  { key: 'cinematography', label: 'Sinematografi' },
  { key: 'environmentDesign', label: 'Desain lingkungan' },
  { key: 'lensPreference', label: 'Preferensi lensa' },
  { key: 'cameraMovementStyle', label: 'Gaya gerak kamera' },
  { key: 'productAppearanceEn', label: 'Tampilan produk (EN) — bentuk, warna, material, kemasan, logo', multiline: true },
  { key: 'styleLineEn', label: 'Style line (EN) — satu kalimat untuk semua prompt' },
  { key: 'restrictions', label: 'Larangan visual', multiline: true },
];

export function VisualBibleEditor({ bibles, onChange }: { bibles: BiblesDoc; onChange: (b: BiblesDoc) => void }) {
  const v = bibles.visual;
  const set = (patch: Partial<VisualBible>) => onChange({ ...bibles, visual: { ...v, ...patch } });
  return (
    <Card>
      <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
        {VIS_FIELDS.map((f) => (
          <label key={f.key} className={`space-y-1 text-sm ${f.multiline ? 'md:col-span-2' : ''}`}>
            <span className="font-medium">{f.label}</span>
            {f.multiline ? (
              <Textarea value={v[f.key]} onChange={(e) => set({ [f.key]: e.target.value })} />
            ) : (
              <Input value={v[f.key]} onChange={(e) => set({ [f.key]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">Palet warna</span>
          <ChipInput value={v.palette} onChange={(palette) => set({ palette })} max={8} placeholder="#16a34a" />
        </div>
      </CardContent>
    </Card>
  );
}
