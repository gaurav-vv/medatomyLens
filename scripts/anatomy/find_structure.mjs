// Dev helper: list body-model structures whose id or name matches the given words.
// Usage: node scripts/anatomy/find_structure.mjs kidney thyroid
import { readFileSync } from "node:fs";

const d = JSON.parse(readFileSync("public/anatomy/body/structures.json", "utf8"));
for (const word of process.argv.slice(2)) {
  const w = word.toLowerCase();
  const hits = d.items.filter((r) => r[1].includes(w) || r[2].toLowerCase().includes(w));
  console.log(`== ${word}: ${hits.length}`);
  for (const r of hits.slice(0, 12)) console.log(`  ${r[0]} ${r[1]} | ${r[2]} | layer ${d.layers[r[3]]} | side ${r[4]} | group ${r[5] >= 0 ? d.groups[r[5]][0] : "-"}`);
}
