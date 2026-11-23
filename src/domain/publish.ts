import { LABELS } from '@/config/enums';
import type { PublishDoc } from '@/types';

/** Teks siap tempel: caption + baris hashtag. */
export function captionWithHashtags(caption: string, hashtags: string[]): string {
  return hashtags.length ? `${caption.trim()}\n\n${hashtags.join(' ')}` : caption.trim();
}

/** Seluruh paket sebagai teks (ekspor/salin). */
export function publishText(doc: PublishDoc): string {
  const blocks = doc.platforms.map((p) =>
    [
      `=== ${LABELS.platform[p.platform]} ===`,
      p.title ? `Judul: ${p.title}` : '',
      ...p.captions.map((c, i) => `Caption ${i + 1}${c.style ? ` (${c.style})` : ''}:\n${captionWithHashtags(c.text, p.hashtags)}`),
      p.coverTexts.length ? `Teks cover: ${p.coverTexts.join(' / ')}` : '',
      p.pinnedComment ? `Komentar pin: ${p.pinnedComment}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
  const tips = doc.postingTips.length ? `=== Tips posting ===\n${doc.postingTips.map((t) => `- ${t}`).join('\n')}` : '';
  return [...blocks, tips].filter(Boolean).join('\n\n');
}
