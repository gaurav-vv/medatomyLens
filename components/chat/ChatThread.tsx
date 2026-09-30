"use client";

import { useEffect, useRef, useState } from "react";
import { ChatError, sendChat, type ChatReply } from "@/lib/ai/client";
import { MAX_QUESTION_CHARS, suggestedQuestions, type ChatRequest, type ChatStatus, type ChatTurn } from "@/lib/ai/grounding";

/** Shared AI chat pieces, used by the Menu chat panel and by each finding's panel. */
export const CHAT_AI_LABEL =
  "AI-generated from this app's explanation of the test. It can be wrong and is not medical advice. Discuss your results with your doctor.";
export const CHAT_NOT_SET_UP =
  "Chat is not set up for this site yet. (Developers: set NEXT_PUBLIC_CHAT_URL in .env.local and restart npm run dev.)";
const CONSENT_KEY = "anatomylens.chat.consent.v1";

export type SendFn = (req: ChatRequest, signal: AbortSignal) => Promise<ChatReply>;

interface Turn extends ChatTurn {
  withheld?: boolean;
}

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function useChatConsent(): [boolean, () => void] {
  const [consent, setConsent] = useState(readConsent);
  return [
    consent,
    () => {
      try {
        localStorage.setItem(CONSENT_KEY, "1");
      } catch {
        /* private mode: ask again next time */
      }
      setConsent(true);
    },
  ];
}

export function ChatConsent({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      <p>
        To answer, the app sends your question to its AI service (Cloudflare Workers AI), with the name of the test and
        whether the result is above, below or within the report&apos;s range.
      </p>
      <p>
        Your report text, values, name and other details are not sent. Questions are not stored, and Cloudflare states it
        does not use them to train AI models.
      </p>
      <p className="text-muted">Avoid typing personal details in your questions.</p>
      <button type="button" className="ui-btn ui-btn-ai" onClick={onAccept}>
        I understand, continue
      </button>
    </div>
  );
}

interface ChatThreadProps {
  term: string;
  status: ChatStatus;
  chatUrl: string;
  inputId: string;
  send?: SendFn;
  /** Tall layouts (the Menu panel) let the conversation fill the space. */
  fill?: boolean;
}

/** One conversation about one test. Key it by the topic so a new topic starts fresh. */
export function ChatThread({ term, status, chatUrl, inputId, send, fill }: ChatThreadProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history = turns.filter((t) => !t.withheld).map(({ role, content }) => ({ role, content })).slice(-6);
    setTurns((t) => [...t, { role: "user", content: q }]);
    setDraft("");
    setError(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const req: ChatRequest = { term, status, question: q, history };
      const reply = await (send ?? ((r, s) => sendChat(chatUrl, r, s)))(req, abort.current.signal);
      setTurns((t) => [...t, { role: "assistant", content: reply.text, withheld: reply.withheld }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(e instanceof ChatError ? e.message : "The question could not be answered. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${fill ? "min-h-0 flex-1" : ""}`}>
      <div
        ref={logRef}
        className={`space-y-2.5 overflow-y-auto text-[13px] leading-relaxed ${fill ? "min-h-0 flex-1" : "max-h-72"}`}
        aria-live="polite"
        aria-label="Conversation"
      >
        {turns.length === 0 && !busy && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions(status).map((q) => (
              <button key={q} type="button" className="ui-btn text-left text-xs leading-snug" onClick={() => void ask(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className="ml-8 rounded-2xl rounded-br-md bg-white/10 px-3 py-2">
              {t.content}
            </p>
          ) : (
            <div
              key={i}
              className={`mr-8 rounded-2xl rounded-bl-md border border-sky-300/25 bg-sky-400/10 px-3 py-2 ${t.withheld ? "text-muted" : ""}`}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">AI · may be wrong</p>
              <p className="whitespace-pre-wrap">{t.content}</p>
            </div>
          ),
        )}
        {busy && <p className="mr-8 rounded-2xl rounded-bl-md border border-sky-300/25 bg-sky-400/10 px-3 py-2 text-muted">Thinking...</p>}
        {error && <p className="rounded-xl bg-amber-200/10 px-3 py-2 text-amber-100">{error}</p>}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Your question
        </label>
        <input
          id={inputId}
          className="min-h-10 min-w-0 flex-1 rounded-full border border-sky-300/25 bg-black/30 px-4 text-base placeholder:text-muted focus-visible:outline-2 focus-visible:outline-sky-300 md:min-h-9 md:text-[13px]"
          value={draft}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="Ask about this result"
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="ui-btn ui-btn-ai shrink-0" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
      <p className="text-[11px] leading-snug text-muted">{CHAT_AI_LABEL}</p>
    </div>
  );
}
