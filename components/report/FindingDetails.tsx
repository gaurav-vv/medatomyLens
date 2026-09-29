"use client";

import { explanationFor, STATUS_LABEL } from "@/lib/medical/report";
import type { ResolvedFinding, ResolvedReport } from "@/lib/medical/types";
import { ReferenceRangeBar } from "./ReferenceRangeBar";

export const NO_EXPLANATION_TEXT = "No explanation is available for this term yet.";
export const NEXT_STEP_TEXT = "Discuss this result with your doctor.";

export function locationText(f: ResolvedFinding): string {
  const loc = f.location;
  if (loc.kind === "region") return loc.region.displayName;
  if (loc.kind === "region_unavailable") return "Region not available in the current model";
  return "Location not specified in the report";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5 border-t border-border pt-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <div className="space-y-1.5 text-[13px] leading-relaxed">{children}</div>
    </section>
  );
}

/** "View source" (Section 19): the report page with the quoted line marked. */
function SourceView({ finding, report }: { finding: ResolvedFinding; report: ResolvedReport }) {
  const page = report.pages.find((p) => p.page === finding.raw.source.page);
  if (!page) return null;
  return (
    <details className="group rounded-lg border border-border bg-black/20">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs text-teal-100 hover:text-teal-50">
        View source · {report.title}, page {page.page} <span className="text-muted group-open:hidden">▸</span>
      </summary>
      <div className="space-y-0.5 px-3 pb-3 font-mono text-[11px] leading-relaxed text-muted">
        <p className="mb-1 font-sans text-[11px] uppercase tracking-wide">{page.heading}</p>
        {page.lines.map((line, i) => {
          const hit = line.includes(finding.raw.source.text);
          return hit ? (
            <mark key={i} className="block rounded bg-teal-300/20 px-1 text-foreground">
              {line}
            </mark>
          ) : (
            <p key={i} className="px-1">
              {line}
            </p>
          );
        })}
      </div>
    </details>
  );
}

interface FindingDetailsProps {
  finding: ResolvedFinding;
  report: ResolvedReport;
  /** Structure chips (body view: tap to show that organ). */
  structures?: { id: string; name: string; onClick?: () => void }[];
}

/**
 * Explanation panel (AGENTS.md Section 108). Report words are always quoted
 * with their page; explanations come only from curated data files.
 */
export function FindingDetails({ finding, report, structures }: FindingDetailsProps) {
  const raw = finding.raw;
  const explanation = explanationFor(finding.term?.normalizedTerm);
  const isLab = raw.findingType === "lab_association";
  const out = finding.status === "ABOVE_RANGE" ? "above" : finding.status === "BELOW_RANGE" ? "below" : null;
  const associations = out === "above" ? explanation?.aboveRange : out === "below" ? explanation?.belowRange : undefined;

  return (
    <div className="space-y-3">
      <Section title="What the report says">
        <blockquote className="rounded-lg border-l-2 border-violet-300/70 bg-white/5 px-3 py-2 font-mono text-[12px]">
          “{raw.source.text}”
        </blockquote>
        <p className="text-[11px] text-muted">
          {report.title} · page {raw.source.page}
          {report.isDemo && " · DEMO / SAMPLE DATA"}
        </p>
        {isLab ? (
          <>
            <p>
              <span className="font-medium">
                {raw.value} {raw.unit}
              </span>{" "}
              <span className="text-muted">· {STATUS_LABEL[finding.status]}</span>
            </p>
            <ReferenceRangeBar finding={raw} />
          </>
        ) : (
          <>
            <p className="text-muted">The report states this. The app does not interpret it.</p>
            {raw.size?.specified && <p>Size as reported: {raw.size.text}</p>}
          </>
        )}
        {finding.status !== "NOT_INTERPRETED" && finding.structures.length > 0 && (
          <p className="text-muted">Location: {locationText(finding)}</p>
        )}
        <SourceView finding={finding} report={report} />
      </Section>

      {finding.status === "NOT_INTERPRETED" ? (
        <Section title="Needs review">
          <p>This finding could not be checked against the report text, so it is not shown on the body.</p>
        </Section>
      ) : finding.structures.length === 0 ? (
        <Section title="Anatomy">
          <p>This finding could not be confidently mapped to a specific anatomical structure.</p>
        </Section>
      ) : (
        <Section title="Why this is highlighted">
          <p>{finding.mappingReason}</p>
          {structures && (
            <div className="flex flex-wrap gap-1.5">
              {structures.map((s) =>
                s.onClick ? (
                  <button
                    key={s.id}
                    type="button"
                    onClick={s.onClick}
                    className="ui-btn ui-btn-report"
                  >
                    {s.name} →
                  </button>
                ) : (
                  <span key={s.id} className="ui-tag border-border text-xs">
                    {s.name}
                  </span>
                ),
              )}
            </div>
          )}
        </Section>
      )}

      {isLab && (
        <Section title="What this test measures">
          {explanation ? (
            <>
              <p>{explanation.measures}</p>
              <p className="text-muted">{explanation.context}</p>
            </>
          ) : (
            <p className="text-muted">{NO_EXPLANATION_TEXT}</p>
          )}
        </Section>
      )}
      {!isLab && (
        <Section title="What this term means">
          <p className="text-muted">{NO_EXPLANATION_TEXT}</p>
        </Section>
      )}

      {associations && associations.length > 0 && (
        <Section title={`Results ${out} the reported range can be associated with`}>
          <ul className="list-disc space-y-0.5 pl-5">
            {associations.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="text-[11px] text-muted">General possibilities, not an assessment of this result.</p>
        </Section>
      )}

      <Section title="Next step">
        <p>{explanation?.nextStep ?? NEXT_STEP_TEXT}</p>
      </Section>

      {explanation && (
        <p className="text-[11px] leading-snug text-muted">
          Explanation source:{" "}
          {explanation.sources.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {s.title}
            </a>
          ))}
          {explanation.review.status === "pending" && ". Pending review by a medical professional."}
        </p>
      )}
    </div>
  );
}
