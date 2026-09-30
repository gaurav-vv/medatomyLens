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
- No analytics and no third-party requests. The e2e test checks that no request leaves localhost. The one exception is the opt-in "Ask AI" chat: after the user agrees, it sends only the term, the range status and the question to the app's Cloudflare Worker (below). No report data is sent.

## Chat about a result (optional, AGENTS.md Sections 28, 33, 34, 81, 108, 114)

The chat is opt-in and lives behind the header Menu. The viewer never depends on it (Sections 82, 83): if the chat is not set up or the service is down, everything else keeps working.

```text
AppMenu (components/menu/AppMenu.tsx: "Ask AI about your results", "About")
  └── ChatPanel (components/menu/ChatPanel.tsx)
        result picker limited to lab results that have a curated explanation
        one-time consent notice (stored in localStorage: anatomylens.chat.consent.v1)
        │
        └── lib/ai/client.ts sendChat
              POST { term, status, question, history }
              to NEXT_PUBLIC_CHAT_URL + "/chat"
              │
              └── Cloudflare Worker (worker/src/handler.ts)
                    origin allow-list (ALLOWED_ORIGINS)
                    rate limit binding: 10 requests/min per IP
                    request validation (lib/ai/grounding.ts parseChatRequest)
                    prompt built server-side from curated data only
                      (lib/ai/grounding.ts buildMessages + lib/medical/explanations.ts)
                    Workers AI model @cf/meta/llama-3.1-8b-instruct-fp8-fast
                    guard (lib/ai/guard.ts) → failing answers return { withheld: true }
                    no logging; observability disabled
```

- **Client sends the minimum:** the normalized term, the range status (above / below / within the report's own range) and the typed question, plus prior turns for context. No report text, values or personal details leave the device.
- **Grounding is server-side:** the Worker builds the whole prompt from the curated explanation of that term (`lib/ai/grounding.ts` + `lib/medical/explanations.ts`). The model is told to answer only from those facts and to reply out-of-scope otherwise. `lib/medical/explanations.ts` holds the curated registry and uses relative imports so the Worker bundles it without the app's path aliases.
- **Guard both ends:** the Worker checks the answer with `lib/ai/guard.ts` (Section 114 words + treatment/dose patterns); a failing answer is returned as `{ withheld: true }` and never shown. The client re-checks the answer before displaying it.
- **Errors** map to friendly messages: 429 (too many questions, wait a minute) and 503 (the service is busy, try again). `chatStatusOf` in `lib/ai/client.ts` classifies them.
- **Free tier:** Cloudflare Workers AI gives 10,000 Neurons/day (resets at 00:00 UTC), enough for roughly a thousand short questions. When it runs out the chat is unavailable and the rest of the app is unaffected.
- Tests: `tests/unit/chat.test.tsx` covers grounding, the guard and the UI with a fake `send`. The real model is not called in CI.

## Demo report and organ view modes (AGENTS.md build order steps 2–5)

- **Data** (`data/medical/`): `mappings/terms.json` (terminology → structure ids), `regions.json` (sub-organ regions: detailed-model parts or overlay pins), `explanations/<term>.json` (curated, sourced), `demo/demo_report.json` (synthetic, labeled DEMO / SAMPLE DATA). See `docs/MEDICAL_MAPPINGS.md`.
- **Logic** (`lib/medical/`): `report.ts` validates every finding (exact quote on its page, location words inside the quote, known structures), computes range status from the report's own range, and resolves the location display (whole organ / region / region unavailable). `anatomyLink.ts` maps structure ids to body meshes and selection keys. Failed checks → `NOT_INTERPRETED`, never drawn.
- **State**: report state lives in `components/report/ReportContext.tsx` (in memory only). The anatomy context gained `viewMode` (`reported | normal | side_by_side`) and `emphasis` (meshes of a finding, several organs at once).
- **Body view**: report-associated structures get a violet "Reported" tint with a legend; a finding emphasises and frames its structures; the organ panel lists the structure's findings (both directions of Section 88).
- **Organ view**: `useOrganReport` derives findings, active finding, effective mode and location. `RegionMarker` draws a fixed-size pin + ring (never size or shape) with a "Reported area" label; without a region the whole organ gets the reported tint and the panel says so. Normal hides markers and tint. Side by side (`SplitRenderer`, desktop/tablet only) renders the same scene twice with one camera into two viewports left of the panel, toggling only uniforms and visibility per half, so rotation and zoom are shared and no shaders recompile.
- **Phones**: the organ view uses a compact top bar and a draggable-height bottom sheet; the camera uses a view offset so the organ is centred in the visible area; side by side is replaced by the Reported/Normal toggle; the footer is shortened with full credits on /about.

## PDF report reading (Phase 2, AGENTS.md Sections 16-19, 37-39, 51-52)

Everything runs in the browser; the PDF is read into memory and never uploaded, stored or logged.

```text
pick file -> checkFile (size, starts with %PDF-) -> pdf.js text with positions (per page)
  -> page has < 40 chars of text? -> OCR (tesseract.js, <= 10 pages) -> buildRows (rows + cells)
  -> parseLabPages (rule-based) -> review screen (user unticks rows) -> RawReport -> resolveReport (existing)
```

| File | Role |
|---|---|
| `lib/reports/validate.ts` | Limits (20 MB, 30 pages, 10 OCR pages, 180 s), error codes and user messages |
| `lib/reports/pdfText.ts` | pdf.js extraction (any build: browser in the app, legacy build in tests), OCR hand-off, cancel/timeout |
| `lib/reports/layout.ts` | Positioned text -> rows and cells (column gaps); the same code for PDF text and OCR words |
| `lib/reports/labParser.ts` | Row -> name, value, unit as printed, the report's own range. Headers, patient details, censored values (`<0.5`) and rows with unplaceable cells are skipped, not guessed |
| `lib/reports/buildReport.ts` | Pages -> `RawReport`. Page lines are the rebuilt rows, so each finding quote is a real line and passes the exact-quote check |
| `lib/reports/ocr.ts`, `readReport.ts` | Browser only: lazy pdf.js and OCR, progress |
| `components/report/ReportUploader.tsx` | Upload button, real progress, errors with retry, review screen |

- Rows read by OCR get `confidence: "low"`, are **not ticked by default** on the review screen, and carry a "compare with your report" note in the finding panel. OCR rows with any word below 60% confidence are left out.
- Only numeric lab rows and imaging sentences are read (see below); other text stays page text.

## Imaging text and terminology (Phase 3, part 1; AGENTS.md Sections 105-107, 111, 113)

- `lib/reports/imagingParser.ts` reads sentences from text pages (not OCR pages) that are not lab rows. Words come from `data/medical/mappings/imaging_vocabulary.json` (organs, regions, finding words, negation, uncertainty and prior-study cues).
- A sentence becomes a `report_statement` only if it has a finding word and names exactly one organ. The side comes only from "right"/"left" in the sentence; none, both or "bilateral" means both organs and no region. A pole or lobe beats cortex/medulla; two of the same kind means no region.
- Negated findings ("no calculus", "not seen") are listed with `negated: true` and no structure: never marked. Uncertain wording is quoted as is with low confidence. Sizes are not taken from sentences that compare with an earlier study.
- `terms.json` has 119 terms in 18 groups (see `docs/MEDICAL_MAPPINGS.md`), all sourced in `docs/MEDICAL_SOURCES.md` and pending review. Thyroid tests stay unhighlighted: the body model has no thyroid gland.
- `regions.json` has 18 regions: kidney poles (pins), cortex, medulla, renal pelvis, liver lobes, lung lobes (model parts).
- Runtime files (pdf.js worker, image decoders, fonts; tesseract worker, LSTM WebAssembly cores, English model) are copied from `node_modules` to `public/vendor/` by `scripts/copy-vendor.mjs` (runs before `dev` and `build`; git-ignored). No CDN. The service worker fetches `/vendor/` network-first with an offline copy.
- Tests use synthetic PDFs written by `tests/fixtures/makePdf.ts` (text, image-only "scanned" pages, password-protected).
