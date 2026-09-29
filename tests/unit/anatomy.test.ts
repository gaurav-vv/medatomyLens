import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  describeSelection,
  detailParts,
  parseStructureIndex,
  searchStructures,
  selectionForTap,
} from "@/lib/anatomy/structures";
import { resolveAppearance } from "@/lib/anatomy/appearance";
import { detectQualityTier } from "@/lib/anatomy/quality";
import { LAYER_IDS, groupKey } from "@/lib/anatomy/types";

const index = parseStructureIndex(JSON.parse(readFileSync("public/anatomy/body/structures.json", "utf8")));
const all = [...index.structures.values()];
const byName = (name: string) => all.find((s) => s.name === name);

describe("structure registry", () => {
  it("covers every BodyParts3D mesh element", () => {
    expect(index.structures.size).toBe(2234);
  });

  it("has unique stable ids (Section 12)", () => {
    const ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9_]+$/);
  });

  it("gives every structure a name", () => {
    expect(all.filter((s) => !s.name.trim()).map((s) => s.mesh)).toEqual([]);
  });

  it("puts key structures in the expected layer", () => {
    expect(byName("Right kidney")?.layer).toBe("organs");
    expect(byName("Right femur")?.layer).toBe("skeleton");
    expect(byName("Left sternocleidomastoid")?.layer).toBe("muscles");
    expect(byName("Skin")?.layer).toBe("skin");
    expect(byName("Arch of aorta")?.layer).toBe("arteries");
    expect(byName("Left thalamus")?.layer).toBe("nervous");
  });

  it("has a GLB for every layer and tier, within size budget", () => {
    for (const layer of LAYER_IDS) {
      for (const tier of ["low", "high"]) {
        const f = `public/anatomy/body/${layer}.${tier}.glb`;
        expect(existsSync(f), f).toBe(true);
        // Budget per file (Section 10). Muscles is the largest layer.
        expect(statSync(f).size, f).toBeLessThan(15 * 1024 * 1024);
      }
    }
  });

  it("rejects malformed index data", () => {
    expect(() => parseStructureIndex({})).toThrow();
    expect(() =>
      parseStructureIndex({ layers: ["organs"], fields: [], items: [["FJ1", "x", "X", 5, "m", -1]], groups: [] }),
    ).toThrow();
  });
});

describe("organ groups", () => {
  it("groups multi-part organs", () => {
    for (const id of ["heart", "liver", "brain", "left_lung", "right_lung", "left_eyeball", "right_eyeball"]) {
      expect(index.groups.get(id)?.members.length, id).toBeGreaterThan(1);
    }
  });

  it("keeps vessels running over an organ out of the organ group", () => {
    for (const g of index.groups.values()) {
      for (const m of g.members) {
        expect(["arteries", "veins"]).not.toContain(index.structures.get(m)?.layer);
      }
    }
  });

  it("puts each mesh in at most one group", () => {
    const members = [...index.groups.values()].flatMap((g) => g.members);
    expect(new Set(members).size).toBe(members.length);
  });

  it("first tap selects the organ, second tap drills into the part, third deselects", () => {
    const part = index.groups.get("heart")!.members[0]!;
    const first = selectionForTap(index, part, null);
    expect(first).toBe(groupKey("heart"));
    const second = selectionForTap(index, part, first);
    expect(second).toBe(part);
    expect(selectionForTap(index, part, second)).toBeNull();
  });

  it("ungrouped structures toggle on tap", () => {
    const kidney = byName("Right kidney")!.mesh;
    expect(selectionForTap(index, kidney, null)).toBe(kidney);
    expect(selectionForTap(index, kidney, kidney)).toBeNull();
  });

  it("describes a group selection with all members", () => {
    const d = describeSelection(index, groupKey("liver"))!;
    expect(d.name).toBe("Liver");
    expect(d.isGroup).toBe(true);
    expect(d.meshes).toEqual(index.groups.get("liver")!.members);
  });

  it("highlights every piece of a structure split into several meshes", () => {
    const pieces = all.filter((s) => s.name === "Right fibular vein");
    expect(pieces.length).toBeGreaterThan(1);
    const d = describeSelection(index, pieces[0]!.mesh)!;
    expect(new Set(d.meshes)).toEqual(new Set(pieces.map((p) => p.mesh)));
  });
});

describe("detail view parts (Section 104)", () => {
  it("lists each named part of an organ once", () => {
    const heart = describeSelection(index, groupKey("heart"))!;
    const parts = detailParts(index, heart);
    expect(parts.length).toBeGreaterThan(5);
    expect(new Set(parts.map((p) => p.name)).size).toBe(parts.length);
    expect(parts.length).toBeLessThanOrEqual(heart.meshes.length);
  });

  it("does not invent parts for a single-mesh structure", () => {
    const kidney = describeSelection(index, byName("Right kidney")!.mesh)!;
    expect(detailParts(index, kidney).map((p) => p.name)).toEqual(["Right kidney"]);
  });

  it("treats a structure split into pieces as one part", () => {
    const vein = describeSelection(index, all.find((s) => s.name === "Right fibular vein")!.mesh)!;
    expect(vein.meshes.length).toBeGreaterThan(1);
    expect(detailParts(index, vein)).toHaveLength(1);
  });
});

describe("anatomy search", () => {
  const names = (q: string, n?: number) => searchStructures(index, q, n).map((r) => r.name);

  it("finds the kidneys first for 'kidney'", () => {
    expect(names("kidney", 2).sort()).toEqual(["Left kidney", "Right kidney"]);
  });

  it("offers whole organs before their parts", () => {
    expect(searchStructures(index, "heart")[0]).toMatchObject({ name: "Heart", kind: "organ" });
    expect(searchStructures(index, "liver")[0]).toMatchObject({ name: "Liver", kind: "organ" });
  });

  it("matches word prefixes across the name", () => {
    expect(names("rig fem")[0]).toBe("Right femur");
  });

  it("lists a split structure once", () => {
    expect(names("right fibular vein").filter((n) => n === "Right fibular vein")).toHaveLength(1);
  });

  it("returns nothing for an empty query", () => {
    expect(searchStructures(index, "   ")).toEqual([]);
  });

  it("finds eye parts", () => {
    expect(names("lens")).toEqual(expect.arrayContaining(["Left lens", "Right lens"]));
  });
});

describe("tissue appearance", () => {
  it("uses organ-specific colours from data", () => {
    expect(resolveAppearance("organs", "Right kidney").color).toBe("#7c2f29");
    expect(resolveAppearance("organs", "Caudate lobe of liver").color).toBe("#6b271d");
  });

  it("falls back to the layer default", () => {
    expect(resolveAppearance("skeleton", "Right femur").color).toBe("#e6dac1");
  });
});

describe("quality tier", () => {
  it("uses low detail on touch devices and weak hardware", () => {
    expect(detectQualityTier({ hardwareConcurrency: 8, deviceMemory: 8 }, true)).toBe("low");
    expect(detectQualityTier({ hardwareConcurrency: 4, deviceMemory: 8 }, false)).toBe("low");
    expect(detectQualityTier({ hardwareConcurrency: 12, deviceMemory: 16 }, false)).toBe("high");
  });
});
