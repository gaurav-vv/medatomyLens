/**
 * Report finding model (AGENTS.md Sections 14, 66, 106). Findings are data,
 * never UI decisions: which structures a lab marker is associated with comes
 * from the curated terminology, not from the report or an AI.
 */

export type Confidence = "high" | "medium" | "low" | "unknown";

export type FindingStatus =
  | "NORMAL"
  | "ABOVE_RANGE"
  | "BELOW_RANGE"
  | "REPORT_STATED"
  | "UNKNOWN"
  | "NOT_INTERPRETED";

export interface ReferenceRange {
  low: number | null;
  high: number | null;
  /** The range exactly as printed in the report. */
  text: string;
}

export interface FindingSource {
  page: number;
  /** Exact text from the report page. */
  text: string;
}

export interface FindingLocation {
  structure: string;
  region: string | null;
  laterality: "left" | "right" | "bilateral" | null;
  specified: boolean;
  textEvidence: string;
}

export interface RawFinding {
  id: string;
  findingType: "lab_association" | "report_statement";
  name: string;
  value?: number | null;
  unit?: string | null;
  referenceRange?: ReferenceRange | null;
  statedBy?: "report" | "app";
  statementText?: string;
  anatomicalStructures?: string[];
  location?: FindingLocation | null;
  size?: { text: string; specified: boolean } | null;
  source: FindingSource;
  confidence: Confidence;
}

export interface ReportPage {
  page: number;
  heading: string;
  lines: string[];
}

export interface RawReport {
  documentId: string;
  title: string;
  isDemo: boolean;
  date: string;
  pages: ReportPage[];
  findings: RawFinding[];
}

export interface Term {
  normalizedTerm: string;
  displayName: string;
  synonyms: string[];
  category: string;
  associatedStructures: string[];
  system: string;
  visualizationType: "association";
  mappingReason: string;
}

export interface Explanation {
  normalizedTerm: string;
  title: string;
  review: { status: "pending" | "reviewed"; note: string };
  sources: { id: string; title: string; url: string; accessed: string }[];
  measures: string;
  context: string;
  aboveRange: string[];
  belowRange: string[];
  nextStep: string;
}

export interface OverlayRegion {
  parentStructure: string;
  displayName: string;
  supportedBy: "overlay";
  overlay: { type: "pin_marker"; position: [number, number, number] };
}

export interface MeshRegion {
  parentStructure: string;
  displayName: string;
  supportedBy: "mesh";
  /** Part ids of the detailed organ model. */
  parts: string[];
}

export type Region = OverlayRegion | MeshRegion;

/** How the 3D view may show a finding's location (Section 107). */
export type LocationDisplay =
  | { kind: "unspecified" }
  | { kind: "region"; regionId: string; region: Region }
  | { kind: "region_unavailable"; regionId: string };

export interface ResolvedFinding {
  raw: RawFinding;
  status: FindingStatus;
  /** Curated term, when the finding name matched one. */
  term: Term | null;
  /** Body-model structure ids this finding is shown on. Empty = unmapped. */
  structures: string[];
  /** Why these structures are shown. */
  mappingReason: string | null;
  location: LocationDisplay;
  /** Validation problems. Any problem means the finding is not visualized. */
  issues: string[];
}

export interface ResolvedReport {
  documentId: string;
  title: string;
  isDemo: boolean;
  date: string;
  pages: ReportPage[];
  findings: ResolvedFinding[];
}
