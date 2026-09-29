/**
 * Reads a picked PDF on this device (browser only). The file is kept in
 * memory for the duration of the read and never uploaded, stored or logged
 * (AGENTS.md Sections 28, 29). pdf.js and OCR are loaded on first use.
 */
import { withBase } from "@/lib/basePath";
import { buildReport, type ReadReport } from "./buildReport";
import type { OcrSession } from "./ocr";
import { extractPdf, type ReadProgress } from "./pdfText";
import { checkFile, REPORT_LIMITS, ReportReadError } from "./validate";

export type { ReadProgress };

let idCounter = 0;

export async function readReportFile(
  file: File,
  opts: { onProgress?: (p: ReadProgress) => void; signal?: AbortSignal } = {},
): Promise<ReadReport> {
  const { onProgress, signal } = opts;
  const deadline = Date.now() + REPORT_LIMITS.timeoutMs;
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const problem = checkFile(file, head);
  if (problem) throw new ReportReadError(problem);

  let lib: typeof import("pdfjs-dist");
  try {
    lib = await import("pdfjs-dist");
  } catch {
    throw new ReportReadError("unavailable");
  }
  lib.GlobalWorkerOptions.workerSrc = withBase("/vendor/pdfjs/pdf.worker.min.mjs");

  const data = new Uint8Array(await file.arrayBuffer());
  let ocr: OcrSession | null = null;
  let ocrFailed = false;
  try {
    const doc = await extractPdf(lib, data, {
      signal,
      deadline,
      onProgress,
      getDocumentParams: {
        standardFontDataUrl: withBase("/vendor/pdfjs/standard_fonts/"),
        wasmUrl: withBase("/vendor/pdfjs/wasm/"),
        useSystemFonts: false,
        verbosity: 0, // errors only; pdf.js never logs page text, but keep the console quiet
      },
      ocr: async (page, n, pageCount) => {
        if (ocrFailed) return null;
        if (!ocr) {
          onProgress?.({ stage: "ocr_loading" });
          try {
            ocr = await (await import("./ocr")).startOcr();
          } catch {
            // Offline or blocked: keep the text pages (Section 39).
            ocrFailed = true;
            return null;
          }
        }
        onProgress?.({ stage: "ocr", page: n, pageCount, fraction: 0 });
        return ocr.recognize(page, (fraction) => onProgress?.({ stage: "ocr", page: n, pageCount, fraction }));
      },
    });
    const read = buildReport(doc, `upload_${Date.now()}_${++idCounter}`);
    if (read.report.pages.every((p) => p.lines.length === 0)) throw new ReportReadError("no_text");
    return read;
  } finally {
    await (ocr as OcrSession | null)?.close().catch(() => undefined);
  }
}
