# Medical Mappings

Mappings live in data files, never in components (AGENTS.md Section 64). Every mapping is an association, not a diagnosis (`visualizationType: "association"`).

## Files

| File | Content |
|---|---|
| `data/medical/mappings/terms.json` | Normalized lab terms: synonyms, associated body-model structure ids, system, and the reason shown to the user |
| `data/medical/regions.json` | Sub-organ regions (Section 105): real parts of the detailed model (`mesh`) or a documented pin position in the organ's bounding box (`overlay`) |
| `data/medical/explanations/<term>.json` | Curated explanation per normalized term (Section 108), with sources and review status |
| `data/medical/demo/demo_report.json` | Synthetic demo report (Section 74), labeled DEMO / SAMPLE DATA |

## Rules implemented in `lib/medical/report.ts`

- Terms match only by exact synonym after removing case, spaces and punctuation. No fuzzy guess: an unknown name stays unmapped and is listed as "Not mapped to a structure".
- Lab findings get their structures from the terminology, never from the report or an AI.
- A report statement names its own structure and location; its location words must be part of the exact quote.
- Every quote must appear verbatim on its source page. Any failed check makes the finding `NOT_INTERPRETED` and it is not drawn.
- Status comes from the report's own range only; with no range it is "Reference range unavailable".
- Location display (Section 107): lab value → whole organ with "Location not specified in the report"; supported region → pin marker; unknown region or a region under another organ → whole organ with "Region not available in the current model".

## Current mappings

| Term | Structures | Why |
|---|---|---|
| creatinine | left_kidney, right_kidney | Filtered from the blood by the kidneys |
| estimated_glomerular_filtration_rate | left_kidney, right_kidney | Estimates how much blood the kidneys filter |
| alanine_aminotransferase | liver | Enzyme found mainly in the liver |

## Regions

Kidney upper/lower poles (both sides) are overlay pins at ±0.7 of the model's vertical half-height: an approximation of where the pole is, stated as such. Kidney cortex and liver left/right lobe use the detailed model's own parts.
