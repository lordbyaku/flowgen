import { describe, expect, it, vi } from 'vitest';
import { createAiService } from '@/ai/aiService';
import type { AIRouter } from '@/ai/router/aiRouter';
import { buildPublishCall, normalizeHashtags, toPublishDoc } from '@/ai/director/publishCall';
import { captionWithHashtags, publishText } from '@/domain/publish';
import type { ScriptDoc } from '@/types';
import { makeBrief, makeScene } from './helpers';

function fakeRouter(texts: string[]) {
  const run = vi.fn(async () => ({ text: texts.shift() ?? '', model: 'm', httpStatus: 200, latencyMs: 1, keyId: 'k', keyLabel: 'K' }));
  return { router: { run } as unknown as AIRouter, run };
}

export const SCRIPT: ScriptDoc = {
  hook: 'Masih catat jualan di buku?',
  problem: 'Sering salah hitung',
  productIntro: 'Warungku-POS',
  mainBenefit: 'Kasir rapi',
  closing: 'Coba sekarang',
  cta: 'Download gratis',
  voiceOver: 'Masih catat jualan di buku? Pakai Warungku-POS.',
  estimatedDurationSec: 15,
  wordCount: 8,
  approved: true,
  updatedAt: 1,
};

const platformItem = (platform: string, extra: Record<string, unknown> = {}) => ({
  platform,
  title: ' Judul ',
  captions: [{ style: 'Hook', text: ' Caption satu ' }, { style: 'Cerita', text: '' }],
  hashtags: ['#UMKM', 'umkm', 'kasir warung', '#Kasir!'],
  coverTexts: ['Kasir rapi', ' ', 'Gratis'],
  pinnedComment: 'Mau coba? Komen "MAU"',
  ...extra,
});

describe('Paket posting (v1.4)', () => {
  it('normalizeHashtags: awalan #, tanpa spasi/tanda baca, tanpa duplikat, maks 15', () => {
    expect(normalizeHashtags(['#UMKM', 'umkm', 'kasir warung', '#Kasir!', '##pos'])).toEqual(['#UMKM', '#kasir', '#warung', '#pos']);
    expect(normalizeHashtags(Array.from({ length: 30 }, (_, i) => `tag${i}`))).toHaveLength(15);
  });

  it('toPublishDoc: hanya platform brief, urut brief, teks dirapikan, WA tanpa hashtag', () => {
    const brief = makeBrief({ project: { platforms: ['reels', 'wa_status'] } });
    const doc = toPublishDoc(
      { platforms: [platformItem('tiktok'), platformItem('wa_status'), platformItem('reels')] as never, postingTips: [' a ', ''] },
      brief,
      5,
    );
    expect(doc.platforms.map((p) => p.platform)).toEqual(['reels', 'wa_status']);
    expect(doc.platforms[0].title).toBe('Judul');
    expect(doc.platforms[0].captions).toEqual([{ style: 'Hook', text: 'Caption satu' }]);
    expect(doc.platforms[0].coverTexts).toEqual(['Kasir rapi', 'Gratis']);
    expect(doc.platforms[1].hashtags).toEqual([]);
    expect(doc.postingTips).toEqual(['a']);
    expect(doc.updatedAt).toBe(5);
  });

  it('prompt memuat aturan per platform brief dan batas klaim; platform kosong = TikTok', () => {
    const c = buildPublishCall(makeBrief({ project: { platforms: [] } }), { script: SCRIPT, scenes: [makeScene({ textOverlay: 'Kasir rapi!' })] });
    expect(c.task).toBe('publish_pack');
    expect(c.userPrompt).toContain('in this order: tiktok.');
    expect(c.userPrompt).toContain('TikTok: title empty');
    expect(c.userPrompt).not.toContain('YouTube Shorts:');
    expect(c.userPrompt).toContain('never forbiddenClaims');
    expect(c.userPrompt).toContain('textOverlays: Kasir rapi!');
  });

  it('aiService: tanpa naskah ditolak tanpa panggilan; dengan naskah menghasilkan dokumen', async () => {
    const out = { platforms: [platformItem('tiktok')], postingTips: ['Posting jam 19.00'] };
    const { router, run } = fakeRouter([JSON.stringify(out)]);
    const svc = createAiService({ provider: {} as never, keys: {} as never, router, now: () => 9 });
    const brief = makeBrief({ project: { platforms: ['tiktok'] } });
    const none = await svc.generatePublishPack({ brief, script: null, scenes: [] });
    expect(none.ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
    const r = await svc.generatePublishPack({ brief, script: SCRIPT, scenes: [] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.platforms[0].hashtags).toEqual(['#UMKM', '#kasir', '#warung']);
    expect(svc.estimate('publish', { brief, script: SCRIPT }).calls).toBe(1);
    expect(svc.estimate('publish', { brief, script: null }).calls).toBe(0);
  });

  it('teks salin: caption + hashtag dan seluruh paket', () => {
    expect(captionWithHashtags(' Halo ', ['#a', '#b'])).toBe('Halo\n\n#a #b');
    expect(captionWithHashtags('Halo', [])).toBe('Halo');
    const doc = toPublishDoc({ platforms: [platformItem('shorts')] as never, postingTips: ['Tip'] }, makeBrief({ project: { platforms: ['shorts'] } }), 1);
    const t = publishText(doc);
    expect(t).toContain('=== YouTube Shorts ===');
    expect(t).toContain('Judul: Judul');
    expect(t).toContain('Komentar pin:');
    expect(t).toContain('=== Tips posting ===');
  });
});
