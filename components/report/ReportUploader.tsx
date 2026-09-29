"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnatomy } from "@/components/anatomy/AnatomyContext";
import { structureName } from "@/lib/medical/anatomyLink";
import { findTerm } from "@/lib/medical/report";
import type { RawFinding } from "@/lib/medical/types";
import { withFindings, type ReadReport } from "@/lib/reports/buildReport";
import type { ReadProgress } from "@/lib/reports/pdfText";
import { REPORT_ERROR_TEXT, ReportReadError, type ReportErrorCode } from "@/lib/reports/validate";
import { useReport } from "./ReportContext";

export const PRIVACY_NOTE = "Read on this device. Your report is not uploaded or saved.";
export const REVIEW_NOTE = "Check these values against your report. Untick anything that was read wrongly.";
export const OCR_NOTE =
  "read by text recognition, which can misread characters (for example a missing decimal point). Rows from scanned pages are not ticked: compare each value with your report before including it.";
export const OCR_ROW_NOTE = "Read by text recognition: tick only if it matches your report.";

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; progress: ReadProgress | null }
  | { kind: "error"; code: ReportErrorCode; file: File }
  | { kind: "review"; read: ReadReport; keep: Set<string> };

/** Real progress only (Section 38): the stage and page actually being worked on. */
export function progressText(p: ReadProgress | null): { text: string; fraction: number | null } {
  if (!p || p.stage === "opening") return { text: "Opening report...", fraction: null };
  if (p.stage === "reading") return { text: `Reading report... page ${p.page} of ${p.pageCount}`, fraction: (p.page - 1) / p.pageCount };
  if (p.stage === "ocr_loading") return { text: "Loading text recognition (first time only)...", fraction: null };
  return {
    text: `Recognizing text on scanned page ${p.page} of ${p.pageCount}... ${Math.round(p.fraction * 100)}%`,
    fraction: p.fraction,
  };
}

const pageList = (pages: number[]) => (pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pages.join(", ")}`);

function ReviewRow({ f, checked, onToggle }: { f: RawFinding; checked: boolean; onToggle: () => void }) {
  const { state } = useAnatomy();
  const term = findTerm(f.name);
  const where = term
    ? `Associated with: ${term.associatedStructures.map((s) => structureName(state.index, s)).join(", ")}`
    : "Not in the app's terminology yet: listed, not shown on the body";
  const id = `review-${f.id}`;
  return (
    <li className="rounded-lg border border-border bg-white/[0.03] px-3 py-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
        <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 accent-teal-300" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium">{f.name}</span>
            <span className="text-sm">
              {f.value} {f.unit ?? ""}
            </span>
            <span className="text-[11px] text-muted">
              {f.referenceRange ? `Reported range ${f.referenceRange.text}` : "No range printed"} · page {f.source.page}
              {f.confidence === "low" && " · text recognition"}
            </span>
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted" title={f.source.text}>
            “{f.source.text}”
          </span>
          <span className={`block text-[11px] ${term ? "text-violet-200/90" : "text-muted"}`}>{where}</span>
          {f.confidence === "low" && <span className="block text-[11px] text-amber-100">{OCR_ROW_NOTE}</span>}
        </span>
      </label>
    </li>
  );
}

/**
 * PDF upload flow (AGENTS.md Sections 16, 37–39): pick → read with real
 * progress → review what was read → show on the body. Errors say what to try
 * and allow a retry; one unreadable page never fails the whole report.
 */
export function ReportUploader({ onShown }: { onShown?: () => void }) {
  const { loadReport } = useReport();
  const { dispatch } = useAnatomy();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const close = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setPhase({ kind: "idle" });
  }, []);

  const read = async (f: File) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ kind: "reading", progress: null });
    try {
      const { readReportFile } = await import("@/lib/reports/readReport");
      const result = await readReportFile(f, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) setPhase({ kind: "reading", progress });
        },
      });
      if (controller.signal.aborted) return;
      // Values read by OCR are opt-in: the user compares them with the report first (Section 4.4).
      setPhase({ kind: "review", read: result, keep: new Set(result.report.findings.filter((x) => x.confidence !== "low").map((x) => x.id)) });
    } catch (e) {
      if (controller.signal.aborted) return;
      setPhase({ kind: "error", code: e instanceof ReportReadError ? e.code : "unavailable", file: f });
    }
  };

  useEffect(() => {
    if (phase.kind === "idle") return;
    dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [phase.kind]);

  useEffect(() => {
    if (phase.kind === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [phase.kind, close]);

  // Stop reading if the viewer goes away.
  useEffect(() => () => abort.current?.abort(), []);

  const choose = () => input.current?.click();

  return (
    <>
      <button type="button" onClick={choose} className="ui-btn ui-btn-accent md:w-full md:justify-start md:rounded-lg">
        Upload report (PDF)
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        data-testid="report-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void read(f);
        }}
      />

      {phase.kind !== "idle" &&
        createPortal(
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/50 md:items-center">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-upload-title"
            className="ui-panel flex max-h-[88dvh] w-full min-w-0 flex-col rounded-b-none p-4 md:max-w-xl md:rounded-b-2xl"
          >
            {phase.kind === "reading" && (
              <ReadingView progress={phase.progress} onCancel={close} />
            )}
            {phase.kind === "error" && (
              <div className="space-y-3">
                <h2 id="report-upload-title" tabIndex={-1} data-autofocus className="text-base font-semibold outline-none">
                  The report could not be read
                </h2>
                <p role="alert" className="text-sm">
                  {REPORT_ERROR_TEXT[phase.code]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {phase.code !== "not_pdf" && phase.code !== "empty" && phase.code !== "too_large" && (
                    <button type="button" className="ui-btn ui-btn-accent" onClick={() => void read(phase.file)}>
                      Try again
                    </button>
                  )}
                  <button type="button" className="ui-btn" onClick={choose}>
                    Choose another file
                  </button>
                  <button type="button" className="ui-btn" onClick={close}>
                    Close
                  </button>
                </div>
              </div>
            )}
            {phase.kind === "review" && (
              <ReviewView
                read={phase.read}
                keep={phase.keep}
                onToggle={(id) => {
                  const keep = new Set(phase.keep);
                  if (keep.has(id)) keep.delete(id);
                  else keep.add(id);
                  setPhase({ ...phase, keep });
                }}
                onChooseAnother={choose}
                onCancel={close}
                onShow={() => {
                  const keep = phase.keep;
                  dispatch({ type: "emphasize", meshes: [] });
                  loadReport(withFindings(phase.read.report, (f) => keep.has(f.id)));
                  onShown?.();
                  close();
                }}
              />
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function ReadingView({ progress, onCancel }: { progress: ReadProgress | null; onCancel: () => void }) {
  const { text, fraction } = progressText(progress);
  return (
    <div className="space-y-3">
      <h2 id="report-upload-title" tabIndex={-1} data-autofocus className="text-base font-semibold outline-none">
        Reading your report
      </h2>
      <p role="status" aria-live="polite" className="text-sm" data-testid="report-progress">
        {text}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        {fraction == null ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-300/60" />
        ) : (
          <div className="h-full rounded-full bg-teal-300/70 transition-[width]" style={{ width: `${Math.round(fraction * 100)}%` }} />
        )}
      </div>
      <p className="text-[11px] text-muted">{PRIVACY_NOTE}</p>
      <button type="button" className="ui-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function ReviewView({
  read,
  keep,
  onToggle,
  onChooseAnother,
  onCancel,
  onShow,
}: {
  read: ReadReport;
  keep: Set<string>;
  onToggle: (id: string) => void;
  onChooseAnother: () => void;
  onCancel: () => void;
  onShow: () => void;
}) {
  const { report, summary } = read;
  const n = report.findings.length;
  return (
    <>
      <div className="space-y-1.5">
        <h2 id="report-upload-title" tabIndex={-1} data-autofocus className="text-base font-semibold outline-none">
          Check what was read
        </h2>
        <p className="text-sm" data-testid="review-summary">
          {n === 0
            ? "No recognizable test results were found in this report."
            : `${n} test result${n === 1 ? "" : "s"} found on ${summary.pageCount} page${summary.pageCount === 1 ? "" : "s"}.`}
        </p>
        {summary.ocrPages.length > 0 && (
          <p className="rounded-lg bg-amber-200/10 px-2.5 py-1.5 text-[12px] text-amber-100">
            {pageList(summary.ocrPages)} {summary.ocrPages.length === 1 ? "was a scanned image" : "were scanned images"},{" "}
            {OCR_NOTE}
          </p>
        )}
        {summary.unreadablePages.length > 0 && (
          <p className="text-[12px] text-muted">{pageList(summary.unreadablePages)}: no readable text.</p>
        )}
        {summary.lowConfidenceRows > 0 && (
          <p className="text-[12px] text-muted">
            {summary.lowConfidenceRows} row{summary.lowConfidenceRows === 1 ? " was" : "s were"} not clear enough to read and
            {summary.lowConfidenceRows === 1 ? " is" : " are"} left out.
          </p>
        )}
        {n > 0 && <p className="text-[12px] text-muted">{REVIEW_NOTE}</p>}
      </div>
      {n > 0 && (
        <ul aria-label="Test results read from the report" className="-mx-1 mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1">
          {report.findings.map((f) => (
            <ReviewRow key={f.id} f={f} checked={keep.has(f.id)} onToggle={() => onToggle(f.id)} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted">
        {PRIVACY_NOTE} Only rows that look like test results are read; other text such as imaging findings is not interpreted yet.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {n > 0 && (
          <button type="button" className="ui-btn ui-btn-accent" disabled={keep.size === 0} onClick={onShow}>
            Show results ({keep.size})
          </button>
        )}
        <button type="button" className="ui-btn" onClick={onChooseAnother}>
          Choose another file
        </button>
        <button type="button" className="ui-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}
