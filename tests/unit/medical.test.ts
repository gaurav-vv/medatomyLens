import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import demo from "@/data/medical/demo/demo_report.json";
import termsFile from "@/data/medical/mappings/terms.json";
import organIndex from "@/public/anatomy/organs/index.json";
import { parseStructureIndex } from "@/lib/anatomy/structures";
import { meshesForStructure, selectionKeyFor, structureExists, structureIdsOfSelection } from "@/lib/medical/anatomyLink";
import { describeSelection } from "@/lib/anatomy/structures";
import {
  explanationFor,
  findingsForStructures,
  findTerm,
  parseRegions,
  rangeStatus,
  rangeText,
  REGIONS,
  reportSummary,
  resolveFinding,
  resolveReport,
  TERMS,
} from "@/lib/medical/report";
import type { RawFinding, RawReport } from "@/lib/medical/types";

const index = parseStructureIndex(JSON.parse(readFileSync("public/anatomy/body/structures.json", "utf8")));
const known = (id: string) => structureExists(index, id);
const report = resolveReport(demo as RawReport, known);
const byId = (id: string) => report.findings.find((f) => f.raw.id === id)!;

describe("terminology (Section 15)", () => {
  it("normalizes case, spacing and punctuation", () => {
    expect(findTerm("ALT (SGPT)")?.normalizedTerm).toBe("alanine_aminotransferase");
    expect(findTerm("s. creatinine")?.normalizedTerm).toBe("creatinine");
    expect(findTerm("EGFR")?.normalizedTerm).toBe("estimated_glomerular_filtration_rate");
  });
  it("does not guess unknown terms (Section 90)", () => {
    expect(findTerm("Vitamin B12")).toBeNull();
    expect(findTerm("creatine kinase")).toBeNull();
  });
  it("every mapping is an association to a real body-model structure", () => {
    for (const t of TERMS) {
      expect(t.visualizationType).toBe("association");
      for (const s of t.associatedStructures) expect(known(s), `${t.normalizedTerm} → ${s}`).toBe(true);
    }
    expect(termsFile.terms.length).toBe(TERMS.length);
  });
  it("synonyms are unique across terms", () => {
    const all = TERMS.flatMap((t) => t.synonyms.map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "")));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("reference range (Sections 68, 110)", () => {
  const r = (low: number | null, high: number | null) => ({ low, high, text: "" });
  it("uses only the report's own range", () => {
    expect(rangeStatus(1.9, r(0.7, 1.3))).toBe("ABOVE_RANGE");
    expect(rangeStatus(0.5, r(0.7, 1.3))).toBe("BELOW_RANGE");
    expect(rangeStatus(1.3, r(0.7, 1.3))).toBe("NORMAL");
    expect(rangeStatus(42, r(60, null))).toBe("BELOW_RANGE");
  });
  it("never substitutes a range when the report has none (Section 69)", () => {
    expect(rangeStatus(1.9, null)).toBe("UNKNOWN");
    expect(rangeStatus(1.9, r(null, null))).toBe("UNKNOWN");
  });
  it("has a text equivalent", () => {
    expect(rangeText(byId("finding_001").raw)).toBe("1.9 mg/dL, above reported range (0.7 - 1.3 mg/dL).");
    expect(rangeText({ ...byId("finding_001").raw, referenceRange: null })).toMatch(/Reference range unavailable/);
  });
});

describe("demo report (Sections 74, 106, 107)", () => {
  it("is labeled as demo data on every page", () => {
    expect(demo.isDemo).toBe(true);
    for (const p of demo.pages) expect(p.lines[0]).toMatch(/DEMO \/ SAMPLE DATA/);
  });
  it("every finding validates against its page text", () => {
    for (const f of report.findings) expect(f.issues, f.raw.id).toEqual([]);
  });
  it("maps lab markers through terminology, not the report", () => {
    expect(byId("finding_001").structures).toEqual(["left_kidney", "right_kidney"]);
    expect(byId("finding_001").status).toBe("ABOVE_RANGE");
    expect(byId("finding_002").status).toBe("BELOW_RANGE");
    expect(byId("finding_003").structures).toEqual(["liver"]);
    expect(byId("finding_003").status).toBe("NORMAL");
  });
  it("keeps unmapped findings and counts them (Section 39)", () => {
    expect(byId("finding_004").structures).toEqual([]);
    expect(reportSummary(report.findings)).toEqual({ total: 5, mapped: 4, review: 0, grouped: 0, unmapped: 1 });
  });
  it("a lab value has no location: whole organ (Section 107)", () => {
    expect(byId("finding_001").location.kind).toBe("unspecified");
  });
  it("an imaging statement with a supported region gets a region marker", () => {
    const f = byId("finding_005");
    expect(f.status).toBe("REPORT_STATED");
    expect(f.location).toMatchObject({ kind: "region", regionId: "right_kidney_lower_pole" });
  });
});

describe("validation and fallbacks", () => {
  const base = demo.findings[4] as RawFinding;
  it("rejects a quote that is not on its page", () => {
    const f = resolveFinding({ ...base, source: { page: 2, text: "Right kidney: 3 cm cyst." } }, demo.pages, known);
    expect(f.status).toBe("NOT_INTERPRETED");
    expect(f.structures).toEqual([]);
  });
  it("rejects location words that are not in the quote", () => {
    const f = resolveFinding({ ...base, location: { ...base.location!, textEvidence: "upper pole" } }, demo.pages, known);
    expect(f.status).toBe("NOT_INTERPRETED");
  });
  it("an unsupported region falls back to the parent organ", () => {
    const f = resolveFinding({ ...base, location: { ...base.location!, region: "right_kidney_segment_9" } }, demo.pages, known);
    expect(f.status).toBe("REPORT_STATED");
    expect(f.location).toEqual({ kind: "region_unavailable", regionId: "right_kidney_segment_9" });
    expect(f.structures).toEqual(["right_kidney"]);
  });
  it("a region under the wrong organ is not used (laterality, Section 113)", () => {
    const f = resolveFinding({ ...base, location: { ...base.location!, region: "left_kidney_lower_pole" } }, demo.pages, known);
    expect(f.location.kind).toBe("region_unavailable");
  });
  it("unknown structures are never visualized", () => {
    const f = resolveFinding({ ...base, anatomicalStructures: ["spleen_x"] }, demo.pages, known);
    expect(f.status).toBe("NOT_INTERPRETED");
  });
});

describe("regions (Section 105)", () => {
  it("region ids are prefixed by their parent and the parent exists", () => {
    for (const [id, r] of Object.entries(REGIONS)) {
      expect(id.startsWith(r.parentStructure)).toBe(true);
      expect(known(r.parentStructure), id).toBe(true);
    }
  });
  it("mesh regions name parts that exist in the detailed organ model", () => {
    for (const [id, r] of Object.entries(REGIONS)) {
      if (r.supportedBy !== "mesh") continue;
      const organ = organIndex.organs.find((o) => o.bodyIds.includes(r.parentStructure))!;
      expect(organ, id).toBeTruthy();
      for (const p of r.parts) expect(organ.parts.some((x) => x.id === p), `${id}: ${p}`).toBe(true);
    }
  });
  it("paired-organ regions stay on their side", () => {
    for (const [id, r] of Object.entries(REGIONS)) {
      if (id.startsWith("left_")) expect(r.parentStructure.startsWith("left_")).toBe(true);
      if (id.startsWith("right_")) expect(r.parentStructure.startsWith("right_")).toBe(true);
    }
  });
  it("rejects overlays outside the organ box", () => {
    expect(() =>
      parseRegions({ right_kidney_x: { parentStructure: "right_kidney", displayName: "x", supportedBy: "overlay", overlay: { position: [0, 2, 0] } } }),
    ).toThrow();
  });
});

describe("finding ↔ anatomy link (Section 88)", () => {
  it("resolves structure ids to body meshes and selection keys", () => {
    expect(meshesForStructure(index, "right_kidney")).toEqual(["FJ3147"]);
    expect(selectionKeyFor(index, "right_kidney")).toBe("FJ3147");
    expect(selectionKeyFor(index, "liver")).toBe("group:liver");
    expect(meshesForStructure(index, "liver").length).toBeGreaterThan(1);
  });
  it("selecting an organ finds its findings", () => {
    const right = structureIdsOfSelection(index, describeSelection(index, "FJ3147"));
    expect(findingsForStructures(report.findings, right).map((f) => f.raw.id)).toEqual(["finding_001", "finding_002", "finding_005"]);
    const left = structureIdsOfSelection(index, describeSelection(index, "FJ3145"));
    expect(findingsForStructures(report.findings, left).map((f) => f.raw.id)).toEqual(["finding_001", "finding_002"]);
  });
});

describe("curated explanations (Sections 108, 116)", () => {
  const files = readdirSync("data/medical/explanations");
  it("every explanation belongs to a term and lists a source", () => {
    for (const file of files) {
      const e = JSON.parse(readFileSync(`data/medical/explanations/${file}`, "utf8"));
      expect(file).toBe(`${e.normalizedTerm}.json`);
      expect(TERMS.some((t) => t.normalizedTerm === e.normalizedTerm)).toBe(true);
      expect(e.sources.length).toBeGreaterThan(0);
      expect(e.nextStep).toBe("Discuss this result with your doctor.");
      expect(explanationFor(e.normalizedTerm)).toBeTruthy();
    }
  });
  it("sources are recorded in docs/MEDICAL_SOURCES.md", () => {
    const doc = readFileSync("docs/MEDICAL_SOURCES.md", "utf8");
    for (const file of files) {
      const e = JSON.parse(readFileSync(`data/medical/explanations/${file}`, "utf8"));
      for (const s of e.sources) expect(doc).toContain(s.url);
    }
  });
  it("creatinine lists ordinary non-disease causes (Section 108)", () => {
    const e = explanationFor("creatinine")!;
    expect(e.aboveRange.join(" ")).toMatch(/Dehydration/);
    expect(e.aboveRange.join(" ")).toMatch(/exercise/);
    expect(e.aboveRange.join(" ")).toMatch(/medicines/);
  });
});
