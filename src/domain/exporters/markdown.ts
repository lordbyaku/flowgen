import { LABELS } from '@/config/enums';
import { formatDateTime } from '@/lib/format';
import { copyText } from '@/domain/promptText';
import { lintAll } from '@/domain/linter';
import type { Brief, Variant } from '@/types';
import type { ExportBundle, ExportSection } from './bundle';
import { capcutText } from './capcutGuide';
import { assetsText } from '@/domain/assets';

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '-');
const line = (label: string, v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '' : `- **${label}:** ${v}`;
const lines = (...l: string[]) => l.filter(Boolean).join('\n');

export function briefMarkdown(b: Brief): string {
  const p = b.project;
  return lines(
    '### Project',
    line('Nama', p.name),
    line('Tujuan', p.objective ? LABELS.objective[p.objective] : ''),
    line('Platform', p.platforms.map((x) => LABELS.platform[x]).join(', ')),
    line('Aspect ratio', p.aspectRatio),
    line('Durasi', `${p.durationSec} detik`),
    line('Bahasa', LABELS.scriptLanguage[p.scriptLanguage]),
    '',
    '### Produk',
    line('Nama', b.product.name),
    line('Jenis', LABELS.productType[b.product.type]),
    line('Kategori', b.product.category),
    line('Deskripsi', b.product.description),
    line('Manfaat', b.product.benefits.join('; ')),
    line('USP', b.product.usps.join('; ')),
    line('Klaim boleh', b.product.allowedClaims.join('; ')),
    line('Klaim dilarang', b.product.forbiddenClaims.join('; ')),
    '',
    '### Audiens dan pesan',
    line('Usia', b.audience.ageRange),
    line('Segmen', b.audience.segment),
    line('Masalah', b.audience.painPoint),
    line('Pesan utama', b.audience.keyMessage),
    line('CTA', b.audience.cta),
    '',
    '### Visual',
    line('Realisme', b.visual.realism ? LABELS.realism[b.visual.realism] : ''),
    line('Gaya', b.visual.style ? LABELS.creativeStyle[b.visual.style] : ''),
    line('Tone', b.visual.tone ? LABELS.tone[b.visual.tone] : ''),
    line('Palet', b.visual.palette.join(', ')),
    '',
    '### Lokasi',
    line('Lokasi utama', b.location.main),
    line('Nuansa lokal', b.location.localFlavor),
    line('Catatan tambahan untuk AI', b.output.extraNotes),
  );
}

export function toMarkdown(
  bundle: ExportBundle,
  sections: ExportSection[],
  opts: { variants?: Variant[]; lintDisabled?: string[] } = {},
): string {
  const has = (s: ExportSection) => sections.includes(s);
  const out: string[] = [`# ${bundle.name || 'Project tanpa nama'}`, `_Diekspor ${formatDateTime(Date.now())}_`];
  const selected = bundle.creative?.concepts.find((c) => c.id === bundle.creative?.selectedConceptId);

  if (has('brief')) out.push('## Ringkasan Brief', briefMarkdown(bundle.brief));

  if (has('concept') && selected) {
    out.push(
      '## Konsep Terpilih',
      lines(
        `### ${selected.title}`,
        line('Angle', LABELS.angle[selected.angle]),
        line('Pesan inti', selected.coreMessage),
        line('Emosi', selected.emotion),
        line('Identitas visual', selected.visualIdentity),
        line('Pendekatan cerita', selected.storytelling),
        line('Hook pembuka', selected.openingHook),
        line('CTA penutup', selected.closingCta),
        line('Jumlah scene', selected.recommendedSceneCount),
        line('Alasan kreatif', selected.rationale),
      ),
    );
  }

  if (has('script') && bundle.script) {
    const s = bundle.script;
    out.push(
      '## Naskah',
      lines(
        line('Hook', s.hook),
        line('Masalah', s.problem),
        line('Perkenalan produk', s.productIntro),
        line('Manfaat utama', s.mainBenefit),
        line('Penutup', s.closing),
        line('CTA', s.cta),
        line('Estimasi durasi', `${s.estimatedDurationSec} detik`),
      ),
      '### Voice-over',
      s.voiceOver || '-',
    );
  }

  if (has('storyboard') && bundle.scenes.length) {
    out.push(
      '## Storyboard',
      '| # | Judul | Durasi | Tujuan | Visual | Shot | Kamera | VO | Teks overlay |',
      '|---|---|---|---|---|---|---|---|---|',
      ...bundle.scenes.map(
        (s, i) =>
          `| ${i + 1} | ${esc(s.title)} | ${s.durationSec}s | ${esc(s.purpose)} | ${esc(s.visualDescription)} | ${esc(s.shot)} | ${esc(s.cameraMovement)} | ${esc(s.voiceOver)} | ${esc(s.textOverlay)} |`,
      ),
    );
  }

  if (has('characterBible') && bundle.bibles) {
    out.push('## Character Bible');
    if (bundle.bibles.characters.length === 0) out.push('_Tanpa karakter._');
    for (const c of bundle.bibles.characters) {
      out.push(
        `### ${c.name} (${c.id})`,
        lines(
          line('Gender', c.genderPresentation),
          line('Usia', c.approxAge),
          line('Penampilan', c.appearance),
          line('Rambut', c.hair),
          line('Pakaian', c.clothing),
          line('Aksesori', c.accessories),
          line('Kepribadian', c.personality),
          line('Larangan', c.restrictions),
        ),
        '**Character Master Description (EN):**',
        `> ${c.masterDescriptionEn}`,
      );
    }
  }

  if (has('visualBible') && bundle.bibles) {
    const v = bundle.bibles.visual;
    out.push(
      '## Visual Bible',
      lines(
        line('Art direction', v.artDirection),
        line('Palet', v.palette.join(', ')),
        line('Cahaya', v.lightingStyle),
        line('Sinematografi', v.cinematography),
        line('Lingkungan', v.environmentDesign),
        line('Lensa', v.lensPreference),
        line('Gerak kamera', v.cameraMovementStyle),
        line('Tampilan produk (EN)', v.productAppearanceEn),
        line('Style line (EN)', v.styleLineEn),
        line('Larangan', v.restrictions),
      ),
    );
  }

  if (has('assets') && bundle.assets) {
    out.push('## Prompt Aset Flow (buat dulu: karakter → tempat → produk)', '```text', assetsText(bundle.assets), '```');
  }

  if (has('prompts') && bundle.scenes.length) {
    const variants = opts.variants ?? bundle.brief.output.variants;
    out.push('## Prompt Google Flow');
    bundle.scenes.forEach((s, i) => {
      out.push(`### Scene ${i + 1}: ${s.title} (${s.durationSec}s)`);
      for (const v of variants) {
        const text = copyText(s, v);
        if (!text.trim()) continue;
        out.push(`**${LABELS.variant[v]}**`, '```text', text, '```');
      }
      if (s.framePrompts?.start) out.push('**Frame awal (gambar)**', '```text', s.framePrompts.start, '```');
      if (s.framePrompts?.end) out.push('**Frame akhir (gambar)**', '```text', s.framePrompts.end, '```');
    });
  }

  if (has('capcut') && bundle.capcut) out.push('## Panduan CapCut', capcutText(bundle.capcut, bundle.scenes));

  if (has('assumptions')) {
    const a = bundle.creative?.assumptions ?? [];
    out.push('## Asumsi AI', list(a));
  }

  if (has('lint') && bundle.scenes.length) {
    const res = lintAll({ brief: bundle.brief, bibles: bundle.bibles, scenes: bundle.scenes, assets: bundle.assets }, opts.lintDisabled);
    const rows = bundle.scenes.flatMap((s, i) =>
      (res[s.id] ?? []).map((iss) => `- Scene ${i + 1} · ${iss.ruleId} (${iss.severity}): ${iss.message}`),
    );
    out.push('## Hasil Linter', rows.length ? rows.join('\n') : '_Tidak ada peringatan._');
  }

  return out.join('\n\n') + '\n';
}
