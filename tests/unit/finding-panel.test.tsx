import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import demo from "@/data/medical/demo/demo_report.json";
import { FindingDetails, NO_EXPLANATION_TEXT } from "@/components/report/FindingDetails";
import { ReferenceRangeBar } from "@/components/report/ReferenceRangeBar";
import { resolveReport } from "@/lib/medical/report";
import type { RawReport } from "@/lib/medical/types";

const report = resolveReport(demo as RawReport, () => true);
afterEach(cleanup);
const f = (id: string) => report.findings.find((x) => x.raw.id === id)!;

describe("explanation panel (Section 108)", () => {
  it("quotes the report with its page, then the curated explanation", () => {
    const { container } = render(<FindingDetails finding={f("finding_001")} report={report} />);
    expect(container.textContent).toContain("“Creatinine | 1.9 | mg/dL | 0.7 - 1.3”");
    expect(screen.getByText(/Demo Medical Report · page 1/)).toBeTruthy();
    expect(screen.getByText("Above reported range", { exact: false })).toBeTruthy();
    expect(container.textContent).toContain("Creatinine is a normal waste product");
    expect(screen.getByText(/can be associated with/)).toBeTruthy();
    expect(screen.getByText("Dehydration")).toBeTruthy();
    expect(screen.getByText("Discuss this result with your doctor.")).toBeTruthy();
    expect(screen.getByText(/Location not specified in the report/)).toBeTruthy();
    expect(screen.getByText(/Pending review by a medical professional/)).toBeTruthy();
  });
  it("does not list out-of-range associations for a value within range", () => {
    render(<FindingDetails finding={f("finding_003")} report={report} />);
    expect(screen.queryByText(/can be associated with/)).toBeNull();
    expect(screen.getByText("Within reported range", { exact: false })).toBeTruthy();
  });
  it("shows only the quote and source when no curated entry exists", () => {
    render(<FindingDetails finding={f("finding_004")} report={report} />);
    expect(screen.getByText(NO_EXPLANATION_TEXT)).toBeTruthy();
    expect(screen.getByText(/could not be confidently mapped/)).toBeTruthy();
  });
  it("a report statement is quoted, with size as text and the region name", () => {
    render(<FindingDetails finding={f("finding_005")} report={report} />);
    expect(screen.getByText(/The report states this/)).toBeTruthy();
    expect(screen.getByText("Size as reported: 1.8 cm")).toBeTruthy();
    expect(screen.getByText(/Right kidney, lower pole/)).toBeTruthy();
  });
});

describe("reference range bar (Section 110)", () => {
  it("has a text equivalent and uses the report's range", () => {
    render(<ReferenceRangeBar finding={f("finding_001").raw} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("1.9 mg/dL, above reported range (0.7 - 1.3 mg/dL).");
    expect(screen.getByText(/Reported range: 0.7 - 1.3/)).toBeTruthy();
  });
  it("says the range is unavailable instead of inventing one", () => {
    render(<ReferenceRangeBar finding={{ ...f("finding_001").raw, referenceRange: null }} />);
    expect(screen.getByText("Reference range unavailable.")).toBeTruthy();
  });
});
