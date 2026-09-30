/**
 * Curated explanations (AGENTS.md Section 108), keyed by normalized term.
 * Relative imports on purpose: the chat Worker (worker/) bundles this file
 * too, so the app and the Worker always use the same curated text.
 */
import creatinine from "../../data/medical/explanations/creatinine.json";
import egfr from "../../data/medical/explanations/estimated_glomerular_filtration_rate.json";
import alt from "../../data/medical/explanations/alanine_aminotransferase.json";
import bun from "../../data/medical/explanations/blood_urea_nitrogen.json";
import urea from "../../data/medical/explanations/urea.json";
import uricAcid from "../../data/medical/explanations/uric_acid.json";
import ast from "../../data/medical/explanations/aspartate_aminotransferase.json";
import ggt from "../../data/medical/explanations/gamma_glutamyl_transferase.json";
import bilirubinTotal from "../../data/medical/explanations/bilirubin_total.json";
import bilirubinDirect from "../../data/medical/explanations/bilirubin_direct.json";
import bilirubinIndirect from "../../data/medical/explanations/bilirubin_indirect.json";
import albumin from "../../data/medical/explanations/albumin.json";
import alp from "../../data/medical/explanations/alkaline_phosphatase.json";
import lipase from "../../data/medical/explanations/lipase.json";
import troponinI from "../../data/medical/explanations/cardiac_troponin_i.json";
import troponinT from "../../data/medical/explanations/cardiac_troponin_t.json";
import totalProtein from "../../data/medical/explanations/total_protein.json";
import globulin from "../../data/medical/explanations/globulin.json";
import agRatio from "../../data/medical/explanations/albumin_globulin_ratio.json";
import type { Explanation } from "./types";

const EXPLANATIONS: Record<string, Explanation> = Object.fromEntries(
  (
    [
      creatinine, egfr, alt, bun, urea, uricAcid, ast, ggt, bilirubinTotal, bilirubinDirect, bilirubinIndirect,
      albumin, alp, lipase, troponinI, troponinT, totalProtein, globulin, agRatio,
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
