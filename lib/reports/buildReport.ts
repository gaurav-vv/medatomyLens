/**
 * Extracted pages → the report model the viewer already uses (RawReport).
 * The page lines ARE the rebuilt rows, so every finding quote is a real line
 * of its page and passes the exact-quote check in lib/medical/report.ts.
 */
import type { RawFinding, RawReport } from "@/lib/medical/types";
import { parseLabPages, parseRow } from "./labParser";
import { parseImagingLines } from "./imagingParser";
import type { TextRow } from "./layout";
import type { ExtractedDocument, PageMethod } from "./pdfText";

export const OCR_PAGE_NOTE = "read by text recognition";

export interface ReadSummary {
  pageCount: number;
  ocrPages: number[];
  unreadablePages: number[];
  /** Rows skipped because text recognition was unsure of them. */
  lowConfidenceRows: number;
}

export interface ReadReport {
  report: RawReport;
  summary: ReadSummary;
}

function heading(page: number, method: PageMethod): string {
  if (method === "ocr") return `Page ${page} (${OCR_PAGE_NOTE})`;
  if (method === "unreadable") return `Page ${page} (no readable text)`;
  return `Page ${page}`;
}

export function buildReport(doc: ExtractedDocument, documentId: string): ReadReport {
  const readable = doc.pages.filter((p) => p.method !== "unreadable");
  const { findings: lab, lowConfidenceRows } = parseLabPages(
    readable.map((p) => ({ page: p.page, rows: p.rows, method: p.method as "text" | "ocr" })),
  );
  // Rows that are not lab results may be imaging text (V1.5). OCR pages are left out:
  // a misread "left"/"right" or "no" would change where a statement is placed.
  const labIds = new Set(lab.map((f) => f.id));
  const imaging = readable
    .filter((p) => p.method === "text")
    .flatMap((p) =>
      parseImagingLines(
        p.page,
        p.rows.map((r, i) => ({ text: r.text, index: i })).filter((l) => !labIds.has(`p${p.page}_r${l.index + 1}`)),
      ),
    );
  const findings = [...lab, ...imaging];
  return {
    report: {
      documentId,
      title: "Uploaded report",
      isDemo: false,
      date: "",
      pages: doc.pages.map((p) => ({ page: p.page, heading: heading(p.page, p.method), lines: p.rows.map((r) => r.text) })),
      findings,
    },
    summary: {
      pageCount: doc.pageCount,
      ocrPages: doc.pages.filter((p) => p.method === "ocr").map((p) => p.page),
      unreadablePages: doc.pages.filter((p) => p.method === "unreadable").map((p) => p.page),
      lowConfidenceRows,
    },
  };
}

/** Keep only the findings the user confirmed on the review screen. */
export function withFindings(report: RawReport, keep: (f: RawFinding) => boolean): RawReport {
  return { ...report, findings: report.findings.filter(keep) };
}

/** Lab rows read by text recognition (the only source of low-confidence lab findings). */
export function fromOcr(f: RawFinding): boolean {
  return f.findingType === "lab_association" && f.confidence === "low";
}

/** A page is usable when at least one row reads as a result or an organ statement. */
export function rowsAreUsable(rows: TextRow[]): boolean {
  return rows.some((r) => parseRow(r.cells)) || parseImagingLines(0, rows.map((r, i) => ({ text: r.text, index: i }))).length > 0;
}
