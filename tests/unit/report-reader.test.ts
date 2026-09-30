// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseStructureIndex } from "@/lib/anatomy/structures";
import { structureExists } from "@/lib/medical/anatomyLink";
import { resolveReport } from "@/lib/medical/report";
import { buildReport, rowsAreUsable } from "@/lib/reports/buildReport";
import { buildRows, textAmount, type TextPiece } from "@/lib/reports/layout";
import { isUnit, MIN_OCR_CONFIDENCE, parseLabPages, parseRange, parseRow } from "@/lib/reports/labParser";
import { extractPdf } from "@/lib/reports/pdfText";
import { checkFile, REPORT_LIMITS, ReportReadError } from "@/lib/reports/validate";
import { labTablePage, makePdf, type PdfPageSpec } from "../fixtures/makePdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href;

const index = parseStructureIndex(JSON.parse(readFileSync("public/anatomy/body/structures.json", "utf8")));
const known = (id: string) => structureExists(index, id);
const lib = pdfjs as unknown as typeof import("pdfjs-dist");
const quiet = { verbosity: 0, standardFontDataUrl: new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href };
const extract = (data: Uint8Array, opts: Parameters<typeof extractPdf>[2] = {}) =>
  extractPdf(lib, data, { ...opts, getDocumentParams: quiet });

/** SYNTHETIC lab report (Section 75): invented values, no real patient or laboratory. */
const SYNTHETIC_ROWS = [
  ["Test", "Result", "Unit", "Reference range"],
  ["Serum Creatinine", "1.9", "mg/dL", "0.7 - 1.3"],
  ["eGFR", "42", "mL/min/1.73m2", "> 60"],
  ["ALT (SGPT)", "28", "U/L", "7 - 56"],
  ["Vitamin B6", "12", "ng/mL", "5 - 50"],
  ["Potassium", "4.1", "mmol/L"],
];
const syntheticReport = (): PdfPageSpec[] => [
  {
    texts: [
      ...labTablePage("SYNTHETIC TEST REPORT - not a real patient", SYNTHETIC_ROWS).texts!,
      { x: 40, y: 90, text: "Patient Name: Test Person", size: 10 },
      { x: 300, y: 90, text: "Age: 45 Years", size: 10 },
      { x: 40, y: 250, text: "Sample ID 12345 collected 2026-01-15", size: 10 },
    ],
  },
  { texts: [{ x: 40, y: 60, text: "Page two (synthetic)", size: 12 }, { x: 40, y: 100, text: "Haemoglobin 13.2 g/dL 12 - 16", size: 10 }] },
];

const piece = (text: string, x: number, y: number, size = 10): TextPiece => ({ text, x, y, width: text.length * size * 0.5, height: size });

describe("row rebuilding (Section 18)", () => {
  it("groups pieces on one baseline and splits cells at column gaps", () => {
    const rows = buildRows([
      piece("0.7 - 1.3", 390, 100),
      piece("Creatinine", 40, 100.4),
      piece("1.9", 220, 99.8),
      piece("mg/dL", 300, 100),
      piece("Next line", 40, 118),
    ]);
    expect(rows.map((r) => r.text)).toEqual(["Creatinine | 1.9 | mg/dL | 0.7 - 1.3", "Next line"]);
  });
  it("joins words separated by a normal space into one cell", () => {
    const rows = buildRows([piece("Serum", 40, 100), piece("Creatinine", 40 + 5 * 5 + 3, 100)]);
    expect(rows[0]!.cells).toEqual(["Serum Creatinine"]);
  });
  it("splits cells padded with runs of spaces inside one piece", () => {
    expect(buildRows([piece("ALT      28      U/L", 40, 100)])[0]!.cells).toEqual(["ALT", "28", "U/L"]);
  });
  it("counts real characters to decide on OCR", () => {
    expect(textAmount([piece("  a b ", 0, 0)])).toBe(2);
  });
});

describe("lab row parser (Sections 66–69)", () => {
  it("reads name, value, unit and the report's own range", () => {
    expect(parseRow(["Creatinine", "1.9", "mg/dL", "0.7 - 1.3"])).toMatchObject({
      name: "Creatinine",
      value: 1.9,
      unit: "mg/dL",
      referenceRange: { low: 0.7, high: 1.3, text: "0.7 - 1.3" },
      layout: "table",
    });
  });
  it("keeps H/L flags without letting them become units", () => {
    expect(parseRow(["Creatinine", "1.9", "H", "mg/dL", "0.7-1.3"])).toMatchObject({ flag: "H", unit: "mg/dL" });
    expect(parseRow(["Creatinine", "1.9 H", "mg/dL", "0.7-1.3"])).toMatchObject({ value: 1.9, flag: "H" });
  });
  it("reads one-sided ranges", () => {
    expect(parseRange("> 60")).toEqual({ low: 60, high: null, text: "> 60" });
    expect(parseRange("<5")).toEqual({ low: null, high: 5, text: "<5" });
    expect(parseRange("Up to 40")).toEqual({ low: null, high: 40, text: "Up to 40" });
    expect(parseRange("10 to 20")).toEqual({ low: 10, high: 20, text: "10 to 20" });
    expect(parseRange("20 - 10")).toBeNull();
  });
  it("reads a row printed as one line of text", () => {
    expect(parseRow(["Vitamin B12 450 pg/mL 200 - 900"])).toMatchObject({ name: "Vitamin B12", value: 450, unit: "pg/mL", layout: "text" });
    expect(parseRow(["Haemoglobin 13.2 g/dL 12 - 16"])).toMatchObject({ name: "Haemoglobin", value: 13.2 });
  });
  it("reads a unit and range printed in one cell", () => {
    expect(parseRow(["ALT", "28", "U/L 7 - 56"])).toMatchObject({ unit: "U/L", referenceRange: { low: 7, high: 56 } });
  });
  it("keeps units exactly as printed (Section 67)", () => {
    expect(parseRow(["eGFR", "42", "mL/min/1.73 m2", ">60"])?.unit).toBe("mL/min/1.73 m2");
    expect(isUnit("µmol/L")).toBe(true);
    expect(isUnit("%")).toBe(true);
    expect(isUnit("10^3/µL")).toBe(true);
    expect(isUnit("Jaffe")).toBe(false);
    expect(isUnit("Years")).toBe(false);
    expect(isUnit("mg/dL 0.7 - 1.3")).toBe(false);
  });
  it("never turns headers or patient details into findings (Sections 28, 29)", () => {
    expect(parseRow(["Test", "Result", "Unit", "Reference range"])).toBeNull();
    expect(parseRow(["Age", "45", "Years"])).toBeNull();
    expect(parseRow(["Patient ID", "12345", "mg/dL"])).toBeNull();
    expect(parseRow(["Sample ID 12345 collected 2026-01-15"])).toBeNull();
  });
  it("does not guess when a row is unclear (Section 90)", () => {
    expect(parseRow(["Creatinine", "see note"])).toBeNull(); // no number
    expect(parseRow(["Creatinine", "1.9"])).toBeNull(); // no unit or range to anchor it
    expect(parseRow(["Creatinine", "<0.5", "mg/dL"])).toBeNull(); // censored value: not a plain number
    expect(parseRow(["Creatinine", "1.9", "mg/dL", "0.7 - 1.3", "1.5"])).toBeNull(); // extra number (e.g. previous result)
  });
  it("reads common Indian lab layouts", () => {
    // Method / technology column between name and value.
    expect(parseRow(["CREATININE - SERUM", "PHOTOMETRY", "0.83", "mg/dL", "0.6-1.1"])).toMatchObject({
      name: "CREATININE - SERUM",
      value: 0.83,
      unit: "mg/dL",
      referenceRange: { low: 0.6, high: 1.1 },
    });
    // Trailing text column (method, comment) is ignored.
    expect(parseRow(["Creatinine", "1.9", "mg/dL", "0.7 - 1.3", "Enzymatic"])).toMatchObject({ value: 1.9 });
    // Range with the unit printed after it.
    expect(parseRow(["Haemoglobin", "13.2", "g/dL", "13.0 - 17.0 g/dL"])).toMatchObject({ unit: "g/dL", referenceRange: { low: 13, high: 17 } });
    expect(parseRow(["Haemoglobin", "13.2", "13.0 - 17.0 g/dL"])).toMatchObject({ unit: "g/dL", referenceRange: { low: 13, high: 17 } });
    // Value with its unit in one cell; name with a trailing colon.
    expect(parseRow(["Urea :", "32 mg/dL", "15 - 40"])).toMatchObject({ name: "Urea", value: 32, unit: "mg/dL" });
    // Thousands separators.
    expect(parseRow(["Total Leucocyte Count", "7,800", "cells/cu.mm", "4,000 - 11,000"])).toMatchObject({
      value: 7800,
      referenceRange: { low: 4000, high: 11000 },
    });
    // Sex-specific range: value kept, no range chosen (Section 69).
    expect(parseRow(["Creatinine", "1.1", "mg/dL", "Male: 0.7-1.3"])).toMatchObject({ value: 1.1, referenceRange: null });
  });
  it("leaves out OCR rows below the confidence threshold", () => {
    const row = (minConfidence: number) => ({ cells: ["Creatinine", "1.9", "mg/dL"], text: "Creatinine | 1.9 | mg/dL", minConfidence });
    const r = parseLabPages([{ page: 1, method: "ocr", rows: [row(MIN_OCR_CONFIDENCE - 1), row(95)] }]);
    expect(r.lowConfidenceRows).toBe(1);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]!.confidence).toBe("low");
  });
});

describe("file checks (Sections 51, 52)", () => {
  const head = (s: string) => new TextEncoder().encode(s);
  it("checks content, not the name", () => {
    expect(checkFile({ size: 10 }, head("%PDF-1.7\n"))).toBeNull();
    expect(checkFile({ size: 10 }, head("\u0000\u0000junk %PDF-1.4"))).toBeNull();
    expect(checkFile({ size: 10 }, head("PK\u0003\u0004 zip"))).toBe("not_pdf");
    expect(checkFile({ size: 0 }, head(""))).toBe("empty");
    expect(checkFile({ size: REPORT_LIMITS.maxBytes + 1 }, head("%PDF-1.7"))).toBe("too_large");
  });
});

describe("PDF extraction end to end (synthetic PDFs)", () => {
  it("reads a text PDF into findings whose quotes validate and map through terminology", async () => {
    const doc = await extract(makePdf(syntheticReport()));
    expect(doc.pageCount).toBe(2);
    expect(doc.pages.map((p) => p.method)).toEqual(["text", "text"]);
    const { report, summary } = buildReport(doc, "test_doc");
    expect(report.isDemo).toBe(false);
    expect(summary.ocrPages).toEqual([]);
    expect(report.pages[0]!.lines).toContain("Serum Creatinine | 1.9 | mg/dL | 0.7 - 1.3");
    expect(report.findings.map((f) => f.name)).toEqual([
      "Serum Creatinine",
      "eGFR",
      "ALT (SGPT)",
      "Vitamin B6",
      "Potassium",
      "Haemoglobin",
    ]);

    const resolved = resolveReport(report, known);
    for (const f of resolved.findings) expect(f.issues, f.raw.name).toEqual([]);
    const by = (name: string) => resolved.findings.find((f) => f.raw.name === name)!;
    expect(by("Serum Creatinine").structures).toEqual(["left_kidney", "right_kidney"]);
    expect(by("Serum Creatinine").status).toBe("ABOVE_RANGE");
    expect(by("eGFR").status).toBe("BELOW_RANGE");
    expect(by("ALT (SGPT)").structures).toEqual(["liver"]);
    expect(by("Potassium").status).toBe("UNKNOWN"); // no range printed: none substituted
    expect(by("Vitamin B6").structures).toEqual([]); // not in terminology: listed, not mapped
    expect(by("Haemoglobin").raw.source.page).toBe(2);
    // Patient details stay page text only.
    expect(resolved.findings.some((f) => /Patient|Age|Sample/.test(f.raw.name))).toBe(false);
  });

  it("sends only pages without enough text to OCR, and caps OCR pages", async () => {
    const blank: PdfPageSpec = { texts: [{ x: 40, y: 40, text: "p", size: 8 }] };
    const pdf = makePdf([syntheticReport()[0]!, blank, blank]);
    const asked: number[] = [];
    const doc = await extract(pdf, {
      ocr: async (_page, n) => {
        asked.push(n);
        return n === 2 ? [piece("Creatinine", 40, 100), piece("1.9", 220, 100), piece("mg/dL", 300, 100)].map((p) => ({ ...p, confidence: 92 })) : null;
      },
    });
    expect(asked).toEqual([2, 3]);
    expect(doc.pages.map((p) => p.method)).toEqual(["text", "ocr", "unreadable"]);
    const { report, summary } = buildReport(doc, "t");
    expect(summary).toMatchObject({ ocrPages: [2], unreadablePages: [3] });
    const ocrFinding = report.findings.find((f) => f.source.page === 2)!;
    expect(ocrFinding).toMatchObject({ name: "Creatinine", value: 1.9, confidence: "low" });
    expect(report.pages[1]!.heading).toMatch(/text recognition/);
  });

  it("tries OCR on pages whose text reads as nothing useful (table drawn as an image)", async () => {
    const headerOnly: PdfPageSpec = {
      texts: [
        { x: 40, y: 40, text: "SYNTHETIC LAB - header and footer are real text", size: 10 },
        { x: 40, y: 800, text: "This report is electronically generated. Page 1 of 1", size: 8 },
      ],
    };
    const asked: number[] = [];
    const doc = await extract(makePdf([headerOnly]), {
      usable: rowsAreUsable,
      ocr: async (_p, n) => {
        asked.push(n);
        return [piece("Creatinine", 40, 100), piece("1.9", 220, 100), piece("mg/dL", 300, 100)].map((p) => ({ ...p, confidence: 90 }));
      },
    });
    expect(asked).toEqual([1]);
    expect(doc.pages[0]!.method).toBe("ocr");
    // A page that already has results is not sent to OCR.
    const asked2: number[] = [];
    await extract(makePdf(syntheticReport().slice(0, 1)), { usable: rowsAreUsable, ocr: async (_p, n) => (asked2.push(n), null) });
    expect(asked2).toEqual([]);
  });

  it("rejects password-protected, damaged and oversized-page-count PDFs with clear errors", async () => {
    const code = async (data: Uint8Array) => {
      try {
        await extract(data);
        return "ok";
      } catch (e) {
        return e instanceof ReportReadError ? e.code : String(e);
      }
    };
    expect(await code(makePdf(syntheticReport(), { passwordProtected: true }))).toBe("password");
    expect(await code(new TextEncoder().encode("%PDF-1.4\nthis is not a real pdf body"))).toBe("unreadable_file");
    const many = Array.from({ length: REPORT_LIMITS.maxPages + 1 }, () => ({ texts: [{ x: 40, y: 40, text: "x" }] }));
    expect(await code(makePdf(many))).toBe("too_many_pages");
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(extract(makePdf(syntheticReport()), { signal: controller.signal })).rejects.toMatchObject({ code: "cancelled" });
  });
});
