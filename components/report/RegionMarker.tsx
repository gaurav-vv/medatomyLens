"use client";

import { useEffect, useRef } from "react";
import { Billboard, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { useAnatomy } from "@/components/anatomy/AnatomyContext";
import type { DetailOrgan } from "@/lib/anatomy/detailOrgans";
import { organBox } from "./reportLook";
import { useOrganReport } from "./useOrganReport";

const MARKER_COLOR = "#c4b5fd";

/**
 * Reported-area marker (AGENTS.md Sections 105, 107): a pin and ring that are
 * clearly artificial. It shows only where the report places a finding. Its
 * size is fixed relative to the organ and never reflects the finding's size;
 * a reported size is shown as text only.
 */
export function RegionMarker({ organ }: { organ: DetailOrgan | undefined }) {
  const { state, detailRoot } = useAnatomy();
  const { location, active, mode } = useOrganReport();
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const region = location?.kind === "region" ? location.region : null;
  const ready = state.detailStatus === "ready";

  useEffect(() => {
    const g = group.current;
    const root = detailRoot.current;
    if (!g || !root || !region || !ready) return;
    const whole = organBox(root);
    if (whole.isEmpty()) return;
    const size = whole.getSize(new Vector3());
    let at: Vector3;
    if (region.supportedBy === "overlay") {
      const [x, y, z] = region.overlay.position;
      at = whole.getCenter(new Vector3()).add(new Vector3((x * size.x) / 2, (y * size.y) / 2, (z * size.z) / 2));
    } else {
      const meshes = new Set(organ?.parts.filter((p) => region.parts.includes(p.id)).flatMap((p) => p.meshes) ?? []);
      const partBox = organBox(root, meshes);
      at = (partBox.isEmpty() ? whole : partBox).getCenter(new Vector3());
    }
    // The marker belongs to the organ view, not to the model: convert to the
    // detail group's local space.
    g.position.copy(g.parent ? g.parent.worldToLocal(at) : at);
    g.scale.setScalar(Math.max(size.length() * 0.035, 0.003));
    invalidate();
  }, [region, ready, organ, detailRoot, invalidate]);

  if (!region || !active) return null;
  const showLabel = mode === "reported";
  return (
    <group ref={group} userData={{ reportMarker: true }} visible={mode !== "normal"}>
      <Billboard>
        <mesh renderOrder={20}>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.95} depthTest={false} depthWrite={false} />
        </mesh>
        <mesh renderOrder={20}>
          <circleGeometry args={[0.28, 24]} />
          <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.95} depthTest={false} depthWrite={false} />
        </mesh>
      </Billboard>
      {showLabel && (
        <Html center={false} style={{ pointerEvents: "none" }} position={[1.3, 0, 0]} zIndexRange={[15, 0]}>
          <div className="whitespace-nowrap rounded-md border border-violet-300/50 bg-[#121820]/90 px-2 py-1 text-[11px] text-violet-100 shadow">
            Reported area
            {active.raw.size?.specified && <span className="block text-muted">Size as reported: {active.raw.size.text}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
