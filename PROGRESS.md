# PROGRESS.md: project status and handoff

> Read this first when you pick up the project (human or AI), then read `AGENTS.md`, which holds the binding rules.
> Update this file at the end of every work session: change **Current status**, **Next steps** and **Open decisions**, and add a line to the **Log**.

Last updated: 2026-09-30

---

## 1. What this is

**AnatomyLens** is a free, client-only web app (a PWA that works on phones and the web) that shows realistic whole-body 3D anatomy. It will later map findings from an uploaded medical report onto the body. It is educational and must never diagnose (see AGENTS.md Sections 3, 4, 114 and 118).

The user's product flow:

```text
Open app → Explore mode (whole body, education)
        → Upload report → affected organs highlighted
        → tap organ → organ view → tap finding → explanation (curated, sourced)
```

## 2. Phase plan (agreed with the user)

| Phase | Scope | Status |
|---|---|---|
| 1 | Realistic whole-body anatomy viewer (explore mode) | **In progress** |
| 1.1 | Scaffold, PWA, tests, CI, docs | Done |
| 1.2 | Choose and verify the 3D asset, license | Done (BodyParts3D 4.0) |
| 1.3 | Model pipeline: registry, layers, GLB, detail tiers | Done |
| 1.4 | Realistic rendering (tissue materials, lighting) | Basic version done; polish pending |
| 1.5 | Explore UI: layers, search, select, focus, mobile sheet | Done |
| 1.6 | Detailed view for any structure (body → detail → back) | Done: internal parts for kidneys, heart, liver, lungs, brain, eyes (HRA atlas) |
| 1.7 | Rendering polish, About screen, deploy | Done: live at https://gaurav-vv.github.io/medatomyLens/ |
| 1.8 | AGENTS.md build order 2–5: demo report, organ view Reported/Normal/Side by side, region marker, range bar, curated explanations (3 terms) | Done (explanations pending medical review) |
| 2 | PDF reading: pdf.js, table parser, OCR fallback, AI fallback with exact-quote check, review screen | Done except the AI fallback (waiting on provider choice) |
| 3 | Mapping findings to anatomy: terminology, organ profiles, report mode, range bar, explanations, imaging text | In progress: 119 terms, 19 explanations, imaging text reader, 18 regions, AI chat (Cloudflare) built but not deployed; medical review, bone/X-ray regions, report comparison pending |
| 4 | Adding medical content region by region (reviewed sources only) | Not started |

The user chose this order (visuals, then PDF, then mapping). AGENTS.md Section 115 lists a different order, and updating AGENTS.md to match hasn't been approved yet (see section 6).

## 3. Current status

What works now (verified by tests and screenshots, desktop and mobile Chromium):

- 2,234 BodyParts3D meshes in 7 layers: skin, muscles, skeleton, organs, arteries, veins, nervous system.
- Skeleton and organs show on first open. Other layers load the first time they're turned on, then toggle instantly.
- Two detail tiers: `low` (about 25% of triangles) for touch devices or weak hardware, `high` otherwise.
- Search across all structures and organ groups, with keyboard support.
- Organ groups (heart, lungs, liver, brain, eyes, intestines, pancreas, nose, thymus): the first tap selects the organ, the second tap drills into the tapped part, and a third deselects.
- The selection glows and the surrounding anatomy fades. There are Focus and Reset camera flights, and Escape deselects.
- Mobile layout: top search, layer chips, and a bottom-sheet panel. The camera keeps the model inside the space the controls leave free (`lib/ui/insets.ts` measures the real overlay elements; CameraRig applies a view offset and fits the home view), so the skull no longer sits under the search bar.
- Zoom goes to the point under the mouse wheel or between pinching fingers (`ZoomToPointer.tsx`), not the body centre.
- Demo report (clearly labeled DEMO / SAMPLE DATA): associated organs highlighted, finding panel with quote, page, View source, reference range bar and curated explanation; organ view with Reported / Normal / Side by side (desktop) and a pin marker for the reported region.
- One shared UI style (`ui-panel`, `ui-btn`, `ui-btn-accent`, `ui-btn-report`, `ui-tag` in `app/globals.css`); 36 px touch targets on phones; scrollbars hidden app-wide (user request; scrolling still works).
- **Detail view** for any selected structure or organ: "Open detailed view" isolates it using the high-detail GLB (loaded lazily, with a real "Loading detailed model..." state). The body layers are hidden, not unloaded, so "Back to body" is instant. The camera frames the structure and returns to the exact body view. There's a parts list of what the model really contains (for example, 22 parts for the heart); tapping a part in the list or in 3D highlights it and fades the rest, so parts inside the organ stay visible. Escape clears the part first, then goes back. The view is labeled "Generic normal reference" and "Generic anatomical model — not your actual anatomy". Kidneys (9 parts each), heart (16), liver (30), lungs (61), brain (237) and each eye (23) use detailed HuBMAP atlas organs with a "See inside" switch that makes the outer layers see-through. Other single-mesh structures say they have no separate internal parts.
- Disclaimer and full model credits are on the About page (linked from the header on every screen); the user asked to remove the footer from the main page. The disclaimer also appears under every report finding, and the organ view always shows "Generic anatomical model — not your actual anatomy".
- No third-party network requests (checked in e2e).
- **PDF upload (Phase 2):** "Upload" (next to the search) reads the file on the device (pdf.js), rebuilds table rows, and parses numeric lab rows (name, value, unit as printed, the report's own range). Scanned pages go to on-device OCR (tesseract.js, self-hosted). A review screen lists every row read, with its quote, page and mapping; OCR rows are unticked by default. Only then is the report shown on the body, labeled "YOUR REPORT · ON THIS DEVICE". Limits: 20 MB, 30 pages, 10 OCR pages, 180 s. Errors (not a PDF, password, corrupted, too many pages, no text) say what to try, with retry.

Not done or known gaps:

- **AI chat (new, 2026-09-30):** Menu → "Ask AI about your results" (and "Ask AI about this result" in every recognized lab finding) opens a chat. Tests with a curated explanation are grounded in it; other recognized tests only in their terminology entry (name, why shown, group). A Cloudflare Worker + Cloudflare Workers AI (free tier) answers; the client sends only the test name, the range status and the question, the Worker grounds the prompt in the curated explanation server-side and runs a guard, and the client re-checks the answer. **Not yet deployed:** the user must create a free Cloudflare account and run `npm run worker:deploy`, then set `CHAT_URL`. **Not tested against the real model** yet (unit tests use a fake `send`).
- **e2e not re-run** after the 2026-09-30 medical-content and menu changes.
- **Female body + sex-specific ranges:** unfinished and unverified, saved on the **local-only branch `wip/female-body`** (commit 4094b4f). **Do not push it** (user request).
- Performance on a **real phone hasn't been measured yet**. The test browser renders without a GPU, so its load times mean nothing. Each mesh is a separate draw call (about 650 for the default view); merging meshes per layer is the planned fix if phones stutter.
- The structure panel shows only the name, layer, side and parent organ. There's no educational text yet; it needs reviewed sources (AGENTS.md Section 116).
- CI on GitHub: `npm run check` passes, but the e2e step fails on the GitHub runner (logs need a GitHub login to read; likely timeouts on the slower software-rendered runner). The website deploy is separate and succeeds.
- The full desktop e2e run was not repeated after the last phone-layout change (stopped on request); the full mobile run passed.
- 19 explanations drafted from MedlinePlus and marked "Pending review by a medical professional". The other ~99 terms are mapped only.
- Hosted on GitHub Pages: https://gaurav-vv.github.io/medatomyLens/ (repo https://github.com/gaurav-vv/medatomyLens). Every push to `main` redeploys via `.github/workflows/pages.yml` (GitHub Pages, sub-path handled by `NEXT_PUBLIC_BASE_PATH` / `lib/basePath.ts`).

## 4. Key decisions (and why)

| Decision | Reason |
|---|---|
| Client-only static Next.js export, no backend or database | Free hosting, privacy (reports never leave the device), offline use |
| PWA instead of native apps | One codebase for phones and the web, no store fees; Capacitor is possible later |
| BodyParts3D 4.0 as the model | The best free whole-body model found. **Z-Anatomy was rejected** because it bundles non-commercial (NC) kidney and inner-ear models and brain models with no license, and it needs Blender |
| CC BY-SA 2.1 JP share-alike | Applies to the model files in `public/anatomy/` only, not to the app code. The user accepted it ("ok continue") |
| React Three Fiber + drei | There was no existing 3D code; drei provides meshopt decoding, BVH picking and environment lighting |
| No Draco (`useGLTF(url, false, true)`) | Draco would fetch its decoder from a Google CDN. Meshopt decodes locally |
| Organs render realistically, but **reported areas use a clearly artificial marker** | The user wanted realistic "defected parts". This was declined under AGENTS.md Sections 93, 95, 107 and 118, and the reasons were explained to the user |
| AI (Phase 2) only extracts; it never decides organs or colors | AGENTS.md Sections 13 and 34. Every AI result must quote report text exactly, or it's rejected |
| Rule-based parser first, AI as fallback | Free, fast and private; cloud AI only with the user's opt-in |

## 5. Next steps (in order)

0. **Now:** run e2e (`npm run build; npm run test:e2e`); deploy the chat Worker (`npm run worker:deploy`) and set `CHAT_URL`; try the chat against the real model (answer speed and quality). Then commit on `main` (medical content + chat), without the female-body branch.
1. **User:** test on a real phone and report how smooth it is and how long it takes to load. If it stutters, merge meshes per layer or reduce the draw calls.
2. **Detailed organs (HRA): done** for kidneys, heart, liver, lungs, brain and eyes. Pipeline: `npm run anatomy:fetch-organs` then `npm run anatomy:organs`, configured in `data/anatomy/detail_organs.json`; part colours in `appearance.json` "parts". Brain L/R labels in the source are mirrored and are set from geometry (`lateralityFromGeometry`, see THIRD_PARTY_ASSETS). Candidates to add later: spleen, pancreas, stomach, bladder, thyroid (check each source the same way).
3. Fix the CI e2e step on GitHub (read the run log, then raise timeouts or run a smaller e2e set in CI).
4. Optional rendering extras that need a post-processing dependency (ambient occlusion, depth of field in the detail view): only after real-phone numbers, high tier only.
5. **Medical review:** someone qualified should review the 19 explanations in `data/medical/explanations/` (status "pending") and the new mappings, then set `review.status` to "reviewed" and fill the Reviewed-by column in docs/MEDICAL_SOURCES.md.
6. Phase 2 is done except the AI fallback. Next: test uploads with real-layout (synthetic or de-identified) reports from the labs users will use, and tune the parser.
7. Phase 3 next parts: explanations for more terms (needs a reviewer; each new explanation also enables chat for that term), bone/X-ray regions (e.g. distal radius, femoral neck), more detailed organs (spleen, pancreas, bladder), and comparing reports by date (Sections 43, 44, 70).

## 6. Open decisions (waiting on the user)

- [x] **AI chat per finding** (requested 2026-09-30): the user chose a free hosted proxy (a Cloudflare Worker calling Cloudflare Workers AI) after rejecting the in-browser WebLLM model (830 MB download) and users bringing their own Gemini keys. A user's-own-API-key provider could still be added later behind an adapter, with its own opt-in.
- [ ] AGENTS.md Section 74 asks for a demo report; the user asked to remove the demo button (done). Update AGENTS.md?
- [ ] May AGENTS.md be updated to whole-body scope, the new phase order, PWA and the AI rules? (Asked; not answered yet.)
- [x] Git host and hosting: GitHub + GitHub Pages (https://github.com/gaurav-vv/medatomyLens).
- [x] Build order: follow AGENTS.md Section 115 (demo report and organ view before PDF). Chosen by the user ("b").
- [ ] Who reviews the medical content (mappings and explanations) before it's committed?
- [ ] UI language: English only for V1?
- [ ] Which AI provider for Phase 2 extraction: the chat now uses Cloudflare (Worker + Workers AI); the extraction fallback is still undecided (self-hosted, another cloud free tier, or reuse the Worker).
- [x] Model files are in git directly (largest 13.8 MB, under GitHub's 100 MB limit).
- [ ] "Remove every slide bar": scrollbars were hidden. Did the user also mean the reference range bar? (Asked.)

## 7. How to run and verify

```powershell
npm install
npm run dev                  # http://localhost:3000
npm run check                # lint + typecheck + unit tests + static build (must pass)
npm run build; npm run test:e2e   # Playwright, desktop + mobile, serves ./out on :4173
# On a phone, same Wi-Fi: npm run build; npx serve out -l 4173 → http://<PC-IPv4>:4173
```

To rebuild the anatomy model (only when the pipeline or data changes): download the BodyParts3D files into `assets-src/bp3d/` (see README), then run `npm run anatomy:index && npm run anatomy:registry && npm run anatomy:glb`. This needs Python 3.

## 8. Where things are

```text
app/                          page, layout, manifest (Next 16 App Router)
components/anatomy/           AnatomyViewer (layout), AnatomyContext (state/reducer),
                              AnatomyCanvas (R3F canvas, lighting, lazy layers),
                              BodyLayer (materials, selection look, taps), CameraRig,
                              AnatomySearch, AnatomyLayerToggle, OrganPanel,
                              DetailModel (isolated high-detail copy), DetailPanel (back, labels, parts)
components/layout/Disclaimer  disclaimer + generic-model label + model attribution
components/menu/               AppMenu (header "Menu": Ask AI about your results, About),
                              ChatPanel (result picker, consent, chat UI)
lib/ai/                       client (sendChat to the Worker, error mapping), grounding
                              (parseChatRequest, buildMessages, suggested questions),
                              guard (checkAnswer: Section 114 words + treatment/dose)
worker/                       Cloudflare Worker: src/handler.ts (validate, ground, Workers AI,
                              guard), src/index.ts, wrangler.toml (ALLOWED_ORIGINS, rate limit)
lib/anatomy/                  types, structures (index, search, selection, tap logic),
                              appearance (tissue look), quality (device tier)
data/anatomy/                 appearance.json, groups.json, layer_overrides.json,
                              laterality_corrections.json, structures.json, layers.json
public/anatomy/body/          <layer>.<low|high>.glb + structures.json (runtime index)
public/anatomy/organs/        detailed HRA organs (<id>.glb) + index.json (parts, attribution)
scripts/anatomy/              index_elements.py → build_registry.py → build_glb.mjs; diagnose.py
                              fetch_hra.py → build_detail_organs.mjs; hra_bounds/tree/sides/where.mjs (read-only inspection)
tests/unit, tests/e2e         Vitest (registry, laterality, search, state, wording), Playwright
docs/                         ARCHITECTURE, THIRD_PARTY_ASSETS, MEDICAL_SOURCES, MEDICAL_MAPPINGS
```

## 9. Gotchas for the next developer or AI

- **Next.js 16** differs from older versions. Read `node_modules/next/dist/docs/` before using Next APIs. `typecheck` runs `next typegen` first (it provides `LayoutProps`).
- `next dev` inserts a rules block into AGENTS.md unless one exists in CLAUDE.md. **CLAUDE.md hosts that block on purpose, so AGENTS.md stays untouched.** Don't delete it.
- The React Compiler lint rule forbids mutating values returned by hooks. Mutate three.js objects through refs inside effects (see `BodyLayer.tsx`).
- **Laterality:** in the BodyParts3D source the patient's left is +x, and the app keeps it at +X (a proper rotation, tested). A structure gets a body side only if its mirror-named partner exists and its geometry agrees. The build **fails** on conflicts; fix them in `laterality_corrections.json` with evidence, and never by weakening the test.
- A layer is chosen from FMA IS-A ancestors (`LAYER_RULES` in `build_registry.py`). If a structure lands in the wrong layer, prefer adding an FMA class there; use `layer_overrides.json` only for exact names that can't be classified that way.
- `tests/unit/wording.test.ts` scans app strings for words banned by AGENTS.md Section 114 (damaged, severe, "you have", and so on).
- The dev machine is Windows with PowerShell. Avoid inline `python -c` with nested quotes; write a script file instead.
- **Never edit files with PowerShell `Get-Content`/`Set-Content`** (Windows PowerShell 5 reads and writes cp1252 and corrupts characters such as “”·→). Use the editor tool or a Node script.
- `assets-src/` (raw downloads, about 620 MB extracted) is git-ignored.

## 10. Log

| Date | Work done |
|---|---|
| 2026-09-29 | Planning with the user (scope: whole body, PWA, free, AI extraction; phase order visuals → PDF → mapping). Phase 1.1 scaffold (Next 16, R3F, Tailwind, Vitest, Playwright, CI, PWA shell). Z-Anatomy evaluated and rejected (NC parts). BodyParts3D 4.0 pipeline: 2,234 meshes, 7 layers, 12 organ groups, 3 laterality corrections, low and high GLBs. Explore UI with search, selection, focus and mobile layout. 68 unit tests and 4 e2e tests passing. Created PROGRESS.md. |
| 2026-09-29 | Phase 1.6 detail view: `view`/`detailPart`/`detailStatus` in AnatomyContext, DetailModel (high-detail copies, part highlight with see-through fade), DetailPanel, camera save/fit/restore, Escape handling. 76 unit tests and 6 e2e tests (desktop and mobile) passing; screenshots checked. |
| 2026-09-29 | The user chose a second model for internal organ parts. Found HuBMAP HRA reference organs (CC BY 4.0, about 90 organs). Integrated the kidneys (plus renal pelvis): fetch and build scripts, `public/anatomy/organs/`, DetailOrganModel, "See inside", part list with the atlas source note, footer credit. HRA frame verified equal to the app frame (left = +X); tests check side, alignment, size and that the pelvis is medial. 88 unit tests and 6 e2e tests passing. |
| 2026-09-29 | Added HRA heart, liver, lungs, brain and both eyes (detailed parts, colours, laterality checks; brain labels mirrored in source and fixed from geometry; eyes simplified 4.5 to 0.35 MB). Brain white matter and cerebellar hemispheres now fade with See inside. Material recompile only when transparency flips (faster toggles). fetch-organs script lists all 10 sources. Removed survey_hra.py. 95 unit tests and 8 e2e tests (desktop and mobile) passing; screenshots checked. |
| 2026-09-29 | Phase 1.7: rendering polish without new dependencies (rim light, CSS studio backdrop, adaptive resolution while the camera moves via drei AdaptiveDpr + OrbitControls regress). About page with disclaimer, privacy and full credits; header link. Optional sub-path hosting (`lib/basePath.ts`, basePath in next.config, service worker scope-relative, v2 cache). GitHub Pages workflow. 98 unit tests and 10 e2e tests (desktop and mobile) passing. First git commit. |
| 2026-09-29 | Pushed to https://github.com/gaurav-vv/medatomyLens; GitHub Pages enabled (Source: GitHub Actions). |
| 2026-09-29 | User chose to follow AGENTS.md build order (steps 2–5 before PDF). Added demo report (synthetic), terminology for creatinine/eGFR/ALT with MedlinePlus-sourced explanations (review pending), regions (kidney poles as overlay pins, kidney cortex and liver lobes as model parts), finding validation (exact quotes), body highlight + finding panel, organ view modes with region marker and side-by-side, reference range bar, View source. Mobile layout reworked: compact header/footer, organ view bottom sheet, camera view offset. 152 unit tests, 12 e2e (desktop + mobile) passing. |
| 2026-09-29 | Zoom goes to the part under the mouse wheel or between pinching fingers (ZoomToPointer, unit + e2e tested) instead of the body centre. Shared UI primitives in globals.css (ui-panel, ui-btn, ui-btn-accent, ui-btn-report, ui-tag) used across viewer, panels and About; 36 px touch targets on phones; 16 px search text (no iOS auto-zoom). 156 unit, 13 e2e passing. |
| 2026-09-29 | Phone layout: overlay insets measured from the real controls, camera view offset + fitted home view so the body stays clear of search and layer chips; organ view top bar moved below the header. Disclaimer/credits footer removed from the main page (user request) and kept on About (plus under each finding). Scrollbars hidden. About page and header aligned. Pushed 2d2081f; live on GitHub Pages. 156 unit tests pass; full mobile e2e passed. |
| 2026-09-29 | Phase 2: on-device PDF reading (pdfjs-dist 6.3.289), row/cell rebuilding, rule-based lab-row parser, OCR fallback (tesseract.js 7.0.0, self-hosted via scripts/copy-vendor.mjs), review screen, upload errors with retry, uploaded-report labels. Fixed the phone page being zoomed out (layer chip fieldset had min-width: min-content). Synthetic PDF writer for tests. 182 unit tests; 6 new e2e upload tests (desktop + mobile, incl. OCR) pass. |
| 2026-09-30 | Phase 3 part 1: 10 new MedlinePlus-sourced lab terms (BUN, urea, AST, GGT, bilirubin x3, lipase, troponin I/T; pending review), 10 new regions (kidney medulla/pelvis, caudate lobe, lung lobes), data-driven imaging text reader (side, region, negation, uncertainty, prior-study sizes), review screen and panels show organ statements. Fixed a cp1252 encoding corruption in PROGRESS.md. 198 unit tests, 8 upload e2e tests pass. |
| 2026-09-30 | Real-report feedback: 64 lab terms plus BP/pulse in display groups (kidneys, liver, pancreas, heart, blood pressure, thyroid, blood sugar/count/fats/proteins, electrolytes). Blood-measured tests shown on arteries+veins (`layer:` structure ids, only while the finding is open), calcium/phosphorus/ALP also on bones; thyroid listed only (no thyroid mesh). Repeated results merged. Grouped, collapsible result list with status tags (green in range, amber outside; no graded severity colours). Demo button removed (user request; demo data kept for tests); upload next to the search. Closing finding details keeps the highlight (bar to reopen/clear). Shared control sizes (40/36 px), icon buttons, panel style. 207 unit tests, upload and smoke e2e pass. |
| 2026-09-30 | Medical content: 16 new explanations checked against their MedlinePlus pages (BUN, urea, uric acid, AST, GGT, bilirubin x3, albumin, ALP, lipase, troponin I/T, total protein, globulin, A/G ratio; AST/ALT ratio has no source so no explanation). 52 new terms from a real-layout report (iron/vitamins, CRP/ESR/immunoglobulins, clotting, urine, SpO2/blood gases/peak flow, CK/CK-MB/NT-proBNP/BNP, cortisol/LH/FSH/prolactin/SHBG/PTH/testosterone, trace minerals, osmolality): 119 terms, 18 groups. Ambiguous names are not highlighted (bare pH not recognized; bare osmolality, PTH, testosterone listed only). Term keys handle subscripts (SpO₂). Female-body work moved to local branch wip/female-body (not pushed). |
| 2026-09-30 | (Superseded the same day, see next rows.) First AI chat attempt: in-browser WebLLM model in each finding panel. Removed because it needed an 830 MB download. |
| 2026-09-30 | Medical content: 16 new explanations checked against MedlinePlus (20 total, pending review); 52 new terms from a real-layout report → 119 terms in 18 groups. Ambiguous names are not highlighted; term keys handle subscripts (SpO₂). Female-body work moved to the local-only branch wip/female-body (not pushed). |
| 2026-09-30 | AI chat redesigned to a free hosted proxy: header Menu (`components/menu/AppMenu.tsx`: Ask AI about your results, About) → ChatPanel → `lib/ai/client.ts` sendChat → Cloudflare Worker (`worker/`) on Cloudflare Workers AI (Llama 3.1 8B Instruct). Worker has an origin allow-list, a 10/min per-IP rate limit, request validation, curated server-side grounding (`lib/ai/grounding.ts` + `lib/medical/explanations.ts`) and a guard (`lib/ai/guard.ts`); failing answers return `{withheld:true}`; no logging. Client re-checks answers. The earlier in-browser WebLLM chat was tried and removed. Built but not deployed. |
