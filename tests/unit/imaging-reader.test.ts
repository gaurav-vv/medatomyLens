import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseStructureIndex } from "@/lib/anatomy/structures";
import { structureExists } from "@/lib/medical/anatomyLink";
import { findTerm, REGIONS, resolveReport, TERMS } from "@/lib/medical/report";
import type { RawReport } from "@/lib/medical/types";
import vocabulary from "@/data/medical/mappings/imaging_vocabulary.json";
import { buildReport } from "@/lib/reports/buildReport";
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
  it("keeps tests without a single organ, or without a model structure, unmapped", () => {
    for (const t of ["TSH", "Free T4", "ALP", "Alkaline Phosphatase", "Amylase", "Glucose", "HbA1c", "Sodium", "Haemoglobin"])
      expect(findTerm(t), t).toBeNull();
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
    expect(read("Left lung: opacity in the lower zone.")!.location!.region).toBe("left_lung_lower_lobe");
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
