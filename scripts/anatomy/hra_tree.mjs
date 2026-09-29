// Dev helper: print the node tree of an HRA organ with crosswalk labels and mesh sizes.
// Usage: node scripts/anatomy/hra_tree.mjs assets-src/hra/<organ> [maxDepth]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";

const dir = process.argv[2];
const maxDepth = Number(process.argv[3] ?? 99);
const [, ...rows] = readFileSync(join(dir, "crosswalk.csv"), "utf8").trim().split(/\r?\n/);
const cw = new Map(rows.map((r) => { const [n, o, ...l] = r.split(","); return [n.trim(), `${l.join(",").trim()} (${o})`]; }));
const doc = await new NodeIO().read(join(dir, readdirSync(dir).find((f) => f.endsWith(".glb"))));
let unlabelled = 0, meshes = 0, tris = 0;
const walk = (n, d) => {
  const m = n.getMesh();
  let t = 0;
  if (m) for (const p of m.listPrimitives()) t += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  if (m) { meshes++; tris += t; if (!cw.has(n.getName())) unlabelled++; }
  if (d <= maxDepth) console.log(`${"  ".repeat(d)}${n.getName()}${m ? ` [${Math.round(t)} tris]` : ""} → ${cw.get(n.getName()) ?? "—"}`);
  for (const c of n.listChildren()) walk(c, d + 1);
};
for (const r of doc.getRoot().listScenes()[0].listChildren()) walk(r, 0);
console.log(`meshes ${meshes}, tris ${Math.round(tris)}, unlabelled meshes ${unlabelled}, crosswalk rows ${cw.size}`);
