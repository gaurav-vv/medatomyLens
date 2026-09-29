import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Disclaimer, DISCLAIMER_TEXT, GENERIC_MODEL_LABEL, MODEL_ATTRIBUTION } from "@/components/layout/Disclaimer";

describe("Disclaimer", () => {
  it("shows the medical disclaimer and generic-model label", () => {
    render(<Disclaimer />);
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeTruthy();
    expect(screen.getByText(GENERIC_MODEL_LABEL)).toBeTruthy();
  });

  it("states it is not a diagnosis", () => {
    expect(DISCLAIMER_TEXT).toMatch(/does not provide a medical diagnosis/);
  });

  it("credits the 3D model source (CC BY-SA attribution)", () => {
    render(<Disclaimer />);
    expect(screen.getAllByText(MODEL_ATTRIBUTION)[0]).toBeTruthy();
  });
});
