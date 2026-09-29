# Architecture

## Summary

AnatomyLens is a client-only Progressive Web App (PWA): a Next.js static export served from a free static host. It has no backend, database or accounts in V1. Reports will be processed in the browser and never uploaded (AGENTS.md Sections 28, 35, 82).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, `output: "export"`), React 19, TypeScript strict |
| 3D | three.js through React Three Fiber 9 and drei 10; `frameloop="demand"`; drei `<Bvh>` for fast picking |
| Styling | Tailwind CSS 4 |
| PWA | `app/manifest.ts` plus a hand-written `public/sw.js` (no plugin) |
| Model pipeline | Python (registry) and Node with gltf-transform and meshoptimizer (GLB); dev-only |
| Tests | Vitest + Testing Library (unit), Playwright (desktop and mobile end to end) |

## Anatomy pipeline (build time, run manually)

```text
assets-src/bp3d/  (git-ignored; official BodyParts3D 4.0 download)
  │  npm run anatomy:index     → elements.json (2,234 meshes: FMA id, name, bounds)
  │  npm run anatomy:registry  → data/anatomy/structures.json, layers.json
  │                              public/anatomy/body/structures.json (compact runtime index)
  │  npm run anatomy:glb       → public/anatomy/body/<layer>.<low|high>.glb
```

- **Layers:** each mesh goes to one layer (skin, muscles, skeleton, organs, arteries, veins, nervous) based on its FMA IS-A ancestors, as set by `LAYER_RULES` in `build_registry.py`. A short, reviewed name list in `data/anatomy/layer_overrides.json` covers meshes the ontology doesn't classify.
- **Organ groups** (`data/anatomy/groups.json`): multi-mesh organs such as the heart, liver, lungs and brain come from the PART-OF tree. The first tap selects the organ and a second tap selects the part. Vessels running over an organ stay in their own layer.
- **Laterality:** a structure gets a body side only if its mirror-named partner exists and its geometry agrees. The build fails on a conflict unless the conflict is in `laterality_corrections.json` with its evidence.
- **Coordinates:** source millimetres, Z-up, patient's left = +x, mapped to metres, Y-up, left = +X by a proper rotation (no mirroring). This is tested.
- **Detail tiers:** `high` keeps the full source detail and `low` keeps about 25% of the triangles. The tier is chosen once per device (`lib/anatomy/quality.ts`): touch devices, 4 or fewer CPU cores, or 4 GB or less of memory get `low`.

## Runtime (explore mode)

```text
app/page.tsx
└── AnatomyViewer            layout; AnatomyProvider (state: layers, selection, camera requests)
    ├── AnatomyCanvas        R3F canvas, studio lighting (local Lightformers, no HDR download)
    │   ├── LayerSlot × 7    lazy: a layer's GLB loads the first time it is shown, then stays loaded
    │   │   └── BodyLayer    tissue materials from data/anatomy/appearance.json; selection glow and fade
    │   └── CameraRig        short (380 ms), interruptible focus and reset flights
    ├── AnatomySearch        combobox over organs and structures (keyboard: arrows, Enter, Escape)
    ├── AnatomyLayerToggle   switches with loading and error state
    ├── OrganPanel           selected structure; bottom sheet on mobile; Escape closes; "Open detailed view"
    └── DetailPanel          detail view: Back to body, labels, parts list (only parts the model has)
```

- **Detail view** (`view: "detail"` in the context): body layers stay mounted but hidden; `DetailModel` renders copies of the selected meshes from the layer's **high** GLB (loaded lazily, cached by drei). CameraRig saves the body camera, fits the structure, and restores it on return.
- **Detailed atlas organs** (kidneys, heart, liver, lungs, brain, eyes): when `lib/anatomy/detailOrgans.ts` finds an entry in `public/anatomy/organs/index.json` for the selected body id, `DetailOrganModel` loads that organ's GLB instead (lazily, on first open; cached afterwards). Parts are keyed `part:<id>`; a mesh takes the look of its most specific part (`resolvePartAppearance`). "See inside" fades parts marked `shell`; taps pass through faded meshes. Material recompiles happen only when a mesh's transparency actually changes, so toggles stay instant. The organ group is exposed as `detailRoot`, and CameraRig frames it once `detailStatus` is `ready`.
- **Organ pipeline:** `npm run anatomy:fetch-organs` (`scripts/anatomy/fetch_hra.py`, CC BY 4.0 check) → `npm run anatomy:organs` (`scripts/anatomy/build_detail_organs.mjs`, driven by `data/anatomy/detail_organs.json` and `detail_label_corrections.json`; translation only, laterality checked, meshopt). `hra_bounds/tree/sides/where.mjs` are read-only inspection helpers for new sources.

- Selection state is a key: either a mesh id (`FJ3147`) or an organ group (`group:heart`). `lib/anatomy/structures.ts` turns a key into a name, meshes and layers.
- three.js objects are changed through refs inside effects, never through values returned by hooks (required by the React Compiler lint rules).
- Appearance colours are anatomical only and carry no medical meaning (Sections 23, 93).

## Performance design

- The canvas has its own lazy chunk, so the page shell paints first. Rendering happens only on demand.
- Layers load on demand, hidden layers keep their GPU data (so toggling is instant), and drei `<Bvh>` speeds up tap picking.
- The service worker serves `/_next/static/` and `/anatomy/` cache-first, so models download once.
- Known limitation: each mesh is one draw call (about 650 for the default view, about 2,200 with every layer on). If mid-range phones struggle, the next step is to merge meshes per layer and select by triangle ranges.

## Privacy

- The service worker caches only static app files and anatomy assets, never report data.
- No analytics and no third-party requests. The e2e test checks that no request leaves localhost.
