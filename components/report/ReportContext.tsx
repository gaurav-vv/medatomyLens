"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAnatomy } from "@/components/anatomy/AnatomyContext";
import { meshesForStructure, structureExists } from "@/lib/medical/anatomyLink";
import { resolveReport } from "@/lib/medical/report";
import type { RawReport, ResolvedFinding, ResolvedReport } from "@/lib/medical/types";

interface ReportContextValue {
  report: ResolvedReport | null;
  selectedFinding: ResolvedFinding | null;
  /** Meshes of every mapped finding: drawn in the "Reported" look. */
  reportedMeshes: Set<string>;
  /** Show a report read from the user's PDF (after the review screen). Memory only. */
  loadReport: (report: RawReport) => void;
  closeReport: () => void;
  selectFinding: (id: string | null) => void;
  meshesOf: (finding: ResolvedFinding) => string[];
}

const ReportContext = createContext<ReportContextValue | null>(null);

/**
 * Report state (AGENTS.md Section 50), kept apart from the anatomy state.
 * Everything stays in memory on this device: nothing is sent or stored.
 */
export function ReportProvider({ children }: { children: ReactNode }) {
  const { state } = useAnatomy();
  const index = state.index;
  const [raw, setRaw] = useState<RawReport | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const report = useMemo(
    () => (raw && index ? resolveReport(raw, (id) => structureExists(index, id)) : null),
    [raw, index],
  );

  const meshesOf = useCallback(
    (f: ResolvedFinding) => (index ? f.structures.flatMap((s) => meshesForStructure(index, s)) : []),
    [index],
  );

  // Always-on "Reported" look: organs and structures only. Whole layers (blood
  // vessels, bones) are shown only while their finding is open, so the body
  // does not look entirely "reported".
  const reportedMeshes = useMemo(
    () =>
      new Set(
        report && index
          ? report.findings.flatMap((f) => f.structures.filter((s) => !s.startsWith("layer:")).flatMap((s) => meshesForStructure(index, s)))
          : [],
      ),
    [report, index],
  );

  const value = useMemo<ReportContextValue>(
    () => ({
      report,
      selectedFinding: report?.findings.find((f) => f.raw.id === selectedId) ?? null,
      reportedMeshes,
      loadReport: (r: RawReport) => {
        setSelectedId(null);
        setRaw(r);
      },
      closeReport: () => {
        setRaw(null);
        setSelectedId(null);
      },
      selectFinding: setSelectedId,
      meshesOf,
    }),
    [report, selectedId, reportedMeshes, meshesOf],
  );
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used inside ReportProvider");
  return ctx;
}
