/**
 * Extracted pages → the report model the viewer already uses (RawReport).
 * The page lines ARE the rebuilt rows, so every finding quote is a real line
 * of its page and passes the exact-quote check in lib/medical/report.ts.
 */
import type { RawFinding, RawReport } from "@/lib/medical/types";
import { parseLabPages } from "./labParser";
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
  const { findings, lowConfidenceRows } = parseLabPages(
    doc.pages.filter((p) => p.method !== "unreadable").map((p) => ({ page: p.page, rows: p.rows, method: p.method as "text" | "ocr" })),
  );
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
