import type { BiblesDoc, Brief, Scene, Variant } from '@/types';

export type LintSeverity = 'error' | 'warn' | 'info';

export interface LintIssue {
  ruleId: string;
  severity: LintSeverity;
  sceneId: string;
  message: string;
}

export interface LintContext {
  brief: Brief;
  bibles: BiblesDoc | null;
  scenes: Scene[];
  variant: Variant;
}

export type LintRule = {
  id: string;
  severity: LintSeverity;
  title: string;
  check: (scene: Scene, ctx: LintContext, prompt: string) => string[];
};
