"use client";

import { Component, Suspense, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Bvh, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { LAYER_IDS, type LayerId, type QualityTier } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";
import { BodyLayer } from "./BodyLayer";
import { CameraRig, HOME_POSITION, HOME_TARGET } from "./CameraRig";
import { DetailModel } from "./DetailModel";
import { ViewerStatus } from "./ViewerStatus";
import { ZoomToPointer } from "./ZoomToPointer";
import { SplitRenderer } from "@/components/report/SplitRenderer";
import { useOrganReport } from "@/components/report/useOrganReport";

/** Reports a layer's load failure instead of crashing the viewer (Section 37). */
class LayerErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function LoadingMarker({ layer }: { layer: LayerId }) {
  const { dispatch } = useAnatomy();
  useEffect(() => {
    dispatch({ type: "layerStatus", layer, status: "loading" });
  }, [dispatch, layer]);
  return null;
}

/** Mounts a layer the first time it is shown, then keeps it for instant toggling. */
function LayerSlot({ layer, tier }: { layer: LayerId; tier: QualityTier }) {
  const { state, dispatch } = useAnatomy();
  const visible = state.visible[layer];
  const everShown = visible || state.status[layer] !== "idle";
  if (!everShown) return null;
  return (
    <LayerErrorBoundary onError={() => dispatch({ type: "layerStatus", layer, status: "error" })}>
      <Suspense fallback={<LoadingMarker layer={layer} />}>
        {/* Hidden (not unmounted) in the detail view, so "Back to body" is instant. */}
        <BodyLayer layer={layer} tier={tier} visible={visible && state.view === "body"} />
      </Suspense>
    </LayerErrorBoundary>
  );
}

/** Studio lighting built from local light-formers: no HDR download. */
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[2.5, 3.5, 3]} intensity={1.6} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#bcd4ff" />
      {/* Cool rim light from behind: separates the silhouette from the dark backdrop. */}
      <directionalLight position={[0, 2.5, -4]} intensity={0.9} color="#cfe3ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 1, 1]} rotation-y={Math.PI / 2} scale={[3, 3, 1]} color="#ffe8d6" />
        <Lightformer form="rect" intensity={1.0} position={[3, 1, -1]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} color="#d6e6ff" />
        <Lightformer form="ring" intensity={0.8} position={[0, 1, -3]} scale={2} />
      </Environment>
    </>
  );
}

export function AnatomyCanvas() {
  const { state, dispatch } = useAnatomy();
  const tier = state.tier;
  const inDetail = state.view === "detail";
  const { mode } = useOrganReport();
  const split = inDetail && mode === "side_by_side";
  const anyLoading = !inDetail && LAYER_IDS.some((l) => state.visible[l] && state.status[l] === "loading");
  const failed = LAYER_IDS.filter((l) => state.status[l] === "error");
  const allReady = tier !== null && LAYER_IDS.every((l) => !state.visible[l] || state.status[l] === "ready");

  return (
    <div
      // Studio backdrop as CSS (free per frame): soft light behind the model.
      className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #1b2430 0%, #0e131a 55%, #080b0f 100%)" }}
      data-layers-ready={allReady ? "true" : "false"}
      data-detail-status={inDetail ? state.detailStatus : "closed"}
      data-view-mode={inDetail ? mode : undefined}
    >
      <Canvas
        // Render only when something changes: saves battery on phones.
        frameloop="demand"
        dpr={tier === "low" ? [1, 1.5] : [1, 2]}
        camera={{ position: HOME_POSITION.toArray(), fov: 35, near: 0.01, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        // While the camera moves, drop resolution briefly for smooth frames on phones.
        performance={{ min: 0.5, debounce: 250 }}
        onPointerMissed={(e) => {
          if (e.type !== "click") return;
          if (inDetail) dispatch({ type: "detailPart", key: null });
          else dispatch({ type: "select", key: null });
        }}
        fallback={<ViewerStatus text="3D is not supported on this device or browser." />}
        aria-label="3D anatomy canvas"
      >
        <AdaptiveDpr pixelated={false} />
        <StudioLighting />
        {tier && (
          <Bvh firstHitOnly>
            {LAYER_IDS.map((l) => (
              <LayerSlot key={l} layer={l} tier={tier} />
            ))}
          </Bvh>
        )}
        {inDetail && (
          <LayerErrorBoundary onError={() => dispatch({ type: "detailStatus", status: "error" })}>
            <DetailModel />
          </LayerErrorBoundary>
        )}
        <OrbitControls
          makeDefault
          target={HOME_TARGET.toArray()}
          enableDamping={false}
          minDistance={0.03}
          maxDistance={6}
          zoomSpeed={1.1}
          regress
        />
        <CameraRig />
        <ZoomToPointer />
        {split && <SplitRenderer />}
      </Canvas>
      {anyLoading && <ViewerStatus text="Loading anatomy..." />}
      {inDetail && state.detailStatus === "loading" && <ViewerStatus text="Loading detailed model..." />}
      {inDetail && state.detailStatus === "error" && (
        <ViewerStatus text="A detailed view is not available for this structure right now. The body view still shows it." />
      )}
      {failed.length > 0 && (
        <p role="alert" className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
          Some anatomy layers could not be loaded ({failed.join(", ")}). Check your connection and reload.
        </p>
      )}
    </div>
  );
}
