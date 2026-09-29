"use client";

import { useDeferredValue, useId, useMemo, useState, type KeyboardEvent } from "react";
import { searchStructures } from "@/lib/anatomy/structures";
import { LAYER_LABELS, type SelectionKey } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";

/** Combobox search across every organ and structure in the model (Section 40). */
export function AnatomySearch() {
  const { state, dispatch } = useAnatomy();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(query);
  const listId = useId();

  const results = useMemo(
    () => (state.index ? searchStructures(state.index, deferred) : []),
    [state.index, deferred],
  );

  const choose = (key: SelectionKey) => {
    dispatch({ type: "select", key, focus: true });
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      choose(results[active].key);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length > 0;
  const total = state.index ? state.index.structures.size : 0;

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        aria-label="Search anatomy"
        placeholder={state.index ? `Search ${total.toLocaleString()} structures` : "Loading names..."}
        disabled={!state.index}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted backdrop-blur focus:outline-2 focus:outline-teal-300"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching structures"
          className="absolute inset-x-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-[#121820]/95 p-1 text-sm shadow-lg backdrop-blur"
        >
          {results.length === 0 && <li className="px-3 py-2 text-muted">No matching structure in this model.</li>}
          {results.map((r, i) => (
            <li
              key={r.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r.key);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer justify-between gap-3 rounded-lg px-3 py-2 ${i === active ? "bg-teal-300/10" : ""}`}
            >
              <span>{r.name}</span>
              <span className="shrink-0 text-xs text-muted">{r.kind === "organ" ? "Organ" : LAYER_LABELS[r.kind]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
