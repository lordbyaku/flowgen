import * as React from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, FileText, KeyRound, Scissors, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/states';
import { GUIDE_GLOSSARY, GUIDE_STAGES, GUIDE_TABS } from './guideContent';

const FLOW_STEPS: { title: string; body: string }[] = [
  {
    title: 'Dari Mode Simpel (Ide → Video)',
    body: 'Hasil dibagi dua langkah. Langkah 1: salin prompt gambar setiap aset, buat gambarnya di Flow, dan simpan sebagai aset dengan nama persis seperti di aplikasi. Langkah 2: untuk setiap klip, pilih model Omni, lampirkan aset yang disebut, tempel prompt, atur durasi, lalu generate. Centang "Sudah dibuat di Flow" agar tahu posisi Anda.',
  },
  {
    title: 'Buat aset dulu (bila memakai mode "Karakter & tempat dibuat di Flow")',
    body: 'Buka tab Karakter & Tempat. Salin prompt setiap karakter, tempat, dan produk, buat gambarnya di Flow, lalu simpan sebagai aset dengan nama yang sama seperti di aplikasi. Aset inilah yang membuat wajah dan produk tetap sama di semua klip.',
  },
  {
    title: 'Buat klip per scene, berurutan',
    body: 'Buka tab Prompt (atau Mode Produksi di HP). Untuk setiap scene: lampirkan aset yang disebut di prompt, tempel prompt video, atur durasi sesuai scene (maksimal 10 detik), lalu generate. Bila scene punya frame awal/akhir, buat gambar frame-nya dulu lalu pakai sebagai frame video.',
  },
  {
    title: 'Hemat kredit: coba draft dulu',
    body: 'Generate di resolusi rendah (360p) untuk mengecek gerakan dan komposisi. Setelah cocok, buat ulang di 720p. Perkiraan kredit ada di bawah daftar scene di tab Prompt.',
  },
  {
    title: 'Scene yang menyambung: pakai Extend (opsional)',
    body: 'Bila scene punya "Prompt Extend", Anda bisa melanjutkan klip scene sebelumnya dengan fitur Extend di Flow, bukan membuat klip baru. Hasilnya lebih mulus untuk gerakan yang berlanjut.',
  },
  {
    title: 'Hasil tidak sesuai? Jangan tulis ulang sendiri',
    body: 'Klik "Hasil Flow gagal?" di kartu scene, centang masalahnya (wajah berubah, produk salah, dll.). Pilih "Tulis ulang prompt" untuk render ulang, atau "Instruksi edit klip (Omni)" untuk memperbaiki klip yang sudah jadi.',
  },
  {
    title: 'Unduh lalu tandai',
    body: 'Unduh setiap klip dan beri nama sesuai nomor scene. Tandai statusnya di tab Produksi agar tahu mana yang sudah selesai.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Tombol "Buat Konsep" tidak bisa diklik.',
    a: 'Masih ada field wajib (tanda W) yang kosong. Lihat panel "Kelengkapan brief" di kanan: klik nama field untuk langsung ke tempatnya, atau pakai AI Brief Assistant.',
  },
  {
    q: 'Muncul permintaan passphrase / vault terkunci.',
    a: 'Key Anda disimpan terenkripsi di browser. Masukkan passphrase yang dibuat saat menyiapkan vault. Agar tidak perlu passphrase dan key ikut di semua device, pilih mode "Tersimpan di akun" di menu AI Provider.',
  },
  {
    q: 'Wajah karakter berubah-ubah antar klip.',
    a: 'Pastikan aset karakter dilampirkan di setiap klip di Flow, dan nama aset sama persis dengan yang ada di aplikasi. Bila tetap berubah, pakai "Hasil Flow gagal?" dengan masalah "Wajah berubah".',
  },
  {
    q: 'AI gagal atau kuota habis.',
    a: 'Key gratis Gemini punya batas harian. Tunggu sebentar lalu coba lagi, atau tambahkan key kedua dari project Google lain di menu AI Provider.',
  },
  {
    q: 'Teks di video salah tulis.',
    a: 'Itu wajar untuk AI video. Prompt dari aplikasi ini sengaja tidak meminta teks di video: teks overlay dan CTA ditambahkan di CapCut.',
  },
];

function Section({ id, icon: Icon, title, description, children }: { id: string; icon: React.ComponentType<{ className?: string }>; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Panduan"
        description="Dari ide produk sampai video jadi, langkah demi langkah."
        actions={
          <Button asChild>
            <Link to="/simple/video">
              <Sparkles /> Tulis ide video
            </Link>
          </Button>
        }
      />

      <nav aria-label="Isi panduan" className="flex flex-wrap gap-2 text-sm">
        {[
          ['alur', 'Alur besar'],
          ['mulai', 'Pertama kali'],
          ['tahapan', 'Tahapan project'],
          ['flow', 'Membuat klip di Flow'],
          ['capcut', 'Merakit di CapCut'],
          ['istilah', 'Kamus istilah'],
          ['masalah', 'Masalah umum'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border px-3 py-1 hover:bg-muted">
            {label}
          </a>
        ))}
      </nav>

      <Section id="alur" icon={Clapperboard} title="Alur besar" description="Aplikasi ini menyiapkan semua teksnya. Videonya dibuat di Google Flow, lalu dirakit di CapCut.">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDE_STAGES.map((s, i) => (
            <li key={s.title} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Tahap {i + 1} · {s.where}</p>
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="mulai" icon={KeyRound} title="Pertama kali memakai">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Ambil API key Gemini gratis</strong> di{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary underline">
              Google AI Studio
            </a>{' '}
            (login dengan akun Google, klik buat API key, lalu salin).
          </li>
          <li>
            <strong>Simpan key di aplikasi</strong>: buka{' '}
            <Link to="/provider" className="text-primary underline">
              AI Provider
            </Link>
            , klik "Siapkan vault", pilih "Tersimpan di akun" agar key ikut di semua device, lalu tempel key.
          </li>
          <li>
            <strong>Tulis ide video</strong> di{' '}
            <Link to="/" className="text-primary underline">
              Beranda
            </Link>
            , pilih durasi dan rasio, lalu klik "Buat prompt". Belum punya ide? Buka{' '}
            <Link to="/simple/ideas" className="text-primary underline">
              Ide Konten
            </Link>
            .
          </li>
          <li>
            <strong>Untuk iklan yang butuh detail</strong> (naskah, storyboard, panduan CapCut, caption), pakai Studio lengkap lewat{' '}
            <Link to="/projects/quick" className="text-primary underline">
              Brief cepat
            </Link>
            .
          </li>
        </ol>
      </Section>

      <Section id="tahapan" icon={FileText} title="Tahapan project (Studio lengkap)" description="Tab di bagian atas setiap project. Kerjakan dari kiri ke kanan; yang opsional boleh dilewati.">
        <ul className="divide-y">
          {GUIDE_TABS.map((t) => (
            <li key={t.label} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-3">
              <div className="flex w-48 shrink-0 items-center gap-2">
                <span className="font-medium">{t.label}</span>
                {t.optional && <Badge variant="muted">opsional</Badge>}
              </div>
              <p className="text-muted-foreground">{t.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="flow" icon={Wand2} title="Membuat klip di Google Flow" description="Nama tombol di Flow bisa berubah sewaktu-waktu; urutannya tetap sama.">
        <ol className="space-y-3">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="capcut" icon={Scissors} title="Merakit di CapCut">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Buka tab CapCut di project dan klik buat panduan. Isinya urutan klip, potongan, teks overlay, musik, dan VO.</li>
          <li>Masukkan klip sesuai nomor scene ke timeline CapCut.</li>
          <li>Rekam atau buat voice-over dari naskah (tab Naskah / Export VO), lalu tambahkan musik dan teks overlay sesuai panduan.</li>
          <li>Ekspor video, lalu buka tab Posting untuk caption dan hashtag.</li>
        </ol>
      </Section>

      <Section id="istilah" icon={FileText} title="Kamus istilah">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {GUIDE_GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-medium">{g.term}</dt>
              <dd className="text-muted-foreground">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="masalah" icon={Sparkles} title="Masalah umum">
        <ul className="space-y-3">
          {FAQ.map((f) => (
            <li key={f.q}>
              <p className="font-medium">{f.q}</p>
              <p className="text-muted-foreground">{f.a}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
