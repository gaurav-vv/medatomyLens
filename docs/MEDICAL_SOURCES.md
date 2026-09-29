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

Deliberately **not highlighted** (recognized and listed under their group, never drawn on an organ):

| Terms | Group | Why | Source |
|---|---|---|---|
| thyroid_stimulating_hormone, triiodothyronine_total, thyroxine_total, triiodothyronine_free, thyroxine_free | Thyroid | The body model has no thyroid gland mesh (Section 105) | MedlinePlus TSH Test https://medlineplus.gov/lab-tests/tsh-thyroid-stimulating-hormone-test/, Thyroxine (T4) Test https://medlineplus.gov/lab-tests/thyroxine-t4-test/, Triiodothyronine (T3) Tests https://medlineplus.gov/lab-tests/triiodothyronine-t3-tests/ |
| glucose_fasting, glucose_post_prandial, glucose_random, hemoglobin_a1c, estimated_average_glucose | Blood sugar | Body-wide (Section 89) | MedlinePlus Blood Glucose Test https://medlineplus.gov/lab-tests/blood-glucose-test/, Hemoglobin A1C Test https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/ |
| hemoglobin, hematocrit, red_blood_cell_count, mean_corpuscular_volume, mean_corpuscular_hemoglobin, mean_corpuscular_hemoglobin_concentration, red_cell_distribution_width_cv, red_cell_distribution_width_sd, white_blood_cell_count, neutrophils, lymphocytes, eosinophils, monocytes, basophils, neutrophil_lymphocyte_ratio, platelet_count, mean_platelet_volume, platelet_distribution_width | Blood count | Body-wide | MedlinePlus Complete Blood Count https://medlineplus.gov/lab-tests/complete-blood-count-cbc/ |
| cholesterol_total, triglycerides, hdl_cholesterol, ldl_cholesterol, vldl_cholesterol, non_hdl_cholesterol, cholesterol_hdl_ratio, ldl_hdl_ratio, atherogenic_index_of_plasma | Blood fats | Body-wide | MedlinePlus Cholesterol Levels https://medlineplus.gov/lab-tests/cholesterol-levels/, Triglycerides Test https://medlineplus.gov/lab-tests/triglycerides-test/ |
| sodium, potassium, chloride, bicarbonate, calcium, phosphorus, magnesium | Electrolytes and minerals | Many organs involved | MedlinePlus Electrolyte Panel https://medlineplus.gov/lab-tests/electrolyte-panel/, Calcium Blood Test https://medlineplus.gov/lab-tests/calcium-blood-test/, Phosphate in Blood https://medlineplus.gov/lab-tests/phosphate-in-blood/ |
| total_protein, globulin, albumin_globulin_ratio | Blood proteins | Made by the liver and the immune system | MedlinePlus Total Protein and A/G Ratio https://medlineplus.gov/lab-tests/total-protein-and-albumin-globulin-a-g-ratio/ |

Added mappings (pending review, 2026-09-30):

| Normalized term | Content | Source | Reviewed by | Date |
|---|---|---|---|---|
| albumin | Terminology mapping only (liver: made by the liver) | MedlinePlus, Albumin Blood Test: https://medlineplus.gov/lab-tests/albumin-blood-test/ | pending | 2026-09-30 |
| alkaline_phosphatase | Terminology mapping only (liver highlighted; the text says bones are not) | MedlinePlus, Alkaline Phosphatase: https://medlineplus.gov/lab-tests/alkaline-phosphatase/ | pending | 2026-09-30 |
| ast_alt_ratio | Terminology mapping only (liver: ratio of two liver-associated enzymes) | MedlinePlus AST Test and ALT Blood Test (above) | pending | 2026-09-30 |
| systolic_blood_pressure, diastolic_blood_pressure, pulse_rate | Terminology mapping only (heart and arteries; pulse: heart) | MedlinePlus, High Blood Pressure: https://medlineplus.gov/highbloodpressure.html; Vital signs: https://medlineplus.gov/ency/article/002341.htm | pending | 2026-09-30 |
| (blood-measured groups) | Shown on the arteries and veins (layer:arteries, layer:veins) because they are measured in blood; the text says this does not point to any vessel or problem. Calcium and phosphorus also on the bones (stored in bone); ALP on liver and bones | MedlinePlus pages listed above for each group (Calcium Blood Test, Phosphate in Blood, Alkaline Phosphatase) | pending | 2026-09-30 |
| uric_acid | Terminology mapping only (kidneys: removed mainly by the kidneys) | MedlinePlus, Uric Acid Test: https://medlineplus.gov/lab-tests/uric-acid-test/ | pending | 2026-09-30 |

Still not recognized: vitamin and hormone tests other than thyroid, iron studies, urine tests, and anything else not listed above; they are listed as "Not in the app's terminology yet".

Wording choices: the sources' lists include disease names; the app's lists are reworded as general possibilities and always include the ordinary non-disease causes the source names (dehydration, exercise, diet, medicines), as required by AGENTS.md Section 108. No severity, prognosis or treatment is stated.
