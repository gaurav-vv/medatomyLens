"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Color, Mesh, MeshPhysicalMaterial, type Group, type Object3D } from "three";
import { resolveAppearance, resolvePartAppearance } from "@/lib/anatomy/appearance";
import {
  detailOrganFor,
  detailOrganUrl,
  isPartKey,
  partIdOf,
  partKey,
  type DetailOrgan,
  type DetailOrganPart,
} from "@/lib/anatomy/detailOrgans";
import { layerUrl } from "@/lib/anatomy/quality";
import type { LayerId } from "@/lib/anatomy/types";
import { useAnatomy } from "./AnatomyContext";

const TAP_TOLERANCE_PX = 6;
const PART_EMISSIVE = new Color("#2dd4bf");
const NO_EMISSIVE = new Color("#000000");

/**
 * Isolated structure for the detail view (AGENTS.md Section 104).
 * Always uses the high-detail GLB of each layer involved. It is fetched only
 * when a detail view first opens (lazy, Section 10) and then cached.
 * The body layers are hidden meanwhile, so body and detail never render at
 * full detail together (Section 84).
 */
export function DetailModel() {
  const { selection, state, detailRoot } = useAnatomy();
  if (!selection) return null;
  const organ = detailOrganFor(state.detailOrgans, state.index, selection);
  return (
    <Suspense fallback={<DetailStatusMarker status="loading" />}>
      <group ref={detailRoot}>
        {organ ? (
          <DetailOrganModel organ={organ} />
        ) : (
          selection.layers.map((layer) => <DetailLayer key={layer} layer={layer} meshIds={selection.meshes} />)
        )}
      </group>
      <DetailStatusMarker status="ready" />
    </Suspense>
  );
}

function physical(a: ReturnType<typeof resolvePartAppearance>) {
  return new MeshPhysicalMaterial({
    color: a.color,
    roughness: a.roughness,
    clearcoat: a.clearcoat,
    clearcoatRoughness: a.clearcoatRoughness,
    sheen: a.sheen,
    sheenColor: a.sheenColor,
    transmission: a.transmission,
    thickness: a.transmission > 0 ? 0.004 : 0,
  });
}

/**
 * Detailed organ with real internal parts (HuBMAP HRA reference organ).
 * A mesh can belong to several parts ("Renal pyramid" is inside "Renal
 * medulla"); it takes the look of its most specific part.
 */
function DetailOrganModel({ organ }: { organ: DetailOrgan }) {
  const { scene } = useGLTF(detailOrganUrl(organ), false, true);
  const root = useRef<Group>(null);
  const { state, dispatch } = useAnatomy();
  const invalidate = useThree((s) => s.invalidate);
  const { detailPart, seeInside } = state;

  const meshInfo = useMemo(() => {
    const info = new Map<string, { part: DetailOrganPart; shell: boolean }>();
    const bySize = [...organ.parts].sort((a, b) => b.meshes.length - a.meshes.length);
    for (const part of bySize) for (const m of part.meshes) info.set(m, { part, shell: part.shell });
    return info;
  }, [organ]);

  const copies = useMemo(() => {
    const out: Mesh[] = [];
    scene.traverse((o: Object3D) => {
      if (!(o instanceof Mesh)) return;
      const id = meshInfo.has(o.name) ? o.name : (o.parent?.name ?? "");
      const info = meshInfo.get(id);
      if (!info) return;
      // Sources built with dropNormals ship without normals: smooth them here.
      if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
      const copy = new Mesh(o.geometry, physical(resolvePartAppearance(info.part.name)));
      o.updateWorldMatrix(true, false);
      copy.applyMatrix4(o.matrixWorld);
      copy.userData.mesh = id;
      copy.userData.shell = info.shell;
      out.push(copy);
    });
    return out;
  }, [scene, meshInfo]);

  useEffect(() => {
    const list = meshesOf(root.current);
    return () => {
      for (const c of list) (c.material as MeshPhysicalMaterial).dispose();
    };
  }, [copies]);

  // Highlighted part glows; everything else fades. "See inside" fades only
  // the outer layers so the internal parts become visible.
  useEffect(() => {
    const part = isPartKey(detailPart) ? organ.parts.find((p) => p.id === partIdOf(detailPart)) : undefined;
    const lit = new Set(part?.meshes ?? []);
    for (const c of meshesOf(root.current)) {
      const m = c.material as MeshPhysicalMaterial;
      const on = lit.has(c.userData.mesh as string);
      m.emissive.copy(on ? PART_EMISSIVE : NO_EMISSIVE);
      m.emissiveIntensity = on ? 0.18 : 0;
      const faded = part ? !on : seeInside && (c.userData.shell as boolean);
      // Recompile only when transparency actually flips (keeps toggles instant).
      if (m.transparent !== faded) m.needsUpdate = true;
      m.transparent = faded;
      m.opacity = faded ? (part ? 0.14 : 0.1) : 1;
      m.depthWrite = !faded;
      c.renderOrder = faded ? 1 : 0;
    }
    invalidate();
  }, [copies, detailPart, seeInside, organ, invalidate]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_TOLERANCE_PX) return;
    const c = e.object as Mesh;
    // Taps pass through see-through layers to the part behind them.
    if ((c.material as MeshPhysicalMaterial).transparent) return;
    e.stopPropagation();
    const info = meshInfo.get(c.userData.mesh as string);
    if (!info) return;
    const key = partKey(info.part.id);
    dispatch({ type: "detailPart", key: detailPart === key ? null : key });
  };

  return (
    <group ref={root} onClick={onClick}>
      {copies.map((c) => (
        <primitive key={c.uuid} object={c} />
      ))}
    </group>
  );
}

/** Reports loading/ready from inside Suspense (fallback vs resolved content). */
function DetailStatusMarker({ status }: { status: "loading" | "ready" }) {
  const { dispatch } = useAnatomy();
  useEffect(() => {
    dispatch({ type: "detailStatus", status });
  }, [dispatch, status]);
  return null;
}

function meshesOf(root: Group | null): Mesh[] {
  const list: Mesh[] = [];
  root?.traverse((o) => {
    if (o instanceof Mesh) list.push(o);
  });
  return list;
}

function DetailLayer({ layer, meshIds }: { layer: LayerId; meshIds: string[] }) {
  const { scene } = useGLTF(layerUrl(layer, "high"), false, true);
  const root = useRef<Group>(null);
  const { state, dispatch } = useAnatomy();
  const invalidate = useThree((s) => s.invalidate);
  const { index, detailPart } = state;

  // Copies of the wanted meshes. Geometry is shared with the cached GLB;
  // materials are owned here and disposed on unmount.
  const copies = useMemo(() => {
    const wanted = new Set(meshIds);
    const out: Mesh[] = [];
    scene.traverse((o: Object3D) => {
      if (!(o instanceof Mesh)) return;
      const id = o.name || o.parent?.name || "";
      if (!wanted.has(id)) return;
      const a = resolveAppearance(layer, index?.structures.get(id)?.name ?? "");
      const material = new MeshPhysicalMaterial({
        color: a.color,
        roughness: a.roughness,
        clearcoat: a.clearcoat,
        clearcoatRoughness: a.clearcoatRoughness,
        sheen: a.sheen,
        sheenColor: a.sheenColor,
        transmission: a.transmission,
        thickness: a.transmission > 0 ? 0.004 : 0,
      });
      const copy = new Mesh(o.geometry, material);
      // Quantized GLBs carry per-node transforms; keep the world placement.
      o.updateWorldMatrix(true, false);
      copy.applyMatrix4(o.matrixWorld);
      copy.userData.mesh = id;
      out.push(copy);
    });
    return out;
  }, [scene, meshIds, layer, index]);

  // Dispose owned materials when the copies change or unmount.
  useEffect(() => {
    const list = meshesOf(root.current);
    return () => {
      for (const c of list) (c.material as MeshPhysicalMaterial).dispose();
    };
  }, [copies]);

  // Highlight the chosen part (all of its pieces). The other parts turn
  // see-through so parts inside the organ (valves, cavities) stay visible.
  useEffect(() => {
    const lit = new Set(
      detailPart && index && !isPartKey(detailPart) ? (index.pieces.get(detailPart) ?? [detailPart]) : [],
    );
    const anyLit = lit.size > 0;
    for (const c of meshesOf(root.current)) {
      const m = c.material as MeshPhysicalMaterial;
      const on = lit.has(c.userData.mesh as string);
      m.emissive.copy(on ? PART_EMISSIVE : NO_EMISSIVE);
      m.emissiveIntensity = on ? 0.18 : 0;
      const faded = anyLit && !on;
      m.transparent = faded;
      m.opacity = faded ? 0.16 : 1;
      m.depthWrite = !faded;
      m.needsUpdate = true;
      c.renderOrder = faded ? 1 : 0;
    }
    invalidate();
  }, [copies, detailPart, index, invalidate]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_TOLERANCE_PX) return;
    e.stopPropagation();
    const id = e.object.userData.mesh as string | undefined;
    if (!id || !index) return;
    const samePart = detailPart !== null && (index.pieces.get(id) ?? [id]).includes(detailPart);
    dispatch({ type: "detailPart", key: samePart ? null : id });
  };

  return (
    <group ref={root} onClick={onClick}>
      {copies.map((c) => (
        <primitive key={c.uuid} object={c} />
      ))}
    </group>
  );
}
