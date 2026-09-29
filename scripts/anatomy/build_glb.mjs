/**
 * Build per-layer GLB files from BodyParts3D OBJ meshes.
 *
 * Input : assets-src/bp3d/obj/isa_BP3D_4.0_obj_99/*.obj   (CC BY-SA 2.1 JP)
 *         data/anatomy/layers.json, data/anatomy/structures.json
 * Output: public/anatomy/body/<layer>.<tier>.glb           (CC BY-SA, see docs)
 *
 * Coordinates: BodyParts3D is millimetres, Z up, patient's left = +X,
 * anterior = -Y. three.js is metres, Y up, camera looking down -Z.
 * Mapping (x, y, z) -> (x, z, -y) / 1000 is a proper rotation (det = +1),
 * so laterality is preserved: patient's left stays at +X, which is the
 * viewer's right when looking at the front of the body.
 *
 * Run: node scripts/anatomy/build_glb.mjs [--layers=skin,organs] [--tiers=high,low]
 */
import { readFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { weld, simplify, quantize, meshopt, dedup, prune } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const OBJ_DIR = "assets-src/bp3d/obj/isa_BP3D_4.0_obj_99";
const OUT_DIR = "public/anatomy/body";

/** Detail tiers. `ratio` is the target fraction of triangles kept. */
const TIERS = {
  high: { ratio: 1, error: 0 },
  low: { ratio: 0.25, error: 0.002 },
};

export const LICENSE_TEXT =
  "BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan. " +
  "Derived model files distributed under the same license. https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1].split(",") : fallback;
}

/** Minimal OBJ reader for BodyParts3D files (v, vn, triangulated f). */
export function parseObj(text) {
  const pos = [];
  const nrm = [];
  const faces = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      // (x, y, z) mm Z-up  ->  (x, z, -y) m Y-up
      pos.push(x / 1000, z / 1000, -y / 1000);
    } else if (line.startsWith("vn ")) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      nrm.push(x, z, -y);
    } else if (line.startsWith("f ")) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => {
          const [v, , n] = t.split("/");
          return { v: Number(v) - 1, n: n ? Number(n) - 1 : Number(v) - 1 };
        });
      // Fan-triangulate polygons.
      for (let i = 1; i + 1 < idx.length; i++) faces.push(idx[0], idx[i], idx[i + 1]);
    }
  }
  // Re-index so each (v, n) pair is one glTF vertex.
  const key = new Map();
  const outPos = [];
  const outNrm = [];
  const indices = new Uint32Array(faces.length);
  faces.forEach((f, i) => {
    const k = f.v * 4_000_000 + f.n;
    let id = key.get(k);
    if (id === undefined) {
      id = outPos.length / 3;
      key.set(k, id);
      outPos.push(pos[f.v * 3], pos[f.v * 3 + 1], pos[f.v * 3 + 2]);
      outNrm.push(nrm[f.n * 3] ?? 0, nrm[f.n * 3 + 1] ?? 1, nrm[f.n * 3 + 2] ?? 0);
    }
    indices[i] = id;
  });
  return {
    position: new Float32Array(outPos),
    normal: new Float32Array(outNrm),
    indices,
  };
}

async function buildLayer(io, layer, elementIds, registry, tierName) {
  const tier = TIERS[tierName];
  const doc = new Document();
  doc.getRoot().getAsset().copyright = LICENSE_TEXT;
  doc.getRoot().getAsset().generator = "AnatomyLens build_glb.mjs";
  const buffer = doc.createBuffer();
  const scene = doc.createScene(layer);
  // One shared placeholder material; real tissue materials are applied at runtime.
  const material = doc.createMaterial(layer);

  for (const fj of elementIds) {
    const file = join(OBJ_DIR, `${fj}.obj`);
    if (!existsSync(file)) throw new Error(`missing mesh ${fj}`);
    const { position, normal, indices } = parseObj(readFileSync(file, "utf8"));
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(position).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(normal).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buffer))
      .setMaterial(material);
    const s = registry[fj];
    // Node name = mesh element id (FJ...). The app maps it to a stable
    // structure id through data/anatomy/structures.json (Section 12).
    const mesh = doc.createMesh(fj).addPrimitive(prim);
    const node = doc.createNode(fj).setMesh(mesh).setExtras({ id: s.id, side: s.side });
    scene.addChild(node);
  }

  const transforms = [weld()];
  if (tier.ratio < 1) {
    transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: tier.ratio, error: tier.error }));
  }
  transforms.push(dedup(), prune({ keepAttributes: true }), quantize(), meshopt({ encoder: MeshoptEncoder, level: "high" }));
  await doc.transform(...transforms);

  const out = join(OUT_DIR, `${layer}.${tierName}.glb`);
  await io.write(out, doc);
  return { out, bytes: statSync(out).size };
}

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

  const layers = JSON.parse(readFileSync("data/anatomy/layers.json", "utf8"));
  const registry = JSON.parse(readFileSync("data/anatomy/structures.json", "utf8"));
  const pick = arg("layers", Object.keys(layers));
  const tiers = arg("tiers", Object.keys(TIERS));
  mkdirSync(OUT_DIR, { recursive: true });

  for (const layer of pick) {
    for (const tier of tiers) {
      const t0 = Date.now();
      const { out, bytes } = await buildLayer(io, layer, layers[layer].elements, registry, tier);
      console.log(`${out}  ${(bytes / 1e6).toFixed(2)} MB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
