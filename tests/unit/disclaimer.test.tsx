import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";
import { DISCLAIMER_TEXT, GENERIC_MODEL_LABEL, HRA_ATTRIBUTION, MODEL_ATTRIBUTION } from "@/components/layout/Disclaimer";

describe("About page: disclaimer and credits", () => {
  it("shows the medical disclaimer, generic-model label and both model credits", () => {
    render(<AboutPage />);
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeTruthy();
    expect(screen.getByText(new RegExp(GENERIC_MODEL_LABEL))).toBeTruthy();
    expect(screen.getByText(MODEL_ATTRIBUTION)).toBeTruthy();
    expect(screen.getByText(HRA_ATTRIBUTION)).toBeTruthy();
  });

  it("states it is not a diagnosis", () => {
    expect(DISCLAIMER_TEXT).toMatch(/does not provide a medical diagnosis/);
  });
});