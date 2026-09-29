"use client";

import dynamic from "next/dynamic";
import { useRef, type RefObject } from "react";
import { useOverlayInsets } from "@/lib/ui/insets";
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

type ViewerRef = RefObject<HTMLDivElement | null>;

function BodyChrome({ viewer }: { viewer: ViewerRef }) {
  // Phones: the camera keeps the body between these controls (see CameraRig).
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useOverlayInsets(viewer, top, bottom);
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
          <ReportCard measureRef={top} />
        </div>
      </div>
      <div ref={bottom} className="pointer-events-auto absolute bottom-3 right-3 z-10 md:hidden">
        <ViewControls />
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

function ViewerChrome({ viewer }: { viewer: ViewerRef }) {
  const { state } = useAnatomy();
  const inDetail = state.view === "detail";
  return (
    <>
      {inDetail ? <DetailPanel viewer={viewer} /> : <BodyChrome viewer={viewer} />}
      {inDetail && (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-10 hidden md:block">
          <ViewControls />
        </div>
      )}
    </>
  );
}

export function AnatomyViewer() {
  const viewer = useRef<HTMLDivElement>(null);
  return (
    <AnatomyProvider>
      <ReportProvider>
        <div ref={viewer} className="absolute inset-0" data-testid="anatomy-viewer">
          <AnatomyCanvas />
        </div>
        <ViewerChrome viewer={viewer} />
      </ReportProvider>
    </AnatomyProvider>
  );
}
