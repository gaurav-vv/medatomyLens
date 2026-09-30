# Medical Sources

Every curated mapping or explanation must list its source here before it's committed (AGENTS.md Sections 92 and 116). Prefer authoritative references such as MedlinePlus, NIH/NIDDK, NHS, or peer-reviewed clinical chemistry references.

Entries marked "pending" were drafted by the developer (with AI assistance) from the listed source and have **not yet been reviewed by a medical professional**. The app shows "Pending review by a medical professional" under each such explanation. Who reviews them is an open decision (see PROGRESS.md).

| Normalized term | Content | Source | Reviewed by | Date |
|---|---|---|---|---|
| creatinine | Terminology mapping (kidneys), explanation, above/below-range associations | MedlinePlus, Creatinine Test: https://medlineplus.gov/lab-tests/creatinine-test/ | pending | 2026-09-29 |
| estimated_glomerular_filtration_rate | Terminology mapping (kidneys), explanation, below-range associations | MedlinePlus, Glomerular Filtration Rate (GFR) Test: https://medlineplus.gov/lab-tests/glomerular-filtration-rate-gfr-test/ | pending | 2026-09-29 |
| alanine_aminotransferase | Terminology mapping (liver), explanation, above/below-range associations | MedlinePlus, ALT Blood Test: https://medlineplus.gov/lab-tests/alt-blood-test/ | pending | 2026-09-29 |
| blood_urea_nitrogen, urea | Terminology mapping (kidneys), explanation, above/below-range associations | MedlinePlus, BUN (Blood Urea Nitrogen): https://medlineplus.gov/lab-tests/bun-blood-urea-nitrogen/ | pending | 2026-09-30 |
| aspartate_aminotransferase | Terminology mapping (liver), explanation, above-range associations | MedlinePlus, AST Test: https://medlineplus.gov/lab-tests/ast-test/ | pending | 2026-09-30 |
| gamma_glutamyl_transferase | Terminology mapping (liver), explanation, above-range associations | MedlinePlus, Gamma-glutamyl Transferase (GGT) Test: https://medlineplus.gov/lab-tests/gamma-glutamyl-transferase-ggt-test/ | pending | 2026-09-30 |
| bilirubin_total, bilirubin_direct, bilirubin_indirect | Terminology mapping (liver), explanations, above/below-range associations | MedlinePlus, Bilirubin Blood Test: https://medlineplus.gov/lab-tests/bilirubin-blood-test/ | pending | 2026-09-30 |
| lipase | Terminology mapping (pancreas), explanation, above/below-range associations | MedlinePlus, Lipase Tests: https://medlineplus.gov/lab-tests/lipase-tests/ | pending | 2026-09-30 |
| cardiac_troponin_i, cardiac_troponin_t | Terminology mapping (heart), explanations, above-range associations | MedlinePlus, Troponin Test: https://medlineplus.gov/lab-tests/troponin-test/ | pending | 2026-09-30 |

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
| albumin | Terminology mapping (liver: made by the liver), explanation, above/below-range associations | MedlinePlus, Albumin Blood Test: https://medlineplus.gov/lab-tests/albumin-blood-test/ | pending | 2026-09-30 |
| alkaline_phosphatase | Terminology mapping (liver and bones), explanation, above/below-range associations | MedlinePlus, Alkaline Phosphatase: https://medlineplus.gov/lab-tests/alkaline-phosphatase/ | pending | 2026-09-30 |
| ast_alt_ratio | Terminology mapping only (liver: ratio of two liver-associated enzymes). No explanation: the MedlinePlus AST page does not describe the ratio | MedlinePlus AST Test and ALT Blood Test (above) | pending | 2026-09-30 |
| systolic_blood_pressure, diastolic_blood_pressure, pulse_rate | Terminology mapping only (heart and arteries; pulse: heart) | MedlinePlus, High Blood Pressure: https://medlineplus.gov/highbloodpressure.html; Vital signs: https://medlineplus.gov/ency/article/002341.htm | pending | 2026-09-30 |
| (blood-measured groups) | Shown on the arteries and veins (layer:arteries, layer:veins) because they are measured in blood; the text says this does not point to any vessel or problem. Calcium and phosphorus also on the bones (stored in bone); ALP on liver and bones | MedlinePlus pages listed above for each group (Calcium Blood Test, Phosphate in Blood, Alkaline Phosphatase) | pending | 2026-09-30 |
| uric_acid | Terminology mapping (kidneys: removed mainly by the kidneys), explanation, above-range associations | MedlinePlus, Uric Acid Test: https://medlineplus.gov/lab-tests/uric-acid-test/ | pending | 2026-09-30 |
| total_protein, globulin, albumin_globulin_ratio | Terminology mapping (blood vessels), explanations, above/below-range associations | MedlinePlus, Total Protein and A/G Ratio: https://medlineplus.gov/lab-tests/total-protein-and-albumin-globulin-a-g-ratio/ | pending | 2026-09-30 |

Added mappings, terminology only (pending review, 2026-09-30). Each URL was opened and checked for topic on 2026-09-30. Pages marked (encyclopedia) are A.D.A.M. content on MedlinePlus: only facts are used, reworded in-house; no text is copied.

| Normalized term | Shown on | Source |
|---|---|---|
| cystatin_c | Kidneys (used to estimate eGFR) | MedlinePlus, GFR Test: https://medlineplus.gov/lab-tests/glomerular-filtration-rate-gfr-test/ |
| urine_albumin_creatinine_ratio | Kidneys | MedlinePlus, Microalbumin Creatinine Ratio: https://medlineplus.gov/lab-tests/microalbumin-creatinine-ratio/ |
| urine_specific_gravity, urine_ph | Kidneys (make urine) | MedlinePlus, Urinalysis (encyclopedia): https://medlineplus.gov/ency/article/003579.htm; Urine specific gravity test (encyclopedia): https://medlineplus.gov/ency/article/003587.htm |
| osmolality_urine; osmolality_serum; osmolality_unspecified | Kidneys; blood vessels; nothing (sample type not stated) | MedlinePlus, Osmolality Tests: https://medlineplus.gov/lab-tests/osmolality-tests/ |
| insulin | Pancreas (makes insulin) | MedlinePlus, Insulin in Blood: https://medlineplus.gov/lab-tests/insulin-in-blood/ |
| c_peptide | Pancreas | MedlinePlus, C-Peptide Test: https://medlineplus.gov/lab-tests/c-peptide-test/ |
| amylase | Pancreas (also salivary glands, not highlighted) | MedlinePlus, Amylase Test: https://medlineplus.gov/lab-tests/amylase-test/ |
| nt_probnp, bnp | Heart | MedlinePlus, Natriuretic Peptide Tests (BNP, NT-proBNP): https://medlineplus.gov/lab-tests/natriuretic-peptide-tests-bnp-nt-probnp/ |
| creatine_kinase; creatine_kinase_mb | Muscles layer; heart | MedlinePlus, Creatine Kinase: https://medlineplus.gov/lab-tests/creatine-kinase/ |
| oxygen_saturation | Lungs | MedlinePlus, Pulse Oximetry: https://medlineplus.gov/lab-tests/pulse-oximetry/ |
| arterial_po2, arterial_pco2; arterial_ph | Lungs; lungs and kidneys | MedlinePlus, Arterial Blood Gas (ABG) Test: https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/ |
| peak_expiratory_flow | Lungs | MedlinePlus, Make peak flow a habit (encyclopedia): https://medlineplus.gov/ency/patientinstructions/000046.htm |
| respiratory_rate | Lungs | MedlinePlus, Vital signs (encyclopedia): https://medlineplus.gov/ency/article/002341.htm |
| cortisol | Adrenal glands | MedlinePlus, Cortisol Test: https://medlineplus.gov/lab-tests/cortisol-test/ |
| parathyroid_hormone | Nothing (no parathyroid mesh) | MedlinePlus, Parathyroid Hormone (PTH) Test: https://medlineplus.gov/lab-tests/parathyroid-hormone-pth-test/ |
| luteinizing_hormone, follicle_stimulating_hormone | Pituitary gland | MedlinePlus, LH Levels Test: https://medlineplus.gov/lab-tests/luteinizing-hormone-lh-levels-test/; FSH Levels Test: https://medlineplus.gov/lab-tests/follicle-stimulating-hormone-fsh-levels-test/ |
| prolactin | Pituitary gland | MedlinePlus, Prolactin Levels: https://medlineplus.gov/lab-tests/prolactin-levels/ |
| testosterone_total | Nothing (source gland depends on sex) | MedlinePlus, Testosterone Levels Test: https://medlineplus.gov/lab-tests/testosterone-levels-test/ |
| sex_hormone_binding_globulin | Liver (made mostly in the liver) | MedlinePlus, SHBG Blood Test: https://medlineplus.gov/lab-tests/shbg-blood-test/ |
| apolipoprotein_b | Blood vessels | MedlinePlus, Apolipoprotein B100 (encyclopedia): https://medlineplus.gov/ency/article/003502.htm |
| lipoprotein_a | Blood vessels | MedlinePlus, Lipoprotein (a) Blood Test: https://medlineplus.gov/lab-tests/lipoprotein-a-blood-test/ |
| reticulocyte_count | Blood vessels | MedlinePlus, Reticulocyte Count: https://medlineplus.gov/lab-tests/reticulocyte-count/ |
| erythrocyte_sedimentation_rate | Blood vessels | MedlinePlus, ESR: https://medlineplus.gov/lab-tests/erythrocyte-sedimentation-rate-esr/ |
| c_reactive_protein, hs_c_reactive_protein | Blood vessels | MedlinePlus, C-Reactive Protein (CRP) Test (covers hs-CRP): https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/ |
| rheumatoid_factor | Blood vessels | MedlinePlus, Rheumatoid Factor (RF) Test: https://medlineplus.gov/lab-tests/rheumatoid-factor-rf-test/ |
| immunoglobulin_g, immunoglobulin_a, immunoglobulin_m | Blood vessels | MedlinePlus, Immunoglobulins Blood Test: https://medlineplus.gov/lab-tests/immunoglobulins-blood-test/ |
| ferritin | Blood vessels | MedlinePlus, Ferritin Blood Test: https://medlineplus.gov/lab-tests/ferritin-blood-test/ |
| serum_iron, total_iron_binding_capacity, transferrin_saturation | Blood vessels | MedlinePlus, Iron Tests: https://medlineplus.gov/lab-tests/iron-tests/ |
| vitamin_b12, folate | Blood vessels | MedlinePlus, Vitamin B Test (covers B12 and folate): https://medlineplus.gov/lab-tests/vitamin-b-test/ |
| vitamin_d_25_hydroxy | Blood vessels | MedlinePlus, Vitamin D Test: https://medlineplus.gov/lab-tests/vitamin-d-test/ |
| prothrombin_time, international_normalized_ratio | Blood vessels | MedlinePlus, PT/INR: https://medlineplus.gov/lab-tests/prothrombin-time-test-and-inr-ptinr/ |
| activated_partial_thromboplastin_time | Blood vessels | MedlinePlus, PTT Test: https://medlineplus.gov/lab-tests/partial-thromboplastin-time-ptt-test/ |
| fibrinogen | Blood vessels | MedlinePlus, Fibrinogen blood test (encyclopedia): https://medlineplus.gov/ency/article/003650.htm |
| d_dimer | Blood vessels | MedlinePlus, D-Dimer Test: https://medlineplus.gov/lab-tests/d-dimer-test/ |
| zinc, copper, selenium | Blood vessels | MedlinePlus (encyclopedia): Zinc in diet https://medlineplus.gov/ency/article/002416.htm, Copper in diet https://medlineplus.gov/ency/article/002419.htm, Selenium in diet https://medlineplus.gov/ency/article/002414.htm |

Choices made to avoid overstating (Section 107): CRP (made by the liver), ferritin (stored mostly in the liver) and clotting factors (made by the liver) are shown on the blood vessels, not the liver, because a result is not specific to the liver. A bare "pH" line is not recognized, because it may be urine or blood.

Wording choices: the sources' lists include disease names; the app's lists are reworded as general possibilities and always include the ordinary non-disease causes the source names (dehydration, exercise, diet, medicines), as required by AGENTS.md Section 108. No severity, prognosis or treatment is stated.

## Explanations added 2026-09-30 (batch 2)

Drafted from the listed MedlinePlus page only, not yet reviewed by a medical professional. Skipped for lack of a clear MedlinePlus source (terminology mapping only): ast_alt_ratio, estimated_average_glucose, cystatin_c, neutrophil_lymphocyte_ratio, platelet_distribution_width, cholesterol_hdl_ratio, ldl_hdl_ratio, atherogenic_index_of_plasma, apolipoprotein_b, fibrinogen, zinc, copper, selenium, osmolality_unspecified, respiratory_rate. The MedlinePlus "Vital signs" encyclopedia page (A.D.A.M. content, no derivative use) was deliberately not used.

| Normalized term | Content | Source | Reviewed by | Date |
|---|---|---|---|---|
| activated_partial_thromboplastin_time | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Partial Thromboplastin Time (PTT) Test: https://medlineplus.gov/lab-tests/partial-thromboplastin-time-ptt-test/ | pending | 2026-09-30 |
| amylase | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Amylase Test: https://medlineplus.gov/lab-tests/amylase-test/ | pending | 2026-09-30 |
| arterial_pco2 | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Arterial Blood Gas (ABG) Test: https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/ | pending | 2026-09-30 |
| arterial_ph | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Arterial Blood Gas (ABG) Test: https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/ | pending | 2026-09-30 |
| arterial_po2 | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Arterial Blood Gas (ABG) Test: https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/ | pending | 2026-09-30 |
| basophils | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Differential: https://medlineplus.gov/lab-tests/blood-differential/ | pending | 2026-09-30 |
| bicarbonate | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Carbon Dioxide (CO2) in Blood: https://medlineplus.gov/lab-tests/carbon-dioxide-co2-in-blood/ | pending | 2026-09-30 |
| bnp | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Natriuretic Peptide Tests (BNP, NT-proBNP): https://medlineplus.gov/lab-tests/natriuretic-peptide-tests-bnp-nt-probnp/ | pending | 2026-09-30 |
| c_peptide | Explanation: what it measures, context, above/below-range associations | MedlinePlus: C-Peptide Test: https://medlineplus.gov/lab-tests/c-peptide-test/ | pending | 2026-09-30 |
| c_reactive_protein | Explanation: what it measures, context, above/below-range associations | MedlinePlus: C-Reactive Protein (CRP) Test: https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/ | pending | 2026-09-30 |
| calcium | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Calcium Blood Test: https://medlineplus.gov/lab-tests/calcium-blood-test/ | pending | 2026-09-30 |
| chloride | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Chloride Blood Test: https://medlineplus.gov/lab-tests/chloride-blood-test/ | pending | 2026-09-30 |
| cholesterol_total | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Cholesterol Levels: https://medlineplus.gov/lab-tests/cholesterol-levels/ | pending | 2026-09-30 |
| cortisol | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Cortisol Test: https://medlineplus.gov/lab-tests/cortisol-test/ | pending | 2026-09-30 |
| creatine_kinase | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Creatine Kinase: https://medlineplus.gov/lab-tests/creatine-kinase/ | pending | 2026-09-30 |
| creatine_kinase_mb | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Creatine Kinase: https://medlineplus.gov/lab-tests/creatine-kinase/ | pending | 2026-09-30 |
| d_dimer | Explanation: what it measures, context, above/below-range associations | MedlinePlus: D-Dimer Test: https://medlineplus.gov/lab-tests/d-dimer-test/ | pending | 2026-09-30 |
| diastolic_blood_pressure | Explanation: what it measures, context, above/below-range associations | MedlinePlus: High Blood Pressure: https://medlineplus.gov/highbloodpressure.html; MedlinePlus: Low Blood Pressure: https://medlineplus.gov/lowbloodpressure.html | pending | 2026-09-30 |
| eosinophils | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Differential: https://medlineplus.gov/lab-tests/blood-differential/ | pending | 2026-09-30 |
| erythrocyte_sedimentation_rate | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Erythrocyte Sedimentation Rate (ESR): https://medlineplus.gov/lab-tests/erythrocyte-sedimentation-rate-esr/ | pending | 2026-09-30 |
| ferritin | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Ferritin Blood Test: https://medlineplus.gov/lab-tests/ferritin-blood-test/ | pending | 2026-09-30 |
| folate | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Vitamin B Test: https://medlineplus.gov/lab-tests/vitamin-b-test/ | pending | 2026-09-30 |
| follicle_stimulating_hormone | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Follicle-Stimulating Hormone (FSH) Levels Test: https://medlineplus.gov/lab-tests/follicle-stimulating-hormone-fsh-levels-test/ | pending | 2026-09-30 |
| glucose_fasting | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Glucose Test: https://medlineplus.gov/lab-tests/blood-glucose-test/ | pending | 2026-09-30 |
| glucose_post_prandial | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Glucose Test: https://medlineplus.gov/lab-tests/blood-glucose-test/ | pending | 2026-09-30 |
| glucose_random | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Glucose Test: https://medlineplus.gov/lab-tests/blood-glucose-test/ | pending | 2026-09-30 |
| hdl_cholesterol | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Cholesterol Levels: https://medlineplus.gov/lab-tests/cholesterol-levels/ | pending | 2026-09-30 |
| hematocrit | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Hematocrit Test: https://medlineplus.gov/lab-tests/hematocrit-test/ | pending | 2026-09-30 |
| hemoglobin | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Hemoglobin Test: https://medlineplus.gov/lab-tests/hemoglobin-test/ | pending | 2026-09-30 |
| hemoglobin_a1c | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Hemoglobin A1C (HbA1c) Test: https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/ | pending | 2026-09-30 |
| hs_c_reactive_protein | Explanation: what it measures, context, above/below-range associations | MedlinePlus: C-Reactive Protein (CRP) Test: https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/ | pending | 2026-09-30 |
| immunoglobulin_a | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Immunoglobulins Blood Test: https://medlineplus.gov/lab-tests/immunoglobulins-blood-test/ | pending | 2026-09-30 |
| immunoglobulin_g | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Immunoglobulins Blood Test: https://medlineplus.gov/lab-tests/immunoglobulins-blood-test/ | pending | 2026-09-30 |
| immunoglobulin_m | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Immunoglobulins Blood Test: https://medlineplus.gov/lab-tests/immunoglobulins-blood-test/ | pending | 2026-09-30 |
| insulin | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Insulin in Blood: https://medlineplus.gov/lab-tests/insulin-in-blood/ | pending | 2026-09-30 |
| international_normalized_ratio | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Prothrombin Time Test and INR (PT/INR): https://medlineplus.gov/lab-tests/prothrombin-time-test-and-inr-ptinr/ | pending | 2026-09-30 |
| ldl_cholesterol | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Cholesterol Levels: https://medlineplus.gov/lab-tests/cholesterol-levels/ | pending | 2026-09-30 |
| lipoprotein_a | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Lipoprotein (a) Blood Test: https://medlineplus.gov/lab-tests/lipoprotein-a-blood-test/ | pending | 2026-09-30 |
| luteinizing_hormone | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Luteinizing Hormone (LH) Levels Test: https://medlineplus.gov/lab-tests/luteinizing-hormone-lh-levels-test/ | pending | 2026-09-30 |
| lymphocytes | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Differential: https://medlineplus.gov/lab-tests/blood-differential/ | pending | 2026-09-30 |
| magnesium | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Magnesium Blood Test: https://medlineplus.gov/lab-tests/magnesium-blood-test/ | pending | 2026-09-30 |
| mean_corpuscular_hemoglobin | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Red Blood Cell (RBC) Indices: https://medlineplus.gov/lab-tests/red-blood-cell-rbc-indices/ | pending | 2026-09-30 |
| mean_corpuscular_hemoglobin_concentration | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Red Blood Cell (RBC) Indices: https://medlineplus.gov/lab-tests/red-blood-cell-rbc-indices/ | pending | 2026-09-30 |
| mean_corpuscular_volume | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Red Blood Cell (RBC) Indices: https://medlineplus.gov/lab-tests/red-blood-cell-rbc-indices/ | pending | 2026-09-30 |
| mean_platelet_volume | Explanation: what it measures, context, above/below-range associations | MedlinePlus: MPV Blood Test: https://medlineplus.gov/lab-tests/mpv-blood-test/ | pending | 2026-09-30 |
| monocytes | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Differential: https://medlineplus.gov/lab-tests/blood-differential/ | pending | 2026-09-30 |
| neutrophils | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Blood Differential: https://medlineplus.gov/lab-tests/blood-differential/ | pending | 2026-09-30 |
| non_hdl_cholesterol | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Cholesterol Levels: https://medlineplus.gov/lab-tests/cholesterol-levels/ | pending | 2026-09-30 |
| nt_probnp | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Natriuretic Peptide Tests (BNP, NT-proBNP): https://medlineplus.gov/lab-tests/natriuretic-peptide-tests-bnp-nt-probnp/ | pending | 2026-09-30 |
| osmolality_serum | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Osmolality Tests: https://medlineplus.gov/lab-tests/osmolality-tests/ | pending | 2026-09-30 |
| osmolality_urine | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Osmolality Tests: https://medlineplus.gov/lab-tests/osmolality-tests/ | pending | 2026-09-30 |
| oxygen_saturation | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Arterial Blood Gas (ABG) Test: https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/ | pending | 2026-09-30 |
| parathyroid_hormone | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Parathyroid Hormone (PTH) Test: https://medlineplus.gov/lab-tests/parathyroid-hormone-pth-test/ | pending | 2026-09-30 |
| peak_expiratory_flow | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Lung Function Tests: https://medlineplus.gov/lab-tests/lung-function-tests/ | pending | 2026-09-30 |
| phosphorus | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Phosphate in Blood: https://medlineplus.gov/lab-tests/phosphate-in-blood/ | pending | 2026-09-30 |
| platelet_count | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Platelet Tests: https://medlineplus.gov/lab-tests/platelet-tests/ | pending | 2026-09-30 |
| potassium | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Potassium Blood Test: https://medlineplus.gov/lab-tests/potassium-blood-test/ | pending | 2026-09-30 |
| prolactin | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Prolactin Levels: https://medlineplus.gov/lab-tests/prolactin-levels/ | pending | 2026-09-30 |
| prothrombin_time | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Prothrombin Time Test and INR (PT/INR): https://medlineplus.gov/lab-tests/prothrombin-time-test-and-inr-ptinr/ | pending | 2026-09-30 |
| pulse_rate | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Arrhythmia: https://medlineplus.gov/arrhythmia.html | pending | 2026-09-30 |
| red_blood_cell_count | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Red Blood Cell (RBC) Count: https://medlineplus.gov/lab-tests/red-blood-cell-rbc-count/ | pending | 2026-09-30 |
| red_cell_distribution_width_cv | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Red Blood Cell (RBC) Indices: https://medlineplus.gov/lab-tests/red-blood-cell-rbc-indices/ | pending | 2026-09-30 |
| red_cell_distribution_width_sd | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Red Blood Cell (RBC) Indices: https://medlineplus.gov/lab-tests/red-blood-cell-rbc-indices/ | pending | 2026-09-30 |
| reticulocyte_count | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Reticulocyte Count: https://medlineplus.gov/lab-tests/reticulocyte-count/ | pending | 2026-09-30 |
| rheumatoid_factor | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Rheumatoid Factor (RF) Test: https://medlineplus.gov/lab-tests/rheumatoid-factor-rf-test/ | pending | 2026-09-30 |
| serum_iron | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Iron Tests: https://medlineplus.gov/lab-tests/iron-tests/ | pending | 2026-09-30 |
| sex_hormone_binding_globulin | Explanation: what it measures, context, above/below-range associations | MedlinePlus: SHBG Blood Test: https://medlineplus.gov/lab-tests/shbg-blood-test/ | pending | 2026-09-30 |
| sodium | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Sodium Blood Test: https://medlineplus.gov/lab-tests/sodium-blood-test/ | pending | 2026-09-30 |
| systolic_blood_pressure | Explanation: what it measures, context, above/below-range associations | MedlinePlus: High Blood Pressure: https://medlineplus.gov/highbloodpressure.html; MedlinePlus: Low Blood Pressure: https://medlineplus.gov/lowbloodpressure.html | pending | 2026-09-30 |
| testosterone_total | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Testosterone Levels Test: https://medlineplus.gov/lab-tests/testosterone-levels-test/ | pending | 2026-09-30 |
| thyroid_stimulating_hormone | Explanation: what it measures, context, above/below-range associations | MedlinePlus: TSH (Thyroid-stimulating hormone) Test: https://medlineplus.gov/lab-tests/tsh-thyroid-stimulating-hormone-test/ | pending | 2026-09-30 |
| thyroxine_free | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Thyroxine (T4) Test: https://medlineplus.gov/lab-tests/thyroxine-t4-test/ | pending | 2026-09-30 |
| thyroxine_total | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Thyroxine (T4) Test: https://medlineplus.gov/lab-tests/thyroxine-t4-test/ | pending | 2026-09-30 |
| total_iron_binding_capacity | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Iron Tests: https://medlineplus.gov/lab-tests/iron-tests/ | pending | 2026-09-30 |
| transferrin_saturation | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Iron Tests: https://medlineplus.gov/lab-tests/iron-tests/ | pending | 2026-09-30 |
| triglycerides | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Triglycerides Test: https://medlineplus.gov/lab-tests/triglycerides-test/ | pending | 2026-09-30 |
| triiodothyronine_free | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Triiodothyronine (T3) Tests: https://medlineplus.gov/lab-tests/triiodothyronine-t3-tests/ | pending | 2026-09-30 |
| triiodothyronine_total | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Triiodothyronine (T3) Tests: https://medlineplus.gov/lab-tests/triiodothyronine-t3-tests/ | pending | 2026-09-30 |
| urine_albumin_creatinine_ratio | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Microalbumin Creatinine Ratio: https://medlineplus.gov/lab-tests/microalbumin-creatinine-ratio/ | pending | 2026-09-30 |
| urine_ph | Explanation: what it measures, context, above/below-range associations | MedlinePlus Medical Encyclopedia: Urine pH test: https://medlineplus.gov/ency/article/003583.htm | pending | 2026-09-30 |
| urine_specific_gravity | Explanation: what it measures, context, above/below-range associations | MedlinePlus Medical Encyclopedia: Urine specific gravity test: https://medlineplus.gov/ency/article/003587.htm | pending | 2026-09-30 |
| vitamin_b12 | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Vitamin B Test: https://medlineplus.gov/lab-tests/vitamin-b-test/ | pending | 2026-09-30 |
| vitamin_d_25_hydroxy | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Vitamin D Test: https://medlineplus.gov/lab-tests/vitamin-d-test/ | pending | 2026-09-30 |
| vldl_cholesterol | Explanation: what it measures, context, above/below-range associations | MedlinePlus: Cholesterol Levels: https://medlineplus.gov/lab-tests/cholesterol-levels/ | pending | 2026-09-30 |
| white_blood_cell_count | Explanation: what it measures, context, above/below-range associations | MedlinePlus: White Blood Count (WBC): https://medlineplus.gov/lab-tests/white-blood-count-wbc/ | pending | 2026-09-30 |
