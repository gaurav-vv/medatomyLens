import { describe, expect, it } from "vitest";
import { anatomyReducer, initialAnatomyState } from "@/components/anatomy/AnatomyContext";
import { groupKey, type AnatomyIndex, type StructureInfo } from "@/lib/anatomy/types";

const kidney: StructureInfo = { mesh: "FJ3147", id: "right_kidney", name: "Right kidney", layer: "organs", side: "right" };
const biceps: StructureInfo = { mesh: "FJ9", id: "right_biceps", name: "Right biceps", layer: "muscles", side: "right" };

function withIndex() {
  const index: AnatomyIndex = {
    structures: new Map([
      [kidney.mesh, kidney],
      [biceps.mesh, biceps],
    ]),
    groups: new Map([["kid", { id: "kid", name: "Kidney group", side: "midline", members: [kidney.mesh] }]]),
    pieces: new Map([
      [kidney.mesh, [kidney.mesh]],
      [biceps.mesh, [biceps.mesh]],
    ]),
  };
  return anatomyReducer(initialAnatomyState(), { type: "index", index });
}

describe("anatomy state", () => {
  it("opens with skeleton and organs visible, nothing selected", () => {
    const s = initialAnatomyState();
    expect(s.visible.skeleton && s.visible.organs).toBe(true);
    expect(s.visible.skin || s.visible.muscles).toBe(false);
    expect(s.selected).toBeNull();
  });

  it("selects and deselects", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    expect(s.selected).toBe(kidney.mesh);
    s = anatomyReducer(s, { type: "select", key: null });
    expect(s.selected).toBeNull();
  });

  it("selecting a hidden structure (from search) shows its layer and requests focus", () => {
    const s = anatomyReducer(withIndex(), { type: "select", key: biceps.mesh, focus: true });
    expect(s.visible.muscles).toBe(true);
    expect(s.focusSeq).toBe(1);
  });

  it("hiding the selected structure's layer clears the selection", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    s = anatomyReducer(s, { type: "toggleLayer", layer: "organs" });
    expect(s.visible.organs).toBe(false);
    expect(s.selected).toBeNull();
  });

  it("hiding another layer keeps the selection", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    s = anatomyReducer(s, { type: "toggleLayer", layer: "skeleton" });
    expect(s.selected).toBe(kidney.mesh);
  });

  it("group selections follow their members' layers", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: groupKey("kid") });
    expect(s.selected).toBe("group:kid");
    s = anatomyReducer(s, { type: "toggleLayer", layer: "organs" });
    expect(s.selected).toBeNull();
  });
});

describe("body ⇄ detail view (Section 103)", () => {
  it("opens only with a selection", () => {
    expect(anatomyReducer(withIndex(), { type: "openDetail" }).view).toBe("body");
  });

  it("opens, highlights a part, and returns with the selection kept", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    s = anatomyReducer(s, { type: "openDetail" });
    expect(s.view).toBe("detail");
    expect(s.detailStatus).toBe("loading");
    s = anatomyReducer(s, { type: "detailPart", key: kidney.mesh });
    expect(s.detailPart).toBe(kidney.mesh);
    s = anatomyReducer(s, { type: "closeDetail" });
    expect(s.view).toBe("body");
    expect(s.selected).toBe(kidney.mesh);
    expect(s.detailPart).toBeNull();
  });

  it("ignores part highlights outside the detail view", () => {
    const s = anatomyReducer(withIndex(), { type: "detailPart", key: kidney.mesh });
    expect(s.detailPart).toBeNull();
  });
});

describe("report-related viewer state (Sections 50, 89, 109)", () => {
  it("emphasis highlights several structures and clears the single selection", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    s = anatomyReducer(s, { type: "emphasize", meshes: [kidney.mesh, biceps.mesh], focus: true });
    expect(s.selected).toBeNull();
    expect(s.emphasis).toEqual([kidney.mesh, biceps.mesh]);
    expect(s.focusSeq).toBe(1);
  });
  it("emphasis turns on a hidden layer, and a selection clears emphasis", () => {
    let s = anatomyReducer(withIndex(), { type: "emphasize", meshes: [biceps.mesh] });
    expect(s.visible.muscles).toBe(true);
    s = anatomyReducer(s, { type: "select", key: kidney.mesh });
    expect(s.emphasis).toEqual([]);
  });
  it("organ view mode lives in the anatomy state and resets on open", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    s = anatomyReducer(s, { type: "openDetail" });
    expect(s.viewMode).toBe("reported");
    s = anatomyReducer(s, { type: "viewMode", mode: "side_by_side" });
    expect(s.viewMode).toBe("side_by_side");
    s = anatomyReducer(s, { type: "closeDetail" });
    s = anatomyReducer(s, { type: "openDetail" });
    expect(s.viewMode).toBe("reported");
  });
  it("emphasis is ignored inside the organ view", () => {
    let s = anatomyReducer(withIndex(), { type: "select", key: kidney.mesh });
    s = anatomyReducer(s, { type: "openDetail" });
    expect(anatomyReducer(s, { type: "emphasize", meshes: [biceps.mesh] })).toBe(s);
  });
});
