import type { Metadata } from "next";
import Link from "next/link";
import {
  DISCLAIMER_TEXT,
  GENERIC_MODEL_LABEL,
  HRA_ATTRIBUTION,
  MODEL_ATTRIBUTION,
} from "@/components/layout/Disclaimer";

export const metadata: Metadata = {
  title: "About · AnatomyLens",
  description: "What AnatomyLens does, what it does not do, and where its 3D anatomy comes from.",
};

const HRA_CITATION =
  'Browne, Kristen, Heidi Schlehlein, Bruce W. Herr II, Ellen Quardokus, Andreas Bueckle, and Katy Börner. "HuBMAP CCF 3D Reference Object Library." https://humanatlas.io/3d-reference-library. CC BY 4.0.';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const linkClass = "underline underline-offset-2 hover:text-foreground";

export default function AboutPage() {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">About AnatomyLens</h1>
          <Link href="/" className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-white/5">
            ← Back to the viewer
          </Link>
        </header>

        <Section title="Important">
          <p className="rounded-lg border border-border bg-surface p-3">{DISCLAIMER_TEXT}</p>
          <p>{GENERIC_MODEL_LABEL}. The organs shown are a generic reference, not a picture of any person&apos;s body.</p>
        </Section>

        <Section title="What it does">
          <ul className="list-disc space-y-1 pl-5">
            <li>Shows a 3D model of the whole human body in layers: skin, muscles, skeleton, organs, arteries, veins and nerves.</li>
            <li>Lets you search, select and open structures, and see the internal parts of detailed organs.</li>
            <li>Later versions will show which structures are associated with findings in a report you upload, always quoting the report and its page.</li>
          </ul>
        </Section>

        <Section title="What it does not do">
          <ul className="list-disc space-y-1 pl-5">
            <li>It does not diagnose, estimate risk or suggest treatment.</li>
            <li>It never draws lesions or other abnormalities. A reported area will be shown with a simple, clearly artificial marker.</li>
            <li>Discuss any result with your doctor.</li>
          </ul>
        </Section>

        <Section title="Privacy">
          <p>
            The app runs entirely in your browser. It has no account, no analytics and no server; the anatomy models are static
            files. Reports you open in later versions stay on your device.
          </p>
        </Section>

        <Section title="3D models and licenses">
          <p>
            Whole-body model:{" "}
            <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noopener noreferrer" className={linkClass}>
              {MODEL_ATTRIBUTION}
            </a>
            . The model files derived from it are shared under the same license (CC BY-SA 2.1 Japan).
          </p>
          <p>
            Detailed organs (kidneys, heart, liver, lungs, brain, eyes):{" "}
            <a href="https://humanatlas.io/3d-reference-library" target="_blank" rel="noopener noreferrer" className={linkClass}>
              {HRA_ATTRIBUTION}
            </a>
            , built from the NLM Visible Human Project; the brain is based on the Allen Human Brain Atlas (Ding et al. 2016).
          </p>
          <p className="text-xs text-muted">{HRA_CITATION}</p>
          <p className="text-xs text-muted">
            Changes made to the models: converted to GLB, positioned to fit the body model (never rotated, scaled or mirrored),
            simplified for phones, and some part labels corrected. Details are in the project&apos;s THIRD_PARTY_ASSETS document.
          </p>
        </Section>
      </div>
    </main>
  );
}
