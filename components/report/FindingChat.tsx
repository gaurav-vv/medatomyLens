"use client";

import { useState } from "react";
import { ChatConsent, ChatThread, CHAT_NOT_SET_UP, useChatConsent, type SendFn } from "@/components/chat/ChatThread";
import { CHAT_URL, chatStatusOf } from "@/lib/ai/client";
import type { ResolvedFinding } from "@/lib/medical/types";

interface FindingChatProps {
  finding: ResolvedFinding;
  chatUrl?: string;
  send?: SendFn;
}

/** "Ask AI about this result", inside a finding's panel. Only for results with a curated explanation. */
export function FindingChat({ finding, chatUrl = CHAT_URL, send }: FindingChatProps) {
  const status = chatStatusOf(finding);
  const [open, setOpen] = useState(false);
  const [consent, accept] = useChatConsent();
  if (!status || !finding.term) return null;

  if (!open)
    return (
      <button type="button" className="ui-btn ui-btn-ai w-full" onClick={() => setOpen(true)}>
        <span aria-hidden className="text-[11px] font-semibold">AI</span> Ask AI about this result
      </button>
    );

  return (
    <section aria-label="Ask AI about this result" className="ui-ai-box space-y-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">Ask AI · {finding.term.displayName}</h4>
        <button type="button" className="ui-icon-btn h-8 w-8 md:h-8 md:w-8" onClick={() => setOpen(false)} aria-label="Close AI chat">
          ✕
        </button>
      </div>
      {!chatUrl ? (
        <p className="text-[13px] text-muted">{CHAT_NOT_SET_UP}</p>
      ) : !consent ? (
        <ChatConsent onAccept={accept} />
      ) : (
        <ChatThread term={finding.term.normalizedTerm} status={status} chatUrl={chatUrl} inputId={`chat-${finding.raw.id}`} send={send} />
      )}
    </section>
  );
}
