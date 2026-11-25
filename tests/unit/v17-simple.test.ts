import { describe, expect, it, vi } from 'vitest';
import { createAiService } from '@/ai/aiService';
import type { AIRouter } from '@/ai/router/aiRouter';
import { buildSimpleFixCall, buildSimpleIdeasCall, buildSimpleVideoCall } from '@/ai/director/simpleCalls';
import { finalizeClipPrompt, planClips, simpleAllText, toSimpleVideo } from '@/domain/simpleVideo';
import { SimpleVideoSchema } from '@/schemas/simple.schema';
import type { SimpleVideoInput, SimpleVideoOutput } from '@/types';

const input = (over: Partial<SimpleVideoInput> = {}): SimpleVideoInput => ({
  idea: 'Ibu penjual kopi keliling membuat kopi susu gula aren untuk pelanggan pagi hari.',
  durationSec: 30,
  aspectRatio: '9:16',
  style: 'ugc',
  speech: 'dialogue',
  speechLanguage: 'id',
  useAssets: true,
  ...over,
});

const output = (n = 3): SimpleVideoOutput => ({
  title: ' Kopi Pagi ',
  summary: 'Ringkas',
  assets: [{ kind: 'character', name: ' Rina ', description: 'Indonesian woman, 30s', imagePrompt: 'Full body of Rina' }],
  clips: Array.from({ length: n }, (_, i) => ({ durationSec: 12, title: `Klip ${i}`, prompt: `Rina pours coffee ${i}. Aspect ratio 9:16.`, speech: i === 0 ? ' Kopi siap! ' : '' })),
  tips: [' Coba klip 1 dulu ', ''],
});

describe('v1.7 — Mode Simpel: rencana klip', () => {
  it('membagi durasi menjadi klip maks 10 detik, selisih maks 1 detik', () => {
    expect(planClips(30)).toEqual([10, 10, 10]);
    expect(planClips(15)).toEqual([8, 7]);
    expect(planClips(45)).toEqual([9, 9, 9, 9, 9]);
    expect(planClips(5)).toEqual([5]);
    expect(planClips(60).reduce((a, b) => a + b)).toBe(60);
  });

  it('prompt klip selalu diakhiri tanpa teks, satu shot, rasio — tanpa dobel', () => {
    const p = finalizeClipPrompt('Rina pours coffee. Aspect ratio 9:16.', '9:16');
    expect(p).toBe('Rina pours coffee. No on-screen text, no subtitles. One continuous shot, no jump cuts. Aspect ratio 9:16.');
    expect(finalizeClipPrompt(p, '9:16')).toBe(p);
  });
});

describe('v1.7 — Mode Simpel: panggilan AI', () => {
  it('ide → video: jumlah & durasi klip, batas kata ucapan, gaya, aturan aset', () => {
    const c = buildSimpleVideoCall(input());
    expect(c.task).toBe('simple_video');
    expect(c.userPrompt).toContain('<idea>');
    expect(c.userPrompt).toContain('Clips: exactly 3, durations in order: 10s, 10s, 10s');
    expect(c.userPrompt).toMatch(/Clip 1 \(10s\): speech max \d+ words/);
    expect(c.userPrompt).toContain('smartphone UGC');
    expect(c.userPrompt).toContain('refer to each asset ONLY by its exact name');
    const noAssets = buildSimpleVideoCall(input({ useAssets: false, speech: 'none' }));
    expect(noAssets.userPrompt).toContain('repeat the full asset description verbatim');
    expect(noAssets.userPrompt).toContain('No dialogue, no narration.');
    expect(c.systemPrompt).toContain('ONE main action');
  });

  it('ide konten dan perbaiki hasil', () => {
    expect(buildSimpleIdeasCall({ topic: 'kopi susu', goal: 'sell' }).userPrompt).toContain('10 different short-video ideas');
    const f = buildSimpleFixCall({ prompt: 'Rina pours coffee.', issues: ['face_changed'], note: 'wajah beda', usesAssets: true });
    expect(f.task).toBe('simple_fix');
    expect(f.userPrompt).toContain('face_changed');
    expect(f.userPrompt).toContain('exact Flow character name');
    expect(f.userPrompt).toContain('Edit this video keeping everything else the same.');
  });
});

describe('v1.7 — Mode Simpel: hasil tersimpan', () => {
  it('durasi mengikuti rencana bila jumlah klip cocok, aset hanya saat dipakai, valid skema', () => {
    const v = toSimpleVideo(input(), output(3), 5, 'sv_1');
    expect(v.title).toBe('Kopi Pagi');
    expect(v.clips.map((c) => c.durationSec)).toEqual([10, 10, 10]);
    expect(v.clips[0].prompt.endsWith('Aspect ratio 9:16.')).toBe(true);
    expect(v.clips[0].speech).toBe('Kopi siap!');
    expect(v.clips[1].speech).toBeUndefined();
    expect(v.assets[0]).toMatchObject({ name: 'Rina', done: false });
    expect(v.tips).toEqual(['Coba klip 1 dulu']);
    expect(SimpleVideoSchema.safeParse(v).success).toBe(true);
    expect(toSimpleVideo(input({ useAssets: false }), output(3), 5).assets).toEqual([]);
    // Jumlah klip berbeda dari rencana → durasi AI dibatasi 3–10.
    expect(toSimpleVideo(input(), output(2), 5).clips.map((c) => c.durationSec)).toEqual([10, 10]);
    expect(simpleAllText(v)).toContain('=== KLIP 1: Klip 0 (10 dtk) ===');
  });

  it('aiService.simpleVideo mengembalikan dokumen siap simpan', async () => {
    const run = vi.fn(async () => ({ text: JSON.stringify(output(3)), model: 'm', httpStatus: 200, latencyMs: 1, keyId: 'k', keyLabel: 'K' }));
    const svc = createAiService({ provider: {} as never, keys: {} as never, router: { run } as unknown as AIRouter, now: () => 7 });
    const r = await svc.simpleVideo(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.createdAt).toBe(7);
    expect(r.value.clips).toHaveLength(3);
  });
});
