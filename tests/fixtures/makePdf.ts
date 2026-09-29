/**
 * Minimal PDF writer for SYNTHETIC test fixtures (AGENTS.md Section 75: no
 * real reports in tests). Writes text in Helvetica at given positions and
 * optional grayscale images (for "scanned" pages), with a correct xref table.
 * Coordinates: points from the top-left of an A4 page (595 x 842).
 */

export interface PdfText {
  x: number;
  y: number;
  text: string;
  size?: number;
}

export interface PdfImage {
  /** Pixels, row by row from the top, one byte per pixel (0 = black). */
  gray: Uint8Array;
  width: number;
  height: number;
  /** Placement on the page, in points from the top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfPageSpec {
  texts?: PdfText[];
  image?: PdfImage;
}

export interface PdfOptions {
  /** Adds a standard security handler whose (empty) user password does not match: readers must ask for a password. */
  passwordProtected?: boolean;
}

const PAGE_W = 595;
const PAGE_H = 842;

const latin1 = (s: string) => Uint8Array.from(s, (c) => {
  const code = c.charCodeAt(0);
  if (code > 255) throw new Error(`makePdf: character not in Latin-1: ${c}`);
  return code;
});
const escapeText = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);

export function makePdf(pages: PdfPageSpec[], opts: PdfOptions = {}): Uint8Array {
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === "string" ? latin1(b) : b;
    chunks.push(bytes);
    length += bytes.length;
  };
  // Object numbers: 1 catalog, 2 pages, 3 font, then per page: page, content, [image].
  const objects: (Uint8Array | string)[][] = [];
  const add = (...parts: (Uint8Array | string)[]) => {
    objects.push(parts);
    return objects.length;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("PAGES"); // placeholder, filled below
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  const pageIds: number[] = [];
  for (const page of pages) {
    let content = "";
    let imageId: number | null = null;
    if (page.image) {
      const im = page.image;
      imageId = add(
        `<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${im.gray.length} >>\nstream\n`,
        im.gray,
        "\nendstream",
      );
      content += `q ${im.w} 0 0 ${im.h} ${im.x} ${PAGE_H - im.y - im.h} cm /Im1 Do Q\n`;
    }
    for (const t of page.texts ?? []) {
      content += `BT /F1 ${t.size ?? 10} Tf ${t.x} ${PAGE_H - t.y} Td (${escapeText(t.text)}) Tj ET\n`;
    }
    const contentBytes = latin1(content);
    const contentId = add(`<< /Length ${contentBytes.length} >>\nstream\n`, contentBytes, "\nendstream");
    const xobj = imageId ? ` /XObject << /Im1 ${imageId} 0 R >>` : "";
    pageIds.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R >>${xobj} >> /Contents ${contentId} 0 R >>`,
      ),
    );
  }
  objects[1] = [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`];
  let encryptId: number | null = null;
  if (opts.passwordProtected) {
    const hex32 = "A5".repeat(32);
    encryptId = add(`<< /Filter /Standard /V 1 /R 2 /O <${hex32}> /U <${"5A".repeat(32)}> /P -4 >>`);
  }

  push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
  objects.forEach((parts, i) => {
    offsets.push(length);
    push(`${i + 1} 0 obj\n`);
    for (const p of parts) push(p);
    push("\nendobj\n");
  });
  const xref = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const o of offsets) push(`${String(o).padStart(10, "0")} 00000 n \n`);
  const id = "0123456789ABCDEF0123456789ABCDEF";
  const enc = encryptId ? ` /Encrypt ${encryptId} 0 R /ID [<${id}> <${id}>]` : "";
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${enc} >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** A synthetic lab table: one text item per cell, placed in columns like real lab PDFs. */
export function labTablePage(title: string, rows: string[][], opts: { top?: number; columns?: number[]; size?: number } = {}): PdfPageSpec {
  const columns = opts.columns ?? [40, 220, 300, 390];
  const top = opts.top ?? 120;
  const texts: PdfText[] = [{ x: 40, y: 60, text: title, size: 14 }];
  rows.forEach((cells, r) =>
    cells.forEach((text, c) => texts.push({ x: columns[c] ?? 40 + c * 100, y: top + r * 18, text, size: opts.size ?? 10 })),
  );
  return { texts };
}
