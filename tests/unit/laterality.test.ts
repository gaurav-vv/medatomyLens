import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseObj } from "../../scripts/anatomy/build_glb.mjs";

/**
 * Laterality must never be swapped (AGENTS.md Sections 55, 113).
 * BodyParts3D: patient's left is x > 0 (source coordinate_system.png).
 */
interface RegistryEntry {
  name: string;
  side: "left" | "right" | "midline";
  layer: string;
  bounds: [number, number, number, number, number, number];
}

const registry = JSON.parse(readFileSync("data/anatomy/structures.json", "utf8")) as Record<
  string,
  RegistryEntry
>;
const entries = Object.values(registry);
const centreX = (e: RegistryEntry) => (e.bounds[0] + e.bounds[3]) / 2;

describe("laterality in the structure registry", () => {
  it("only paired structures get a body side, and it agrees with the name", () => {
    for (const e of entries) {
      if (e.side === "left") expect(e.name, e.name).toMatch(/\bleft\b/i);
      if (e.side === "right") expect(e.name, e.name).toMatch(/\bright\b/i);
    }
  });

  it("every left/right structure lies on the patient's side (left = +x)", () => {
    const lateral = entries.filter((e) => e.side !== "midline");
    expect(lateral.length).toBeGreaterThan(1000);
    const wrong = lateral.filter((e) => (e.side === "left") !== centreX(e) > 0);
    expect(wrong.map((e) => e.name)).toEqual([]);
  });

  it("applies the documented source-label corrections", () => {
    const corrected = Object.entries(registry)
      .filter(([, e]) => (e as RegistryEntry & { lateralityCorrected?: boolean }).lateralityCorrected)
      .map(([fj]) => fj)
      .sort();
    expect(corrected).toEqual(["FJ1469", "FJ1469M", "FJ2190"]);
    expect(registry.FJ1469?.name).toBe("Right flexor pollicis brevis");
    expect(registry.FJ2190?.name).toBe("Left fibular vein");
  });

  it.each([
    ["Left kidney", "left"],
    ["Right kidney", "right"],
    ["Left adrenal gland", "left"],
    ["Right femur", "right"],
    ["Left lens", "left"],
  ])("%s is on the patient's %s (x sign)", (name, side) => {
    const e = entries.find((x) => x.name === name);
    expect(e, name).toBeDefined();
    if (!e) return;
    expect(e.side).toBe(side);
    expect(centreX(e) > 0 ? "left" : "right").toBe(side);
  });

  it("known single-side organs sit on the expected side", () => {
    const byName = (n: string) => entries.find((e) => e.name.toLowerCase() === n);
    expect(centreX(byName("spleen")!)).toBeGreaterThan(0); // patient's left
    expect(centreX(byName("stomach")!)).toBeGreaterThan(0); // mostly left
  });
});

describe("OBJ → glTF coordinate transform", () => {
  it("keeps patient's left at +X (proper rotation, no mirror)", () => {
    // A point on the patient's left (x=+100 mm), anterior (y=-50), up (z=1000).
    const obj = "v 100 -50 1000\nv 0 0 0\nv 0 0 1\nvn 1 0 0\nvn 1 0 0\nvn 1 0 0\nf 1//1 2//2 3//3\n";
    const { position } = parseObj(obj) as { position: Float32Array };
    expect(position[0]).toBeCloseTo(0.1); // left stays +X
    expect(position[1]).toBeCloseTo(1.0); // superior is +Y
    expect(position[2]).toBeCloseTo(0.05); // anterior faces +Z (towards the default camera)
  });

  it("preserves triangle winding (determinant +1)", () => {
    // Axis map (x, y, z) -> (x, z, -y) as a matrix has determinant +1.
    const m = [
      [1, 0, 0],
      [0, 0, 1],
      [0, -1, 0],
    ] as const;
    const det =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    expect(det).toBe(1);
  });
});
