// Copies the browser runtime files of the report readers from node_modules
// into public/vendor/, so the app serves them itself and never loads code or
// data from a CDN (AGENTS.md Sections 28, 35). Runs before `dev` and `build`.
// public/vendor/ is generated (git-ignored); versions come from package-lock.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT = "public/vendor";
const nm = (p) => join("node_modules", p);

/** [source, destination] pairs. Directories are copied whole. */
const FILES = [
  // pdf.js (Mozilla, Apache-2.0): worker, image decoders, standard fonts.
  [nm("pdfjs-dist/build/pdf.worker.min.mjs"), "pdfjs/pdf.worker.min.mjs"],
  [nm("pdfjs-dist/standard_fonts"), "pdfjs/standard_fonts"],
  [nm("pdfjs-dist/LICENSE"), "pdfjs/LICENSE"],
  // tesseract.js (Apache-2.0): worker script and the LSTM-only WebAssembly cores.
  [nm("tesseract.js/dist/worker.min.js"), "tesseract/worker.min.js"],
  [nm("tesseract.js/LICENSE.md"), "tesseract/LICENSE.md"],
  [nm("tesseract.js/dist/worker.min.js.LICENSE.txt"), "tesseract/worker.min.js.LICENSE.txt"],
  [nm("tesseract.js-core/LICENSE"), "tesseract/core/LICENSE"],
  // English model (tessdata_best, integerized; Apache-2.0).
  [nm("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"), "tesseract/lang/eng.traineddata.gz"],
];

rmSync(OUT, { recursive: true, force: true });
const copy = (src, dest) => {
  if (!existsSync(src)) throw new Error(`copy-vendor: missing ${src} (run npm install)`);
  const target = join(OUT, dest);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(src, target, { recursive: true });
};
for (const [src, dest] of FILES) copy(src, dest);

// pdf.js decoders for JPEG 2000 / JBIG2 images and colour profiles (common in scans).
// quickjs-eval is left out: PDF scripting stays disabled.
for (const f of readdirSync(nm("pdfjs-dist/wasm"))) {
  if (!f.startsWith("quickjs")) copy(nm(`pdfjs-dist/wasm/${f}`), `pdfjs/wasm/${f}`);
}
// The worker picks one core by device support (SIMD, relaxed SIMD); only that one is downloaded.
for (const f of readdirSync(nm("tesseract.js-core"))) {
  if (f.endsWith("-lstm.wasm.js")) copy(nm(`tesseract.js-core/${f}`), `tesseract/core/${f}`);
}
console.log(`copy-vendor: report reader files copied to ${OUT}/`);
