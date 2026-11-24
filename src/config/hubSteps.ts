/** Tahapan project (tab di atas setiap project). `optional`: boleh dilewati untuk mendapat prompt Flow. */
export const HUB_STEPS = [
  { to: 'brief', label: 'Brief', optional: false, guide: 'Isi data produk, audiens, dan gaya video. Paling cepat lewat Brief cepat; field bertanda W wajib diisi.' },
  { to: 'concepts', label: 'Konsep', optional: false, guide: 'AI membuat beberapa ide video. Pilih satu dan setujui.' },
  { to: 'script', label: 'Naskah', optional: false, guide: 'AI menulis naskah dan voice-over dari konsep terpilih, sekaligus membagi video menjadi scene.' },
  { to: 'storyboard', label: 'Storyboard', optional: false, guide: 'Daftar scene: apa yang terlihat, durasi, dan gerak kamera. Juga berisi Character Bible dan Visual Bible.' },
  { to: 'assets', label: 'Karakter & Tempat', optional: false, guide: 'Prompt gambar karakter, tempat, dan produk untuk dibuat lebih dulu di Flow sebagai aset (mode default).' },
  { to: 'prompts', label: 'Prompt', optional: false, guide: 'Prompt video per scene untuk ditempel di Google Flow, plus perkiraan kredit Flow.' },
  { to: 'hooks', label: 'Varian Hook', optional: true, guide: 'Beberapa versi pembuka (scene 1) untuk diuji mana yang paling menarik.' },
  { to: 'production', label: 'Produksi', optional: true, guide: 'Tandai status tiap klip (dibuat, diunduh, di CapCut). Ada Mode Produksi satu-per-satu untuk HP.' },
  { to: 'capcut', label: 'CapCut', optional: false, guide: 'Panduan merakit klip, voice-over, musik, dan teks di CapCut.' },
  { to: 'publish', label: 'Posting', optional: true, guide: 'Caption, hashtag, dan jadwal posting, serta catatan performa setelah tayang.' },
  { to: 'export', label: 'Export', optional: true, guide: 'Unduh semua hasil sebagai Markdown, TXT, atau JSON.' },
] as const;
