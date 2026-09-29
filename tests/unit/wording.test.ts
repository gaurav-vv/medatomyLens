import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * AGENTS.md Section 114: app-authored text must not use diagnostic wording.
 * Scans string literals and JSX text in app code. Quoted report text is never
 * stored in source files, so any hit here is app-authored.
 */
const DISALLOWED = [
  "damaged",
  "diseased",
  "infected",
  "failing",
  "dangerous",
  "severe",
  "critical",
  "you have",
];

const ROOTS = ["app", "components", "lib", "data"];
const EXTS = new Set([".ts", ".tsx", ".json"]);

function walk(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : EXTS.has(extname(p)) ? [p] : [];
  });
}

// String literals ('..', "..", `..`) and JSX text between > and <.
const TEXT_PATTERN = /(["'`])((?:\\.|(?!\1).)*)\1|>([^<>{}]+)</g;

function extractText(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(TEXT_PATTERN)) out.push((m[2] ?? m[3] ?? "").toLowerCase());
  return out;
}

describe("UI wording rules (Section 114)", () => {
  const files = ROOTS.flatMap((r) => walk(r));

  it("finds source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has no disallowed wording", (file) => {
    const texts = extractText(readFileSync(file, "utf8"));
    const hits = DISALLOWED.filter((word) =>
      texts.some((t) => new RegExp(`\\b${word}\\b`).test(t)),
    );
    expect(hits).toEqual([]);
  });

  it("detects a disallowed word (self-check)", () => {
    const texts = extractText(`const s = "Your kidney is damaged";`);
    expect(texts.some((t) => /\bdamaged\b/.test(t))).toBe(true);
  });
});
