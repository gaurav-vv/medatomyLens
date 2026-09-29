/**
 * Rule-based lab-row parser (AGENTS.md Sections 16, 18, 66–69).
 *
 * Reads rows like "Creatinine | 1.9 | H | mg/dL | 0.7 - 1.3" into findings.
 * It only records what the row prints: the name as written, the value, the
 * unit exactly as printed (never converted, Section 67) and the report's own
 * reference range (never a substituted one, Section 68). Which organ a test is
 * associated with is decided later by the curated terminology, not here.
 *
 * Anything it cannot read with confidence is not turned into a finding. The
 * quote of every finding is the full row text, which is a line of its page,
 * so the existing exact-quote check (lib/medical/report.ts) verifies it.
 */
import type { Confidence, RawFinding, ReferenceRange } from "@/lib/medical/types";
import type { TextRow } from "./layout";

const NUM = String.raw`\d+(?:\.\d+)?`;
const VALUE_RE = new RegExp(`^(${NUM})$`);
/** A value with a trailing flag in the same cell: "1.9 H", "1.9H", "1.9*". */
const VALUE_FLAG_RE = new RegExp(`^(${NUM})\\s*(H|L|HIGH|LOW|\\*)$`, "i");
const FLAG_RE = /^(H|L|HIGH|LOW|\*|↑|↓)$/i;
const RANGE_BETWEEN = new RegExp(`^(${NUM})\\s*(?:-|–|—|to)\\s*(${NUM})$`, "i");
const RANGE_BELOW = new RegExp(`^(?:<=?|≤|up\\s*to|upto|less than)\\s*(${NUM})$`, "i");
const RANGE_ABOVE = new RegExp(`^(?:>=?|≥|more than|greater than)\\s*(${NUM})$`, "i");

/** Unit tokens: must look like a unit, so words such as "Jaffe" or "Years" are not taken as one. */
const UNIT_WORDS = /^(fl|pg|sec|secs|seconds|ratio|mg|g|ng|iu|u|mmhg|cells|million|mill|lakhs|thou)$/i;
const UNIT_SHAPE = /^[A-Za-zµμ%\/^0-9.²³*×\s-]{1,28}$/;
export function isUnit(cell: string): boolean {
  const c = cell.trim();
  if (!UNIT_SHAPE.test(c)) return false;
  // Starts with a number: only "10^3/µL"-style counts. Spaces: only "mL/min/1.73 m2".
  if (/^\d/.test(c) && !/^10\^?\d/.test(c)) return false;
  if (/\s/.test(c) && !/^\S+\/1\.73\s?m(2|²)$/.test(c)) return false;
  return c.includes("/") || c.includes("%") || /10\^?\d/.test(c) || UNIT_WORDS.test(c);
}

export function parseRange(cell: string): ReferenceRange | null {
  const text = cell.trim();
  let m = RANGE_BETWEEN.exec(text);
  if (m?.[1] && m[2]) {
    const low = Number(m[1]);
    const high = Number(m[2]);
    return low <= high ? { low, high, text } : null;
  }
  m = RANGE_BELOW.exec(text);
  if (m?.[1]) return { low: null, high: Number(m[1]), text };
  m = RANGE_ABOVE.exec(text);
  if (m?.[1]) return { low: Number(m[1]), high: null, text };
  return null;
}

/** Header cells and patient/report details: never lab results (Sections 28, 29). */
const HEADER = /^(tests?|test names?|investigations?|parameters?|descriptions?|analytes?|examinations?)$/i;
const NOT_A_TEST =
  /\b(age|sex|gender|patient|name|id|uhid|mrn|no\.?|number|date|phone|mobile|tel|ref(erred)?|sample|specimen|lab|bill|page|collected|received|reported|registration|reg|barcode|pin|address|doctor|dr)\b/i;

export interface ParsedRow {
  name: string;
  value: number;
  unit: string | null;
  referenceRange: ReferenceRange | null;
  flag: string | null;
}

/** Splits a one-cell row ("Creatinine 1.9 mg/dL 0.7 - 1.3") when the PDF has no column gaps. */
const ONE_CELL = new RegExp(
  `^(?<name>[A-Za-z][A-Za-z0-9 ().,'/+-]*?)\\s+(?<value>${NUM})(?:\\s*(?<flag>H|L|High|Low|\\*))?` +
    `(?:\\s+(?<unit>[A-Za-zµμ%][A-Za-z0-9µμ%/^.²³*×-]*))?` +
    `(?:\\s+(?<range>(?:${NUM}\\s*(?:-|–|to)\\s*${NUM})|(?:(?:<=?|>=?|≤|≥|up to)\\s*${NUM})))?$`,
  "i",
);

function nameOk(name: string): boolean {
  return /[A-Za-z]{2,}/.test(name) && !HEADER.test(name) && !NOT_A_TEST.test(name) && name.length <= 60;
}

/** One row → the printed fields, or null when the row is not clearly a numeric lab result. */
export function parseRow(cells: string[]): (ParsedRow & { layout: "table" | "text" }) | null {
  const [name, first, ...rest] = cells;
  if (name === undefined) return null;
  if (first !== undefined) {
    if (!nameOk(name)) return null;
    // The value is the cell right after the name (a method column in between is not guessed around).
    const v = VALUE_RE.exec(first) ?? VALUE_FLAG_RE.exec(first);
    if (!v?.[1]) return null;
    const value = Number(v[1]);
    let flag: string | null = v[2] ?? null;
    let unit: string | null = null;
    let range: ReferenceRange | null = null;
    for (const c of rest) {
      const asRange = parseRange(c);
      if (!flag && FLAG_RE.test(c)) flag = c;
      else if (!unit && isUnit(c)) unit = c;
      else if (!range && asRange) range = asRange;
      else if (!unit && !range) {
        // "mg/dL 0.7 - 1.3" printed in one cell.
        const m = /^(\S+)\s+(.+)$/.exec(c);
        const r = m?.[2] ? parseRange(m[2]) : null;
        if (!m?.[1] || !isUnit(m[1]) || !r) return null;
        unit = m[1];
        range = r;
      } else return null; // an extra cell we cannot place: do not guess
    }
    if (!unit && !range) return null;
    return { name, value, unit, referenceRange: range, flag, layout: "table" };
  }
  const g = ONE_CELL.exec(name)?.groups;
  if (!g?.name || !g.value) return null;
  const n = g.name.trim();
  if (!nameOk(n)) return null;
  const unit = g.unit && isUnit(g.unit) ? g.unit : null;
  if (g.unit && !unit) return null;
  const range = g.range ? parseRange(g.range) : null;
  if (!unit && !range) return null;
  return { name: n, value: Number(g.value), unit, referenceRange: range, flag: g.flag ?? null, layout: "text" };
}

export interface PageRows {
  page: number;
  rows: TextRow[];
  method: "text" | "ocr";
}

export interface ParseResult {
  findings: RawFinding[];
  /** Rows that had OCR words below the confidence threshold. */
  lowConfidenceRows: number;
}

/** OCR words below this confidence make their row unusable as a finding. */
export const MIN_OCR_CONFIDENCE = 60;

export function parseLabPages(pages: PageRows[]): ParseResult {
  const findings: RawFinding[] = [];
  let lowConfidenceRows = 0;
  for (const p of pages) {
    p.rows.forEach((row, r) => {
      const parsed = parseRow(row.cells);
      if (!parsed) return;
      if (p.method === "ocr" && (row.minConfidence ?? 0) < MIN_OCR_CONFIDENCE) {
        lowConfidenceRows++;
        return;
      }
      const confidence: Confidence = p.method === "ocr" ? "low" : parsed.layout === "table" ? "high" : "medium";
      findings.push({
        id: `p${p.page}_r${r + 1}`,
        findingType: "lab_association",
        name: parsed.name,
        value: parsed.value,
        unit: parsed.unit,
        referenceRange: parsed.referenceRange,
        source: { page: p.page, text: row.text },
        confidence,
      });
    });
  }
  return { findings, lowConfidenceRows };
}
