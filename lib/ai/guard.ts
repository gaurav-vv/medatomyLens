import { DISALLOWED_WORDING } from "../medical/wording";

/**
 * Checks AI answers before they are shown (AGENTS.md Sections 34, 114, 118).
 * Runs in the chat Worker (a failing answer never leaves the server) and again
 * in the app. A blocked answer is withheld as a whole, never edited.
 */
export type GuardResult = { ok: true } | { ok: false; reason: "wording" | "treatment" };

const WORDING = DISALLOWED_WORDING.map((w) => new RegExp(`\\b${w}\\b`, "i"));

const TREATMENT = [
  // Doses such as "500 mg" or "1000 IU", but not result units such as "2.8 mg/dL" or "5 IU/mL".
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug|iu|units?)\b(?!\s*\/)/i,
  /\b(?:dose|dosage|doses)\b/i,
  /\byou should (?:take|start|stop|increase|reduce|lower|raise)\b/i,
];

export function checkAnswer(text: string): GuardResult {
  if (WORDING.some((r) => r.test(text))) return { ok: false, reason: "wording" };
  if (TREATMENT.some((r) => r.test(text))) return { ok: false, reason: "treatment" };
  return { ok: true };
}
