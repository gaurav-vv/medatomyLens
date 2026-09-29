"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Color, Mesh, MeshPhysicalMaterial, type Group } from "three";
import { resolveAppearance } from "@/lib/anatomy/appearance";
import { layerUrl } from "@/lib/anatomy/quality";
import { selectionForTap } from "@/lib/anatomy/structures";
import type { LayerId, QualityTier } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";
import { useReport } from "@/components/report/ReportContext";

/** Pointer travel (px) above which a click is treated as a drag, not a tap. */
const TAP_TOLERANCE_PX = 6;

const SELECTED_EMISSIVE = new Color("#2dd4bf");
const NO_EMISSIVE = new Color("#000000");
/** "Reported" semantic state (Section 23): associated with a report finding. Always labelled in the UI. */
export const REPORTED_EMISSIVE = new Color("#a78bfa");

interface MeshMaterials {
  base: MeshPhysicalMaterial;
  ghost: MeshPhysicalMaterial;
}

function buildMaterials(layer: LayerId, name: string): MeshMaterials {
  const a = resolveAppearance(layer, name);
  const base = new MeshPhysicalMaterial({
    color: a.color,
    roughness: a.roughness,
    clearcoat: a.clearcoat,
    clearcoatRoughness: a.clearcoatRoughness,
    sheen: a.sheen,
    sheenColor: a.sheenColor,
    transmission: a.transmission,
    thickness: a.transmission > 0 ? 0.004 : 0,
  });
  // Faded look for anatomy around a selection (Section 87). Never hidden.
  const ghost = new MeshPhysicalMaterial({
    color: a.color,
    roughness: a.roughness,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  return { base, ghost };
}

/** All meshes under the layer root. three.js objects are mutated through refs. */
function meshesOf(root: Group | null): Mesh[] {
  const list: Mesh[] = [];
  root?.traverse((o) => {
    if (o instanceof Mesh) list.push(o);
  });
  return list;
}

interface BodyLayerProps {
  layer: LayerId;
  tier: QualityTier;
  visible: boolean;
}

export function BodyLayer({ layer, tier, visible }: BodyLayerProps) {
  // useDraco=false: no Draco decoder fetched from a CDN. Meshopt decodes locally.
  const { scene } = useGLTF(layerUrl(layer, tier), false, true);
  const root = useRef<Group>(null);
  const { state, dispatch, selection, meshes } = useAnatomy();
  const invalidate = useThree((s) => s.invalidate);
  const { index, selected } = state;
  const { reportedMeshes } = useReport();
  const emphasis = state.emphasis;
  const highlighted = useMemo(() => new Set(selection?.meshes ?? emphasis), [selection, emphasis]);
  const emphasised = !selection && emphasis.length > 0;

  // Tissue materials, built once per mesh (names come from the index).
  useEffect(() => {
    const registry = meshes.current;
    const list = meshesOf(root.current);
    for (const mesh of list) {
      const id = mesh.name || mesh.parent?.name || "";
      const mats = buildMaterials(layer, index?.structures.get(id)?.name ?? "");
      mesh.userData.mesh = id;
      mesh.userData.materials = mats;
      mesh.material = mats.base;
      registry.set(id, mesh);
    }
    dispatch({ type: "layerStatus", layer, status: "ready" });
    invalidate();
    return () => {
      for (const mesh of list) {
        registry.delete(mesh.userData.mesh as string);
        const mats = mesh.userData.materials as MeshMaterials | undefined;
        mats?.base.dispose();
        mats?.ghost.dispose();
      }
    };
  }, [scene, index, layer, dispatch, meshes, invalidate]);

  // Selection look: the selected structure glows, everything else fades.
  useEffect(() => {
    const anySelected = highlighted.size > 0;
    for (const mesh of meshesOf(root.current)) {
      const mats = mesh.userData.materials as MeshMaterials | undefined;
      if (!mats) continue;
      const id = mesh.userData.mesh as string;
      const isSelected = highlighted.has(id);
      const reported = reportedMeshes.has(id);
      // Selected: teal. Report-associated (or a finding's organs): violet.
      // Low intensity: the tissue keeps its real colour, with a clear tint.
      const tint = isSelected ? (emphasised ? REPORTED_EMISSIVE : SELECTED_EMISSIVE) : !anySelected && reported ? REPORTED_EMISSIVE : NO_EMISSIVE;
      mats.base.emissive.copy(tint);
      mats.base.emissiveIntensity = isSelected ? (emphasised ? 0.3 : 0.14) : tint === NO_EMISSIVE ? 0 : 0.28;
      const faded = anySelected && !isSelected;
      mesh.material = faded ? mats.ghost : mats.base;
      mesh.renderOrder = faded ? 1 : 0;
    }
    invalidate();
  }, [scene, highlighted, emphasised, reportedMeshes, index, invalidate]);

  useEffect(() => {
    invalidate();
  }, [visible, invalidate]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Hidden layers and drags don't select; the event continues to the next
    // hit (R3F delivers to every intersected object until propagation stops).
    if (!visible || e.delta > TAP_TOLERANCE_PX) return;
    e.stopPropagation();
    const id = e.object.userData.mesh as string | undefined;
    if (id) dispatch({ type: "select", key: selectionForTap(index, id, selected) });
  };

  // Hidden layers keep their GPU data so re-showing them is instant.
  return (
    <group ref={root} visible={visible} onClick={onClick}>
      <primitive object={scene} />
    </group>
  );
}
