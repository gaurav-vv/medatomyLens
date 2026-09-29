# AnatomyLens

AnatomyLens is an educational 3D anatomy viewer that works as an installable web app on phones and desktops. It will show where findings in a medical report are associated in the body. It is **not a diagnostic tool**.

Status: Phase 1 (the realistic whole-body anatomy viewer) is in progress. Explore mode works: 2,234 structures across 7 layers, search, organ selection with part drill-down, and camera focus.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # lint + typecheck + unit tests + static build
npm run test:e2e     # Playwright against ./out (run `npm run build` first)
```

The output is a static site in `out/`, which can be deployed to any free static host.

## Deploy (free)

- **GitHub Pages:** push to `main` on GitHub and set Settings → Pages → Source to **GitHub Actions**. `.github/workflows/pages.yml` builds with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes `out/`.
- **Any root-domain host** (Cloudflare Pages, Netlify, Vercel): build command `npm run build`, output folder `out`, no environment variables.

HTTPS is required to install the app on phones.

## Rebuilding the anatomy model (optional)

The processed models are committed in `public/anatomy/`. To regenerate them, download `isa_BP3D_4.0_obj_99.zip` and the `*_parts_list_e.txt`, `*_element_parts.txt` and `*_inclusion_relation_list.txt` files from https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/ into `assets-src/bp3d/`, then run:

```bash
npm run anatomy:index && npm run anatomy:registry && npm run anatomy:glb
```

This needs Python 3.

## Environment

None are required for V1. See `.env.example`.

## Medical safety

The app visualizes associations between report findings and anatomy using a generic model. It does not diagnose, and it never draws lesions or damage. See `AGENTS.md`.

## 3D assets and licenses

The anatomy model is derived from **BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan**. The derived model files in `public/anatomy/` are under the same license (see `public/anatomy/LICENSE.txt`); the application code is not. Details are in `docs/THIRD_PARTY_ASSETS.md`.

## Docs

- `PROGRESS.md`: current status, decisions and next steps (start here)
- `docs/ARCHITECTURE.md`
- `docs/MEDICAL_MAPPINGS.md`
- `docs/MEDICAL_SOURCES.md`
- `docs/THIRD_PARTY_ASSETS.md`
