/**
 * Rebuilds lines and table rows from positioned text pieces (AGENTS.md
 * Section 18). PDF text arrives as scattered pieces with coordinates; lab
 * tables only keep their meaning if "Creatinine", "1.9", "mg/dL" and
 * "0.7 - 1.3" stay together as one row with separate cells.
 *
 * Pure functions: the same code handles pdf.js text and OCR words.
 */

export interface TextPiece {
  text: string;
  /** Left edge, in page units (any unit, as long as one page uses one). */
  x: number;
  /** Baseline (or bottom), measured from the top of the page. */
  y: number;
  width: number;
  /** Font size or word height, in the same unit. */
  height: number;
  /** OCR word confidence 0–100; undefined for real PDF text. */
  confidence?: number;
}

export interface TextRow {
  /** Cells left to right, split where the horizontal gap is column-sized. */
  cells: string[];
  /** Cells joined with " | ": the line shown as the report's text. */
  text: string;
  /** Lowest OCR confidence in the row (undefined for PDF text). */
  minConfidence?: number;
}

export const CELL_SEPARATOR = " | ";

/** Tunables, relative to the text height so they work at any scale. */
const SAME_ROW = 0.5; // baselines closer than half a text height share a row
const COLUMN_GAP = 1.0; // a gap wider than one text height starts a new cell
const WORD_GAP = 0.1; // a smaller gap than this joins pieces with no space

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function buildRows(pieces: TextPiece[]): TextRow[] {
  const usable = pieces.filter((p) => clean(p.text) && p.height > 0 && Number.isFinite(p.x) && Number.isFinite(p.y));
  usable.sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: TextPiece[][] = [];
  let current: TextPiece[] = [];
  let rowY = 0;
  let rowH = 0;
  for (const p of usable) {
    if (current.length && Math.abs(p.y - rowY) <= SAME_ROW * Math.min(rowH, p.height)) {
      current.push(p);
      continue;
    }
    if (current.length) rows.push(current);
    current = [p];
    rowY = p.y;
    rowH = p.height;
  }
  if (current.length) rows.push(current);

  return rows.map(toRow).filter((r) => r.cells.length > 0);
}

function toRow(pieces: TextPiece[]): TextRow {
  pieces.sort((a, b) => a.x - b.x);
  const cells: string[] = [];
  let cell = "";
  let end = -Infinity;
  for (const p of pieces) {
    const gap = p.x - end;
    const h = p.height;
    if (cell && gap > COLUMN_GAP * h) {
      cells.push(cell);
      cell = "";
    }
    // Keep the piece's own spacing; add one space between separated words.
    const text = p.text.replace(/\t/g, "   ");
    cell = cell && gap > WORD_GAP * h && !/\s$/.test(cell) && !/^\s/.test(text) ? `${cell} ${text}` : cell + text;
    end = Math.max(end, p.x + p.width);
  }
  if (cell) cells.push(cell);

  // Some generators pad columns with runs of spaces inside one piece.
  const split = cells.flatMap((c) => c.split(/\s{3,}|\s*\|\s*/)).map(clean).filter(Boolean);
  const conf = pieces.map((p) => p.confidence).filter((c): c is number => c != null);
  return {
    cells: split,
    text: split.join(CELL_SEPARATOR),
    minConfidence: conf.length ? Math.min(...conf) : undefined,
  };
}

/** Characters of real text on a page: decides whether OCR is needed (Section 17). */
export function textAmount(pieces: TextPiece[]): number {
  return pieces.reduce((n, p) => n + p.text.replace(/\s+/g, "").length, 0);
}
