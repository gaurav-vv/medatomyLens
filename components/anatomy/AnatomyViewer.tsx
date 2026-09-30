"use client";

import dynamic from "next/dynamic";
import { Component, useRef, type ReactNode, type RefObject } from "react";
import { useOverlayInsets } from "@/lib/ui/insets";
import { AnatomyProvider, useAnatomy } from "./AnatomyContext";
import { AnatomyLayerToggle } from "./AnatomyLayerToggle";
import { AnatomySearch } from "./AnatomySearch";
import { DetailPanel } from "./DetailPanel";
import { OrganPanel, ViewControls } from "./OrganPanel";
import { ViewerStatus } from "./ViewerStatus";
import { ReportProvider, useReport } from "@/components/report/ReportContext";
import { BodyFindingPanel, ReportCard } from "@/components/report/ReportPanels";
import { ReportUploader } from "@/components/report/ReportUploader";
import { AppMenu } from "@/components/menu/AppMenu";

const NO_3D_TEXT = "3D is not supported on this device or browser. Report reading still works.";

/** True when the browser can create a WebGL context. */
function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

function No3D() {
  return <ViewerStatus text={NO_3D_TEXT} />;
}

// three.js needs WebGL/window, so the canvas is loaded client-side only and
// split into its own chunk so the page shell paints immediately.
const AnatomyCanvas = dynamic(
  () => import("./AnatomyCanvas").then((m) => (webglAvailable() ? m.AnatomyCanvas : No3D)),
  {
    ssr: false,
    loading: () => <ViewerStatus text="Preparing 3D viewer..." />,
  },
);

type ViewerRef = RefObject<HTMLDivElement | null>;

/** A 3D failure must not take the rest of the app down (Sections 37, 83). */
class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <ViewerStatus text={NO_3D_TEXT} /> : this.props.children;
  }
}

function SafeCanvas() {
  return (
    <CanvasErrorBoundary>
      <AnatomyCanvas />
    </CanvasErrorBoundary>
  );
}

function BodyChrome({ viewer }: { viewer: ViewerRef }) {
  // Phones: the camera keeps the body between these controls (see CameraRig).
  // Top edge: the report bar when a report is open, otherwise the layer chips.
  const top = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const { report } = useReport();
  useOverlayInsets(viewer, report ? top : chips, bottom);
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex flex-col gap-2 px-3 md:top-16 md:w-80 md:px-4">
        {/* Search with the upload button on its right. Phones: first row; desktop: centred at the top. */}
        <div
          className="pointer-events-auto flex items-center gap-2 md:fixed md:left-1/2 md:top-3 md:w-[min(34rem,calc(100vw-22rem))] md:-translate-x-1/2"
        >
          <div className="min-w-0 flex-1">
            <AnatomySearch />
          </div>
          <ReportUploader />
          <AppMenu />
        </div>
        <div ref={chips} className="pointer-events-auto">
          <AnatomyLayerToggle />
        </div>
        <div className="pointer-events-auto hidden md:block">
          <ViewControls />
        </div>
        <div className="pointer-events-auto md:self-stretch">
          <ReportCard measureRef={top} />
        </div>
      </div>
      <div ref={bottom} className="pointer-events-auto absolute bottom-3 right-3 z-10 md:hidden">
        <ViewControls />
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
          <SafeCanvas />
        </div>
        <ViewerChrome viewer={viewer} />
      </ReportProvider>
    </AnatomyProvider>
  );
}
