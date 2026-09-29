import Link from "next/link";
import { AnatomyViewer } from "@/components/anatomy/AnatomyViewer";
import { Disclaimer } from "@/components/layout/Disclaimer";

export default function Home() {
  return (
    <main className="relative flex h-full flex-col">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <span className="text-sm font-semibold tracking-wide">AnatomyLens</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted backdrop-blur">
            Explore mode
          </span>
          <Link
            href="/about"
            className="pointer-events-auto rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted backdrop-blur hover:text-foreground"
          >
            About
          </Link>
        </div>
      </header>

      <section aria-label="3D anatomy viewer" className="relative flex-1">
        <AnatomyViewer />
      </section>

      <Disclaimer />
    </main>
  );
}
