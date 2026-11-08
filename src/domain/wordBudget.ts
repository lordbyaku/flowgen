import { VO_FILL_RATIO, WORDS_PER_SEC } from '@/config/constants';
import type { ScriptLanguage } from '@/types';
import { countWords } from '@/lib/utils';

export function wpsFor(lang: ScriptLanguage): number {
  return lang === 'en' ? WORDS_PER_SEC.en : WORDS_PER_SEC.id;
}

export function totalWordBudget(durationSec: number, lang: ScriptLanguage): number {
  return Math.floor(durationSec * VO_FILL_RATIO * wpsFor(lang));
}

export function sceneWordBudget(sceneSec: number, lang: ScriptLanguage): number {
  return Math.floor(sceneSec * VO_FILL_RATIO * wpsFor(lang));
}

export function estimateSpokenSec(text: string, lang: ScriptLanguage): number {
  return Math.round((countWords(text) / wpsFor(lang)) * 10) / 10;
}

export interface WordCheck {
  words: number;
  budget: number;
  over: boolean;
}

export function checkWords(text: string, budget: number): WordCheck {
  const words = countWords(text);
  return { words, budget, over: words > budget };
}
