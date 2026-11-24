import { FLOW_CREDITS } from '@/config/constants';

export interface FlowCreditEstimate {
  clips: number;
  seconds: number;
  /** Draft 360p. */
  draft: number;
  /** 720p. */
  hd: number;
}

/** Kredit satu klip Gemini Omni di Flow: tarif dasar sampai 10 detik, detik berikutnya dua kali lipat. */
export function clipCredits(sec: number, perSec: number): number {
  const s = Math.max(0, Math.round(sec));
  const base = Math.min(s, FLOW_CREDITS.baseSec);
  return base * perSec + (s - base) * perSec * 2;
}

/** Perkiraan kredit Flow untuk satu kali render setiap klip (tanpa render ulang, edit, atau upscale). */
export function estimateFlowCredits(durations: number[]): FlowCreditEstimate {
  return {
    clips: durations.length,
    seconds: durations.reduce((a, b) => a + Math.max(0, Math.round(b)), 0),
    draft: durations.reduce((a, d) => a + clipCredits(d, FLOW_CREDITS.draftPerSec), 0),
    hd: durations.reduce((a, d) => a + clipCredits(d, FLOW_CREDITS.hdPerSec), 0),
  };
}
