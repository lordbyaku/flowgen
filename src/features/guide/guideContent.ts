import { HUB_STEPS } from '@/config/hubSteps';

export const GUIDE_STAGES = [
  { title: 'Brief', where: 'di aplikasi', body: 'Ceritakan produk dan target pembeli. Brief cepat bisa mengisinya dengan AI.' },
  { title: 'Prompt', where: 'di aplikasi', body: 'AI membuat konsep, naskah, storyboard, lalu prompt video per scene.' },
  { title: 'Klip video', where: 'di Google Flow', body: 'Tempel prompt satu per satu di Flow (model Omni) dan unduh klipnya.' },
  { title: 'Video jadi', where: 'di CapCut', body: 'Rakit klip, tambah voice-over, musik, dan teks, lalu posting.' },
] as const;

export const GUIDE_TABS = HUB_STEPS.map((s) => ({ label: s.label, optional: s.optional, body: s.guide }));

export const GUIDE_GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'W / P / O', meaning: 'Tanda di setiap field brief: W = wajib, P = penting (hasil lebih bagus bila diisi), O = opsional.' },
  { term: 'Brief', meaning: 'Ringkasan tentang produk, pembeli, dan gaya video yang dipakai AI sebagai bahan.' },
  { term: 'Konsep & angle', meaning: 'Ide besar video dan sudut pandang jualannya, mis. masalah–solusi atau testimoni.' },
  { term: 'Storyboard & scene', meaning: 'Video dibagi menjadi scene pendek (maks. 10 detik). Setiap scene jadi satu klip di Flow.' },
  { term: 'Character Bible', meaning: 'Deskripsi tetap setiap karakter (wajah, rambut, pakaian) agar sama di semua scene.' },
  { term: 'Visual Bible', meaning: 'Aturan tampilan seluruh video: warna, cahaya, gaya kamera, tampilan produk.' },
  { term: 'Aset Flow', meaning: 'Gambar karakter, tempat, atau produk yang disimpan di Flow lalu dilampirkan ke setiap klip.' },
  { term: 'Frame awal / akhir', meaning: 'Gambar diam yang dibuat dulu, lalu dipakai Flow sebagai titik awal atau akhir klip.' },
  { term: 'Extend', meaning: 'Fitur Flow untuk melanjutkan klip yang sudah ada, cocok untuk scene yang menyambung.' },
  { term: 'Varian prompt', meaning: 'Versi prompt yang lebih ringkas atau lebih detail. Standar sudah cukup untuk kebanyakan kasus.' },
  { term: 'Baris Avoid', meaning: 'Daftar hal yang tidak boleh muncul (teks rusak, logo salah, dll.) di akhir prompt.' },
  { term: 'Linter', meaning: 'Pemeriksa otomatis prompt: memberi peringatan bila ada yang berisiko gagal di Flow.' },
  { term: 'Varian hook', meaning: 'Beberapa versi 1–3 detik pertama video untuk diuji mana yang paling menahan penonton.' },
  { term: 'Vault & passphrase', meaning: 'Tempat API key disimpan. Mode "Tersimpan di akun" tidak butuh passphrase dan ikut di semua device.' },
  { term: 'Kredit Flow', meaning: 'Biaya generate di Flow. Draft 360p lebih murah; perkiraannya ada di tab Prompt.' },
];
