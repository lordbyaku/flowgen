import * as React from 'react';
import { BookUser, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/common/Field';
import { SingleToggle, optionsFrom } from '@/components/common/ToggleGroup';
import { LoadingState } from '@/components/common/states';
import { CHARACTER_ROLES, LABELS } from '@/config/enums';
import { MAX_CHARACTERS } from '@/config/constants';
import { createCharacter } from '@/config/presets';
import { listSavedCharacterBibles } from '@/data/projectRepo';
import { useAuthStore } from '@/stores/authStore';
import type { CharacterBible, CharacterInput } from '@/types';
import { BoolField, StepSection, TextField, useBrief, useSetBrief } from '../fields';
import { ReferenceImages } from '../ReferenceImages';

function bibleToInput(b: CharacterBible): Partial<CharacterInput> {
  return {
    nickname: b.name,
    genderPresentation: b.genderPresentation,
    approxAge: b.approxAge,
    hair: b.hair,
    clothing: b.clothing,
    accessories: b.accessories,
    personality: b.personality,
    restrictions: b.restrictions,
    expression: b.appearance,
    fromBibleId: b.id,
  };
}

function SavedBiblePicker({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (b: CharacterBible) => void }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const [items, setItems] = React.useState<{ projectName: string; bible: CharacterBible }[] | null>(null);
  React.useEffect(() => {
    if (open && uid && items === null) void listSavedCharacterBibles(uid).then(setItems).catch(() => setItems([]));
  }, [open, uid, items]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pakai Character Bible tersimpan</DialogTitle>
          <DialogDescription>Karakter dari project Anda sebelumnya. Data disalin ke brief ini dan tetap bisa diubah.</DialogDescription>
        </DialogHeader>
        {items === null ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada Character Bible di project lain.</p>
        ) : (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {items.map(({ projectName, bible }) => (
              <li key={`${projectName}-${bible.id}`}>
                <button
                  type="button"
                  className="w-full rounded-md border p-3 text-left hover:bg-muted"
                  onClick={() => {
                    onPick(bible);
                    onOpenChange(false);
                  }}
                >
                  <p className="font-medium">
                    {bible.name} <span className="text-xs text-muted-foreground">· {projectName}</span>
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{bible.masterDescriptionEn}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CharacterCard({ index, onRemove }: { index: number; onRemove?: () => void }) {
  const brief = useBrief();
  const set = useSetBrief();
  const c = brief.characters.list[index];
  const base = `characters.list.${index}`;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{c.nickname || `Karakter ${index + 1}`}</CardTitle>
        {onRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 /> Hapus
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField path={`${base}.nickname`} label="Nama panggilan" level="W" placeholder="mis. Bu Sari" />
        <div className="space-y-1.5">
          <TextField path={`${base}.role`} label="Peran" level="W" placeholder="mis. Pemilik warung" />
          <div className="flex flex-wrap gap-1">
            {CHARACTER_ROLES.map((r) => (
              <button key={r} type="button" className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted" onClick={() => set(`${base}.role`, r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <TextField path={`${base}.genderPresentation`} label="Gender presentation" level="W" placeholder="mis. Perempuan" />
        <TextField path={`${base}.approxAge`} label="Perkiraan usia" level="W" placeholder="mis. Sekitar 35 tahun" />
        <TextField path={`${base}.ethnicLook`} label="Penampilan etnis" level="P" placeholder="typical Indonesian" hint="Default: tampilan khas Indonesia" />
        <TextField path={`${base}.skinTone`} label="Warna kulit" level="P" placeholder="mis. Sawo matang" />
        <TextField path={`${base}.faceShape`} label="Bentuk wajah" level="P" placeholder="mis. Oval, pipi penuh" />
        <TextField path={`${base}.hair`} label="Rambut (model, warna, panjang) atau hijab" level="P" placeholder="mis. Hijab segi empat warna krem" />
        <BoolField path={`${base}.hijab`} label="Berhijab" />
        <BoolField path={`${base}.facialHair`} label="Janggut/kumis" />
        <TextField path={`${base}.build`} label="Postur tubuh" level="O" placeholder="mis. Sedang, tinggi 160 cm" />
        <TextField path={`${base}.clothing`} label="Pakaian (model dan warna)" level="W" placeholder="mis. Kemeja batik biru tua lengan pendek, celemek hijau" hint="Warna pakaian dijaga konsisten di setiap klip" />
        <TextField path={`${base}.accessories`} label="Aksesori" level="O" placeholder="mis. Jam tangan cokelat" />
        <TextField path={`${base}.expression`} label="Ekspresi dominan dan kepribadian" level="P" placeholder="mis. Ramah, ceria, cekatan" />
        <TextField path={`${base}.relationToProduct`} label="Hubungan dengan produk" level="P" placeholder="mis. Memakai aplikasi setiap hari" />
        <TextField path={`${base}.restrictions`} label="Larangan visual" level="O" placeholder="mis. Tanpa tato, tanpa rokok" />
        <Field label="Gambar referensi karakter" level="P" className="md:col-span-2">
          <ReferenceImages value={c.referenceImages} onChange={(v) => set(`${base}.referenceImages`, v)} />
        </Field>
      </CardContent>
    </Card>
  );
}

export function Step6Characters() {
  const brief = useBrief();
  const set = useSetBrief();
  const [pick, setPick] = React.useState(false);
  const { mode, list } = brief.characters;
  const usesPeople = mode === 'single' || mode === 'multiple';
  const max = mode === 'multiple' ? MAX_CHARACTERS : 1;

  const setMode = (m: typeof mode) => {
    set('characters.mode', m);
    if ((m === 'single' || m === 'multiple') && list.length === 0) set('characters.list', [createCharacter()]);
    if (m === 'single' && list.length > 1) set('characters.list', list.slice(0, 1));
  };

  return (
    <div className="space-y-5">
      <StepSection title="Langkah 6 — Karakter" description="Character Master Description dibuat dari data ini dan disisipkan lengkap di setiap prompt.">
        <Field label="Mode karakter" className="md:col-span-2">
          <SingleToggle options={optionsFrom(LABELS.characterMode)} value={mode} clearable={false} onChange={(v) => v && setMode(v)} ariaLabel="Mode karakter" />
        </Field>
      </StepSection>
      {usesPeople ? (
        <>
          {list.map((c, i) => (
            <CharacterCard key={c.id} index={i} onRemove={list.length > 1 ? () => set('characters.list', list.filter((_, j) => j !== i)) : undefined} />
          ))}
          <div className="flex flex-wrap gap-2">
            {list.length < max && (
              <Button variant="outline" onClick={() => set('characters.list', [...list, createCharacter()])}>
                <Plus /> Tambah karakter
              </Button>
            )}
            <Button variant="outline" onClick={() => setPick(true)}>
              <BookUser /> Pakai dari Character Bible tersimpan
            </Button>
          </div>
          <SavedBiblePicker
            open={pick}
            onOpenChange={setPick}
            onPick={(b) => {
              const filled = list.length < max ? [...list, createCharacter(bibleToInput(b))] : list.map((c, i) => (i === list.length - 1 ? { ...c, ...bibleToInput(b) } : c));
              set('characters.list', filled);
            }}
          />
        </>
      ) : (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {mode === 'hands_only'
            ? 'Hanya tangan yang tampil. AI akan membuat deskripsi tangan yang konsisten (warna kulit, kuku, lengan baju).'
            : 'Tanpa orang: video fokus pada produk. Field karakter tidak dihitung dalam skor kelengkapan.'}
        </p>
      )}
    </div>
  );
}
