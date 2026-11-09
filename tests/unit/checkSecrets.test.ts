// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/check-secrets.mjs', ...args], { encoding: 'utf8' });

describe('check:secrets (P1-02)', () => {
  it('mendeteksi key palsu di fixture', () => {
    const r = run('tests/fixtures/leaky');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('config.ts');
    expect(r.stderr).toContain('config-new.ts'); // format baru AQ.…
  });
  it('src bersih', () => {
    const r = run('src');
    expect(r.status).toBe(0);
  });
});
