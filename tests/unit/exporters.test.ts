import { describe, expect, it } from 'vitest';
import { toExportBundle, EXPORT_SECTIONS } from '@/domain/exporters/bundle';
import { toMarkdown } from '@/domain/exporters/markdown';
import { promptsTxt, voTxt } from '@/domain/exporters/txt';
import { clipboardText } from '@/domain/exporters/clipboard';
import { capcutSections, buildTimelineFromScenes } from '@/domain/exporters/capcutGuide';
import { parseProjectJson, projectToJson, exportFilename } from '@/domain/exporters/projectJson';
import { copyAllText, copyText, buildNegative } from '@/domain/promptText';
import { pushVersion, restoreVersion } from '@/domain/sceneVersions';
import { fitScenesDoc } from '@/data/sceneRepo';
import type { Project, ProjectDocs } from '@/types';
import { makeBibles, makeBrief, makeScene } from './helpers';

const KEY_RE = /AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z_-]{20,}/;

function project(): Project {
  return {
    id: 'p1',
    schemaVersion: 1,
    name: 'Promo Warungku',
    brandId: 'b1',
    status: 'in_progress',
    brief: makeBrief(),
    completeness: 90,
    step: 9,
    stage: 'prompts',
    lintDisabled: [],
    createdAt: 1,
    updatedAt: 2,
  };
}

function docs(): ProjectDocs {
  return {
    creative: {
      analysis: { product: 'p', market: 'm', strongestAngle: 's' },
      concepts: [{ id: 'c1', title: 'Kasir Rapi', angle: 'problem_solution', coreMessage: 'cm', emotion: 'lega', visualIdentity: 'v', storytelling: 's', openingHook: 'h', closingCta: 'cta', recommendedSceneCount: 2, rationale: 'r' }],
      assumptions: ['Asumsi satu'],
      selectedConceptId: 'c1',
      approved: true,
      history: [],
      updatedAt: 1,
    },
    script: { hook: 'Hook', problem: '', productIntro: '', mainBenefit: '', closing: '', cta: 'Download', voiceOver: 'VO lengkap', estimatedDurationSec: 2, wordCount: 2, approved: true, updatedAt: 1 },
    bibles: makeBibles(),
    scenes: { items: [makeScene({ id: 'b', order: 1, title: 'Demo', voiceOver: 'Ketuk produk' }), makeScene({ id: 'a', order: 0, title: 'Hook' })], updatedAt: 1 },
    capcut: {
      sceneOrder: ['Hook', 'Demo'],
      timeline: [{ scene: 1, startSec: 0, endSec: 5, note: 'buka' }],
      voiceOverSequence: ['VO1'],
      musicMood: 'ceria',
      sfx: ['klik'],
      transitions: ['cut'],
      rhythm: 'cepat',
      textOverlays: [{ scene: 1, text: 'Kasir rapi!', position: 'atas', style: 'bold', startSec: 0, endSec: 2 }],
      opening: 'buka',
      closing: 'tutup',
      updatedAt: 1,
      checklist: {},
    },
    assets: null,
  };
}

describe('Exporters (27)', () => {
  const bundle = toExportBundle(project(), docs());

  it('scene diurutkan', () => expect(bundle.scenes.map((s) => s.id)).toEqual(['a', 'b']));

  it('Markdown lengkap memuat semua bagian berurutan', () => {
    const md = toMarkdown(bundle, [...EXPORT_SECTIONS]);
    const order = ['# Promo Warungku', '## Ringkasan Brief', '## Konsep Terpilih', '## Naskah', '## Storyboard', '## Character Bible', '## Visual Bible', '## Prompt Google Flow', '## Panduan CapCut', '## Asumsi AI', '## Hasil Linter'];
    let last = -1;
    for (const h of order) {
      const i = md.indexOf(h);
      expect(i, h).toBeGreaterThan(last);
      last = i;
    }
    expect(md).toContain('Avoid: on-screen text, watermark');
    expect(md).toContain('Asumsi satu');
  });

  it('TXT prompt dan VO sesuai format', () => {
    const t = promptsTxt(bundle);
    expect(t).toMatch(/^=== SCENE 1: Hook \(5s\) ===\n/);
    expect(t).toContain('=== SCENE 2: Demo (5s) ===');
    expect(t).toContain('\n\nAvoid: ');
    expect(voTxt(bundle)).toBe('1. Masih catat jualan di buku?\n\n2. Ketuk produk\n');
  });

  it('Salin Semua memakai pemisah === SCENE n ===', () => {
    const all = copyAllText(bundle.scenes);
    expect(all.split('=== SCENE ').length - 1).toBe(2);
    expect(all.startsWith('=== SCENE 1 ===\n')).toBe(true);
    expect(copyText(bundle.scenes[0])).toMatch(/\n\nAvoid: on-screen text, watermark$/);
  });

  it('clipboard dan CapCut per bagian', () => {
    expect(clipboardText(bundle, 'capcut')).toContain('## Teks overlay');
    expect(capcutSections(bundle.capcut!, bundle.scenes).find((s) => s.id === 'overlays')!.text).toContain('"Kasir rapi!"');
    expect(buildTimelineFromScenes(bundle.scenes)).toEqual([
      { scene: 1, startSec: 0, endSec: 5, note: 'hook' },
      { scene: 2, startSec: 5, endSec: 10, note: 'hook' },
    ]);
  });

  it('ekspor seluruh project tidak memuat pola key atau kata cipher', () => {
    // project mentah dengan field liar tidak ikut karena bundle whitelist
    const dirty = { ...project(), apiKey: 'AIza' + 'Sy' + 'LEAKLEAKLEAKLEAKLEAKLEAKLEAKLEAK1', geminiKey: 'AQ.' + 'LeakLeakLeak'.repeat(4), cipher: { iv: 'x', data: 'y' } } as unknown as Project;
    const b = toExportBundle(dirty, docs());
    for (const out of [toMarkdown(b, [...EXPORT_SECTIONS]), promptsTxt(b), voTxt(b), projectToJson(b), clipboardText(b, 'allPrompts')]) {
      expect(out).not.toMatch(KEY_RE);
      expect(out.toLowerCase()).not.toContain('cipher');
    }
  });

  it('JSON project: round trip, file tidak valid ditolak dengan pesan', () => {
    const r = parseProjectJson(projectToJson(bundle));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.docs.scenes!.items).toHaveLength(2);
    expect(parseProjectJson('bukan json')).toEqual({ ok: false, message: 'File bukan JSON yang valid.' });
    expect(parseProjectJson('{"format":"lain"}').ok).toBe(false);
    const bad = JSON.parse(projectToJson(bundle));
    bad.project.brief.project.durationSec = 999;
    const rb = parseProjectJson(JSON.stringify(bad));
    expect(rb.ok).toBe(false);
    if (!rb.ok) expect(rb.message).toMatch(/tidak valid/);
    const future = { ...JSON.parse(projectToJson(bundle)), schemaVersion: 99 };
    expect(parseProjectJson(JSON.stringify(future)).ok).toBe(false);
  });

  it('nama file', () => expect(exportFilename('Promo Warungku', 'paket', 'md')).toMatch(/^promo-warungku-\d{8}-paket\.md$/));
});

describe('Negatif, versi, ukuran dokumen', () => {
  it('buildNegative menggabungkan dasar + AI + global tanpa duplikat', () => {
    const n = buildNegative('Watermark, blurry', makeBrief());
    expect(n.toLowerCase().split('watermark').length - 1).toBe(1);
    expect(n).toContain('blurry');
    expect(n).toContain('deformed hands');
  });
  it('versi maks 5 dan pulihkan snapshot', () => {
    let s = makeScene({ flowPrompts: { standard: 'v0' } });
    for (let i = 1; i <= 7; i++) s = pushVersion({ ...s, flowPrompts: { standard: `v${i}` } }, 'edited', i);
    expect(s.versions).toHaveLength(5);
    expect(s.versions[0].prompt).toBe('v7');
    const old = s.versions[4];
    const restored = restoreVersion({ ...s, title: 'Ganti' }, old, 100);
    expect(restored.flowPrompts.standard).toBe(old.prompt);
    expect(restored.id).toBe(s.id);
    expect(restored.versions.length).toBeLessThanOrEqual(5);
  });
  it('fitScenesDoc memangkas versi tertua bila > batas', () => {
    let s = makeScene({ flowPrompts: { standard: 'x'.repeat(5000) } });
    for (let i = 0; i < 5; i++) s = pushVersion(s, 'edited', i);
    const doc = { items: Array.from({ length: 5 }, (_, i) => ({ ...s, id: `s${i}` })), updatedAt: 0 };
    const r = fitScenesDoc(doc, 60_000);
    expect(r.trimmed).toBe(true);
    expect(r.doc.items[0].versions.length).toBeLessThan(5);
    expect(fitScenesDoc(doc, 10_000_000).trimmed).toBe(false);
  });
});
