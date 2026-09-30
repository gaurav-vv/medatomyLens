/**
 * Chat grounding (AGENTS.md Sections 33, 34, 108), shared by the app and the
 * chat Worker (worker/). Relative imports on purpose, so the Worker bundles it.
 *
 * Only minimal data is sent: the test's normalized term, whether the result is
 * above/below/within the report's range, the question and recent turns. No
 * report text, values or patient details. The Worker builds the facts from the
 * app's own curated explanation.
 */
import termsFile from "../../data/medical/mappings/terms.json";
import { explanationFor } from "../medical/explanations";
import type { Explanation } from "../medical/types";

export type ChatStatus = "ABOVE_RANGE" | "BELOW_RANGE" | "NORMAL" | "UNKNOWN" | "GENERAL";
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface ChatRequest {
  term: string;
  status: ChatStatus;
  question: string;
  history: ChatTurn[];
}
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY = 6;
export const MAX_TURN_CHARS = 1200;
const STATUSES: ChatStatus[] = ["ABOVE_RANGE", "BELOW_RANGE", "NORMAL", "UNKNOWN", "GENERAL"];

export const OUT_OF_SCOPE_REPLY =
  "I can only answer from this app's explanation of this test. Please ask your doctor about this.";

const MAPPING_REASON = new Map(termsFile.terms.map((t) => [t.normalizedTerm, t.mappingReason]));

/** Validates an incoming request body. Returns an error message instead of throwing. */
export function parseChatRequest(body: unknown): ChatRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request." };
  const b = body as Record<string, unknown>;
  if (typeof b.term !== "string" || !explanationFor(b.term)) return { error: "This test has no explanation in the app." };
  if (typeof b.status !== "string" || !STATUSES.includes(b.status as ChatStatus)) return { error: "Invalid result status." };
  if (typeof b.question !== "string" || !b.question.trim() || b.question.length > MAX_QUESTION_CHARS)
    return { error: `The question must be 1 to ${MAX_QUESTION_CHARS} characters.` };
  const history = b.history ?? [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY) return { error: "Invalid conversation history." };
  for (const t of history) {
    const turn = t as Record<string, unknown>;
    if ((turn.role !== "user" && turn.role !== "assistant") || typeof turn.content !== "string" || turn.content.length > MAX_TURN_CHARS)
      return { error: "Invalid conversation history." };
  }
  return { term: b.term, status: b.status as ChatStatus, question: b.question.trim(), history: history as ChatTurn[] };
}

const STATUS_TEXT: Record<ChatStatus, string> = {
  ABOVE_RANGE: "The result is above the reference range printed on the user's report.",
  BELOW_RANGE: "The result is below the reference range printed on the user's report.",
  NORMAL: "The result is within the reference range printed on the user's report.",
  UNKNOWN: "The report prints no reference range for this result, so the app does not say whether it is in range.",
  GENERAL:
    "The user is asking about this test in general. No result is being discussed, so do not talk about the user's own result.",
};

export function buildFacts(explanation: Explanation, status: ChatStatus, mappingReason?: string): string {
  const list = (items: string[]) => items.map((a) => `- ${a}`).join("\n");
  const lines = [
    `Test: ${explanation.title}`,
    `Result: ${STATUS_TEXT[status]}`,
    ...(mappingReason ? [`Why the app shows it on the body: ${mappingReason}`] : []),
    `What this test measures: ${explanation.measures}`,
    `Things to know: ${explanation.context}`,
  ];
  if (status === "ABOVE_RANGE" && explanation.aboveRange.length > 0)
    lines.push(`Results above the reported range can be associated with (general possibilities, not an assessment of this result):\n${list(explanation.aboveRange)}`);
  if (status === "BELOW_RANGE" && explanation.belowRange.length > 0)
    lines.push(`Results below the reported range can be associated with (general possibilities, not an assessment of this result):\n${list(explanation.belowRange)}`);
  lines.push(`Next step: ${explanation.nextStep}`);
  return lines.join("\n");
}

export function systemPrompt(facts: string): string {
  return [
    "You are the explanation helper in AnatomyLens, an educational app that shows where findings from a medical report are associated in the body.",
    "Answer the user's question using ONLY the FACTS below. Rephrase them in plain, calm language.",
    "Rules:",
    `1. Do not add medical information that is not in the FACTS. If the answer is not in the FACTS, reply exactly: ${OUT_OF_SCOPE_REPLY}`,
    "2. Never tell the user which condition or illness they may or may not have, and never guess a cause for this particular result.",
    "3. Never describe how serious, urgent or worrying the result is, and never predict what will happen.",
    "4. Never suggest treatment, medicines, doses, supplements, diets or tests.",
    '5. Describe the result only as "above the reported range", "below the reported range" or "within the reported range", as the FACTS say.',
    "6. If the user describes symptoms or feeling unwell, tell them to contact a doctor, or local emergency services if it feels urgent.",
    "7. Keep answers short: at most 120 words.",
    "",
    "FACTS:",
    facts,
  ].join("\n");
}

/** The model input for a validated request. */
export function buildMessages(req: ChatRequest): ChatMessage[] {
  const explanation = explanationFor(req.term);
  if (!explanation) throw new Error("No explanation for term");
  return [
    { role: "system", content: systemPrompt(buildFacts(explanation, req.status, MAPPING_REASON.get(req.term))) },
    ...req.history.slice(-MAX_HISTORY),
    { role: "user", content: req.question },
  ];
}

/** Starter questions: they only ask what the curated explanation answers. */
export function suggestedQuestions(status: ChatStatus): string[] {
  const out = ["What does this test measure?", "What can affect this result?"];
  if (status === "ABOVE_RANGE") out.push('What does "above the reported range" mean here?');
  if (status === "BELOW_RANGE") out.push('What does "below the reported range" mean here?');
  return out;
}
