import termsFile from "@/data/medical/mappings/terms.json";
import regionsFile from "@/data/medical/regions.json";
import type {
  FindingStatus,
  LocationDisplay,
  RawFinding,
  RawReport,
  ReferenceRange,
  Region,
  ResolvedFinding,
  ResolvedReport,
  Term,
  TermGroup,
} from "./types";

/** Curated data (small, bundled): terminology, regions, explanations. */
export const TERMS: Term[] = termsFile.terms as Term[];
export const TERM_GROUPS: TermGroup[] = termsFile.groups as TermGroup[];
export const REGIONS: Record<string, Region> = parseRegions(regionsFile.regions);

/** Validate the region data file: only regions the viewer can display (Section 105). */
export function parseRegions(data: unknown): Record<string, Region> {
  const out: Record<string, Region> = {};
  for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
    const r = value as Partial<Region> & { overlay?: { position?: unknown }; parts?: unknown };
    if (!r.parentStructure || !r.displayName || !id.startsWith(`${r.parentStructure}_`)) throw new Error(`Region invalid: ${id}`);
    if (r.supportedBy === "overlay") {
      const p = r.overlay?.position;
      if (!Array.isArray(p) || p.length !== 3 || p.some((n) => typeof n !== "number" || Math.abs(n) > 1))
        throw new Error(`Region overlay invalid: ${id}`);
    } else if (r.supportedBy === "mesh") {
      if (!Array.isArray(r.parts) || r.parts.length === 0) throw new Error(`Region parts missing: ${id}`);
    } else throw new Error(`Region support invalid: ${id}`);
    out[id] = r as Region;
  }
  return out;
}
/** Case, spacing and punctuation-insensitive key ("ALT (SGPT)" → "altsgpt", "SpO₂" → "spo2"). */
export function termKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2080-\u2089]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[\u00b2\u00b3\u00b9]/g, (c) => (c === "\u00b9" ? "1" : c === "\u00b2" ? "2" : "3"))
    .replace(/[^a-z0-9]+/g, "");
}

const TERM_BY_KEY = new Map<string, Term>();
for (const t of TERMS) for (const s of t.synonyms) TERM_BY_KEY.set(termKey(s), t);

/** Exact synonym match only: no fuzzy guessing (Section 90). */
export function findTerm(name: string): Term | null {
  return TERM_BY_KEY.get(termKey(name)) ?? null;
}

export { explanationFor } from "./explanations";

/** Position of a value against the report's own range (Sections 68, 110). */
export function rangeStatus(value: number | null | undefined, range: ReferenceRange | null | undefined): FindingStatus {
  if (value == null || !Number.isFinite(value)) return "UNKNOWN";
  if (!range || (range.low == null && range.high == null)) return "UNKNOWN";
  if (range.high != null && value > range.high) return "ABOVE_RANGE";
  if (range.low != null && value < range.low) return "BELOW_RANGE";
  return "NORMAL";
}

export const STATUS_LABEL: Record<FindingStatus, string> = {
  NORMAL: "Within reported range",
  ABOVE_RANGE: "Above reported range",
  BELOW_RANGE: "Below reported range",
  REPORT_STATED: "The report states",
  UNKNOWN: "Reference range unavailable",
  NOT_INTERPRETED: "Not interpreted",
};

function locationOf(raw: RawFinding): LocationDisplay {
  const loc = raw.location;
  if (!loc || !loc.specified || !loc.region) return { kind: "unspecified" };
  const region = REGIONS[loc.region];
  if (!region || region.parentStructure !== loc.structure) return { kind: "region_unavailable", regionId: loc.region };
  return { kind: "region", regionId: loc.region, region };
}

/**
 * Validate and map one finding. Validation mirrors what extracted reports
 * will need: the quote must be on its page, and any location words must be
 * inside the quote. A failed check never becomes a visualized finding.
 */
export function resolveFinding(raw: RawFinding, pages: RawReport["pages"], knownStructures: (id: string) => boolean): ResolvedFinding {
  const issues: string[] = [];
  const page = pages.find((p) => p.page === raw.source.page);
  if (!page) issues.push(`Source page ${raw.source.page} is missing.`);
  else if (!page.lines.some((l) => l.includes(raw.source.text))) issues.push("Source text was not found on its page.");

  let term: Term | null = null;
  let structures: string[] = [];
  let mappingReason: string | null = null;
  let status: FindingStatus;

  if (raw.findingType === "lab_association") {
    term = findTerm(raw.name);
    if (term) {
      structures = term.associatedStructures;
      mappingReason = term.mappingReason;
    }
    status = rangeStatus(raw.value, raw.referenceRange);
  } else {
    status = "REPORT_STATED";
    structures = raw.anatomicalStructures ?? [];
    mappingReason = "The report itself names this structure.";
    const loc = raw.location;
    if (loc?.specified) {
      if (!raw.source.text.includes(loc.textEvidence)) issues.push("Location words are not part of the quoted text.");
      if (!structures.includes(loc.structure)) issues.push("Location structure is not one of the finding's structures.");
    }
    if (!raw.statementText || !raw.source.text.includes(raw.statementText.replace(/\.$/, "")))
      issues.push("Statement is not an exact quote of the report.");
  }

  const unknown = structures.filter((s) => !knownStructures(s));
  if (unknown.length) issues.push(`Unknown structures: ${unknown.join(", ")}.`);
  if (issues.length) {
    return { raw, status: "NOT_INTERPRETED", term, structures: [], mappingReason: null, location: { kind: "unspecified" }, issues };
  }
  return { raw, status, term, structures, mappingReason, location: locationOf(raw), issues };
}

export function resolveReport(report: RawReport, knownStructures: (id: string) => boolean): ResolvedReport {
  return {
    documentId: report.documentId,
    title: report.title,
    isDemo: report.isDemo,
    date: report.date,
    pages: report.pages,
    findings: report.findings.map((f) => resolveFinding(f, report.pages, knownStructures)),
  };
}

/** Findings associated with any of the given structure ids. */
export function findingsForStructures(findings: ResolvedFinding[], ids: Iterable<string>): ResolvedFinding[] {
  const set = new Set(ids);
  return findings.filter((f) => f.structures.some((s) => set.has(s)));
}

/** Counts for the report summary (Section 39). */
export function reportSummary(findings: ResolvedFinding[]) {
  const mapped = findings.filter((f) => f.structures.length > 0).length;
  const review = findings.filter((f) => f.status === "NOT_INTERPRETED").length;
  // Recognized tests that are listed under their group but have no single organ.
  const grouped = findings.filter((f) => f.status !== "NOT_INTERPRETED" && !f.structures.length && (f.term || f.raw.negated)).length;
  return { total: findings.length, mapped, review, grouped, unmapped: findings.length - mapped - review - grouped };
}

export interface FindingSection {
  id: string;
  title: string;
  /** Why nothing is highlighted for this section, when that is the case. */
  note?: string;
  findings: ResolvedFinding[];
}

/**
 * Findings grouped for the list (organ first, then body-wide test groups,
 * then report statements, unrecognized tests and rows that need review).
 */
export function groupFindings(findings: ResolvedFinding[], structureName: (id: string) => string): FindingSection[] {
  const sections = new Map<string, FindingSection>();
  const add = (id: string, title: string, f: ResolvedFinding, note?: string) => {
    const s = sections.get(id) ?? { id, title, note, findings: [] };
    s.findings.push(f);
    sections.set(id, s);
  };
  const groupById = new Map(TERM_GROUPS.map((g) => [g.id, g]));
  for (const f of findings) {
    if (f.status === "NOT_INTERPRETED") add("review", "Needs review", f);
    else if (f.raw.findingType === "report_statement") {
      const where = f.structures.length ? f.structures.map(structureName).join(", ") : "Not marked";
      add(`statement:${where}`, `Report statements · ${where}`, f, f.structures.length ? undefined : "Findings the report states were not found.");
    } else if (f.term) {
      const g = groupById.get(f.term.group);
      add(`group:${f.term.group}`, g?.displayName ?? f.term.group, f, g?.note);
    } else add("unknown", "Not in the app's terminology yet", f, "Listed from the report, not linked to a structure.");
  }
  // Within a section, results outside the reported range come first.
  const outside = (f: ResolvedFinding) => (f.status === "ABOVE_RANGE" || f.status === "BELOW_RANGE" ? 0 : 1);
  for (const s of sections.values()) s.findings.sort((a, b) => outside(a) - outside(b));
  const order = (s: FindingSection) =>
    s.id === "review" ? 4 : s.id === "unknown" ? 3 : s.id.startsWith("statement:") ? 1 : s.findings.some((f) => f.structures.length) ? 0 : 2;
  const groupOrder = (s: FindingSection) => TERM_GROUPS.findIndex((g) => `group:${g.id}` === s.id);
  return [...sections.values()].sort((a, b) => order(a) - order(b) || groupOrder(a) - groupOrder(b));
}

/** Human text for a reference range bar (accessibility, Section 110). */
export function rangeText(f: RawFinding): string {
  const value = `${f.value} ${f.unit ?? ""}`.trim();
  const status = rangeStatus(f.value, f.referenceRange);
  if (status === "UNKNOWN") return `${value}. Reference range unavailable.`;
  return `${value}, ${STATUS_LABEL[status].toLowerCase()} (${f.referenceRange!.text} ${f.unit ?? ""}).`.replace(" )", ")");
}
