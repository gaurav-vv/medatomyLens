import { AnatomyViewer } from "@/components/anatomy/AnatomyViewer";

export default function Home() {
  return (
    <main className="relative flex h-dvh flex-col">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] md:p-4">
        <span className="text-sm font-semibold tracking-wide">AnatomyLens</span>
      </header>

      <section aria-label="3D anatomy viewer" className="relative flex-1">
        <AnatomyViewer />
      </section>

    </main>
  );
}
