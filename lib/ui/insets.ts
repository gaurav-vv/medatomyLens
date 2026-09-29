"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

/**
 * Screen space covered by overlay UI (px from the top and bottom of the
 * viewer). The 3D camera keeps the model inside the space that is left, so
 * controls never cover the anatomy. Measured from the real elements, so it
 * follows wrapping, font size and orientation changes.
 */
export interface Insets {
  top: number;
  bottom: number;
}

let insets: Insets = { top: 0, bottom: 0 };
const listeners = new Set<() => void>();

function set(next: Insets) {
  if (next.top === insets.top && next.bottom === insets.bottom) return;
  insets = next;
  for (const l of listeners) l();
}

export function useInsets(): Insets {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => insets,
    () => insets,
  );
}

/**
 * Report the overlay elements that cover the top and bottom of `viewer`.
 * Elements that are hidden (display: none) count as zero.
 */
export function useOverlayInsets(
  viewer: RefObject<HTMLElement | null>,
  top: RefObject<HTMLElement | null>,
  bottom?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const measure = () => {
      const v = viewer.current?.getBoundingClientRect();
      if (!v) return;
      const t = top.current?.getBoundingClientRect();
      const b = bottom?.current?.getBoundingClientRect();
      set({
        top: t && t.height > 0 ? Math.max(0, Math.round(t.bottom - v.top)) : 0,
        bottom: b && b.height > 0 ? Math.max(0, Math.round(v.bottom - b.top)) : 0,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of [viewer.current, top.current, bottom?.current]) if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      set({ top: 0, bottom: 0 });
    };
  }, [viewer, top, bottom]);
}
