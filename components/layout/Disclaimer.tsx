import Link from "next/link";

// Disclaimer text required by AGENTS.md Sections 46 and 95.
export const DISCLAIMER_TEXT =
  "This application provides educational visualization of information contained in uploaded medical reports. It does not provide a medical diagnosis or replace professional medical advice.";

export const GENERIC_MODEL_LABEL = "Generic anatomical model — not your actual anatomy";

export function Disclaimer() {
  return (
    <footer className="z-10 border-t border-border bg-surface px-3 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 text-center text-[10px] leading-snug text-muted backdrop-blur md:px-4 md:py-2 md:text-[11px]">
      <p>{DISCLAIMER_TEXT}</p>
      <p className="hidden md:block">{GENERIC_MODEL_LABEL}</p>
      {/* Phones: full credits live on the About page (linked here) to keep the 3D view large. */}
      <p className="md:hidden">
        <Link href="/about" className="underline underline-offset-2">
          Model credits and licenses
        </Link>
        {" · "}BodyParts3D (CC BY-SA 2.1 JP) · HuBMAP HRA (CC BY 4.0)
      </p>
      <p className="hidden md:block">
        3D model:{" "}
        <a
          href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {MODEL_ATTRIBUTION}
        </a>
        {" · "}Detailed organs:{" "}
        <a
          href="https://humanatlas.io/3d-reference-library"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {HRA_ATTRIBUTION}
        </a>
      </p>
    </footer>
  );
}

export const MODEL_ATTRIBUTION = "BodyParts3D © The Database Center for Life Science, CC BY-SA 2.1 JP";
export const HRA_ATTRIBUTION = "HuBMAP Human Reference Atlas, CC BY 4.0";
