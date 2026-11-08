import { Field } from '@/components/common/Field';
import { optionsFrom } from '@/components/common/ToggleGroup';
import { Input } from '@/components/ui/input';
import { LABELS } from '@/config/enums';
import { BoolField, EnumField, ListField, StepSection, TextField, useBrief, useSetBrief } from '../fields';
import { ReferenceImages } from '../ReferenceImages';

export function Step2Product() {
  const brief = useBrief();
  const set = useSetBrief();
  const pr = brief.product;
  return (
    <StepSection title="Langkah 2 — Produk" description="Semakin rinci detail fisik produk, semakin konsisten tampilannya di setiap klip.">
      <TextField path="product.name" label="Nama produk" placeholder="mis. Kopi Susu Gula Aren 250 ml" />
      <TextField path="product.category" label="Kategori" placeholder="mis. Minuman kopi siap minum" />
      <EnumField path="product.type" label="Jenis produk" options={optionsFrom(LABELS.productType)} clearable={false} className="md:col-span-2" />
      <TextField
        path="product.description"
        label="Deskripsi singkat"
        multiline
        maxLength={600}
        className="md:col-span-2"
        placeholder="1–3 kalimat: apa produknya dan untuk siapa."
        hint="Ringkas dan faktual; ini dasar semua naskah"
      />
      <ListField path="product.benefits" label="Manfaat utama" max={5} placeholder="mis. Manis alami tanpa gula pasir" />
      <ListField path="product.usps" label="Unique Selling Point" max={3} placeholder="mis. Satu-satunya pakai aren organik" />
      <TextField path="product.priceAndPromo" label="Harga dan promo" placeholder="mis. Rp18.000, diskon 20% sampai 31 Juli" />
      <TextField path="product.proof" label="Bukti dan angka" multiline placeholder="mis. 10.000 cup terjual, rating 4,9 di GoFood" hint="Testimoni, jumlah pengguna, hasil terukur" />
      <ListField path="product.allowedClaims" label="Klaim yang BOLEH dipakai" placeholder="mis. Tanpa pengawet" hint="AI hanya memakai klaim ini dan manfaat" />
      <ListField path="product.forbiddenClaims" label="Klaim yang DILARANG" placeholder="mis. Menyembuhkan penyakit" hint="Dicek otomatis oleh Prompt Linter (L08)" suggestions={['Hasil pasti', 'Klaim kesehatan', 'Paling murah', 'Nomor 1']} />
      <ListField path="product.usageSteps" label="Cara pakai atau alur demo" placeholder="mis. Kocok, buka tutup, minum" />
      <TextField path="product.shapeSize" label="Bentuk dan ukuran" placeholder="mis. Botol plastik bening silinder 250 ml, tinggi 15 cm" />
      <ListField path="product.dominantColors" label="Warna dominan produk" max={6} placeholder="#8B4513 atau cokelat tua" />
      <TextField path="product.materialTexture" label="Material dan tekstur" placeholder="mis. Plastik PET glossy, isi cairan cokelat susu" />
      <TextField path="product.packaging" label="Kemasan" placeholder="mis. Label kertas krem melingkar, tutup hitam" />
      <TextField path="product.logoPlacement" label="Logo dan posisinya" placeholder="mis. Logo bulat cokelat di tengah label depan" />
      <TextField path="product.textOnProduct" label="Teks yang ada di produk" placeholder="mis. KOPI AREN di label" hint="Teks pada produk sering rusak di AI video; cukup disebut" />
      {pr.type === 'software' && (
        <ListField path="product.softwareScreens" label="Halaman/layar yang ditampilkan" placeholder="mis. Layar kasir, laporan harian" className="md:col-span-2" />
      )}
      <Field label="Gambar referensi produk" level="P" className="md:col-span-2" hint="URL atau file lokal (maks 5)">
        <ReferenceImages value={pr.referenceImages} onChange={(v) => set('product.referenceImages', v)} />
      </Field>
      <BoolField path="product.mustBeVisible" label="Produk harus tampil" hint="Linter L03 memeriksa detail produk di prompt" />
      {pr.mustBeVisible && (
        <Field id="f-minvis" label="Minimal tampil per scene (detik)" level="O">
          <Input
            id="f-minvis"
            type="number"
            min={0}
            max={8}
            value={pr.minVisibleSecPerScene ?? ''}
            onChange={(e) => set('product.minVisibleSecPerScene', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </Field>
      )}
      <BoolField path="product.wantCloseUp" label="Close-up produk" />
    </StepSection>
  );
}
