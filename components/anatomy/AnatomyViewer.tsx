"use client";

import dynamic from "next/dynamic";
import { AnatomyProvider, useAnatomy } from "./AnatomyContext";
import { AnatomyLayerToggle } from "./AnatomyLayerToggle";
import { AnatomySearch } from "./AnatomySearch";
import { DetailPanel } from "./DetailPanel";
import { OrganPanel, ViewControls } from "./OrganPanel";
import { ViewerStatus } from "./ViewerStatus";
import { ReportProvider } from "@/components/report/ReportContext";
import { BodyFindingPanel, ReportCard } from "@/components/report/ReportPanels";

// three.js needs WebGL/window, so the canvas is loaded client-side only and
// split into its own chunk so the page shell paints immediately.
const AnatomyCanvas = dynamic(
  () => import("./AnatomyCanvas").then((m) => m.AnatomyCanvas),
  {
    ssr: false,
    loading: () => <ViewerStatus text="Preparing 3D viewer..." />,
  },
);

function BodyChrome() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex flex-col gap-2 px-3 md:top-16 md:w-64 md:px-4">
        <div className="pointer-events-auto md:hidden">
          <AnatomySearch />
        </div>
        <div className="pointer-events-auto">
          <AnatomyLayerToggle />
        </div>
        <div className="pointer-events-auto hidden md:block">
          <ViewControls />
        </div>
        <div className="pointer-events-auto self-start md:self-stretch">
          <ReportCard />
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 hidden w-full max-w-sm -translate-x-1/2 md:block">
        <div className="pointer-events-auto">
          <AnatomySearch />
        </div>
      </div>
      <OrganPanel />
      <BodyFindingPanel />
    </>
  );
}

function ViewerChrome() {
  const { state } = useAnatomy();
  const inDetail = state.view === "detail";
  return (
    <>
      {inDetail ? <DetailPanel /> : <BodyChrome />}
      <div className={`pointer-events-auto absolute right-3 z-10 ${inDetail ? "bottom-3 hidden md:block" : "bottom-3 md:hidden"}`}>
        <ViewControls />
      </div>
    </>
  );
}

export function AnatomyViewer() {
  return (
    <AnatomyProvider>
      <ReportProvider>
        <div className="absolute inset-0" data-testid="anatomy-viewer">
          <AnatomyCanvas />
        </div>
        <ViewerChrome />
      </ReportProvider>
    </AnatomyProvider>
  );
}
