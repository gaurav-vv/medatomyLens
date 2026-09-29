"use client";

import { useEffect, useMemo } from "react";
import { GENERIC_MODEL_LABEL } from "@/components/layout/Disclaimer";
import { detailOrganFor, isPartKey, partIdOf, partKey } from "@/lib/anatomy/detailOrgans";
import { detailParts } from "@/lib/anatomy/structures";
import { LAYER_LABELS } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";

export const NORMAL_REFERENCE_LABEL = "Generic normal reference";
export const HRA_SOURCE_NOTE =
  "Detailed model: HuBMAP Human Reference Atlas (CC BY 4.0), built from the Visible Human data. It comes from a different reference body than the full-body model, so its shape differs slightly.";

/**
 * Detail view chrome (AGENTS.md Sections 21, 103, 104): back control, the
 * generic-model label, and the list of parts the model really contains.
 * The Reported / Side-by-side modes arrive with report mapping (Phase 3);
 * until then the view is the generic normal reference only.
 */
export function DetailPanel() {
  const { state, dispatch, selection } = useAnatomy();
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

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex flex-wrap items-center gap-2 px-3 md:top-14 md:px-4">
        <button
          type="button"
          onClick={() => dispatch({ type: "closeDetail" })}
          className="pointer-events-auto rounded-full border border-border bg-surface px-3 py-1.5 text-xs backdrop-blur hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-teal-300"
        >
          ← Back to body
        </button>
        <h2 className="pointer-events-auto text-sm font-semibold uppercase tracking-wide">
          {organ?.name ?? selection.name}
        </h2>
        <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-2.5 py-1 text-[11px] text-teal-100">
          {NORMAL_REFERENCE_LABEL}
        </span>
        {organ && (
          <button
            type="button"
            role="switch"
            aria-checked={state.seeInside}
            onClick={() => dispatch({ type: "toggleSeeInside" })}
            className={`pointer-events-auto rounded-full border px-3 py-1.5 text-xs backdrop-blur focus-visible:outline-2 focus-visible:outline-teal-300 ${
              state.seeInside ? "border-teal-300/60 bg-teal-300/20" : "border-border bg-surface"
            }`}
          >
            See inside
          </button>
        )}
      </div>

      <p className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[60%] rounded-lg bg-surface px-2.5 py-1.5 text-[11px] text-muted backdrop-blur md:left-4">
        {GENERIC_MODEL_LABEL}
      </p>

      <aside
        aria-label="Structure parts"
        className="pointer-events-auto absolute inset-x-2 bottom-20 z-20 max-h-[32%] overflow-y-auto rounded-2xl border border-border bg-[#121820]/90 p-4 shadow-xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:max-h-[calc(100%-7rem)] md:w-80"
      >
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
        <p className="mt-3 text-xs text-muted">
          No findings are linked to this structure. Educational descriptions will be added from reviewed sources.
        </p>
      </aside>
    </>
  );
}
