/**
 * Words app-authored text must not use (AGENTS.md Section 114). Shared by the
 * wording test and the AI answer guard (lib/ai/guard.ts). This file lists them
 * on purpose, so the wording test skips it.
 */
export const DISALLOWED_WORDING = [
  "damaged",
  "diseased",
  "infected",
  "failing",
  "dangerous",
  "severe",
  "critical",
  "you have",
] as const;
