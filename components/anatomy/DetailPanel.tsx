"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useOverlayInsets } from "@/lib/ui/insets";
import { GENERIC_MODEL_LABEL } from "@/components/layout/Disclaimer";
import { detailOrganFor, isPartKey, partIdOf, partKey } from "@/lib/anatomy/detailOrgans";
import { detailParts } from "@/lib/anatomy/structures";
import { LAYER_LABELS } from "@/lib/anatomy/types";
import { structureName } from "@/lib/medical/anatomyLink";
import { FindingDetails } from "@/components/report/FindingDetails";
import { findingSubtitle, reportLabel } from "@/components/report/ReportPanels";
import { useReport } from "@/components/report/ReportContext";
import { useIsWide, useOrganReport } from "@/components/report/useOrganReport";
import { useAnatomy, type OrganViewMode } from "./AnatomyContext";

export const NORMAL_REFERENCE_LABEL = "Generic normal reference";
export const REPORTED_VIEW_LABEL = "Reported";
export const HRA_SOURCE_NOTE =
  "Detailed model: HuBMAP Human Reference Atlas (CC BY 4.0), built from the Visible Human data. It comes from a different reference body than the full-body model, so its shape differs slightly.";
export const LOCATION_UNSPECIFIED_NOTE =
  "The report does not specify where in this organ the finding is located. The whole organ is shown.";
export const REGION_UNAVAILABLE_NOTE = "Region not available in the current model. The whole organ is shown.";

const MODES: { id: OrganViewMode; label: string; wideOnly?: boolean }[] = [
  { id: "reported", label: "Reported" },
  { id: "normal", label: "Normal" },
  { id: "side_by_side", label: "Side by side", wideOnly: true },
];

const chip = "pointer-events-auto ui-btn";

/** Reported | Normal | Side by side (Section 109). Side by side is desktop/tablet only. */
function OrganViewModeToggle({ mode }: { mode: OrganViewMode }) {
  const { dispatch } = useAnatomy();
  const wide = useIsWide();
  return (
    <div role="radiogroup" aria-label="Organ view mode" className="pointer-events-auto flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur-xl md:min-h-9">
      {MODES.filter((m) => wide || !m.wideOnly).map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
          onClick={() => dispatch({ type: "viewMode", mode: m.id })}
          className={`rounded-full px-3 py-1.5 text-xs focus-visible:outline-2 md:py-1 focus-visible:outline-teal-300 ${
            mode === m.id ? "bg-white/15 text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** Findings of this organ with the active one's explanation (Sections 104, 108). */
function OrganFindings() {
  const { state } = useAnatomy();
  const { report, selectFinding } = useReport();
  const { findings, active, location, mode } = useOrganReport();
  if (!report || findings.length === 0 || !active) return null;
  return (
    <section aria-label="Organ findings" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Reported findings <span className="font-bold text-amber-200">· {reportLabel(report)}</span>
      </h3>
      <ul className="-mx-2 space-y-0.5">
        {findings.map((f) => (
          <li key={f.raw.id}>
            <button
              type="button"
              aria-pressed={f === active}
              onClick={() => selectFinding(f.raw.id)}
              className={`w-full rounded-lg px-2 py-1.5 text-left ${f === active ? "bg-violet-300/15" : "hover:bg-white/5"}`}
            >
              <span className="block text-sm leading-tight">{f.raw.name}</span>
              <span className="block text-[11px] text-muted">{findingSubtitle(f)}</span>
            </button>
          </li>
        ))}
      </ul>
      {mode !== "normal" && location?.kind === "unspecified" && (
        <p className="rounded-lg bg-violet-300/10 px-2.5 py-1.5 text-[11px] text-violet-100">{LOCATION_UNSPECIFIED_NOTE}</p>
      )}
      {mode !== "normal" && location?.kind === "region_unavailable" && (
        <p className="rounded-lg bg-violet-300/10 px-2.5 py-1.5 text-[11px] text-violet-100">{REGION_UNAVAILABLE_NOTE}</p>
      )}
      {mode === "normal" && (
        <p className="text-[11px] text-muted">
          Normal shows the generic model without report markers. It does not show your own organ or values.
        </p>
      )}
      <FindingDetails
        finding={active}
        report={report}
        structures={active.structures.map((id) => ({ id, name: structureName(state.index, id) }))}
      />
    </section>
  );
}

/**
 * Organ view chrome (AGENTS.md Sections 21, 103, 104, 109): back control,
 * view mode, generic-model label, findings with explanations, and the parts
 * the model really contains. Phones: top bar plus a bottom sheet.
 */
export function DetailPanel({ viewer }: { viewer: RefObject<HTMLDivElement | null> }) {
  const topBar = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  useOverlayInsets(viewer, topBar, sheet);
  const { state, dispatch, selection } = useAnatomy();
  const { report } = useReport();
  const view = useOrganReport();
  const wide = useIsWide();
  const [sheetOpen, setSheetOpen] = useState(false);
  const organ = detailOrganFor(state.detailOrgans, state.index, selection);
  const parts = useMemo(() => {
    if (organ) return organ.parts.map((p) => ({ key: partKey(p.id), name: p.name, tag: p.shell ? "Outer layer" : "Inside" }));
    if (!state.index || !selection) return [];
    return detailParts(state.index, selection).map((p) => ({ key: p.key, name: p.name, tag: LAYER_LABELS[p.layer] }));
  }, [organ, state.index, selection]);

  const isOn = (key: string) => {
    const current = state.detailPart;
    if (!current) return false;
    if (isPartKey(key) || isPartKey(current)) return key === current;
    return !!state.index?.pieces.get(key)?.includes(current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // First Escape clears a highlighted part, the next one goes back.
      if (state.detailPart) dispatch({ type: "detailPart", key: null });
      else dispatch({ type: "closeDetail" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.detailPart, dispatch]);

  if (!selection) return null;
  const activeName = state.detailPart && isPartKey(state.detailPart)
    ? organ?.parts.find((p) => p.id === partIdOf(state.detailPart!))?.name
    : undefined;
  const hasFindings = view.findings.length > 0;
  const modeLabel = view.mode === "normal" ? NORMAL_REFERENCE_LABEL : `${REPORTED_VIEW_LABEL} view · ${reportLabel(report)}`;

  return (
    <>
      <div ref={topBar} className="pointer-events-none absolute inset-x-0 top-14 z-20 space-y-1.5 px-3 md:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back to body"
            onClick={() => dispatch({ type: "closeDetail" })}
            className={`${chip} shrink-0`}
          >
            ← <span className="hidden sm:inline">Back to body</span>
            <span className="sm:hidden">Body</span>
          </button>
          <h2 className="pointer-events-auto truncate text-sm font-semibold uppercase tracking-wide">
            {organ?.name ?? selection.name}
          </h2>
          {!wide && (
            <button
              type="button"
              onClick={() => dispatch({ type: "resetCamera" })}
              className={`${chip} ml-auto shrink-0 text-muted`}
            >
              ⟲ Reset view
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {view.mode !== "side_by_side" && (
            <span
              className={`ui-tag ${
                view.mode === "normal" ? "border-teal-300/30 bg-teal-300/10 text-teal-100" : "border-violet-300/40 bg-violet-300/10 text-violet-100"
              }`}
            >
              {modeLabel}
            </span>
          )}
          {hasFindings && <OrganViewModeToggle mode={view.mode} />}
          {organ && (
            <button
              type="button"
              role="switch"
              aria-checked={state.seeInside}
              onClick={() => dispatch({ type: "toggleSeeInside" })}
              className={`${chip} ${state.seeInside ? "ui-btn-accent" : ""}`}
            >
              See inside
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted md:hidden">{GENERIC_MODEL_LABEL}</p>
      </div>

      {view.mode === "side_by_side" && (
        <div className="pointer-events-none absolute inset-x-0 top-32 z-10 hidden grid-cols-2 text-center md:grid md:pr-[23rem]">
          <span className="ui-tag mx-auto border-violet-300/40 bg-violet-300/10 text-violet-100">
            {REPORTED_VIEW_LABEL} · {reportLabel(report)}
          </span>
          <span className="ui-tag mx-auto border-teal-300/30 bg-teal-300/10 text-teal-100">
            {NORMAL_REFERENCE_LABEL}
          </span>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-3 left-3 z-20 hidden max-w-[60%] rounded-lg bg-surface px-2.5 py-1.5 text-[11px] text-muted backdrop-blur md:left-4 md:block">
        {GENERIC_MODEL_LABEL}
      </p>

      <div
        ref={sheet}
        className={`pointer-events-auto ui-panel absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-b-none md:rounded-b-2xl md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:max-h-[calc(100%-7rem)] md:w-[21rem] ${
          sheetOpen ? "h-[72%]" : "h-[34%]"
        } md:h-auto`}
      >
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          aria-expanded={sheetOpen}
          aria-label={sheetOpen ? "Collapse details" : "Expand details"}
          className="mx-auto flex w-full shrink-0 justify-center pb-1 pt-2 md:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </button>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 md:pt-4">
          <OrganFindings />
          <aside aria-label="Structure parts">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {parts.length > 1 ? `Parts in this model (${parts.length})` : "Parts in this model"}
            </h3>
            {activeName && (
              <p className="mt-1 text-xs text-teal-100" aria-live="polite">
                Showing: {activeName}
              </p>
            )}
            {parts.length > 1 ? (
              <ul className="mt-2 space-y-0.5 text-sm">
                {parts.map((p) => {
                  const on = isOn(p.key);
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => dispatch({ type: "detailPart", key: on ? null : p.key })}
                        className={`flex w-full justify-between gap-3 rounded-lg px-2 py-1.5 text-left ${on ? "bg-teal-300/15 text-teal-100" : "hover:bg-white/5"}`}
                      >
                        <span>{p.name}</span>
                        <span className="shrink-0 text-[11px] text-muted">{p.tag}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">
                This model shows {selection.name.toLowerCase()} as a single surface. It has no separate internal parts for
                this structure.
              </p>
            )}
            {organ && <p className="mt-3 text-[11px] leading-snug text-muted">{HRA_SOURCE_NOTE}</p>}
            {!hasFindings && (
              <p className="mt-3 text-xs text-muted">
                {report
                  ? "No findings in the demo report are associated with this structure."
                  : "No findings are linked to this structure. Educational descriptions will be added from reviewed sources."}
              </p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
