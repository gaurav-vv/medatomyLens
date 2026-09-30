import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import demo from "@/data/medical/demo/demo_report.json";
import { resolveReport } from "@/lib/medical/report";
import type { RawReport } from "@/lib/medical/types";
import { FindingChat } from "@/components/report/FindingChat";
import { FindingDetails } from "@/components/report/FindingDetails";
import { CHAT_AI_LABEL } from "@/components/chat/ChatThread";

const report = resolveReport(demo as RawReport, () => true);
const f = (id: string) => report.findings.find((x) => x.raw.id === id)!;
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("chat inside a finding", () => {
  it("appears only for results with a curated explanation", () => {
    const { unmount } = render(<FindingDetails finding={f("finding_001")} report={report} />);
    expect(screen.getByRole("button", { name: /Ask AI about this result/ })).toBeTruthy();
    unmount();
    render(<FindingDetails finding={f("finding_004")} report={report} />);
    expect(screen.queryByRole("button", { name: /Ask AI about this result/ })).toBeNull();
  });

  it("opens, asks for consent, then sends a question about this result only", async () => {
    const send = vi.fn(async () => ({ text: "It is a waste product.", withheld: false }));
    render(<FindingChat finding={f("finding_001")} chatUrl="https://x" send={send} />);
    fireEvent.click(screen.getByRole("button", { name: /Ask AI about this result/ }));
    fireEvent.click(screen.getByText("I understand, continue"));
    fireEvent.click(screen.getByText("What does this test measure?"));
    expect(await screen.findByText("It is a waste product.")).toBeTruthy();
    expect(screen.getByText(CHAT_AI_LABEL)).toBeTruthy();
    expect((send.mock.calls[0] as unknown[])[0]).toEqual({ term: "creatinine", status: "ABOVE_RANGE", question: "What does this test measure?", history: [] });
  });
});
