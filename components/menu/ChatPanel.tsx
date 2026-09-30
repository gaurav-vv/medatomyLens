"use client";

import { useEffect, useMemo, useState } from "react";
import { useReport } from "@/components/report/ReportContext";
import { ChatConsent, ChatThread, CHAT_NOT_SET_UP, useChatConsent, type SendFn } from "@/components/chat/ChatThread";
import { CHAT_URL, chatStatusOf } from "@/lib/ai/client";
import type { ChatStatus } from "@/lib/ai/grounding";
import { EXPLAINED_TESTS } from "@/lib/medical/explanations";
import type { ResolvedReport } from "@/lib/medical/types";

export { CHAT_AI_LABEL, CHAT_NOT_SET_UP } from "@/components/chat/ChatThread";
export const CHAT_GENERAL_NOTE =
  "No result from your report is selected, so answers are about the test in general. Upload a report to ask about your own results.";

interface ChatPanelViewProps {
  report: ResolvedReport | null;
  selectedFindingId: string | null;
  chatUrl: string;
  onClose: () => void;
  send?: SendFn;
}

/** Menu → "Ask AI about your results": pick any explained test (your results first). */
export function ChatPanelView({ report, selectedFindingId, chatUrl, onClose, send }: ChatPanelViewProps) {
  const topics = useMemo(() => {
    const fromReport = (report?.findings ?? []).flatMap((f) => {
      const status = chatStatusOf(f);
      return status
        ? [{ id: f.raw.id, name: f.term?.displayName ?? f.raw.name, status, term: f.term!.normalizedTerm, mine: true }]
        : [];
    });
    const inReport = new Set(fromReport.map((t) => t.term));
    const general = EXPLAINED_TESTS.filter((t) => !inReport.has(t.term)).map((t) => ({
      id: `general:${t.term}`,
      name: t.title,
      status: "GENERAL" as ChatStatus,
      term: t.term,
      mine: false,
    }));
    return [...fromReport, ...general];
  }, [report]);
  const [topicId, setTopicId] = useState<string | null>(
    topics.find((t) => t.id === selectedFindingId)?.id ?? topics[0]?.id ?? null,
  );
  const topic = topics.find((t) => t.id === topicId) ?? topics[0] ?? null;
  const [consent, accept] = useChatConsent();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  let body: React.ReactNode;
  if (!chatUrl || !topic) body = <p className="text-[13px] text-muted">{CHAT_NOT_SET_UP}</p>;
  else if (!consent) body = <ChatConsent onAccept={accept} />;
  else
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-200/80">
          Test
          <select
            className="min-h-10 rounded-full border border-sky-300/25 bg-black/30 px-3 text-base font-normal normal-case tracking-normal text-foreground focus-visible:outline-2 focus-visible:outline-sky-300 md:min-h-9 md:text-[13px]"
            value={topic.id}
            onChange={(e) => setTopicId(e.target.value)}
          >
            {topics.some((t) => t.mine) && (
              <optgroup label="Your report">
                {topics.filter((t) => t.mine).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Other tests (general questions)">
              {topics.filter((t) => !t.mine).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {topic.status === "GENERAL" && <p className="text-[12px] leading-snug text-muted">{CHAT_GENERAL_NOTE}</p>}
        <ChatThread key={topic.id} term={topic.term} status={topic.status} chatUrl={chatUrl} inputId="chat-question" send={send} fill />
      </div>
    );

  return (
    <div
      role="dialog"
      aria-label="Ask AI about your results"
      className="ui-panel ui-ai-box pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex max-h-[85dvh] flex-col gap-4 rounded-b-none bg-[#0e1720]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:max-h-[calc(100dvh-6rem)] sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-b-2xl"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-50">
          <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-400/20 text-[11px] text-sky-100">
            AI
          </span>
          Ask AI about your results
        </h2>
        <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close chat">
          ✕
        </button>
      </div>
      {body}
    </div>
  );
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const { report, selectedFinding } = useReport();
  return (
    <ChatPanelView
      // A new report starts a new conversation.
      key={report?.documentId ?? "none"}
      report={report}
      selectedFindingId={selectedFinding?.raw.id ?? null}
      chatUrl={CHAT_URL}
      onClose={onClose}
    />
  );
}
