import type { ChatRequest, ChatStatus } from "./grounding";
import { checkAnswer } from "./guard";
import { explanationFor } from "../medical/explanations";
import type { ResolvedFinding } from "../medical/types";

/** Chat Worker address, set at build time (NEXT_PUBLIC_CHAT_URL). Empty = chat not set up. */
export const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL ?? "";

export const WITHHELD_TEXT =
  "This answer was not shown because it used wording the app does not allow (for example a diagnosis, severity or treatment). Try asking what the test measures.";

export interface ChatReply {
  text: string;
  withheld: boolean;
}

export class ChatError extends Error {}

const STATUS_OF: Partial<Record<ResolvedFinding["status"], ChatStatus>> = {
  ABOVE_RANGE: "ABOVE_RANGE",
  BELOW_RANGE: "BELOW_RANGE",
  NORMAL: "NORMAL",
  UNKNOWN: "UNKNOWN",
};

/** Chat is offered only for lab results with a curated explanation (Section 108). */
export function chatStatusOf(finding: ResolvedFinding): ChatStatus | null {
  if (finding.raw.findingType !== "lab_association") return null;
  if (!explanationFor(finding.term?.normalizedTerm)) return null;
  return STATUS_OF[finding.status] ?? null;
}

export async function sendChat(
  url: string,
  req: ChatRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ChatReply> {
  let res: Response;
  try {
    res = await fetchImpl(`${url.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ChatError("The AI service could not be reached. Check your internet connection and try again.");
  }
  if (res.status === 429) throw new ChatError("Too many questions in a short time. Wait a minute and try again.");
  if (res.status === 503)
    throw new ChatError("The AI service is busy or has reached its free daily limit. Try again later.");
  if (!res.ok) throw new ChatError("The question could not be answered. Try asking in a different way.");
  const body = (await res.json().catch(() => ({}))) as { answer?: unknown; withheld?: unknown };
  if (body.withheld === true) return { text: WITHHELD_TEXT, withheld: true };
  if (typeof body.answer !== "string" || !body.answer.trim()) throw new ChatError("No answer was produced. Try again.");
  // Second check on this device (Section 34).
  if (!checkAnswer(body.answer).ok) return { text: WITHHELD_TEXT, withheld: true };
  return { text: body.answer.trim(), withheld: false };
}
