import { MAX_HASHTAGS, MAX_OUTPUT_TOKENS, TEMPERATURE } from '@/config/constants';
import { LABELS } from '@/config/enums';
import { PublishAiSchema } from '@/schemas/publish.schema';
import type { Brand, Brief, Concept, Platform, PublishDoc, Scene, ScriptDoc } from '@/types';
import { briefDigest } from './briefSerializer';
import { buildSystemPrompt } from './systemPrompts';

/** Platform tujuan paket posting: dari brief, default TikTok. */
export function publishPlatforms(brief: Brief): Platform[] {
  return brief.project.platforms.length ? brief.project.platforms : ['tiktok'];
}

const PLATFORM_RULES: Record<Platform, string> = {
  tiktok: 'TikTok: title empty; caption short (max ~150 chars before hashtags), hook in the first line; 3-6 hashtags mixing niche and broad.',
  reels: 'Instagram Reels: title empty; caption 1-3 short lines + CTA; 5-10 hashtags.',
  shorts: 'YouTube Shorts: title max 90 chars with the main keyword; caption is the description (1-2 lines); 3-5 hashtags incl. #shorts.',
  ig_feed: 'Instagram Feed: title empty; caption may be longer (story + CTA, max ~600 chars); 5-10 hashtags.',
  facebook: 'Facebook: title max 90 chars; caption conversational with CTA; 0-3 hashtags.',
  wa_status: 'WhatsApp Status: title empty; caption one short line with CTA (order/DM contact cue); no hashtags.',
  youtube: 'YouTube: title max 90 chars, keyword first; caption is a 2-4 line description with CTA; 3-5 hashtags.',
};

export function buildPublishCall(
  brief: Brief,
  input: { brand?: Brand | null; concept?: Concept | null; script: ScriptDoc; scenes: Scene[] },
) {
  const platforms = publishPlatforms(brief);
  const sorted = [...input.scenes].sort((a, b) => a.order - b.order);
  const overlays = sorted.map((s) => s.textOverlay.trim()).filter(Boolean);
  const c = input.concept;
  const user = [
    briefDigest(brief),
    '',
    '<publish_context>',
    `brand: ${input.brand?.name || '-'}${input.brand?.toneOfVoice ? ` (tone: ${input.brand.toneOfVoice})` : ''}`,
    `objective: ${brief.project.objective ?? '-'}`,
    `audience: ${brief.audience.segment || '-'}, age ${brief.audience.ageRange || '-'}; pain point: ${brief.audience.painPoint || '-'}`,
    `benefits: ${brief.product.benefits.join('; ') || '-'}`,
    `allowedClaims: ${brief.product.allowedClaims.join('; ') || '-'}`,
    `priceAndPromo: ${brief.product.priceAndPromo || '-'}; offerDeadline: ${brief.audience.offerDeadline || '-'}`,
    c ? `concept: ${c.title} — ${c.coreMessage}; hook: ${c.openingHook}; cta: ${c.closingCta}` : 'concept: -',
    `scriptHook: ${input.script.hook}`,
    `voiceOver: ${input.script.voiceOver}`,
    `textOverlays: ${overlays.join(' | ') || '-'}`,
    '</publish_context>',
    '',
    'TASK (Posting package — text only, the user posts manually):',
    `Return platforms with EXACTLY one item per platform, in this order: ${platforms.join(', ')}.`,
    'Each item: platform (enum), title, captions (2-3 options with a short Indonesian style label such as "Hook pertanyaan", "Cerita singkat", "To the point"),',
    `hashtags (max ${MAX_HASHTAGS}, each a single word starting with #, no spaces), coverTexts (3 options, max 6 words each, punchy, for the thumbnail/cover),`,
    'pinnedComment (one comment the creator pins: invites interaction or repeats the CTA).',
    'Platform rules:',
    ...platforms.map((p) => `- ${PLATFORM_RULES[p]}`),
    `Write titles, captions, cover texts and pinned comments in the script language (${LABELS.scriptLanguage[brief.project.scriptLanguage]}).`,
    'Captions must match the video content and CTA. Use only allowedClaims and benefits; never forbiddenClaims; no fake urgency beyond offerDeadline.',
    'Also return postingTips: up to 5 short practical tips in Indonesian (best posting time window, first-hour engagement, which caption to test first).',
  ].join('\n');
  return {
    task: 'publish_pack' as const,
    systemPrompt: buildSystemPrompt(brief),
    userPrompt: user,
    schema: PublishAiSchema,
    temperature: TEMPERATURE.publish,
    maxOutputTokens: MAX_OUTPUT_TOKENS.publish,
  };
}

/** Hashtag rapi: awalan #, tanpa spasi/tanda baca, tanpa duplikat (abaikan huruf besar), maks 15. */
export function normalizeHashtags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    for (const part of raw.split(/[\s,]+/)) {
      const word = part.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
      if (!word) continue;
      const k = word.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(`#${word}`);
    }
  }
  return out.slice(0, MAX_HASHTAGS);
}

/** Hanya platform brief, urut sesuai brief, satu item per platform; teks dirapikan. */
export function toPublishDoc(out: { platforms: PublishDoc['platforms']; postingTips: string[] }, brief: Brief, now: number): PublishDoc {
  const platforms = publishPlatforms(brief).flatMap((p) => {
    const it = out.platforms.find((x) => x.platform === p);
    if (!it) return [];
    return [
      {
        platform: p,
        title: it.title.trim(),
        captions: it.captions.map((c) => ({ style: c.style.trim(), text: c.text.trim() })).filter((c) => c.text).slice(0, 3),
        hashtags: p === 'wa_status' ? [] : normalizeHashtags(it.hashtags),
        coverTexts: it.coverTexts.map((t) => t.trim()).filter(Boolean).slice(0, 3),
        pinnedComment: it.pinnedComment.trim(),
      },
    ];
  });
  if (platforms.length === 0) throw new Error('Paket posting kosong');
  return { platforms, postingTips: out.postingTips.map((t) => t.trim()).filter(Boolean).slice(0, 5), updatedAt: now };
}
