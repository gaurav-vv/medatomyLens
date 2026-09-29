"use client";

import { useSyncExternalStore } from "react";
import { useAnatomy, type OrganViewMode } from "@/components/anatomy/AnatomyContext";
import { detailOrganFor } from "@/lib/anatomy/detailOrgans";
import { structureIdsOfSelection } from "@/lib/medical/anatomyLink";
import { findingsForStructures } from "@/lib/medical/report";
import type { LocationDisplay, ResolvedFinding } from "@/lib/medical/types";
import { useReport } from "./ReportContext";

const WIDE_QUERY = "(min-width: 768px)";

function subscribeWide(cb: () => void) {
  const m = window.matchMedia(WIDE_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Desktop/tablet layout (side-by-side allowed, side panels instead of sheets). */
export function useIsWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

export interface OrganReportView {
  findings: ResolvedFinding[];
  /** Finding whose location the organ view shows. */
  active: ResolvedFinding | null;
  /** Mode actually shown (Normal when there are no findings; no split on phones). */
  mode: OrganViewMode;
  location: LocationDisplay | null;
  /** Reported look on the whole organ (no region to mark). */
  wholeOrgan: boolean;
}

/**
 * What the organ view shows for the report (AGENTS.md Sections 104, 107, 109).
 * Pure derivation from anatomy + report state, shared by panels and 3D.
 */
export function useOrganReport(): OrganReportView {
  const { state, selection } = useAnatomy();
  const { report, selectedFinding } = useReport();
  const wide = useIsWide();
  const organ = detailOrganFor(state.detailOrgans, state.index, selection);
  const ids = state.index ? structureIdsOfSelection(state.index, selection, organ) : [];
  const findings = report ? findingsForStructures(report.findings, ids) : [];
  const active = findings.find((f) => f === selectedFinding) ?? findings[0] ?? null;

  let mode: OrganViewMode = findings.length === 0 ? "normal" : state.viewMode;
  if (mode === "side_by_side" && !wide) mode = "reported";

  let location: LocationDisplay | null = active?.location ?? null;
  // A mesh region needs those parts in the model actually shown (Section 105).
  if (location?.kind === "region" && location.region.supportedBy === "mesh") {
    const partIds = new Set(organ?.parts.map((p) => p.id) ?? []);
    if (!location.region.parts.some((p) => partIds.has(p))) location = { kind: "region_unavailable", regionId: location.regionId };
  }
  return { findings, active, mode, location, wholeOrgan: !!active && location?.kind !== "region" };
}
