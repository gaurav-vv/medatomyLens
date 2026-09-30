/**
 * Imaging report text → report statements (AGENTS.md Sections 106, 107, 111, 113).
 *
 * Reads sentences like "Right kidney: 1.8 cm simple cortical cyst at the lower
 * pole." and records WHERE the report places a statement: organ, side and
 * region, using only words inside the sentence. It never rewrites the
 * report's words and never names a condition: the sentence is quoted as is.
 *
 * Safety rules implemented here:
 * - A negated finding ("No calculus", "no evidence of cyst") is never marked;
 *   it is listed with no structure.
 * - A side is taken only from "right"/"left" in the same sentence; if both or
 *   neither appear for a paired organ, both sides are shown with no region.
 * - A region is used only when its organ (and side) is certain.
 * - Sizes in a sentence that compares with an earlier study are not taken.
 * - Sentences without a finding word (e.g. "Liver is normal in size") are not findings.
 */
import vocabulary from "@/data/medical/mappings/imaging_vocabulary.json";
import type { Confidence, FindingLocation, RawFinding } from "@/lib/medical/types";

interface OrganWords {
  id: string;
  words: string[];
  /** Short codes (vertebral levels such as "L4"): used only with spine context, never in a range. */
  codes?: string[];
  structure?: string;
  paired?: { left: string; right: string };
}
interface RegionWords {
  organ: string;
  words: string[];
  region: string;
  kind: "position" | "tissue";
}
interface Vocabulary {
  organs: OrganWords[];
  regions: RegionWords[];
  findingWords: string[];
  negationCues: string[];
  uncertaintyCues: string[];
  priorCues: string[];
  spine: { contextWords: string[]; levelRangePattern: string };
  contextSections: { labels: string[]; resultLabels: string[] };
}
const V = vocabulary as Vocabulary;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Word-boundary regex for a list of phrases ("?" is matched literally). */
const anyOf = (words: string[]) =>
  new RegExp(words.map((w) => (/^\W+$/.test(w) ? esc(w) : `\\b${esc(w).replace(/\s+/g, "\\s+")}\\b`)).join("|"), "gi");

const FINDING = anyOf(V.findingWords);
const NEGATION = anyOf(V.negationCues);
const UNCERTAIN = anyOf(V.uncertaintyCues);
const PRIOR = anyOf(V.priorCues);
const SIDE = /\b(right|left|bilateral|both)\b/gi;
const SIZE = /\b\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)*\s*(?:mm|cm)\b/i;
const ORGANS = V.organs.map((o) => ({ ...o, re: anyOf(o.words), codeRe: o.codes?.length ? new RegExp(`\\b(?:${o.codes.map(esc).join("|")})\\b`, "g") : null }));
const SPINE_CONTEXT = anyOf(V.spine.contextWords);
const LEVEL_RANGE = new RegExp(V.spine.levelRangePattern, "i");
const REGIONS = V.regions.map((r) => ({ ...r, re: anyOf(r.words) }));

interface Match {
  start: number;
  end: number;
}
function matches(re: RegExp, text: string): Match[] {
  re.lastIndex = 0;
  return [...text.matchAll(re)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

/** Sentences of one line, with their exact text (a substring of the line). */
export function sentences(line: string): string[] {
  const out: string[] = [];
  // Split after ". " but not inside numbers such as "1.8 cm".
  const re = /[^.!?]+(?:\.(?=\d)[^.!?]*)*[.!?]?/g;
  for (const m of line.matchAll(re)) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/** True when every finding word in the sentence sits in a clause that is negated before it. */
function allNegated(sentence: string, findings: Match[]): boolean {
  const clauses = [...sentence.matchAll(/[^;,]+/g)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
  return findings.every((f) => {
    const clause = clauses.find((c) => f.start >= c.start && f.start < c.end);
    if (!clause) return false;
    const before = sentence.slice(clause.start, f.start);
    const after = sentence.slice(f.end, clause.end);
    // "No cyst", "without calculus" (cue before) or "cyst not seen" (cue after).
    return matches(NEGATION, before).length > 0 || /\b(not\s+seen|not\s+visuali[sz]ed|absent|ruled\s+out)\b/i.test(after);
  });
}

export interface ImagingStatement {
  finding: RawFinding;
  negated: boolean;
}

/** One sentence → a statement about one organ, or null when it states nothing locatable. */
export function readSentence(sentence: string, page: number, id: string): ImagingStatement | null {
  const findingHits = matches(FINDING, sentence);
  if (!findingHits.length) return null;
  // Level codes (case-sensitive, e.g. "L4") only in a sentence about the spine that names one level.
  const codesOk = matches(SPINE_CONTEXT, sentence).length > 0 && !LEVEL_RANGE.test(sentence);
  const organs = ORGANS.map((o) => ({ o, hits: [...matches(o.re, sentence), ...(codesOk && o.codeRe ? matches(o.codeRe, sentence) : [])] })).filter(
    (x) => x.hits.length,
  );
  // Exactly one organ: a sentence about several organs is not guessed apart.
  if (organs.length !== 1) return null;
  const { o: organ, hits: organHits } = organs[0]!;

  const negated = allNegated(sentence, findingHits);
  const uncertain = matches(UNCERTAIN, sentence).length > 0;
  const prior = matches(PRIOR, sentence).length > 0;

  let structures: string[];
  let side: "left" | "right" | null = null;
  const evidence: Match[] = [...organHits];
  if (organ.paired) {
    const sides = matches(SIDE, sentence);
    const words = new Set(sides.map((m) => sentence.slice(m.start, m.end).toLowerCase()));
    if (words.size === 1 && (words.has("left") || words.has("right"))) {
      side = words.has("left") ? "left" : "right";
      evidence.push(...sides);
      structures = [organ.paired[side]];
    } else {
      // No side, both sides or "bilateral": both organs, no region (Section 107).
      structures = [organ.paired.left, organ.paired.right];
    }
  } else {
    structures = [organ.structure!];
  }

  let region: string | null = null;
  if (!organ.paired || side) {
    const hits = REGIONS.filter((r) => r.organ === organ.id).map((r) => ({ r, m: matches(r.re, sentence) })).filter((x) => x.m.length);
    // One position (pole, lobe) wins over a tissue layer; two of the same kind: no region.
    const position = hits.filter((h) => h.r.kind === "position");
    const pick = position.length === 1 ? position[0] : position.length === 0 && hits.length === 1 ? hits[0] : undefined;
    if (pick) {
      region = pick.r.region.replace("{side}", side ?? "");
      evidence.push(...pick.m);
    }
  }

  const start = Math.min(...evidence.map((e) => e.start));
  const end = Math.max(...evidence.map((e) => e.end));
  const location: FindingLocation = {
    structure: structures.length === 1 ? structures[0]! : organ.paired ? organ.paired.right : structures[0]!,
    region,
    laterality: side,
    specified: structures.length === 1,
    textEvidence: sentence.slice(start, end),
  };
  const size = !prior && !negated ? SIZE.exec(sentence)?.[0] : undefined;
  const confidence: Confidence = uncertain || !side && !!organ.paired ? "low" : "medium";
  const organName = side ? `${side[0]!.toUpperCase()}${side.slice(1)} ${organ.id.replace(/_/g, " ")}` : organ.id.replace(/_/g, " ");

  return {
    negated,
    finding: {
      id,
      findingType: "report_statement",
      name: `${organName[0]!.toUpperCase()}${organName.slice(1)} (report statement)`,
      statedBy: "report",
      statementText: sentence,
      // A negated finding is listed but never drawn (Section 111).
      anatomicalStructures: negated ? [] : structures,
      location: negated ? null : location,
      size: size ? { text: size, specified: true } : null,
      source: { page, text: sentence },
      confidence,
      negated: negated || undefined,
    },
  };
}

/**
 * Why the study was done ("Clinical indication: suspected fracture") is a question,
 * not a finding: such lines are never read as statements. A label alone on its
 * line starts a section that lasts until the next findings/impression heading.
 */
const CONTEXT_LABEL = anyOf(V.contextSections.labels);
const RESULT_LABEL = anyOf(V.contextSections.resultLabels);
const startsWith = (re: RegExp, text: string) => matches(re, text).some((m) => m.start === text.search(/\S/));
const labelOnly = (re: RegExp, text: string) => startsWith(re, text) && text.replace(re, "").replace(/[\s:.\-–]/g, "") === "";

export function parseImagingLines(page: number, lines: { text: string; index: number }[]): RawFinding[] {
  const out: RawFinding[] = [];
  let inContext = false;
  for (const { text, index } of lines) {
    if (startsWith(RESULT_LABEL, text)) inContext = false;
    if (startsWith(CONTEXT_LABEL, text)) {
      // "Clinical history: ..." is skipped; a bare "CLINICAL HISTORY" heading also skips what follows.
      inContext = labelOnly(CONTEXT_LABEL, text);
      continue;
    }
    if (inContext) continue;
    sentences(text).forEach((s, i) => {
      const st = readSentence(s, page, `p${page}_s${index + 1}_${i + 1}`);
      if (st) out.push(st.finding);
    });
  }
  return out;
}
