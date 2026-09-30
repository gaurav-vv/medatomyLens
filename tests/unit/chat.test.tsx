import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import demo from "@/data/medical/demo/demo_report.json";
import { resolveReport } from "@/lib/medical/report";
import type { RawReport, ResolvedReport } from "@/lib/medical/types";
import {
  buildMessages,
  MAX_QUESTION_CHARS,
  parseChatRequest,
  suggestedQuestions,
  type ChatRequest,
  type ChatTurn,
} from "@/lib/ai/grounding";
import { checkAnswer } from "@/lib/ai/guard";
import { ChatError, chatStatusOf, sendChat, WITHHELD_TEXT } from "@/lib/ai/client";
import {
  CHAT_AI_LABEL,
  CHAT_NOT_SET_UP,
  CHAT_GENERAL_NOTE,
  ChatPanelView,
} from "@/components/menu/ChatPanel";

const report: ResolvedReport = resolveReport(demo as RawReport, () => true);
const f = (id: string) => report.findings.find((x) => x.raw.id === id)!;

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. grounding.ts
// ---------------------------------------------------------------------------
describe("grounding: parseChatRequest", () => {
  const valid = {
    term: "creatinine",
    status: "ABOVE_RANGE",
    question: "What does this test measure?",
    history: [],
  };

  it("accepts a valid body", () => {
    const r = parseChatRequest(valid);
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.term).toBe("creatinine");
      expect(r.status).toBe("ABOVE_RANGE");
      expect(r.question).toBe("What does this test measure?");
      expect(r.history).toEqual([]);
    }
  });

  it("rejects an unknown term (no explanation)", () => {
    const r = parseChatRequest({ ...valid, term: "vitamin_b6" });
    expect("error" in r).toBe(true);
  });

  it("rejects a bad status", () => {
    const r = parseChatRequest({ ...valid, status: "DAMAGED" });
    expect("error" in r).toBe(true);
  });

  it("rejects an empty question", () => {
    const r = parseChatRequest({ ...valid, question: "   " });
    expect("error" in r).toBe(true);
  });

  it("rejects a too-long question", () => {
    const r = parseChatRequest({ ...valid, question: "a".repeat(MAX_QUESTION_CHARS + 1) });
    expect("error" in r).toBe(true);
  });

  it("rejects a bad history (too many / wrong shape)", () => {
    const tooMany = Array.from({ length: 7 }, () => ({ role: "user", content: "x" }));
    expect("error" in parseChatRequest({ ...valid, history: tooMany })).toBe(true);
    expect("error" in parseChatRequest({ ...valid, history: [{ role: "bot", content: "x" }] })).toBe(true);
    expect("error" in parseChatRequest({ ...valid, history: "nope" })).toBe(true);
  });

  it("trims the question", () => {
    const r = parseChatRequest({ ...valid, question: "  hello  " });
    expect("error" in r).toBe(false);
    if (!("error" in r)) expect(r.question).toBe("hello");
  });
});

describe("grounding: buildMessages", () => {
  const req = (over: Partial<ChatRequest> = {}): ChatRequest => ({
    term: "creatinine",
    status: "ABOVE_RANGE",
    question: "What does this test measure?",
    history: [],
    ...over,
  });

  it("system prompt contains the curated measures text and status sentence", () => {
    const msgs = buildMessages(req());
    expect(msgs[0]!.role).toBe("system");
    const sys = msgs[0]!.content;
    expect(sys).toContain("Creatinine is a normal waste product made when muscles are used");
    expect(sys).toContain("above the reference range printed on the user's report");
  });

  it("includes only the aboveRange list for ABOVE_RANGE (not belowRange items)", () => {
    const sys = buildMessages(req({ status: "ABOVE_RANGE" }))[0]!.content;
    expect(sys).toContain("Dehydration");
    expect(sys).not.toContain("Poor nutrition");
    expect(sys).not.toContain("Low muscle mass");
  });

  it("includes only the belowRange list for BELOW_RANGE", () => {
    const sys = buildMessages(req({ status: "BELOW_RANGE" }))[0]!.content;
    expect(sys).toContain("Poor nutrition");
    expect(sys).not.toContain("Dehydration");
  });

  it("does not list associations for NORMAL", () => {
    const sys = buildMessages(req({ status: "NORMAL" }))[0]!.content;
    expect(sys).not.toContain("Dehydration");
    expect(sys).not.toContain("Poor nutrition");
  });

  it("system prompt forbids diagnosis and treatment", () => {
    const sys = buildMessages(req())[0]!.content;
    expect(sys).toContain("Never tell the user which condition or illness");
    expect(sys).toContain("Never suggest treatment, medicines, doses");
  });

  it("trims history to the last 6 turns", () => {
    const history: ChatTurn[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn ${i}`,
    }));
    const msgs = buildMessages(req({ history }));
    // system + 6 history + current user question
    expect(msgs.length).toBe(1 + 6 + 1);
    expect(msgs[1]!.content).toBe("turn 4");
    expect(msgs[6]!.content).toBe("turn 9");
    expect(msgs[msgs.length - 1]!.role).toBe("user");
    expect(msgs[msgs.length - 1]!.content).toBe("What does this test measure?");
  });
});

describe("grounding: suggestedQuestions", () => {
  it("varies by status", () => {
    expect(suggestedQuestions("ABOVE_RANGE")).toContain('What does "above the reported range" mean here?');
    expect(suggestedQuestions("BELOW_RANGE")).toContain('What does "below the reported range" mean here?');
    const normal = suggestedQuestions("NORMAL");
    expect(normal).toContain("What does this test measure?");
    expect(normal.some((q) => q.includes("above the reported range"))).toBe(false);
    expect(normal.some((q) => q.includes("below the reported range"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. guard.ts
// ---------------------------------------------------------------------------
describe("guard: checkAnswer", () => {
  it("allows a plain range description", () => {
    expect(checkAnswer("Your result of 1.9 mg/dL is above the reported range.").ok).toBe(true);
  });

  it("allows a result unit like 5 IU/mL", () => {
    expect(checkAnswer("5 IU/mL").ok).toBe(true);
  });

  it("blocks disallowed wording", () => {
    expect(checkAnswer("your kidneys are damaged").ok).toBe(false);
    expect(checkAnswer("You have kidney disease").ok).toBe(false);
  });

  it("blocks treatment / dose text", () => {
    expect(checkAnswer("Take 500 mg daily").ok).toBe(false);
    expect(checkAnswer("You should stop your medicine").ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. client.ts
// ---------------------------------------------------------------------------
describe("client: chatStatusOf", () => {
  it("maps creatinine to ABOVE_RANGE", () => {
    expect(chatStatusOf(f("finding_001"))).toBe("ABOVE_RANGE");
  });

  it("returns null for a term with no explanation (finding_004)", () => {
    expect(chatStatusOf(f("finding_004"))).toBeNull();
  });

  it("returns null for a report statement (finding_005)", () => {
    expect(chatStatusOf(f("finding_005"))).toBeNull();
  });
});

describe("client: sendChat", () => {
  const req: ChatRequest = { term: "creatinine", status: "ABOVE_RANGE", question: "What?", history: [] };
  const jsonRes = (status: number, body: unknown): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as Response;

  it("returns text for 200 { answer }", async () => {
    const fetchImpl = vi.fn(async () => jsonRes(200, { answer: "It measures kidney filtering." }));
    const reply = await sendChat("https://api.example.com", req, undefined, fetchImpl as unknown as typeof fetch);
    expect(reply).toEqual({ text: "It measures kidney filtering.", withheld: false });
  });

  it("returns withheld for 200 { withheld: true }", async () => {
    const fetchImpl = vi.fn(async () => jsonRes(200, { withheld: true }));
    const reply = await sendChat("https://api.example.com", req, undefined, fetchImpl as unknown as typeof fetch);
    expect(reply).toEqual({ text: WITHHELD_TEXT, withheld: true });
  });

  it("withholds an answer that fails the guard", async () => {
    const fetchImpl = vi.fn(async () => jsonRes(200, { answer: "Your kidneys are damaged." }));
    const reply = await sendChat("https://api.example.com", req, undefined, fetchImpl as unknown as typeof fetch);
    expect(reply.withheld).toBe(true);
    expect(reply.text).toBe(WITHHELD_TEXT);
  });

  it("throws a friendly ChatError on 429", async () => {
    const fetchImpl = vi.fn(async () => jsonRes(429, {}));
    await expect(sendChat("https://api.example.com", req, undefined, fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(ChatError);
  });

  it("throws a friendly ChatError on 503", async () => {
    const fetchImpl = vi.fn(async () => jsonRes(503, {}));
    await expect(sendChat("https://api.example.com", req, undefined, fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(ChatError);
  });

  it("throws a friendly ChatError on a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(sendChat("https://api.example.com", req, undefined, fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(ChatError);
  });

  it("POSTs to `${url}/chat` with a body of exactly term,status,question,history", async () => {
    const fetchImpl = vi.fn(async () => jsonRes(200, { answer: "ok" }));
    await sendChat("https://api.example.com/", req, undefined, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [callUrl, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(callUrl).toBe("https://api.example.com/chat");
    expect(init.method).toBe("POST");
    const sent = JSON.parse(init.body as string);
    expect(Object.keys(sent).sort()).toEqual(["history", "question", "status", "term"]);
    expect(sent).toEqual({ term: "creatinine", status: "ABOVE_RANGE", question: "What?", history: [] });
  });
});

// ---------------------------------------------------------------------------
// 5. ChatPanelView
// ---------------------------------------------------------------------------
describe("ChatPanelView", () => {
  const noop = () => {};

  it("shows CHAT_NOT_SET_UP when chatUrl is empty", () => {
    render(<ChatPanelView report={report} selectedFindingId={null} chatUrl="" onClose={noop} />);
    expect(screen.getByText(CHAT_NOT_SET_UP)).toBeTruthy();
  });

  it("with no report, offers every explained test as a general question", async () => {
    const send = vi.fn(async () => ({ text: "General answer.", withheld: false }));
    render(<ChatPanelView report={null} selectedFindingId={null} chatUrl="https://x" onClose={noop} send={send} />);
    fireEvent.click(screen.getByText("I understand, continue"));
    const select = screen.getByLabelText("Test") as HTMLSelectElement;
    expect(select.options.length).toBe(19);
    expect(screen.getByText(CHAT_GENERAL_NOTE)).toBeTruthy();
    expect(screen.getByPlaceholderText("Ask about this result")).toBeTruthy();
    fireEvent.click(screen.getByText("What does this test measure?"));
    expect(await screen.findByText("General answer.")).toBeTruthy();
    const [req] = send.mock.calls[0]! as unknown as [ChatRequest, AbortSignal];
    expect(req.status).toBe("GENERAL");
  });

  it("a report without explained results still offers general questions", () => {
    const onlyB6 = { ...demo, findings: (demo as RawReport).findings.filter((x) => x.id === "finding_004") };
    const noTopics = resolveReport(onlyB6 as RawReport, () => true);
    render(<ChatPanelView report={noTopics} selectedFindingId={null} chatUrl="https://x" onClose={noop} />);
    fireEvent.click(screen.getByText("I understand, continue"));
    expect((screen.getByLabelText("Test") as HTMLSelectElement).options.length).toBe(19);
  });

  it("shows the consent screen first, then a Test select defaulting to selectedFindingId", () => {
    render(<ChatPanelView report={report} selectedFindingId="finding_001" chatUrl="https://x" onClose={noop} />);
    // Consent gate first.
    expect(screen.queryByLabelText("Test")).toBeNull();
    fireEvent.click(screen.getByText("I understand, continue"));
    const select = screen.getByLabelText("Test") as HTMLSelectElement;
    expect(select.value).toBe("finding_001");
  });

  it("clicking a suggested question calls send with the expected request and shows the answer + AI label", async () => {
    const send = vi.fn(async () => ({ text: "It checks kidney filtering.", withheld: false }));
    render(
      <ChatPanelView
        report={report}
        selectedFindingId="finding_001"
        chatUrl="https://x"
        onClose={noop}
        send={send}
      />,
    );
    fireEvent.click(screen.getByText("I understand, continue"));
    fireEvent.click(screen.getByText("What does this test measure?"));

    expect(await screen.findByText("It checks kidney filtering.")).toBeTruthy();
    expect(screen.getByText(CHAT_AI_LABEL)).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
    const [req] = send.mock.calls[0]! as unknown as [ChatRequest, AbortSignal];
    expect(req).toEqual({
      term: "creatinine",
      status: "ABOVE_RANGE",
      question: "What does this test measure?",
      history: [],
    });
  });

  it("shows a ChatError message from send", async () => {
    const send = vi.fn(async () => {
      throw new ChatError("Too many questions in a short time. Wait a minute and try again.");
    });
    render(
      <ChatPanelView
        report={report}
        selectedFindingId="finding_001"
        chatUrl="https://x"
        onClose={noop}
        send={send}
      />,
    );
    fireEvent.click(screen.getByText("I understand, continue"));
    fireEvent.click(screen.getByText("What does this test measure?"));
    expect(await screen.findByText("Too many questions in a short time. Wait a minute and try again.")).toBeTruthy();
  });
});
