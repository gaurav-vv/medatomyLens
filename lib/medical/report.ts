import termsFile from "@/data/medical/mappings/terms.json";
import regionsFile from "@/data/medical/regions.json";
import creatinine from "@/data/medical/explanations/creatinine.json";
import egfr from "@/data/medical/explanations/estimated_glomerular_filtration_rate.json";
import alt from "@/data/medical/explanations/alanine_aminotransferase.json";
import type {
  Explanation,
  FindingStatus,
  LocationDisplay,
  RawFinding,
  RawReport,
  ReferenceRange,
  Region,
  ResolvedFinding,
  ResolvedReport,
  Term,
} from "./types";

/** Curated data (small, bundled): terminology, regions, explanations. */
export const TERMS: Term[] = termsFile.terms as Term[];
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
const EXPLANATIONS: Record<string, Explanation> = Object.fromEntries(
  ([creatinine, egfr, alt] as Explanation[]).map((e) => [e.normalizedTerm, e]),
);

/** Case, spacing and punctuation-insensitive key ("ALT (SGPT)" → "altsgpt"). */
export function termKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const TERM_BY_KEY = new Map<string, Term>();
for (const t of TERMS) for (const s of t.synonyms) TERM_BY_KEY.set(termKey(s), t);

/** Exact synonym match only: no fuzzy guessing (Section 90). */
export function findTerm(name: string): Term | null {
  return TERM_BY_KEY.get(termKey(name)) ?? null;
}

export function explanationFor(normalizedTerm: string | undefined | null): Explanation | null {
  return normalizedTerm ? (EXPLANATIONS[normalizedTerm] ?? null) : null;
}

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
  return { total: findings.length, mapped, review, unmapped: findings.length - mapped - review };
}

/** Human text for a reference range bar (accessibility, Section 110). */
export function rangeText(f: RawFinding): string {
  const value = `${f.value} ${f.unit ?? ""}`.trim();
  const status = rangeStatus(f.value, f.referenceRange);
  if (status === "UNKNOWN") return `${value}. Reference range unavailable.`;
  return `${value}, ${STATUS_LABEL[status].toLowerCase()} (${f.referenceRange!.text} ${f.unit ?? ""}).`.replace(" )", ")");
}
