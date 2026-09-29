/**
 * Upload limits and file checks (AGENTS.md Sections 51, 52). Reports are read
 * on this device only, so these checks protect the user's browser (memory,
 * time) rather than a server. The file name and the browser's MIME type are
 * not trusted: the file must start like a PDF.
 */

export const REPORT_LIMITS = {
  /** Largest accepted file. */
  maxBytes: 20 * 1024 * 1024,
  /** Most pages read from one report. */
  maxPages: 30,
  /** Most pages sent to text recognition (OCR is slow on phones). */
  maxOcrPages: 10,
  /** A page with fewer characters of real text than this is treated as scanned (Section 17). */
  minTextChars: 40,
  /** Whole-report time limit. */
  timeoutMs: 180_000,
} as const;

export type ReportErrorCode =
  | "not_pdf"
  | "empty"
  | "too_large"
  | "too_many_pages"
  | "password"
  | "unreadable_file"
  | "no_text"
  | "timeout"
  | "cancelled"
  | "unavailable";

const MB = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

/** User-facing messages (Section 37): what happened and what to try. */
export const REPORT_ERROR_TEXT: Record<ReportErrorCode, string> = {
  not_pdf: "This file is not a PDF. Choose a PDF report.",
  empty: "This file is empty. Choose a PDF report.",
  too_large: `This file is larger than ${MB(REPORT_LIMITS.maxBytes)}. Choose a smaller PDF.`,
  too_many_pages: `This report has more than ${REPORT_LIMITS.maxPages} pages. Choose a shorter PDF or only the pages with results.`,
  password: "This PDF is password-protected. Remove the password in your PDF app, then try again.",
  unreadable_file: "This PDF could not be opened. The file may be corrupted or incomplete.",
  no_text: "We couldn't extract readable text from this report. Try uploading a clearer PDF.",
  timeout: "Reading this report took too long and was stopped. Try a shorter or clearer PDF.",
  cancelled: "Reading was cancelled.",
  unavailable: "Report processing is temporarily unavailable. Your anatomy viewer is still available.",
};

export class ReportReadError extends Error {
  constructor(readonly code: ReportErrorCode) {
    super(REPORT_ERROR_TEXT[code]);
    this.name = "ReportReadError";
  }
}

/** "%PDF-" may be preceded by a little junk; readers accept it within the first 1 KB. */
export function looksLikePdf(head: Uint8Array): boolean {
  const s = String.fromCharCode(...head.subarray(0, 1024));
  return s.includes("%PDF-");
}

/** Checks that need no parsing. Returns the error code, or null when the file may be read. */
export function checkFile(file: { size: number }, head: Uint8Array): ReportErrorCode | null {
  if (file.size === 0) return "empty";
  if (file.size > REPORT_LIMITS.maxBytes) return "too_large";
  if (!looksLikePdf(head)) return "not_pdf";
  return null;
}
