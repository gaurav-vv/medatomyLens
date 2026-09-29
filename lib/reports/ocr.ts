/**
 * Text recognition for scanned pages (AGENTS.md Section 17), browser only.
 * tesseract.js and its English model are served by this site from
 * public/vendor/ (scripts/copy-vendor.mjs) and downloaded only the first time
 * a scanned page is read. Nothing is sent anywhere: recognition runs in a
 * Web Worker on this device.
 */
import type { PDFPageProxy } from "pdfjs-dist";
import type { Worker as OcrWorker } from "tesseract.js";
import { withBase } from "@/lib/basePath";
import type { TextPiece } from "./layout";

/** Rendered page width for recognition: enough for small table text, bounded for phone memory. */
const TARGET_WIDTH = 2000;
const MAX_SCALE = 3;

const abs = (path: string) => new URL(withBase(path), window.location.href).href;

export interface OcrSession {
  recognize(page: PDFPageProxy, onFraction: (f: number) => void): Promise<TextPiece[] | null>;
  close(): Promise<void>;
}

export async function startOcr(): Promise<OcrSession> {
  const { createWorker, OEM } = await import("tesseract.js");
  let report: ((f: number) => void) | null = null;
  const worker: OcrWorker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: abs("/vendor/tesseract/worker.min.js"),
    corePath: abs("/vendor/tesseract/core"),
    langPath: abs("/vendor/tesseract/lang"),
    workerBlobURL: false,
    gzip: true,
    // The model is a static public file; the service worker caches it. No IndexedDB copy.
    cacheMethod: "none",
    logger: (m) => {
      if (m.status === "recognizing text" && report) report(m.progress);
    },
  });

  return {
    async recognize(page, onFraction) {
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(MAX_SCALE, TARGET_WIDTH / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      try {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        report = onFraction;
        const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
        const pieces: TextPiece[] = [];
        for (const block of data.blocks ?? [])
          for (const para of block.paragraphs)
            for (const line of para.lines) {
              // One baseline per recognized line keeps its words on one row.
              const y = (line.baseline.y0 + line.baseline.y1) / 2;
              const height = Math.max(1, line.bbox.y1 - line.bbox.y0);
              for (const w of line.words) {
                if (!w.text.trim()) continue;
                pieces.push({ text: w.text, x: w.bbox.x0, y, width: w.bbox.x1 - w.bbox.x0, height, confidence: w.confidence });
              }
            }
        return pieces;
      } catch {
        return null;
      } finally {
        report = null;
        // Release the bitmap right away (phones have little memory).
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    close: () => worker.terminate().then(() => undefined),
  };
}
