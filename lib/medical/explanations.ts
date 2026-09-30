/**
 * Curated explanations (AGENTS.md Section 108), keyed by normalized term.
 * Relative imports on purpose: the chat Worker (worker/) bundles this file
 * too, so the app and the Worker always use the same curated text.
 */
// Imports are listed explicitly (one per file) so the Worker bundler includes them.
import x_activated_partial_thromboplastin_time from "../../data/medical/explanations/activated_partial_thromboplastin_time.json";
import x_alanine_aminotransferase from "../../data/medical/explanations/alanine_aminotransferase.json";
import x_albumin from "../../data/medical/explanations/albumin.json";
import x_albumin_globulin_ratio from "../../data/medical/explanations/albumin_globulin_ratio.json";
import x_alkaline_phosphatase from "../../data/medical/explanations/alkaline_phosphatase.json";
import x_amylase from "../../data/medical/explanations/amylase.json";
import x_arterial_pco2 from "../../data/medical/explanations/arterial_pco2.json";
import x_arterial_ph from "../../data/medical/explanations/arterial_ph.json";
import x_arterial_po2 from "../../data/medical/explanations/arterial_po2.json";
import x_aspartate_aminotransferase from "../../data/medical/explanations/aspartate_aminotransferase.json";
import x_basophils from "../../data/medical/explanations/basophils.json";
import x_bicarbonate from "../../data/medical/explanations/bicarbonate.json";
import x_bilirubin_direct from "../../data/medical/explanations/bilirubin_direct.json";
import x_bilirubin_indirect from "../../data/medical/explanations/bilirubin_indirect.json";
import x_bilirubin_total from "../../data/medical/explanations/bilirubin_total.json";
import x_blood_urea_nitrogen from "../../data/medical/explanations/blood_urea_nitrogen.json";
import x_bnp from "../../data/medical/explanations/bnp.json";
import x_c_peptide from "../../data/medical/explanations/c_peptide.json";
import x_c_reactive_protein from "../../data/medical/explanations/c_reactive_protein.json";
import x_calcium from "../../data/medical/explanations/calcium.json";
import x_cardiac_troponin_i from "../../data/medical/explanations/cardiac_troponin_i.json";
import x_cardiac_troponin_t from "../../data/medical/explanations/cardiac_troponin_t.json";
import x_chloride from "../../data/medical/explanations/chloride.json";
import x_cholesterol_total from "../../data/medical/explanations/cholesterol_total.json";
import x_cortisol from "../../data/medical/explanations/cortisol.json";
import x_creatine_kinase from "../../data/medical/explanations/creatine_kinase.json";
import x_creatine_kinase_mb from "../../data/medical/explanations/creatine_kinase_mb.json";
import x_creatinine from "../../data/medical/explanations/creatinine.json";
import x_d_dimer from "../../data/medical/explanations/d_dimer.json";
import x_diastolic_blood_pressure from "../../data/medical/explanations/diastolic_blood_pressure.json";
import x_eosinophils from "../../data/medical/explanations/eosinophils.json";
import x_erythrocyte_sedimentation_rate from "../../data/medical/explanations/erythrocyte_sedimentation_rate.json";
import x_estimated_glomerular_filtration_rate from "../../data/medical/explanations/estimated_glomerular_filtration_rate.json";
import x_ferritin from "../../data/medical/explanations/ferritin.json";
import x_folate from "../../data/medical/explanations/folate.json";
import x_follicle_stimulating_hormone from "../../data/medical/explanations/follicle_stimulating_hormone.json";
import x_gamma_glutamyl_transferase from "../../data/medical/explanations/gamma_glutamyl_transferase.json";
import x_globulin from "../../data/medical/explanations/globulin.json";
import x_glucose_fasting from "../../data/medical/explanations/glucose_fasting.json";
import x_glucose_post_prandial from "../../data/medical/explanations/glucose_post_prandial.json";
import x_glucose_random from "../../data/medical/explanations/glucose_random.json";
import x_hdl_cholesterol from "../../data/medical/explanations/hdl_cholesterol.json";
import x_hematocrit from "../../data/medical/explanations/hematocrit.json";
import x_hemoglobin from "../../data/medical/explanations/hemoglobin.json";
import x_hemoglobin_a1c from "../../data/medical/explanations/hemoglobin_a1c.json";
import x_hs_c_reactive_protein from "../../data/medical/explanations/hs_c_reactive_protein.json";
import x_immunoglobulin_a from "../../data/medical/explanations/immunoglobulin_a.json";
import x_immunoglobulin_g from "../../data/medical/explanations/immunoglobulin_g.json";
import x_immunoglobulin_m from "../../data/medical/explanations/immunoglobulin_m.json";
import x_insulin from "../../data/medical/explanations/insulin.json";
import x_international_normalized_ratio from "../../data/medical/explanations/international_normalized_ratio.json";
import x_ldl_cholesterol from "../../data/medical/explanations/ldl_cholesterol.json";
import x_lipase from "../../data/medical/explanations/lipase.json";
import x_lipoprotein_a from "../../data/medical/explanations/lipoprotein_a.json";
import x_luteinizing_hormone from "../../data/medical/explanations/luteinizing_hormone.json";
import x_lymphocytes from "../../data/medical/explanations/lymphocytes.json";
import x_magnesium from "../../data/medical/explanations/magnesium.json";
import x_mean_corpuscular_hemoglobin from "../../data/medical/explanations/mean_corpuscular_hemoglobin.json";
import x_mean_corpuscular_hemoglobin_concentration from "../../data/medical/explanations/mean_corpuscular_hemoglobin_concentration.json";
import x_mean_corpuscular_volume from "../../data/medical/explanations/mean_corpuscular_volume.json";
import x_mean_platelet_volume from "../../data/medical/explanations/mean_platelet_volume.json";
import x_monocytes from "../../data/medical/explanations/monocytes.json";
import x_neutrophils from "../../data/medical/explanations/neutrophils.json";
import x_non_hdl_cholesterol from "../../data/medical/explanations/non_hdl_cholesterol.json";
import x_nt_probnp from "../../data/medical/explanations/nt_probnp.json";
import x_osmolality_serum from "../../data/medical/explanations/osmolality_serum.json";
import x_osmolality_urine from "../../data/medical/explanations/osmolality_urine.json";
import x_oxygen_saturation from "../../data/medical/explanations/oxygen_saturation.json";
import x_parathyroid_hormone from "../../data/medical/explanations/parathyroid_hormone.json";
import x_peak_expiratory_flow from "../../data/medical/explanations/peak_expiratory_flow.json";
import x_phosphorus from "../../data/medical/explanations/phosphorus.json";
import x_platelet_count from "../../data/medical/explanations/platelet_count.json";
import x_potassium from "../../data/medical/explanations/potassium.json";
import x_prolactin from "../../data/medical/explanations/prolactin.json";
import x_prothrombin_time from "../../data/medical/explanations/prothrombin_time.json";
import x_pulse_rate from "../../data/medical/explanations/pulse_rate.json";
import x_red_blood_cell_count from "../../data/medical/explanations/red_blood_cell_count.json";
import x_red_cell_distribution_width_cv from "../../data/medical/explanations/red_cell_distribution_width_cv.json";
import x_red_cell_distribution_width_sd from "../../data/medical/explanations/red_cell_distribution_width_sd.json";
import x_reticulocyte_count from "../../data/medical/explanations/reticulocyte_count.json";
import x_rheumatoid_factor from "../../data/medical/explanations/rheumatoid_factor.json";
import x_serum_iron from "../../data/medical/explanations/serum_iron.json";
import x_sex_hormone_binding_globulin from "../../data/medical/explanations/sex_hormone_binding_globulin.json";
import x_sodium from "../../data/medical/explanations/sodium.json";
import x_systolic_blood_pressure from "../../data/medical/explanations/systolic_blood_pressure.json";
import x_testosterone_total from "../../data/medical/explanations/testosterone_total.json";
import x_thyroid_stimulating_hormone from "../../data/medical/explanations/thyroid_stimulating_hormone.json";
import x_thyroxine_free from "../../data/medical/explanations/thyroxine_free.json";
import x_thyroxine_total from "../../data/medical/explanations/thyroxine_total.json";
import x_total_iron_binding_capacity from "../../data/medical/explanations/total_iron_binding_capacity.json";
import x_total_protein from "../../data/medical/explanations/total_protein.json";
import x_transferrin_saturation from "../../data/medical/explanations/transferrin_saturation.json";
import x_triglycerides from "../../data/medical/explanations/triglycerides.json";
import x_triiodothyronine_free from "../../data/medical/explanations/triiodothyronine_free.json";
import x_triiodothyronine_total from "../../data/medical/explanations/triiodothyronine_total.json";
import x_urea from "../../data/medical/explanations/urea.json";
import x_uric_acid from "../../data/medical/explanations/uric_acid.json";
import x_urine_albumin_creatinine_ratio from "../../data/medical/explanations/urine_albumin_creatinine_ratio.json";
import x_urine_ph from "../../data/medical/explanations/urine_ph.json";
import x_urine_specific_gravity from "../../data/medical/explanations/urine_specific_gravity.json";
import x_vitamin_b12 from "../../data/medical/explanations/vitamin_b12.json";
import x_vitamin_d_25_hydroxy from "../../data/medical/explanations/vitamin_d_25_hydroxy.json";
import x_vldl_cholesterol from "../../data/medical/explanations/vldl_cholesterol.json";
import x_white_blood_cell_count from "../../data/medical/explanations/white_blood_cell_count.json";
import type { Explanation } from "./types";

const EXPLANATIONS: Record<string, Explanation> = Object.fromEntries(
  (
    [
      x_activated_partial_thromboplastin_time,
      x_alanine_aminotransferase,
      x_albumin,
      x_albumin_globulin_ratio,
      x_alkaline_phosphatase,
      x_amylase,
      x_arterial_pco2,
      x_arterial_ph,
      x_arterial_po2,
      x_aspartate_aminotransferase,
      x_basophils,
      x_bicarbonate,
      x_bilirubin_direct,
      x_bilirubin_indirect,
      x_bilirubin_total,
      x_blood_urea_nitrogen,
      x_bnp,
      x_c_peptide,
      x_c_reactive_protein,
      x_calcium,
      x_cardiac_troponin_i,
      x_cardiac_troponin_t,
      x_chloride,
      x_cholesterol_total,
      x_cortisol,
      x_creatine_kinase,
      x_creatine_kinase_mb,
      x_creatinine,
      x_d_dimer,
      x_diastolic_blood_pressure,
      x_eosinophils,
      x_erythrocyte_sedimentation_rate,
      x_estimated_glomerular_filtration_rate,
      x_ferritin,
      x_folate,
      x_follicle_stimulating_hormone,
      x_gamma_glutamyl_transferase,
      x_globulin,
      x_glucose_fasting,
      x_glucose_post_prandial,
      x_glucose_random,
      x_hdl_cholesterol,
      x_hematocrit,
      x_hemoglobin,
      x_hemoglobin_a1c,
      x_hs_c_reactive_protein,
      x_immunoglobulin_a,
      x_immunoglobulin_g,
      x_immunoglobulin_m,
      x_insulin,
      x_international_normalized_ratio,
      x_ldl_cholesterol,
      x_lipase,
      x_lipoprotein_a,
      x_luteinizing_hormone,
      x_lymphocytes,
      x_magnesium,
      x_mean_corpuscular_hemoglobin,
      x_mean_corpuscular_hemoglobin_concentration,
      x_mean_corpuscular_volume,
      x_mean_platelet_volume,
      x_monocytes,
      x_neutrophils,
      x_non_hdl_cholesterol,
      x_nt_probnp,
      x_osmolality_serum,
      x_osmolality_urine,
      x_oxygen_saturation,
      x_parathyroid_hormone,
      x_peak_expiratory_flow,
      x_phosphorus,
      x_platelet_count,
      x_potassium,
      x_prolactin,
      x_prothrombin_time,
      x_pulse_rate,
      x_red_blood_cell_count,
      x_red_cell_distribution_width_cv,
      x_red_cell_distribution_width_sd,
      x_reticulocyte_count,
      x_rheumatoid_factor,
      x_serum_iron,
      x_sex_hormone_binding_globulin,
      x_sodium,
      x_systolic_blood_pressure,
      x_testosterone_total,
      x_thyroid_stimulating_hormone,
      x_thyroxine_free,
      x_thyroxine_total,
      x_total_iron_binding_capacity,
      x_total_protein,
      x_transferrin_saturation,
      x_triglycerides,
      x_triiodothyronine_free,
      x_triiodothyronine_total,
      x_urea,
      x_uric_acid,
      x_urine_albumin_creatinine_ratio,
      x_urine_ph,
      x_urine_specific_gravity,
      x_vitamin_b12,
      x_vitamin_d_25_hydroxy,
      x_vldl_cholesterol,
      x_white_blood_cell_count,
    ] as Explanation[]
  ).map((e) => [e.normalizedTerm, e]),
);

export function explanationFor(normalizedTerm: string | undefined | null): Explanation | null {
  return normalizedTerm ? (EXPLANATIONS[normalizedTerm] ?? null) : null;
}

/** Every test with a curated explanation, by title (chat: general questions). */
export const EXPLAINED_TESTS: { term: string; title: string }[] = Object.values(EXPLANATIONS)
  .map((e) => ({ term: e.normalizedTerm, title: e.title }))
  .sort((a, b) => a.title.localeCompare(b.title));
