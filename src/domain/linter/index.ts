import type { Scene, Variant } from '@/types';
import { scenePrompt } from '@/domain/promptText';
import type { LintContext, LintIssue, LintRule } from './types';
import { L01, L04, L06, L10, L11, L13 } from './rules/structure';
import { L02, L03 } from './rules/consistency';
import { L05, L07, L08, L09, L12 } from './rules/content';

export type { LintIssue, LintContext, LintRule, LintSeverity } from './types';
export { applyLintFixes, FIX_LABEL, FIXABLE_RULES, isFixable, type FixableRule } from './fixes';

export const LINT_RULES: LintRule[] = [L01, L02, L03, L04, L05, L06, L07, L08, L09, L10, L11, L12, L13];

export function lintScene(scene: Scene, ctx: LintContext, disabled: string[] = []): LintIssue[] {
  const prompt = scenePrompt(scene, ctx.variant);
  return LINT_RULES.filter((r) => !disabled.includes(r.id)).flatMap((r) =>
    r.check(scene, ctx, prompt).map((message) => ({ ruleId: r.id, severity: r.severity, sceneId: scene.id, message })),
  );
}

export function lintAll(
  ctx: Omit<LintContext, 'variant'> & { variant?: Variant },
  disabled: string[] = [],
): Record<string, LintIssue[]> {
  const full: LintContext = { ...ctx, variant: ctx.variant ?? 'standard' };
  return Object.fromEntries(full.scenes.map((s) => [s.id, lintScene(s, full, disabled)]));
}

export function worstSeverity(issues: LintIssue[]): LintIssue['severity'] | null {
  if (issues.some((i) => i.severity === 'error')) return 'error';
  if (issues.some((i) => i.severity === 'warn')) return 'warn';
  if (issues.length > 0) return 'info';
  return null;
}
