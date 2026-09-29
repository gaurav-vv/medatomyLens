import { describe, expect, it } from "vitest";
import { withBase } from "@/lib/basePath";
import { layerUrl } from "@/lib/anatomy/quality";

describe("base path", () => {
  it("keeps root-relative asset URLs when no sub-path is configured", () => {
    expect(withBase("/sw.js")).toBe("/sw.js");
    expect(layerUrl("organs", "low")).toBe("/anatomy/body/organs.low.glb");
  });
});
