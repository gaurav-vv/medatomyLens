# Third-Party Assets

Every 3D model, texture, font or dataset shipped with the app is recorded here before it is added (AGENTS.md Sections 9 and 112).

## In use: HuBMAP Human Reference Atlas 3D Reference Organs (detailed organs)

- Source: https://github.com/hubmapconsortium/hra-kg (`digital-objects/ref-organ/`); library page https://humanatlas.io/3d-reference-library
- Downloaded: 2026-09-29 with `scripts/anatomy/fetch_hra.py`, which refuses any file whose `metadata.yaml` doesn't state CC BY 4.0.
- In use: `kidney-male-left` v1.3, `kidney-male-right` v1.3, `renal-pelvis-male-left` v1.0, `renal-pelvis-male-right` v1.0, `heart-male` v1.3, `liver-male` v1.2, `lung-male` v1.4, `brain-male` v1.4, `eye-male-left` v1.3, `eye-male-right` v1.3 (fetch all with `npm run anatomy:fetch-organs`)
- License: **CC BY 4.0**, stated in each organ's `metadata.yaml`. Commercial use and modification are allowed with attribution; there is no share-alike requirement.
- Built from the NLM Visible Human Project data (Spitzer et al. 1996; Ackerman 1998). The brain is based on the Allen Human Brain Atlas (Ding et al. 2016) and has been CC BY 4.0 since v1.3.
- Changes made (`scripts/anatomy/build_detail_organs.mjs`, settings in `data/anatomy/detail_organs.json`):
  - Each kidney was merged with its renal pelvis.
  - Each model was translated so it sits on the matching body-model organ. It was not rotated, scaled or mirrored.
  - The source materials were removed.
  - The files were meshopt-compressed.
  - Brain: the source's left/right labels contradict its geometry for all 261 lateral meshes (every other HRA organ agrees with its geometry). The part names are set to the side the geometry is actually on (`lateralityFromGeometry`), and the build fails if a label would already match its side. Abbreviation "HTH" is shown as "Hypothalamus".
  - Liver and brain: unnamed parts take their name from the source node name (`nameFromNode`).
  - Lungs: 3 label corrections, listed with reasons in `data/anatomy/detail_label_corrections.json`.
  - Heart and liver: left/right words name a side of the organ (for example "left lobe of liver"), not the patient's side, so the laterality check is off for them (`lateralParts: false`).
  - Eyes: the per-face normals were dropped and the mesh was simplified to 25% of its triangles (4.5 MB → 0.35 MB each). The app recomputes smooth normals.
  - Brain, lungs and heart: triangle simplification per `simplify` in `detail_organs.json`.
- Output: `public/anatomy/organs/*.glb` and `index.json`. The attribution is stored in each file's copyright field, in `index.json` and in the app footer.
- Required attribution:

```text
Browne, Kristen, Heidi Schlehlein, Bruce W. Herr II, Ellen Quardokus, Andreas Bueckle, and Katy Börner.
"HuBMAP CCF 3D Reference Object Library." https://humanatlas.io/3d-reference-library. CC BY 4.0.
```

- Orientation: the files are in metres with Y up, the patient's left at +X and anterior at +Z, the same frame as the app. `tests/unit/detail-organs.test.ts` checks the side, the position on the body organ, the real size, and that the renal pelvis lies medial to its kidney.
- The unit tests also check that the left ventricle is left of the right ventricle, the right liver lobe is right of the left lobe, each brain hemisphere is on its side, and the cornea is anterior to the retina.
- Other organs are available from the same library (uterus, ovaries, spleen, lymph nodes and more) and haven't been added yet.

## In use: BodyParts3D 4.0 (whole-body model)

- Source: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/ (`isa_BP3D_4.0_obj_99.zip`, plus the parts and relation lists)
- Downloaded: 2026-09-29
- License: CC BY-SA 2.1 Japan. Commercial use, modification and redistribution are allowed, with attribution and share-alike.
- Share-alike: the derived files in `public/anatomy/` (GLB layers and `structures.json`) are distributed under CC BY-SA 2.1 JP, as stated in `public/anatomy/LICENSE.txt`. The app loads them as separate files, so the app's source code is not affected.
- Required attribution (shown in the app's About screen and footer when those exist, and in the README):

```text
BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan
```

### Section 112 checklist

- [x] License permits the intended use
- [x] Share-alike effect understood and recorded
- [x] Attribution text recorded
- [x] Each structure is a separate, named mesh: 2,234 meshes with FMA IDs
- [ ] Internal organ parts (for example renal cortex and medulla): **not in the model**. The kidney, for example, is a single mesh. **Resolved for the kidneys, heart, liver, lungs, brain and eyes** with the HRA detailed organs above; other organs still use the body mesh in the detail view.
- [x] Left and right can be told apart, and patient orientation was checked (patient's left is +x in the source and stays +X in the app). This is tested in `tests/unit/laterality.test.ts`. Three wrong source labels are corrected and documented in `data/anatomy/laterality_corrections.json`.
- [x] Size: 23 MB for all layers at low detail and 38 MB at high detail. Layers load on demand, and the first view (skeleton and organs) is about 5 MB (low) or 9 MB (high).
- [x] Converts cleanly to GLB (`scripts/anatomy/build_glb.mjs`)

### What the model contains

Skin, hair of head and eyebrows (as solid surfaces), 436 muscle meshes, 309 skeleton meshes (bones, teeth, cartilage, ligaments), organs (digestive, respiratory, urinary, reproductive (male only), eye parts, glands), 639 artery meshes, 395 vein meshes, and 144 nervous-system meshes (brain regions, cranial nerves near the eye, spinal cord).

What it doesn't contain: the inner ear or cochlea, peripheral limb nerves, lymphatic system, female anatomy, internal kidney structure, or real hair strands. The app must not claim these exist (Section 7).

## Considered and not used: Z-Anatomy

- Source: https://github.com/Z-Anatomy/Models-of-human-anatomy (CC BY-SA 4.0, built on BodyParts3D)
- Not used because its License.txt lists bundled parts under non-commercial licenses (Kidney by Lissie Cowley, CC BY-NC 4.0; Inner Ear, University of Dundee, CC BY-NC-SA 4.0) and two brain models with no license stated. The file doesn't mark which meshes those are, and it can only be opened in Blender.

## Fonts

- Geist and Geist Mono (via `next/font`, self-hosted at build time), SIL Open Font License 1.1.
