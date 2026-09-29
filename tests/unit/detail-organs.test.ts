// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { MeshoptDecoder } from "meshoptimizer";
import { detailOrganFor, parseDetailOrgans, partKey } from "@/lib/anatomy/detailOrgans";
import { describeSelection, parseStructureIndex } from "@/lib/anatomy/structures";
import { groupKey } from "@/lib/anatomy/types";
import { resolvePartAppearance } from "@/lib/anatomy/appearance";

const organsFile = JSON.parse(readFileSync("public/anatomy/organs/index.json", "utf8"));
const organs = parseDetailOrgans(organsFile);
/** Organs by their own id (the parsed index is keyed by body-model id). */
const byId = new Map<string, ReturnType<typeof organs.organs.get> & object>(
  [...organs.organs.values()].map((o) => [o.id, o]),
);
const index = parseStructureIndex(JSON.parse(readFileSync("public/anatomy/body/structures.json", "utf8")));
const registry = JSON.parse(readFileSync("data/anatomy/structures.json", "utf8")) as Record<
  string,
  { name: string; bounds: number[] }
>;

/** Body-model centre in app coordinates (m, Y up, left = +X, anterior = +Z). */
function bodyCentre(name: string) {
  const b = Object.values(registry).find((r) => r.name === name)!.bounds;
  return [(b[0]! + b[3]!) / 2000, (b[2]! + b[5]!) / 2000, -(b[1]! + b[4]!) / 2000];
}

async function glbBounds(file: string) {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(`public/anatomy/organs/${file}`);
  const b = getBounds(doc.getRoot().listScenes()[0]!);
  return { centre: b.min.map((v, i) => (v + b.max[i]!) / 2), size: b.min.map((v, i) => b.max[i]! - v), doc };
}

describe("detailed organ models (HRA)", () => {
  it("lists both kidneys with internal parts", () => {
    for (const id of ["left_kidney", "right_kidney"]) {
      const o = byId.get(id)!;
      const names = o.parts.map((p) => p.name.toLowerCase());
      for (const n of ["cortex of kidney", "renal medulla", "renal pyramid", "renal papilla", "renal column"]) {
        expect(names, `${id} ${n}`).toContain(n);
      }
      expect(names.some((n) => n.includes("renal pelvis"))).toBe(true);
    }
  });

  it.each([
    ["left_kidney", "Left kidney", 1],
    ["right_kidney", "Right kidney", -1],
  ])("%s sits on the patient's correct side and on its body organ (never mirrored)", async (id, bodyName, sign) => {
    const o = byId.get(id)!;
    const { centre, size } = await glbBounds(o.file);
    expect(Math.sign(centre[0]!)).toBe(sign);
    // Pelvis-inclusive bounds differ a little from the kidney-only anchor.
    const body = bodyCentre(bodyName);
    for (let i = 0; i < 3; i++) expect(Math.abs(centre[i]! - body[i]!)).toBeLessThan(0.02);
    // Real kidney size (about 10–13 cm long), i.e. metres and not rescaled.
    expect(size[1]!).toBeGreaterThan(0.09);
    expect(size[1]!).toBeLessThan(0.14);
  });

  /** Centre of one part (all its meshes) in a built organ. */
  async function partCentre(id: string, match: (name: string) => boolean) {
    const o = byId.get(id)!;
    const { doc } = await glbBounds(o.file);
    const part = o.parts.find((p) => match(p.name.toLowerCase()));
    expect(part, `${id}: part`).toBeDefined();
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const m of part!.meshes) {
      const b = getBounds(doc.getRoot().listNodes().find((n) => n.getName() === m)!);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i]!, b.min[i]!);
        max[i] = Math.max(max[i]!, b.max[i]!);
      }
    }
    return min.map((v, i) => (v + max[i]!) / 2);
  }

  it("every organ sits on its body-model organ and has a real-world size", async () => {
    // [id, min, max] of the largest dimension in metres.
    const sizes: [string, number, number][] = [
      ["heart", 0.09, 0.16],
      ["liver", 0.15, 0.26],
      ["lungs", 0.2, 0.32],
      ["brain", 0.13, 0.2],
      ["left_eye", 0.02, 0.03],
      ["right_eye", 0.02, 0.03],
    ];
    for (const [id, lo, hi] of sizes) {
      const o = byId.get(id)!;
      const { size } = await glbBounds(o.file);
      const longest = Math.max(...size);
      expect(longest, id).toBeGreaterThan(lo);
      expect(longest, id).toBeLessThan(hi);
    }
  });

  it("all organs share one body frame: their alignment offsets agree (translation only)", () => {
    // HRA and the body model differ by one whole-body shift. An organ whose
    // offset differs a lot from the others is misplaced (or mirrored).
    const offsets = organsFile.organs.map((o: { offset: number[] }) => o.offset) as number[][];
    const median = [0, 1, 2].map((i) => {
      const v = offsets.map((o) => o[i]!).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)]!;
    });
    for (const o of organsFile.organs as { id: string; offset: number[] }[]) {
      const d = Math.hypot(...o.offset.map((v, i) => v - median[i]!));
      expect(d, o.id).toBeLessThan(0.045);
    }
  });

  it("part ids are unique within each organ", () => {
    for (const o of byId.values()) {
      const ids = o.parts.map((p) => p.id);
      expect(new Set(ids).size, o.id).toBe(ids.length);
    }
  });

  it("paired organs are on the patient's correct side (left = +X)", async () => {
    for (const [id, sign] of [["left_eye", 1], ["right_eye", -1]] as const) {
      const { centre } = await glbBounds(byId.get(id)!.file);
      expect(Math.sign(centre[0]!), id).toBe(sign);
    }
    const leftLung = await partCentre("lungs", (n) => n === "left lung");
    const rightLung = await partCentre("lungs", (n) => n === "right lung");
    expect(leftLung[0]!).toBeGreaterThan(0);
    expect(rightLung[0]!).toBeLessThan(0);
  });

  it("left and right parts of midline organs are not swapped", async () => {
    // Heart: the left ventricle lies to the patient's left of the right ventricle.
    const lv = await partCentre("heart", (n) => n === "heart left ventricle");
    const rv = await partCentre("heart", (n) => n === "heart right ventricle");
    expect(lv[0]!).toBeGreaterThan(rv[0]!);
    // Liver: the right lobe lies to the patient's right of the left lobe.
    const rl = await partCentre("liver", (n) => n === "right lobe of liver");
    const ll = await partCentre("liver", (n) => n === "left lobe of liver");
    expect(rl[0]!).toBeLessThan(ll[0]!);
    // Brain: hemispheres on their own sides.
    expect((await partCentre("brain", (n) => n === "left cerebral hemisphere"))[0]!).toBeGreaterThan(0);
    expect((await partCentre("brain", (n) => n === "right cerebral hemisphere"))[0]!).toBeLessThan(0);
    // Eye: the cornea is anterior (+Z) of the retina.
    const cornea = await partCentre("left_eye", (n) => n.includes("cornea") && !n.includes("scleral"));
    const retina = await partCentre("left_eye", (n) => n === "left retina");
    expect(cornea[2]!).toBeGreaterThan(retina[2]!);
  });

  it("names parts from the source and flags names taken from node names", () => {
    for (const o of new Set(organs.organs.values())) {
      for (const p of o.parts) {
        expect(p.name.trim(), o.id).not.toBe("");
        expect(["crosswalk", "node", "corrected"]).toContain((p as { labelSource?: string }).labelSource);
      }
    }
    const brain = byId.get("brain")!;
    expect(brain.parts.some((p) => /\bHTH\b/.test(p.name))).toBe(false);
  });

  it("renal pelvis lies medial to (towards the midline of) its kidney, as in real anatomy", async () => {
    for (const id of ["left_kidney", "right_kidney"]) {
      const o = byId.get(id)!;
      const pelvis = o.parts.find((p) => p.name.toLowerCase().includes("renal pelvis"))!;
      const { centre, doc } = await glbBounds(o.file);
      const node = doc.getRoot().listNodes().find((n) => n.getName() === pelvis.meshes[0])!;
      const b = getBounds(node);
      const pelvisX = (b.min[0]! + b.max[0]!) / 2;
      expect(Math.abs(pelvisX), id).toBeLessThan(Math.abs(centre[0]!));
      expect(Math.sign(pelvisX), id).toBe(Math.sign(centre[0]!));
    }
  });

  it("every part lists meshes that exist in its GLB", async () => {
    for (const o of new Set(organs.organs.values())) {
      const { doc } = await glbBounds(o.file);
      const names = new Set(doc.getRoot().listNodes().map((n) => n.getName()));
      for (const p of o.parts) for (const m of p.meshes) expect(names.has(m), `${o.id}/${m}`).toBe(true);
    }
  });

  it("files stay small for phones and carry the CC BY credit", async () => {
    for (const o of new Set(organs.organs.values())) {
      expect(statSync(`public/anatomy/organs/${o.file}`).size).toBeLessThan(2 * 1024 * 1024);
      const { doc } = await glbBounds(o.file);
      expect(doc.getRoot().getAsset().copyright).toMatch(/CC BY 4\.0/);
    }
    expect(organsFile.attribution).toMatch(/Human Reference Atlas/);
  });

  it("is used for body-model organ selections", () => {
    const kidney = [...index.structures.values()].find((s) => s.name === "Right kidney")!;
    const sel = describeSelection(index, kidney.mesh);
    expect(detailOrganFor(organs, index, sel)?.id).toBe("right_kidney");
    for (const [group, organ] of [
      ["heart", "heart"],
      ["liver", "liver"],
      ["brain", "brain"],
      ["left_lung", "lungs"],
      ["right_lung", "lungs"],
      ["left_eyeball", "left_eye"],
      ["right_eyeball", "right_eye"],
    ]) {
      const g = describeSelection(index, groupKey(group!));
      expect(detailOrganFor(organs, index, g)?.id, group).toBe(organ);
    }
    const femur = [...index.structures.values()].find((s) => s.name === "Right femur")!;
    expect(detailOrganFor(organs, index, describeSelection(index, femur.mesh))).toBeUndefined();
  });

  it("gives internal parts distinct tissue looks", () => {
    const cortex = resolvePartAppearance("Cortex of kidney").color;
    const pyramid = resolvePartAppearance("Renal pyramid").color;
    const pelvis = resolvePartAppearance("Right renal pelvis").color;
    expect(new Set([cortex, pyramid, pelvis]).size).toBe(3);
  });

  it("uses prefixed part keys that cannot collide with mesh ids", () => {
    expect(partKey("renal_pyramid")).toBe("part:renal_pyramid");
    expect(index.structures.has(partKey("renal_pyramid"))).toBe(false);
  });

  it("rejects a malformed index", () => {
    expect(() => parseDetailOrgans({})).toThrow();
    expect(() => parseDetailOrgans({ attribution: "x", organs: [{ id: "a" }] })).toThrow();
  });
});
