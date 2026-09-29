"use client";

import { useEffect, useState, type RefObject } from "react";
import { useAnatomy } from "@/components/anatomy/AnatomyContext";
import { selectionKeyFor, structureName } from "@/lib/medical/anatomyLink";
import { reportSummary, STATUS_LABEL } from "@/lib/medical/report";
import type { ResolvedFinding } from "@/lib/medical/types";
import { FindingDetails } from "./FindingDetails";
import { useReport } from "./ReportContext";
import { ReportUploader } from "./ReportUploader";

export const DEMO_LABEL = "DEMO / SAMPLE DATA";
export const UPLOADED_LABEL = "YOUR REPORT · ON THIS DEVICE";
export const REPORTED_LEGEND = "Highlighted: structures associated with findings in this report";

/** Label that says where the shown findings come from (Section 74: demo data is always labeled). */
export function reportLabel(report: { isDemo: boolean } | null): string {
  if (!report) return "";
  return report.isDemo ? DEMO_LABEL : UPLOADED_LABEL;
}

/** Short status line for a finding in lists. */
export function findingSubtitle(f: ResolvedFinding): string {
  if (f.status === "NOT_INTERPRETED") return "Needs review";
  const value = f.raw.findingType === "lab_association" ? `${f.raw.value} ${f.raw.unit ?? ""} · ` : "";
  return `${value}${STATUS_LABEL[f.status]}`;
}

/** Opens a finding in the body view: its structures are emphasised and framed. */
export function useOpenFinding() {
  const { dispatch } = useAnatomy();
  const { selectFinding, meshesOf } = useReport();
  return (f: ResolvedFinding) => {
    selectFinding(f.raw.id);
    dispatch({ type: "emphasize", meshes: meshesOf(f), focus: true });
  };
}

function FindingRow({ f, active, onOpen }: { f: ResolvedFinding; active: boolean; onOpen: () => void }) {
  const { state } = useAnatomy();
  const where = f.structures.length
    ? f.structures.map((s) => structureName(state.index, s)).join(", ")
    : f.status === "NOT_INTERPRETED"
      ? "Not shown"
      : "Not mapped to a structure";
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onOpen}
        className={`w-full rounded-lg px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-teal-300 ${
          active ? "bg-violet-300/15" : "hover:bg-white/5"
        }`}
      >
        <span className="block text-sm leading-tight">{f.raw.name}</span>
        <span className="block text-[11px] text-muted">{findingSubtitle(f)}</span>
        <span className="block text-[11px] text-violet-200/80">{where}</span>
      </button>
    </li>
  );
}

/**
 * Report entry point and finding list for the body view. Desktop: a card in
 * the left column. Phone: a compact bar that expands into a list.
 */
/** `measureRef`: the always-visible part (button or header bar), used to keep the 3D model below it on phones. */
export function ReportCard({ measureRef }: { measureRef?: RefObject<HTMLDivElement | null> }) {
  const { report, selectedFinding, loadDemo, closeReport } = useReport();
  const { dispatch } = useAnatomy();
  const open = useOpenFinding();
  const [expanded, setExpanded] = useState(false);

  if (!report) {
    return (
      <div ref={measureRef} className="flex flex-wrap gap-2 md:flex-col">
        <ReportUploader onShown={() => setExpanded(true)} />
        <button
          type="button"
          onClick={() => {
            loadDemo();
            setExpanded(true);
          }}
          className="ui-btn ui-btn-report md:w-full md:justify-start md:rounded-lg"
        >
          Try the demo report
        </button>
      </div>
    );
  }

  const s = reportSummary(report.findings);
  return (
    <section
      aria-label="Report findings"
      className="ui-panel"
    >
      <div ref={measureRef} className="flex items-center gap-2 px-3 py-2 md:pb-0 md:pt-2.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black ${
            report.isDemo ? "bg-amber-200/90" : "bg-teal-200/90"
          }`}
        >
          {reportLabel(report)}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="ml-auto rounded-full px-2 py-0.5 text-[11px] text-muted hover:text-foreground md:hidden"
        >
          {expanded ? "Hide ▴" : `${s.total} findings ▾`}
        </button>
        <button
          type="button"
          onClick={() => {
            closeReport();
            dispatch({ type: "emphasize", meshes: [] });
          }}
          aria-label={report.isDemo ? "Close demo report" : "Close report"}
          className="rounded-full p-1 text-xs text-muted hover:text-foreground md:ml-auto"
        >
          ✕
        </button>
      </div>
      <div className={`${expanded ? "block" : "hidden"} md:block`}>
        <p className="px-3 pt-1 text-sm font-semibold">{report.title}</p>
        <p className="px-3 text-[11px] text-muted">
          {s.total} findings · {s.mapped} shown on the body{s.unmapped ? ` · ${s.unmapped} not mapped` : ""}
          {s.review ? ` · ${s.review} need review` : ""}
        </p>
        <ul className="mt-1 max-h-[38dvh] overflow-y-auto px-1 pb-1 md:max-h-[calc(100dvh-32rem)]">
          {report.findings.map((f) => (
            <FindingRow
              key={f.raw.id}
              f={f}
              active={selectedFinding === f}
              onOpen={() => {
                open(f);
                setExpanded(false);
              }}
            />
          ))}
        </ul>
        <p className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] text-muted">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />
          {REPORTED_LEGEND}
        </p>
      </div>
    </section>
  );
}

/** Finding details in the body view, when no single structure is selected. */
export function BodyFindingPanel() {
  const { state, dispatch } = useAnatomy();
  const { report, selectedFinding, selectFinding } = useReport();
  const visible = !!report && !!selectedFinding && !state.selected && state.view === "body";

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      selectFinding(null);
      dispatch({ type: "emphasize", meshes: [] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selectFinding, dispatch]);

  if (!visible || !report || !selectedFinding) return null;
  const index = state.index;
  const structures = selectedFinding.structures.map((id) => {
    const key = index ? selectionKeyFor(index, id) : null;
    return {
      id,
      name: structureName(index, id),
      onClick: key ? () => dispatch({ type: "select", key, focus: true }) : undefined,
    };
  });

  return (
    <aside
      aria-label="Finding details"
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 max-h-[55dvh] overflow-y-auto ui-panel p-4 md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:max-h-[calc(100%-6rem)] md:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-bold tracking-wide ${report.isDemo ? "text-amber-200" : "text-teal-200"}`}>
            {reportLabel(report)}
          </p>
          <h2 className="text-base font-semibold leading-tight">{selectedFinding.raw.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            selectFinding(null);
            dispatch({ type: "emphasize", meshes: [] });
          }}
          aria-label="Close"
          className="-m-1 rounded-full p-1 text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {structures.length > 0 && (
        <p className="mt-1 text-[11px] text-muted">Tap an organ below to select it and open its detailed view.</p>
      )}
      <div className="mt-2">
        <FindingDetails finding={selectedFinding} report={report} structures={structures} />
      </div>
    </aside>
  );
}

/** Findings linked to the selected structure (Anatomy → Findings, Section 88). */
export function StructureFindings({ ids }: { ids: string[] }) {
  const { report } = useReport();
  const open = useOpenFinding();
  if (!report) {
    return (
      <p className="mt-2 text-xs text-muted">
        No findings are linked to this structure. Educational descriptions will be added from reviewed sources.
      </p>
    );
  }
  const set = new Set(ids);
  const list = report.findings.filter((f) => f.structures.some((s) => set.has(s)));
  if (!list.length) return <p className="mt-2 text-xs text-muted">No findings in this report are associated with this structure.</p>;
  return (
    <div className="mt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Reported findings <span className="font-bold text-amber-200">· {reportLabel(report)}</span>
      </h3>
      <ul className="mt-1 -mx-2">
        {list.map((f) => (
          <FindingRow key={f.raw.id} f={f} active={false} onOpen={() => open(f)} />
        ))}
      </ul>
    </div>
  );
}
