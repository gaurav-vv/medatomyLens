// Dev helper: for an HRA organ, compare each node's L/R name suffix with its geometric side (+X = patient's left).
// Usage: node scripts/anatomy/hra_sides.mjs assets-src/hra/brain-male
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { getBounds } from "@gltf-transform/functions";

const dir = process.argv[2];
const doc = await new NodeIO().read(join(dir, readdirSync(dir).find((f) => f.endsWith(".glb"))));
const counts = { agree: 0, swapped: 0, nearMidline: 0 };
const swapped = [];
for (const n of doc.getRoot().listNodes()) {
  if (!n.getMesh()) continue;
  const m = n.getName().match(/_(L|R)(_[a-z])?$/);
  if (!m) continue;
  const b = getBounds(n);
  const cx = (b.min[0] + b.max[0]) / 2;
  if (Math.abs(cx) < 0.003) { counts.nearMidline++; continue; }
  const geo = cx > 0 ? "L" : "R";
  if (geo === m[1]) counts.agree++;
  else { counts.swapped++; swapped.push(`${n.getName()} x=${cx.toFixed(3)}`); }
}
console.log(counts);
console.log(swapped.slice(0, 12).join("\n"));
