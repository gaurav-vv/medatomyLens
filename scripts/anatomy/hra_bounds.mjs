// Dev helper: world-space bounds of every mesh node in HRA GLBs.
// Usage: node scripts/anatomy/hra_bounds.mjs assets-src/hra/kidney-male-left/3d-vh-m-kidney-l.glb ...
import { NodeIO } from "@gltf-transform/core";
import { getBounds } from "@gltf-transform/functions";

const io = new NodeIO();
for (const file of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const doc = await io.read(file);
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const b = getBounds(scene);
  const c = b.min.map((v, i) => ((v + b.max[i]) / 2).toFixed(3));
  const s = b.min.map((v, i) => (b.max[i] - v).toFixed(3));
  console.log(`\n${file}\n  scene centre ${c}  size ${s}`);
  const roots = scene.listChildren();
  for (const r of roots) {
    const t = r.getTranslation(), q = r.getRotation(), sc = r.getScale();
    console.log(`  root ${r.getName()} t=${t.map((v) => v.toFixed(3))} r=${q.map((v) => v.toFixed(3))} s=${sc.map((v) => v.toFixed(4))}`);
  }
  if (process.argv.includes("--parts")) {
    scene.traverse((n) => {
      if (!n.getMesh()) return;
      const nb = getBounds(n);
      const nc = nb.min.map((v, i) => ((v + nb.max[i]) / 2).toFixed(3));
      console.log(`    ${n.getName().padEnd(34)} centre ${nc}`);
    });
  }
}
