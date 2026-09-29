"use client";

import { useEffect } from "react";
import { LAYER_LABELS, groupKey } from "@/lib/anatomy/types";
import { structureIdsOfSelection } from "@/lib/medical/anatomyLink";
import { StructureFindings } from "@/components/report/ReportPanels";
import { useAnatomy } from "./AnatomyContext";

const SIDE_LABEL = {
  left: "Left side of the body",
  right: "Right side of the body",
  midline: null,
} as const;

/**
 * Summary panel for the selected structure (Section 42). Desktop: right card.
 * Mobile: bottom sheet. Only facts the model data actually provides are shown.
 */
export function OrganPanel() {
  const { state, dispatch, selection } = useAnatomy();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.selected && state.view === "body") dispatch({ type: "select", key: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selected, state.view, dispatch]);

  if (!state.selected || !selection || state.view !== "body") return null;
  const side = SIDE_LABEL[selection.side];

  return (
    <aside
      aria-label="Selected structure"
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 max-h-[50dvh] overflow-y-auto rounded-2xl border border-border bg-[#121820]/90 p-4 shadow-xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:max-h-[calc(100%-6rem)] md:w-80"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-tight" aria-live="polite">
          {selection.name}
        </h2>
        <button
          type="button"
          onClick={() => dispatch({ type: "select", key: null })}
          aria-label="Close"
          className="-m-1 rounded-full p-1 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-teal-300"
        >
          ✕
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-muted">{selection.isGroup ? "Made of" : "Layer"}</dt>
        <dd>
          {selection.isGroup
            ? `${selection.meshes.length} model parts`
            : selection.layers.map((l) => LAYER_LABELS[l]).join(", ")}
        </dd>
        {side && (
          <>
            <dt className="text-muted">Position</dt>
            <dd>{side}</dd>
          </>
        )}
        {!selection.isGroup && selection.group && (
          <>
            <dt className="text-muted">Part of</dt>
            <dd>
              <button
                type="button"
                onClick={() => dispatch({ type: "select", key: groupKey(selection.group!.id) })}
                className="underline decoration-teal-300/50 underline-offset-2 hover:text-teal-200"
              >
                {selection.group.name}
              </button>
            </dd>
          </>
        )}
      </dl>

      {selection.isGroup && (
        <p className="mt-3 text-xs text-muted">Tap the organ again to select one of its parts.</p>
      )}
      <StructureFindings ids={state.index ? structureIdsOfSelection(state.index, selection) : []} />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "openDetail" })}
          className="rounded-full border border-teal-300/60 bg-teal-300/20 px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-teal-300"
        >
          Open detailed view
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "focus" })}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-teal-300"
        >
          Focus
        </button>
      </div>
    </aside>
  );
}

export function ViewControls() {
  const { dispatch } = useAnatomy();
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "resetCamera" })}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted backdrop-blur hover:text-foreground focus-visible:outline-2 focus-visible:outline-teal-300"
    >
      ⟲ Reset view
    </button>
  );
}
