import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseStructureIndex } from "@/lib/anatomy/structures";
import { meshesForStructure, structureExists, structureName } from "@/lib/medical/anatomyLink";
import { findTerm, groupFindings, REGIONS, resolveReport, TERM_GROUPS, TERMS } from "@/lib/medical/report";
import type { RawReport } from "@/lib/medical/types";
import vocabulary from "@/data/medical/mappings/imaging_vocabulary.json";
import { buildReport, dedupe } from "@/lib/reports/buildReport";
import { readSentence, sentences } from "@/lib/reports/imagingParser";

const index = parseStructureIndex(JSON.parse(readFileSync("public/anatomy/body/structures.json", "utf8")));
const known = (id: string) => structureExists(index, id);
const read = (s: string) => readSentence(s, 1, "t")?.finding ?? null;

describe("terminology additions (Sections 15, 89, 92)", () => {
  it("resolves common report spellings", () => {
    expect(findTerm("SGOT")?.normalizedTerm).toBe("aspartate_aminotransferase");
    expect(findTerm("AST (SGOT)")?.normalizedTerm).toBe("aspartate_aminotransferase");
    expect(findTerm("Gamma GT")?.normalizedTerm).toBe("gamma_glutamyl_transferase");
    expect(findTerm("S. Bilirubin Total")?.normalizedTerm).toBe("bilirubin_total");
    expect(findTerm("Bilirubin (Direct)")?.normalizedTerm).toBe("bilirubin_direct");
    expect(findTerm("Blood Urea")?.normalizedTerm).toBe("urea");
    expect(findTerm("BUN")?.normalizedTerm).toBe("blood_urea_nitrogen");
    expect(findTerm("hs-Troponin I")?.normalizedTerm).toBe("cardiac_troponin_i");
    expect(findTerm("Serum Lipase")?.associatedStructures).toEqual(["pancreas"]);
  });
  it("groups tests by body part; blood tests go on the vessels, bone minerals on the bones, thyroid is not drawn", () => {
    const groups: [string, string, string[]][] = [
      ["TSH (Ultrasensitive/4thGen)", "thyroid", []],
      ["TRI-IODOTHYRONINE (T3, TOTAL)", "thyroid", []],
      ["GLUCOSE, FASTING , NAF PLASMA", "blood_sugar", ["layer:arteries", "layer:veins"]],
      ["HBA1C, GLYCATED HEMOGLOBIN", "blood_sugar", ["layer:arteries", "layer:veins"]],
      ["TOTAL LEUCOCYTE COUNT (TLC)", "blood_count", ["layer:arteries", "layer:veins"]],
      ["RDW-CV", "blood_count", ["layer:arteries", "layer:veins"]],
      ["VLDL CHOLESTEROL", "blood_fats", ["layer:arteries", "layer:veins"]],
      ["ATHEROGENIC INDEX (AIP)", "blood_fats", ["layer:arteries", "layer:veins"]],
      ["PHOSPHORUS, INORGANIC", "electrolytes", ["layer:skeleton", "layer:arteries", "layer:veins"]],
      ["CALCIUM", "electrolytes", ["layer:skeleton", "layer:arteries", "layer:veins"]],
      ["SODIUM", "electrolytes", ["layer:arteries", "layer:veins"]],
      ["GLOBULIN", "blood_proteins", ["layer:arteries", "layer:veins"]],
    ];
    for (const [name, group, structures] of groups) {
      const t = findTerm(name);
      expect(t?.group, name).toBe(group);
      expect(t?.associatedStructures, name).toEqual(structures);
    }
    // Vessel wording never suggests a problem in a vessel.
    expect(findTerm("Haemoglobin")!.mappingReason).toMatch(/does not point to any vessel or problem/);
    expect(findTerm("ALKALINE PHOSPHATASE")!.associatedStructures).toEqual(["liver", "layer:skeleton"]);
    expect(findTerm("Vitamin B6")).toBeNull();
  });
  it("reads blood pressure as systolic and diastolic, shown on the heart and arteries", () => {
    const rows = ["BP | 140/90 | mmHg", "Blood Pressure: 120/80 mmHg"].map((text) => ({ text, cells: text.split(" | ") }));
    const { report } = buildReport({ pageCount: 1, pages: [{ page: 1, method: "text", rows }] }, "t");
    expect(report.findings.map((f) => [f.name, f.value, f.source.text])).toEqual([
      ["Blood pressure (systolic)", 140, "BP | 140/90 | mmHg"],
      ["Blood pressure (diastolic)", 90, "BP | 140/90 | mmHg"],
      ["Blood pressure (systolic)", 120, "Blood Pressure: 120/80 mmHg"],
      ["Blood pressure (diastolic)", 80, "Blood Pressure: 120/80 mmHg"],
    ]);
    const resolved = resolveReport(report as RawReport, known).findings;
    for (const f of resolved) expect(f.issues).toEqual([]);
    expect(resolved[0]!.structures).toEqual(["heart", "layer:arteries"]);
    expect(resolved[0]!.status).toBe("UNKNOWN"); // no range printed: none substituted
  });

  it("layer structure ids resolve to every mesh of that layer", () => {
    expect(known("layer:arteries")).toBe(true);
    expect(known("layer:nonsense")).toBe(false);
    expect(meshesForStructure(index, "layer:skeleton").length).toBeGreaterThan(100);
    expect(structureName(index, "layer:skeleton")).toBe("Bones");
  });
  it("maps the liver and kidney panel names printed by common labs", () => {
    for (const n of ["BILIRUBIN CONJUGATED (DIRECT)", "ALBUMIN", "AST (SGOT) / ALT (SGPT) RATIO (DE"])
      expect(findTerm(n)?.associatedStructures, n).toEqual(["liver"]);
    expect(findTerm("URIC ACID")?.associatedStructures).toEqual(["left_kidney", "right_kidney"]);
  });
  it("every term belongs to a known group", () => {
    for (const t of TERMS) expect(TERM_GROUPS.some((g) => g.id === t.group), t.normalizedTerm).toBe(true);
  });
  it("every term has its source recorded in docs/MEDICAL_SOURCES.md", () => {
    const doc = readFileSync("docs/MEDICAL_SOURCES.md", "utf8");
    for (const t of TERMS) expect(doc, t.normalizedTerm).toContain(t.normalizedTerm);
  });
});

describe("imaging text (Sections 107, 111, 113)", () => {
  it("splits sentences without breaking decimals", () => {
    expect(sentences("Right kidney: 1.8 cm cyst. Liver is normal.")).toEqual(["Right kidney: 1.8 cm cyst.", "Liver is normal."]);
  });

  it("places a statement on the named side and region, quoting the report", () => {
    const f = read("Right kidney: 1.8 cm simple cortical cyst at the lower pole.")!;
    expect(f.findingType).toBe("report_statement");
    expect(f.statedBy).toBe("report");
    expect(f.statementText).toBe("Right kidney: 1.8 cm simple cortical cyst at the lower pole.");
    expect(f.anatomicalStructures).toEqual(["right_kidney"]);
    expect(f.location).toMatchObject({ structure: "right_kidney", laterality: "right", specified: true });
    expect(f.size).toEqual({ text: "1.8 cm", specified: true });
  });

  it("never swaps left and right", () => {
    expect(read("Left kidney shows a 5 mm calculus in the lower pole.")!.anatomicalStructures).toEqual(["left_kidney"]);
    expect(read("Left kidney shows a 5 mm calculus in the lower pole.")!.location!.region).toBe("left_kidney_lower_pole");
    expect(read("Right lung: opacity in the upper lobe.")!.location!.region).toBe("right_lung_upper_lobe");
    // A chest X-ray zone names the lung and side only; zones are not lobes.
    const zone = read("Left lung: opacity in the lower zone.")!;
    expect(zone.anatomicalStructures).toEqual(["left_lung"]);
    expect(zone.location!.region).toBeNull();
  });

  it("with no side, both sides are shown and no region is guessed", () => {
    const f = read("Renal calculus seen in the lower pole.")!;
    expect(f.anatomicalStructures).toEqual(["left_kidney", "right_kidney"]);
    expect(f.location!.region).toBeNull();
    expect(f.location!.specified).toBe(false);
    const both = read("Bilateral renal cysts.")!;
    expect(both.anatomicalStructures).toEqual(["left_kidney", "right_kidney"]);
    const mixed = read("Right kidney normal, left kidney shows a cyst.")!;
    expect(mixed.anatomicalStructures).toEqual(["left_kidney", "right_kidney"]);
  });

  it("negated findings are listed but never marked", () => {
    for (const s of ["No hydronephrosis in the right kidney.", "Right kidney: no evidence of calculus.", "Liver: focal lesion not seen."]) {
      const f = read(s)!;
      expect(f, s).toBeTruthy();
      expect(f.negated, s).toBe(true);
      expect(f.anatomicalStructures, s).toEqual([]);
      expect(f.location, s).toBeNull();
    }
    // A positive clause next to a negated one is still a statement.
    expect(read("Right kidney shows a cyst, no hydronephrosis.")!.negated).toBeUndefined();
  });

  it("keeps uncertainty in the quote and lowers confidence", () => {
    const f = read("Possible small cyst in the liver, right lobe.")!;
    expect(f.statementText).toContain("Possible");
    expect(f.confidence).toBe("low");
    expect(f.location!.region).toBe("liver_right_lobe");
  });

  it("does not take a size from a comparison with an earlier study", () => {
    expect(read("Right kidney cyst now 2 cm, previously 1.5 cm.")!.size).toBeNull();
  });

  it("ignores normal statements and sentences naming several organs", () => {
    expect(read("Liver is normal in size and echotexture.")).toBeNull();
    expect(read("Liver and spleen are enlarged.")).toBeNull();
    expect(read("Impression: normal study.")).toBeNull();
  });

  it("every vocabulary structure and region exists in the model data", () => {
    for (const o of vocabulary.organs) {
      const ids = "paired" in o && o.paired ? [o.paired.left, o.paired.right] : [(o as { structure: string }).structure];
      for (const id of ids) expect(known(id), id).toBe(true);
    }
    for (const r of vocabulary.regions) {
      const ids = r.region.includes("{side}") ? ["left", "right"].map((s) => r.region.replace("{side}", s)) : [r.region];
      for (const id of ids) {
        // Lung middle lobe exists only on the right.
        if (id === "left_lung_middle_lobe") continue;
        expect(REGIONS[id], id).toBeTruthy();
      }
    }
  });

  it("an extracted imaging page validates end to end and places a region marker", () => {
    const rows = [
      "SYNTHETIC ULTRASOUND - not a real patient",
      "Right kidney: 1.8 cm simple cortical cyst at the lower pole.",
      "Left kidney: normal in size. No calculus in the left kidney.",
      "Creatinine | 1.9 | mg/dL | 0.7 - 1.3",
    ].map((text) => ({ text, cells: text.split(" | ") }));
    const { report } = buildReport({ pageCount: 1, pages: [{ page: 1, method: "text", rows }] }, "t");
    const resolved = resolveReport(report as RawReport, known);
    for (const f of resolved.findings) expect(f.issues, f.raw.name).toEqual([]);
    expect(resolved.findings.map((f) => f.raw.name)).toEqual([
      "Creatinine",
      "Right kidney (report statement)",
      "Left kidney (report statement)",
    ]);
    const cyst = resolved.findings[1]!;
    expect(cyst.status).toBe("REPORT_STATED");
    expect(cyst.location).toMatchObject({ kind: "region", regionId: "right_kidney_lower_pole" });
    const negated = resolved.findings[2]!;
    expect(negated.raw.negated).toBe(true);
    expect(negated.structures).toEqual([]);
  });

  it("does not read imaging text from OCR pages (a misread side would move a marker)", () => {
    const rows = [{ text: "Right kidney: 1.8 cm cyst.", cells: ["Right kidney: 1.8 cm cyst."], minConfidence: 95 }];
    const { report } = buildReport({ pageCount: 1, pages: [{ page: 1, method: "ocr", rows }] }, "t");
    expect(report.findings).toEqual([]);
  });
});


describe("finding list (grouping and repeats)", () => {
  const rows = [
    "CREATININE | 3.6 | mg/dL | 0.7 - 1.3",
    "HAEMOGLOBIN | 12.1 | g/dL | 13 - 17",
    "TSH (Ultrasensitive/4thGen) | 7.85 | μIU/mL | 0.55 - 4.78",
    "VITAMIN B6 | 3 | ng/mL | 5 - 50",
  ].map((text) => ({ text, cells: text.split(" | ") }));
  const doc = (pages: number[]) => ({ pageCount: pages.length, pages: pages.map((page) => ({ page, method: "text" as const, rows })) });

  it("keeps a repeated result once (summary pages repeat tests)", () => {
    const { report } = buildReport(doc([1, 2]), "t");
    expect(report.findings.filter((f) => f.name === "CREATININE")).toHaveLength(1);
    expect(report.findings.find((f) => f.name === "CREATININE")!.source.page).toBe(1);
  });
  it("keeps different values for the same test (never picks one, Section 91)", () => {
    const a = { id: "a", findingType: "lab_association" as const, name: "Creatinine", value: 1.1, unit: "mg/dL", source: { page: 1, text: "x" }, confidence: "high" as const };
    expect(dedupe([a, { ...a, id: "b", value: 1.4 }])).toHaveLength(2);
    expect(dedupe([a, { ...a, id: "b", name: "CREATININE" }])).toHaveLength(1);
  });
  it("groups by organ first, then body-wide tests, then unrecognized", () => {
    const { report } = buildReport(doc([1]), "t");
    const sections = groupFindings(resolveReport(report as RawReport, known).findings, (id) => id);
    expect(sections.map((s) => s.title)).toEqual(["Kidneys", "Blood count", "Thyroid", "Not in the app's terminology yet"]);
    expect(sections[2]!.note).toMatch(/not part of the current 3D model/);
  });
});
