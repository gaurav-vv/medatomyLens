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

/** A number; thousands separators ("12,500") only in the exact 1,234 pattern. */
const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)`;
const num = (s: string) => Number(s.replace(/,/g, ""));
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
    const low = num(m[1]);
    const high = num(m[2]);
    return low <= high ? { low, high, text } : null;
  }
  m = RANGE_BELOW.exec(text);
  if (m?.[1]) return { low: null, high: num(m[1]), text };
  m = RANGE_ABOVE.exec(text);
  if (m?.[1]) return { low: num(m[1]), high: null, text };
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

/** "Creatinine :" / "* Creatinine" → "Creatinine" (the quote keeps the original row). */
const cleanName = (s: string) => s.replace(/^[*•\s]+/, "").replace(/[\s:*]+$/, "").trim();
const hasDigit = (s: string) => /\d/.test(s);
/** A text-only cell such as a method or specimen column ("Serum", "Photometry"): ignored, never guessed into a value. */
const isTextCell = (s: string) => !hasDigit(s) && s.length <= 40;
/** "1.9 mg/dL" in one cell. */
const VALUE_UNIT_RE = new RegExp(`^(${NUM})\\s+(\\S+)$`);
/** A range with a label ("Male: 0.7 - 1.3", "Adult 10-40"): which one applies depends on context, so no range is taken (Section 69). */
const LABELED_RANGE = new RegExp(`^[A-Za-z][A-Za-z ./()]*:?\\s*(?:${NUM}\\s*(?:-|–|to)\\s*${NUM}|(?:<=?|>=?|≤|≥)\\s*${NUM})`, "i");

/** "mg/dL 0.7 - 1.3" or "0.7 - 1.3 mg/dL" printed in one cell. */
function unitAndRange(cell: string): { unit: string; range: ReferenceRange } | null {
  const lead = /^(\S+)\s+(.+)$/.exec(cell);
  if (lead?.[1] && lead[2] && isUnit(lead[1])) {
    const range = parseRange(lead[2]);
    if (range) return { unit: lead[1], range };
  }
  const trail = /^(.+?)\s+(\S+)$/.exec(cell);
  if (trail?.[1] && trail[2] && isUnit(trail[2])) {
    const range = parseRange(trail[1]);
    if (range) return { unit: trail[2], range };
  }
  return null;
}

function readValue(cell: string): { value: number; flag: string | null; unit: string | null } | null {
  const v = VALUE_RE.exec(cell) ?? VALUE_FLAG_RE.exec(cell);
  if (v?.[1]) return { value: num(v[1]), flag: v[2] ?? null, unit: null };
  const u = VALUE_UNIT_RE.exec(cell);
  if (u?.[1] && u[2] && isUnit(u[2])) return { value: num(u[1]), flag: null, unit: u[2] };
  return null;
}

/** One row → the printed fields, or null when the row is not clearly a numeric lab result. */
export function parseRow(cells: string[]): (ParsedRow & { layout: "table" | "text" }) | null {
  const [rawName, first] = cells;
  if (rawName === undefined) return null;
  const name = cleanName(rawName);
  if (first !== undefined) {
    if (!nameOk(name)) return null;
    // The value is the first numeric cell after the name. Only text-only cells
    // (method, specimen) may sit in between; anything else is not guessed around.
    let at = 1;
    while (at < cells.length && isTextCell(cells[at]!) && !isUnit(cells[at]!) && !FLAG_RE.test(cells[at]!)) at++;
    const v = at < cells.length ? readValue(cells[at]!) : null;
    if (!v) return null;
    let { flag, unit } = v;
    let range: ReferenceRange | null = null;
    let rangeWithheld = false;
    for (const c of cells.slice(at + 1)) {
      const asRange = parseRange(c);
      const combined: { unit: string; range: ReferenceRange } | null = !range ? unitAndRange(c) : null;
      if (!flag && FLAG_RE.test(c)) flag = c;
      else if (!unit && isUnit(c)) unit = c;
      else if (!range && asRange) range = asRange;
      else if (combined) {
        range = combined.range;
        unit ??= combined.unit;
      }
      else if (!range && !rangeWithheld && LABELED_RANGE.test(c)) rangeWithheld = true;
      else if (!isTextCell(c)) return null; // a numeric cell we cannot place (e.g. a previous result): do not guess
    }
    if (!unit && !range && !rangeWithheld) return null;
    return { name, value: v.value, unit, referenceRange: range, flag, layout: "table" };
  }
  const g = ONE_CELL.exec(rawName)?.groups;
  if (!g?.name || !g.value) return null;
  const n = cleanName(g.name);
  if (!nameOk(n)) return null;
  const unit = g.unit && isUnit(g.unit) ? g.unit : null;
  if (g.unit && !unit) return null;
  const range = g.range ? parseRange(g.range) : null;
  if (!unit && !range) return null;
  return { name: n, value: num(g.value), unit, referenceRange: range, flag: g.flag ?? null, layout: "text" };
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
