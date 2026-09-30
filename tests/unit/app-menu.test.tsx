import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/report/ReportContext", () => ({
  useReport: () => ({ report: null, selectedFinding: null }),
}));

import { AppMenu } from "@/components/menu/AppMenu";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("AppMenu", () => {
  it("toggles aria-expanded on the Menu button", () => {
    render(<AppMenu />);
    const button = screen.getByRole("button", { name: /Menu/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the About link and the Ask AI button when open", () => {
    render(<AppMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Menu/ }));
    const about = screen.getByRole("link", { name: "About" });
    expect(about.getAttribute("href")).toBe("/about");
    expect(screen.getByRole("button", { name: "Ask AI about your results" })).toBeTruthy();
  });

  it("opens the chat panel (with a null report) when Ask AI is clicked", () => {
    render(<AppMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Menu/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ask AI about your results" }));
    expect(screen.getByRole("dialog", { name: "Ask AI about your results" })).toBeTruthy();
  });
});
