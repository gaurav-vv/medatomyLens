import { withBase } from "@/lib/basePath";
import type { QualityTier } from "./types";

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

/**
 * Choose the model detail tier once at startup (AGENTS.md Sections 25, 84).
 * Phones and low-memory devices get the decimated meshes.
 */
export function detectQualityTier(
  nav: NavigatorHints = typeof navigator === "undefined" ? {} : (navigator as NavigatorHints),
  coarsePointer = typeof matchMedia === "undefined" ? false : matchMedia("(pointer: coarse)").matches,
): QualityTier {
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  if (coarsePointer || cores <= 4 || memory <= 4) return "low";
  return "high";
}

export function layerUrl(layer: string, tier: QualityTier) {
  return withBase(`/anatomy/body/${layer}.${tier}.glb`);
}
