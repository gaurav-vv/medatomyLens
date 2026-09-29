/**
 * PDF → pages of rows (AGENTS.md Sections 16, 17). Works with any pdf.js
 * build (browser in the app, the legacy build in Node tests), passed in by the
 * caller. Text is read first; only pages with too little real text are handed
 * to the OCR callback.
 */
import type * as PdfJs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import { buildRows, textAmount, type TextPiece, type TextRow } from "./layout";
import { REPORT_LIMITS, ReportReadError } from "./validate";

export type PageMethod = "text" | "ocr" | "unreadable";

export interface ExtractedPage {
  page: number;
  method: PageMethod;
  rows: TextRow[];
}

export interface ExtractedDocument {
  pageCount: number;
  pages: ExtractedPage[];
}

export type ReadProgress =
  | { stage: "opening" }
  | { stage: "reading"; page: number; pageCount: number }
  | { stage: "ocr_loading" }
  | { stage: "ocr"; page: number; pageCount: number; fraction: number };

export interface ExtractOptions {
  getDocumentParams?: NonNullable<Parameters<typeof PdfJs.getDocument>[0]>;
  onProgress?: (p: ReadProgress) => void;
  /** Text recognition for scanned pages. Returns null when the page could not be recognized. */
  ocr?: (page: PDFPageProxy, pageNumber: number, pageCount: number) => Promise<TextPiece[] | null>;
  /** Whether a page's rows contain anything readable; pages that don't are also tried with OCR. */
  usable?: (rows: TextRow[]) => boolean;
  signal?: AbortSignal;
  deadline?: number;
}

type TextItem = { str: string; transform: number[]; width: number; height: number };
const isTextItem = (i: unknown): i is TextItem => typeof (i as TextItem).str === "string";

/** Text pieces of one page in top-down page units (rotation handled by the viewport). */
export async function pageTextPieces(lib: typeof PdfJs, page: PDFPageProxy): Promise<TextPiece[]> {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const pieces: TextPiece[] = [];
  for (const item of content.items) {
    if (!isTextItem(item) || !item.str.trim()) continue;
    const t = lib.Util.transform(viewport.transform, item.transform);
    const height = Math.hypot(t[2], t[3]);
    // Width is in text space; scale it the same way as the height.
    const scale = item.height ? height / item.height : 1;
    pieces.push({ text: item.str, x: t[4], y: t[5], width: item.width * (Number.isFinite(scale) ? scale : 1), height });
  }
  return pieces;
}

function check(signal: AbortSignal | undefined, deadline: number | undefined) {
  if (signal?.aborted) throw new ReportReadError("cancelled");
  if (deadline && Date.now() > deadline) throw new ReportReadError("timeout");
}

export async function extractPdf(lib: typeof PdfJs, data: Uint8Array, opts: ExtractOptions = {}): Promise<ExtractedDocument> {
  const { onProgress, ocr, signal, deadline } = opts;
  onProgress?.({ stage: "opening" });
  const task = lib.getDocument({ data, enableXfa: false, ...opts.getDocumentParams });
  const abort = () => void task.destroy();
  signal?.addEventListener("abort", abort);
  let doc: PdfJs.PDFDocumentProxy;
  try {
    doc = await task.promise;
  } catch (e) {
    signal?.removeEventListener("abort", abort);
    check(signal, deadline);
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException") throw new ReportReadError("password");
    throw new ReportReadError("unreadable_file");
  }
  try {
    const pageCount = doc.numPages;
    if (pageCount > REPORT_LIMITS.maxPages) throw new ReportReadError("too_many_pages");
    const pages: ExtractedPage[] = [];
    let ocrUsed = 0;
    for (let n = 1; n <= pageCount; n++) {
      check(signal, deadline);
      onProgress?.({ stage: "reading", page: n, pageCount });
      const page = await doc.getPage(n);
      try {
        const pieces = await pageTextPieces(lib, page);
        const textRows = buildRows(pieces);
        const enoughText = textAmount(pieces) >= REPORT_LIMITS.minTextChars;
        // Text that reads as nothing useful (a results table drawn as an image,
        // or a font whose text comes out garbled) also goes to OCR.
        if (!ocr || (enoughText && (!opts.usable || opts.usable(textRows)))) {
          pages.push({ page: n, method: "text", rows: textRows });
          continue;
        }
        if (ocrUsed >= REPORT_LIMITS.maxOcrPages) {
          pages.push({ page: n, method: enoughText ? "text" : "unreadable", rows: textRows });
          continue;
        }
        ocrUsed++;
        const words = await ocr(page, n, pageCount);
        check(signal, deadline);
        const ocrRows = words ? buildRows(words) : null;
        if (ocrRows && (!enoughText || !opts.usable || opts.usable(ocrRows))) pages.push({ page: n, method: "ocr", rows: ocrRows });
        else pages.push({ page: n, method: enoughText ? "text" : "unreadable", rows: textRows });
      } finally {
        page.cleanup();
      }
    }
    return { pageCount, pages };
  } finally {
    signal?.removeEventListener("abort", abort);
    await task.destroy();
  }
}
