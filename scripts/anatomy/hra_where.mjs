// Dev helper: centre of named nodes (substring match) in an HRA GLB.
// Usage: node scripts/anatomy/hra_where.mjs assets-src/hra/brain-male frontal_pole occipital_pole cerebell
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { getBounds } from "@gltf-transform/functions";

const [dir, ...terms] = process.argv.slice(2);
const doc = await new NodeIO().read(join(dir, readdirSync(dir).find((f) => f.endsWith(".glb"))));
for (const n of doc.getRoot().listNodes()) {
  if (!n.getMesh() || !terms.some((t) => n.getName().toLowerCase().includes(t))) continue;
  const b = getBounds(n);
  const c = b.min.map((v, i) => ((v + b.max[i]) / 2).toFixed(3));
  console.log(n.getName().padEnd(52), "x,y,z =", c.join(", "));
}
