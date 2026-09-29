/**
 * Build detailed organ models (with internal parts) for the detail view.
 *
 * Input : assets-src/hra/<source>/  (HuBMAP Human Reference Atlas reference organs, CC BY 4.0;
 *         fetch with `npm run anatomy:fetch-organs`)
 *         data/anatomy/detail_organs.json, detail_label_corrections.json, structures.json
 * Output: public/anatomy/organs/<id>.glb, public/anatomy/organs/index.json
 *
 * HRA files use metres, Y up, patient's left = +X, anterior = +Z: the same
 * frame as the app (checked in tests/unit/detail-organs.test.ts). Each organ is
 * only translated so its centre matches the body-model organ; it is never
 * rotated, mirrored or scaled.
 *
 * Part labels come from the source crosswalk.csv. Mesh nodes without a
 * crosswalk row are named from their own source node name (flagged
 * `labelSource: "node"`); corrections are data-driven and must match the source.
 *
 * Run: node scripts/anatomy/build_detail_organs.mjs [--only=heart,liver]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import {
  dedup, getBounds, meshopt, mergeDocuments, prune, quantize, simplify, unpartition, weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const SRC = "assets-src/hra";
const OUT = "public/anatomy/organs";
/** Parts closer than this to the midline (metres) carry no body side. */
const LATERAL_MIN_M = 0.004;

export const HRA_ATTRIBUTION =
  "HuBMAP Human Reference Atlas, 3D Reference Object Library (Browne, Schlehlein, Herr, Quardokus, Bueckle, Börner), " +
  "CC BY 4.0, https://humanatlas.io/3d-reference-library. Built from NLM Visible Human data; brain informed by Ding et al. 2016.";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Human name from a source node name, e.g. "Allen_head_of_caudate_L" → "Left head of caudate". */
export function nameFromNode(node) {
  let n = node.replace(/^(VH_[MF]_|Allen_)/, "");
  let side = "";
  const m = n.match(/_(L|R)$/);
  if (m) {
    side = m[1] === "L" ? "left " : "right ";
    n = n.slice(0, -2);
  }
  n = n.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  // Source abbreviations spelled out.
  n = n.replace(/\bHTH\b/g, "hypothalamus");
  return cap(`${side}${n}`);
}

function readCrosswalk(dir) {
  const [, ...rows] = readFileSync(join(dir, "crosswalk.csv"), "utf8").trim().split(/\r?\n/);
  const map = new Map();
  for (const row of rows) {
    const [node, ontology, ...label] = row.split(",");
    map.set(node.trim(), { ontology: ontology.trim(), label: label.join(",").trim(), labelSource: "crosswalk" });
  }
  return map;
}

/**
 * Combined centre of body-model structures (by name) and groups (by id), in app
 * coordinates. For paired organs only members on that body side count:
 * BodyParts3D has a few "right" eye meshes that cover both eyes (FJ1337,
 * FJ1340, FJ1368, FJ1371), which would pull the anchor to the midline.
 */
function bodyCentre(registry, anchor, side) {
  const hits = Object.values(registry).filter(
    (r) =>
      ((anchor.structures ?? []).includes(r.name) || (anchor.groups ?? []).includes(r.group)) &&
      (side === "midline" || r.side === side),
  );
  if (!hits.length) throw new Error(`anchor not found: ${JSON.stringify(anchor)}`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const r of hits) {
    // Source mm, Z up, anterior -Y  →  app m, Y up, anterior +Z.
    const [x0, y0, z0, x1, y1, z1] = r.bounds;
    const pts = [[x0 / 1000, z0 / 1000, -y1 / 1000], [x1 / 1000, z1 / 1000, -y0 / 1000]];
    for (const p of pts) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  }
  return min.map((v, i) => (v + max[i]) / 2);
}

function sourceDir(source) {
  const dir = join(SRC, source);
  if (!existsSync(dir)) throw new Error(`missing ${dir}; run npm run anatomy:fetch-organs`);
  return dir;
}

async function buildOrgan(io, organ, registry, corrections) {
  const docs = [];
  const labels = new Map();
  const anchorMin = [Infinity, Infinity, Infinity];
  const anchorMax = [-Infinity, -Infinity, -Infinity];
  for (const source of organ.sources) {
    const dir = sourceDir(source);
    const doc = await io.read(join(dir, readdirSync(dir).find((f) => f.endsWith(".glb"))));
    const cw = readCrosswalk(dir);
    for (const c of corrections.filter((c) => c.source === source)) {
      const cur = cw.get(c.node);
      if (!cur || cur.label !== c.sourceLabel) {
        throw new Error(`label correction for ${source}/${c.node} no longer matches (${cur?.label})`);
      }
      cw.set(c.node, { ontology: "", label: c.label, labelSource: "corrected" });
    }
    for (const [k, v] of cw) labels.set(k, v);
    if (organ.anchorSources.includes(source)) {
      const b = getBounds(doc.getRoot().listScenes()[0]);
      for (let i = 0; i < 3; i++) { anchorMin[i] = Math.min(anchorMin[i], b.min[i]); anchorMax[i] = Math.max(anchorMax[i], b.max[i]); }
    }
    docs.push(doc);
  }

  const doc = docs[0];
  for (const other of docs.slice(1)) mergeDocuments(doc, other);
  const root = doc.getRoot();
  const scenes = root.listScenes();
  const target = bodyCentre(registry, organ.anchor, organ.side);
  const offset = target.map((v, i) => v - (anchorMin[i] + anchorMax[i]) / 2);
  const organRoot = doc.createNode(organ.id).setTranslation(offset);
  for (const s of scenes) for (const child of s.listChildren()) organRoot.addChild(child);
  for (const s of scenes.slice(1)) s.dispose();
  scenes[0].addChild(organRoot);
  root.setDefaultScene(scenes[0]);
  root.getAsset().copyright = HRA_ATTRIBUTION;
  // Source materials are not used; the app applies tissue materials by part.
  for (const m of root.listMaterials()) m.dispose();

  // Parts: each label covers every mesh beneath it. Unlabelled meshes are named
  // from their node name; unlabelled groups simply pass their meshes upward.
  const exclude = new Set(organ.excludeLabels.map((l) => l.toLowerCase()));
  const parts = new Map();
  const walk = (node, chain) => {
    let info = labels.get(node.getName());
    if (!info && node.getMesh()) {
      info = { ontology: "", label: nameFromNode(node.getName()), labelSource: "node" };
    }
    const next = info && !exclude.has(info.label.toLowerCase()) ? [...chain, info] : chain;
    if (node.getMesh()) {
      if (!next.length) throw new Error(`${organ.id}: mesh ${node.getName()} has no part`);
      for (const a of next) {
        const id = slug(a.label);
        if (!parts.has(id)) {
          parts.set(id, { id, name: cap(a.label), ontology: a.ontology, labelSource: a.labelSource, meshes: [] });
        }
        parts.get(id).meshes.push(node.getName());
      }
    }
    for (const c of node.listChildren()) walk(c, next);
  };
  walk(organRoot, []);

  // Mesh node names must be unique for part lookup at runtime.
  const names = root.listNodes().filter((n) => n.getMesh()).map((n) => n.getName());
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) throw new Error(`${organ.id}: duplicate mesh node names ${dup}`);

  // Laterality of part names. Patient's left is +X in this frame. For sources
  // whose L/R labels contradict the frame (documented per organ as
  // `lateralityFromGeometry`), each left/right part is named by the side its
  // geometry is on. For all others a contradiction fails the build.
  let relabelled = 0;
  for (const p of parts.values()) {
    // Only names that start with Left/Right give a body side ("Left putamen").
    // "...of right ventricle" names a side of an organ, not of the body.
    const word = p.name.match(/^(left|right)\b/i)?.[1]?.toLowerCase();
    if (!word || !organ.lateralParts) continue;
    const meshNodes = root.listNodes().filter((n) => p.meshes.includes(n.getName()));
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const n of meshNodes) {
      const b = getBounds(n);
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); }
    }
    const x = (min[0] + max[0]) / 2 - offset[0];
    const geometric = x > 0 ? "left" : "right";
    const measurable = Math.abs(x) >= LATERAL_MIN_M;
    if (organ.lateralityFromGeometry) {
      // The source mirrors every label, so all left/right names are swapped
      // (including parts too close to the midline to measure). Any measurable
      // part that already agrees means the source changed: stop.
      if (measurable && geometric === word) {
        throw new Error(`${organ.id}: "${p.name}" already matches its side; lateralityFromGeometry no longer applies`);
      }
    } else {
      if (!measurable || geometric === word) continue;
      throw new Error(`${organ.id}: part "${p.name}" is named ${word} but lies on the patient's ${geometric}`);
    }
    const swap = (s) => s.replace(/\b(left|right)\b/i, (w) => {
      const to = w.toLowerCase() === "left" ? "right" : "left";
      return w[0] === w[0].toUpperCase() ? cap(to) : to;
    });
    p.name = swap(p.name);
    p.id = slug(p.name);
    p.labelSource = p.labelSource === "crosswalk" ? "corrected" : p.labelSource;
    relabelled++;
  }
  if (relabelled) console.log(`  ${organ.id}: ${relabelled} part names set to their geometric side (lateralityFromGeometry)`);

  // Keep geometry only: source vertex colours, UVs and tangents are unused
  // (the app applies its own tissue materials), and they block welding.
  // With dropNormals (sources whose normals are split per face) normals are
  // removed too, so vertices weld and simplify; the app recomputes smooth
  // normals on load (DetailOrganModel).
  const keep = new Set(organ.dropNormals ? ["POSITION"] : ["POSITION", "NORMAL"]);
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of prim.listSemantics()) {
        if (!keep.has(semantic)) prim.setAttribute(semantic, null);
      }
    }
  }
  const transforms = [unpartition(), weld()];
  if (organ.simplify < 1) {
    // error is relative to each mesh's size (meshoptimizer default).
    transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: organ.simplify, error: organ.simplifyError ?? 0.001 }));
  }
  transforms.push(
    dedup(),
    prune({ keepAttributes: false }),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  await doc.transform(...transforms);

  const file = `${organ.id}.glb`;
  await io.write(join(OUT, file), doc);

  const shellMatch = organ.shellMatch.map((s) => s.toLowerCase());
  const partList = [...parts.values()]
    .map((p) => ({
      ...p,
      meshes: [...new Set(p.meshes)].sort(),
      shell: shellMatch.some((s) => p.name.toLowerCase().includes(s)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    id: organ.id,
    name: organ.name,
    side: organ.side,
    family: organ.family,
    bodyIds: organ.bodyIds,
    file,
    bytes: statSync(join(OUT, file)).size,
    offset: offset.map((v) => Number(v.toFixed(5))),
    parts: partList,
  };
}

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  const config = JSON.parse(readFileSync("data/anatomy/detail_organs.json", "utf8"));
  const corrections = JSON.parse(readFileSync("data/anatomy/detail_label_corrections.json", "utf8")).corrections;
  const registry = JSON.parse(readFileSync("data/anatomy/structures.json", "utf8"));
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  mkdirSync(OUT, { recursive: true });

  const indexPath = join(OUT, "index.json");
  const previous = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")).organs : [];
  const organs = [];
  for (const organ of config.organs) {
    if (only && !only.includes(organ.id)) {
      const kept = previous.find((p) => p.id === organ.id);
      if (kept) organs.push(kept);
      continue;
    }
    const t0 = Date.now();
    const built = await buildOrgan(io, organ, registry, corrections);
    organs.push(built);
    const fromNode = built.parts.filter((p) => p.labelSource === "node").length;
    console.log(
      `${OUT}/${built.file}  ${(built.bytes / 1e6).toFixed(2)} MB  ${built.parts.length} parts ` +
        `(${fromNode} named from node)  offset ${built.offset}  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
  writeFileSync(indexPath, JSON.stringify({ attribution: HRA_ATTRIBUTION, organs }, null, 1));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
