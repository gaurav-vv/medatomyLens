"use client";

import { LAYER_IDS, LAYER_LABELS } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";

/** Layer toggles. Only layers that exist in the model are listed (Section 41). */
export function AnatomyLayerToggle() {
  const { state, dispatch } = useAnatomy();
  return (
    <fieldset className="flex min-w-0 gap-1.5 overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible">
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
            className={`flex min-h-10 shrink-0 items-center justify-between gap-3 rounded-full border px-3.5 text-[13px] transition-colors md:min-h-9 ${
              on
                ? "border-teal-300/50 bg-teal-300/15 text-teal-50"
                : "border-white/10 bg-white/[0.04] text-muted hover:text-foreground"
            } backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-teal-300`}
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
