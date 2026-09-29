import { rangeStatus, rangeText } from "@/lib/medical/report";
import type { RawFinding } from "@/lib/medical/types";

/**
 * Where a value sits against the report's own range (AGENTS.md Section 110).
 * Neutral colours only: position is information, not severity (Section 93).
 * Only bounds printed in the report are drawn; nothing is substituted.
 */
export function ReferenceRangeBar({ finding }: { finding: RawFinding }) {
  const value = finding.value;
  const range = finding.referenceRange;
  const status = rangeStatus(value, range);
  if (value == null || status === "UNKNOWN" || !range) {
    return <p className="text-xs text-muted">Reference range unavailable.</p>;
  }
  const lo = range.low ?? 0;
  const hi = range.high ?? (range.low ?? 0) * 2;
  const min = Math.min(lo, value);
  const max = Math.max(hi, value);
  const pad = (max - min || 1) * 0.15;
  const a = min - pad;
  const b = max + pad;
  const pct = (v: number) => `${(((v - a) / (b - a)) * 100).toFixed(2)}%`;
  const left = range.low != null ? pct(range.low) : "0%";
  const right = range.high != null ? pct(range.high) : "100%";

  return (
    <figure className="space-y-1.5">
      <div role="img" aria-label={rangeText(finding)} className="relative h-7">
        <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-white/10" />
        <div
          className="absolute top-3 h-1.5 rounded-full bg-slate-300/50"
          style={{ left, width: `calc(${right} - ${left})` }}
        />
        <div
          className="absolute top-[7px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-[#0b0f14] bg-white shadow"
          style={{ left: pct(value) }}
        />
      </div>
      <figcaption className="flex justify-between text-[11px] text-muted">
        <span>Reported range: {range.text} {finding.unit}</span>
        <span className="text-foreground">
          {value} {finding.unit}
        </span>
      </figcaption>
    </figure>
  );
}
