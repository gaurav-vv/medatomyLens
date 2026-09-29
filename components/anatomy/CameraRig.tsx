"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useAnatomy } from "./AnatomyContext";

/** Home view: whole body, from the front. Metres, Y up. */
export const HOME_TARGET = new Vector3(0, 0.8, 0.09);
export const HOME_POSITION = new Vector3(0, 0.9, 3.6);
const DURATION_MS = 380;

interface Flight {
  fromTarget: Vector3;
  toTarget: Vector3;
  fromPos: Vector3;
  toPos: Vector3;
  start: number;
}

/**
 * Short, interruptible camera moves (AGENTS.md Section 85): focus on the
 * selected structure, or reset. Any user drag cancels the flight.
 */
export function CameraRig() {
  const { state, selection, meshes, detailRoot } = useAnatomy();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const flight = useRef<Flight | null>(null);
  const saved = useRef<{ target: Vector3; position: Vector3 } | null>(null);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      flight.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  const fly = (toTarget: Vector3, toPos: Vector3) => {
    if (!controls) return;
    flight.current = {
      fromTarget: controls.target.clone(),
      toTarget,
      fromPos: camera.position.clone(),
      toPos,
      start: performance.now(),
    };
    invalidate();
  };

  useEffect(() => {
    if (state.focusSeq === 0 || !selection) return;
    const box = selectionBox();
    if (!box) return;
    const center = box.getCenter(new Vector3());
    const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.03);
    const dir = camera.position.clone().sub(controls?.target ?? HOME_TARGET).normalize();
    fly(center, center.clone().add(dir.multiplyScalar(radius * 3.2 + 0.12)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.focusSeq]);

  // Body ⇄ detail (Section 103): remember the body camera, frame the
  // structure from the front, and restore the exact body camera on return.
  useEffect(() => {
    if (!controls) return;
    if (state.view === "detail") {
      saved.current = { target: controls.target.clone(), position: camera.position.clone() };
      const box = selectionBox();
      if (!box) return;
      const center = box.getCenter(new Vector3());
      const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.02);
      // Fit the bounding sphere in the vertical field of view, with margin.
      const fov = ((camera as PerspectiveCamera).fov ?? 35) * (Math.PI / 180);
      const distance = (radius / Math.sin(fov / 2)) * 1.15;
      fly(center, center.clone().add(new Vector3(0, 0, distance)));
    } else if (saved.current) {
      fly(saved.current.target, saved.current.position);
      saved.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  // Once the detailed model has loaded, frame what is actually shown (for
  // example both lungs when one lung was selected).
  useEffect(() => {
    if (state.view !== "detail" || state.detailStatus !== "ready" || !detailRoot.current) return;
    const box = new Box3().setFromObject(detailRoot.current);
    if (box.isEmpty()) return;
    frameBox(box);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.detailStatus]);

  function frameBox(box: Box3) {
    const center = box.getCenter(new Vector3());
    const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.02);
    const fov = ((camera as PerspectiveCamera).fov ?? 35) * (Math.PI / 180);
    fly(center, center.clone().add(new Vector3(0, 0, (radius / Math.sin(fov / 2)) * 1.15)));
  }

  function selectionBox() {
    if (state.view === "detail" && state.detailStatus === "ready" && detailRoot.current) {
      const shown = new Box3().setFromObject(detailRoot.current);
      if (!shown.isEmpty()) return shown;
    }
    if (!selection) return null;
    const box = new Box3();
    for (const id of selection.meshes) {
      const mesh = meshes.current.get(id);
      if (mesh) box.expandByObject(mesh);
    }
    return box.isEmpty() ? null : box;
  }

  useEffect(() => {
    if (state.resetSeq === 0) return;
    // In the detail view, "reset" re-frames the structure instead of the body.
    if (state.view === "detail") {
      const box = selectionBox();
      if (!box) return;
      const center = box.getCenter(new Vector3());
      const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.02);
      const fov = ((camera as PerspectiveCamera).fov ?? 35) * (Math.PI / 180);
      fly(center, center.clone().add(new Vector3(0, 0, (radius / Math.sin(fov / 2)) * 1.15)));
      return;
    }
    fly(HOME_TARGET.clone(), HOME_POSITION.clone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.resetSeq]);

  useFrame(() => {
    const f = flight.current;
    if (!f || !controls) return;
    const t = Math.min((performance.now() - f.start) / DURATION_MS, 1);
    const k = 1 - Math.pow(1 - t, 3); // ease-out cubic
    controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    controls.update();
    if (t < 1) invalidate();
    else flight.current = null;
  });

  return null;
}
