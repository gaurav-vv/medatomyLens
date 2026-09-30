import { describe, expect, it } from "vitest";
import { buildMessages, parseChatRequest } from "@/lib/ai/grounding";
import { CHAT_URL } from "@/lib/ai/client";

describe("chat for every recognized test", () => {
  it("accepts a recognized test without a curated explanation and grounds it in terminology only", () => {
    const req = parseChatRequest({ term: "ferritin", status: "NORMAL", question: "What is ferritin?", history: [] });
    expect("error" in req).toBe(false);
    const [system] = buildMessages(req as Exclude<typeof req, { error: string }>);
    expect(system!.content).toContain("Ferritin");
    expect(system!.content).toContain("no detailed explanation for this test yet");
    expect(system!.content).toMatch(/ONLY the FACTS/);
  });
  it("still rejects tests the app does not recognize", () => {
    expect("error" in parseChatRequest({ term: "vitamin_b6", status: "NORMAL", question: "x", history: [] })).toBe(true);
  });
  it("the configured URL never keeps stray spaces or a trailing slash", () => {
    expect(CHAT_URL).toBe(CHAT_URL.trim());
    expect(CHAT_URL.endsWith("/")).toBe(false);
  });
});
