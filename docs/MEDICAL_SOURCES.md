# Medical Sources

Every curated mapping or explanation must list its source here before it's committed (AGENTS.md Sections 92 and 116). Prefer authoritative references such as MedlinePlus, NIH/NIDDK, NHS, or peer-reviewed clinical chemistry references.

Entries marked "pending" were drafted by the developer (with AI assistance) from the listed source and have **not yet been reviewed by a medical professional**. The app shows "Pending review by a medical professional" under each such explanation. Who reviews them is an open decision (see PROGRESS.md).

| Normalized term | Content | Source | Reviewed by | Date |
|---|---|---|---|---|
| creatinine | Terminology mapping (kidneys), explanation, above/below-range associations | MedlinePlus, Creatinine Test: https://medlineplus.gov/lab-tests/creatinine-test/ | pending | 2026-09-29 |
| estimated_glomerular_filtration_rate | Terminology mapping (kidneys), explanation, below-range associations | MedlinePlus, Glomerular Filtration Rate (GFR) Test: https://medlineplus.gov/lab-tests/glomerular-filtration-rate-gfr-test/ | pending | 2026-09-29 |
| alanine_aminotransferase | Terminology mapping (liver), explanation, above/below-range associations | MedlinePlus, ALT Blood Test: https://medlineplus.gov/lab-tests/alt-blood-test/ | pending | 2026-09-29 |
| blood_urea_nitrogen, urea | Terminology mapping only (kidneys) | MedlinePlus, BUN (Blood Urea Nitrogen): https://medlineplus.gov/lab-tests/bun-blood-urea-nitrogen/ | pending | 2026-09-30 |
| aspartate_aminotransferase | Terminology mapping only (liver) | MedlinePlus, AST Test: https://medlineplus.gov/lab-tests/ast-test/ | pending | 2026-09-30 |
| gamma_glutamyl_transferase | Terminology mapping only (liver) | MedlinePlus, Gamma-glutamyl Transferase (GGT) Test: https://medlineplus.gov/lab-tests/gamma-glutamyl-transferase-ggt-test/ | pending | 2026-09-30 |
| bilirubin_total, bilirubin_direct, bilirubin_indirect | Terminology mapping only (liver) | MedlinePlus, Bilirubin Blood Test: https://medlineplus.gov/lab-tests/bilirubin-blood-test/ | pending | 2026-09-30 |
| lipase | Terminology mapping only (pancreas) | MedlinePlus, Lipase Tests: https://medlineplus.gov/lab-tests/lipase-tests/ | pending | 2026-09-30 |
| cardiac_troponin_i, cardiac_troponin_t | Terminology mapping only (heart) | MedlinePlus, Troponin Test: https://medlineplus.gov/lab-tests/troponin-test/ | pending | 2026-09-30 |

Deliberately **not mapped yet**: thyroid tests (TSH, T3, T4), because the body model has no thyroid gland mesh (AGENTS.md Section 105: never map to a structure the model cannot show); ALP (liver and bone); amylase (pancreas and salivary glands); glucose, HbA1c, electrolytes and blood counts (no single organ, Section 89). They are still read from reports and listed as "not mapped".

Wording choices: the sources' lists include disease names; the app's lists are reworded as general possibilities and always include the ordinary non-disease causes the source names (dehydration, exercise, diet, medicines), as required by AGENTS.md Section 108. No severity, prognosis or treatment is stated.
