"use client";

import { LAYER_IDS, LAYER_LABELS } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";

/** Layer toggles. Only layers that exist in the model are listed (Section 41). */
export function AnatomyLayerToggle() {
  const { state, dispatch } = useAnatomy();
  return (
    <fieldset className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
      <legend className="sr-only">Anatomy layers</legend>
      {LAYER_IDS.map((layer) => {
        const on = state.visible[layer];
        const status = state.status[layer];
        return (
          <button
            key={layer}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => dispatch({ type: "toggleLayer", layer })}
            className={`flex min-h-9 shrink-0 items-center justify-between gap-3 rounded-full border px-3 text-xs transition-colors md:min-h-8 md:rounded-lg ${
              on
                ? "border-teal-300/40 bg-teal-300/10 text-foreground"
                : "border-border bg-surface text-muted hover:text-foreground"
            } backdrop-blur focus-visible:outline-2 focus-visible:outline-teal-300`}
          >
            <span>{LAYER_LABELS[layer]}</span>
            <span className="text-[10px] text-muted" aria-live="polite">
              {on && status === "loading" ? "Loading..." : status === "error" ? "Unavailable" : ""}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
