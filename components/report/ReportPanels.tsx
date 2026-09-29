"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { useAnatomy } from "@/components/anatomy/AnatomyContext";
import { selectionKeyFor, structureName } from "@/lib/medical/anatomyLink";
import { groupFindings, reportSummary, STATUS_LABEL, type FindingSection } from "@/lib/medical/report";
import type { ResolvedFinding } from "@/lib/medical/types";
import { FindingDetails } from "./FindingDetails";
import { useReport } from "./ReportContext";

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
  if (f.raw.negated) return "The report states: not found";
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

/** Short, neutral status tag for a finding (Section 93: no severity colours). */
export function statusTag(f: ResolvedFinding): { text: string; tone: "out" | "in" | "none" } {
  if (f.status === "NOT_INTERPRETED") return { text: "Review", tone: "none" };
  if (f.raw.negated) return { text: "Not found", tone: "none" };
  if (f.status === "ABOVE_RANGE") return { text: "↑ Above range", tone: "out" };
  if (f.status === "BELOW_RANGE") return { text: "↓ Below range", tone: "out" };
  if (f.status === "NORMAL") return { text: "In range", tone: "in" };
  if (f.status === "REPORT_STATED") return { text: "Report states", tone: "none" };
  return { text: "No range", tone: "none" };
}

/**
 * Colour has one defined meaning (Section 23): green = within the report's own
 * range, red = outside it. Both always carry a text label (Section 24). There is no graded "how far" colour: how much a
 * difference matters depends on the test and the person (Sections 93, 94).
 */
const TONE: Record<"out" | "in" | "none", string> = {
  out: "border-red-500 bg-red-600 text-white",
  in: "border-green-500 bg-green-600 text-white",
  none: "border-white/10 text-muted",
};

function FindingRow({ f, active, onOpen }: { f: ResolvedFinding; active: boolean; onOpen: () => void }) {
  const tag = statusTag(f);
  const isLab = f.raw.findingType === "lab_association";
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onOpen}
        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-teal-300 ${
          active ? "bg-violet-300/15" : "hover:bg-white/5"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-tight">{f.raw.name}</span>
          {isLab && (
            <span className="block text-[12px] font-medium tabular-nums text-foreground/90">
              {f.raw.value} <span className="font-normal text-muted">{f.raw.unit ?? ""}</span>
            </span>
          )}
        </span>
        <span className={`ui-tag shrink-0 ${TONE[tag.tone]}`}>{tag.text}</span>
      </button>
    </li>
  );
}

/** One body part (or kind of test): heading, one-line explanation, results outside the range first. */
function Section({ section, selected, onOpen }: { section: FindingSection; selected: ResolvedFinding | null; onOpen: (f: ResolvedFinding) => void }) {
  const { state } = useAnatomy();
  const shownOn = [...new Set(section.findings.flatMap((f) => f.structures))];
  const outside = section.findings.filter((f) => statusTag(f).tone === "out").length;
  return (
    <li className="rounded-xl border border-border bg-white/[0.02] p-1.5">
      <details open>
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
          <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${shownOn.length ? "bg-violet-400" : "bg-white/20"}`} />
          <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold">{section.title}</h3>
          {outside > 0 && <span className="ui-tag border-red-500 bg-red-600 text-white">{outside} outside range</span>}
          <span className="text-[11px] tabular-nums text-muted">{section.findings.length}</span>
        </summary>
        <p className="px-1.5 pb-1 text-[11px] leading-snug text-muted">
          {section.note}
          {shownOn.length > 0 && (
            <span className="text-violet-200/80"> Shown on: {shownOn.map((s) => structureName(state.index, s)).join(", ")}.</span>
          )}
        </p>
        <ul>
          {section.findings.map((f) => (
            <FindingRow key={f.raw.id} f={f} active={selected === f} onOpen={() => onOpen(f)} />
          ))}
        </ul>
      </details>
    </li>
  );
}

/**
 * Finding list for the body view, grouped by organ and kind of test.
 * Desktop: a card in the left column. Phone: a compact bar that expands.
 * Nothing is shown until a report is uploaded (the upload button sits next to the search).
 */
/** `measureRef`: the always-visible header bar, used to keep the 3D model below it on phones. */
export function ReportCard({ measureRef }: { measureRef?: RefObject<HTMLDivElement | null> }) {
  const { report, selectedFinding, closeReport } = useReport();
  const { state, dispatch } = useAnatomy();
  const open = useOpenFinding();
  const [expanded, setExpanded] = useState(true);
  const sections = useMemo(
    () => (report ? groupFindings(report.findings, (id) => structureName(state.index, id)) : []),
    [report, state.index],
  );

  if (!report) return null;

  const s = reportSummary(report.findings);
  const outsideCount = report.findings.filter((f) => f.status === "ABOVE_RANGE" || f.status === "BELOW_RANGE").length;
  const inCount = report.findings.filter((f) => f.status === "NORMAL").length;
  return (
    <section aria-label="Report findings" className="ui-panel">
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
          className="ui-btn ml-auto border-transparent bg-transparent text-muted md:hidden"
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
          className="ui-icon-btn md:ml-auto"
        >
          ✕
        </button>
      </div>
      <div className={`${expanded ? "block" : "hidden"} md:block`}>
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          <span className="ui-tag border-border text-foreground">{s.total} results</span>
          {outsideCount > 0 && <span className="ui-tag border-red-500 bg-red-600 text-white">{outsideCount} outside range</span>}
          {inCount > 0 && <span className="ui-tag border-green-500 bg-green-600 text-white">{inCount} in range</span>}
          <span className="ui-tag border-border text-muted">{s.mapped} shown on the body</span>
          {s.unmapped + s.grouped > 0 && <span className="ui-tag border-border text-muted">{s.unmapped + s.grouped} listed only</span>}
          {s.review > 0 && <span className="ui-tag border-border text-muted">{s.review} need review</span>}
        </div>
        <p className="sr-only">
          {s.total} findings · {s.mapped} shown on the body
          {s.unmapped ? ` · ${s.unmapped} not recognized yet` : ""}
        </p>
        <ul className="mt-2 max-h-[34dvh] space-y-1.5 overflow-y-auto px-2 pb-2 md:max-h-[calc(100dvh-24rem)]">
          {sections.map((sec) => (
            <Section
              key={sec.id}
              section={sec}
              selected={selectedFinding}
              onOpen={(f) => {
                open(f);
                setExpanded(false);
              }}
            />
          ))}
        </ul>
        <p className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] text-muted">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />
          {REPORTED_LEGEND}. Tap a result to see where it is shown and why.
        </p>
      </div>
    </section>
  );
}

/**
 * Finding details in the body view, when no single structure is selected.
 * Closing the panel keeps the organ highlighted (a small bar can reopen the
 * details or clear the highlight), so on phones the organ can be seen.
 */
export function BodyFindingPanel() {
  const { state, dispatch } = useAnatomy();
  const { report, selectedFinding, selectFinding } = useReport();
  const [collapsedId, setCollapsedId] = useState<string | null>(null);
  const visible = !!report && !!selectedFinding && !state.selected && state.view === "body";
  const collapsed = visible && collapsedId === selectedFinding?.raw.id;

  const clear = useCallback(() => {
    selectFinding(null);
    setCollapsedId(null);
    dispatch({ type: "emphasize", meshes: [] });
  }, [selectFinding, dispatch]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, clear]);

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

  if (collapsed) {
    return (
      <div
        role="status"
        aria-label="Showing finding"
        className="pointer-events-auto ui-panel absolute bottom-3 left-3 right-16 z-20 flex items-center gap-2 px-3 py-1.5 md:left-auto md:right-4 md:top-20 md:bottom-auto md:w-80"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {selectedFinding.raw.name}
          <span className="text-[11px] text-muted"> · {findingSubtitle(selectedFinding)}</span>
        </span>
        <button type="button" className="ui-btn shrink-0" onClick={() => setCollapsedId(null)}>
          Details
        </button>
        <button type="button" aria-label="Clear highlight" className="ui-icon-btn" onClick={clear}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Finding details"
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 max-h-[48dvh] overflow-y-auto ui-panel p-4 md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:max-h-[calc(100%-6rem)] md:w-96"
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
          onClick={() => setCollapsedId(selectedFinding.raw.id)}
          aria-label="Close details (keep highlight)"
          className="ui-icon-btn -m-2"
        >
          ✕
        </button>
      </div>
      {structures.some((s) => s.onClick) && (
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
