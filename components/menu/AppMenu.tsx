"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatPanel } from "./ChatPanel";

/** Small round menu button (right of Upload): Ask AI about your results, About. */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        className="ui-icon-btn border border-white/10 bg-white/[0.04] text-foreground backdrop-blur"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="app-menu"
        title="Menu"
        onClick={() => setOpen((o) => !o)}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <circle cx="10" cy="4" r="1.7" />
          <circle cx="10" cy="10" r="1.7" />
          <circle cx="10" cy="16" r="1.7" />
        </svg>
      </button>
      {open && (
        <nav
          id="app-menu"
          aria-label="Menu"
          className="ui-panel absolute right-0 top-full z-30 mt-2 flex w-[min(15rem,calc(100vw-1.5rem))] flex-col gap-1.5 p-2"
        >
          <button
            type="button"
            className="ui-btn ui-btn-ai justify-start"
            onClick={() => {
              setOpen(false);
              setChat(true);
            }}
          >
            <span aria-hidden className="text-[11px] font-semibold">AI</span> Ask AI about your results
          </button>
          <Link href="/about" className="ui-btn justify-start" onClick={() => setOpen(false)}>
            <span aria-hidden>ⓘ</span> About
          </Link>
        </nav>
      )}
      {chat && createPortal(<ChatPanel onClose={() => setChat(false)} />, document.body)}
    </div>
  );
}
