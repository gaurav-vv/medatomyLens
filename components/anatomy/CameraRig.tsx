"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useAnatomy } from "./AnatomyContext";
import { useIsWide, useOrganReport } from "@/components/report/useOrganReport";
import { organBox } from "@/components/report/reportLook";
import { SPLIT_PANEL_PX } from "@/components/report/SplitRenderer";

import { useInsets } from "@/lib/ui/insets";

/** Whole body half-extents (m) used to fit the home view on phones. */
const BODY_HALF_HEIGHT = 0.92;
const BODY_HALF_WIDTH = 0.42;

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
  const size = useThree((s) => s.size);
  const wide = useIsWide();
  const { mode } = useOrganReport();
  const split = state.view === "detail" && mode === "side_by_side";
  const phone = !wide;
  const insets = useInsets();
  const covered = phone ? Math.min(insets.top + insets.bottom, size.height * 0.7) : 0;
  const userMoved = useRef(false);

  // Phones: centre the model in the space the controls leave free (measured
  // from the real overlay elements). A view offset keeps taps and rotation exact.
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    if (phone && covered > 0) {
      cam.setViewOffset(size.width, size.height, 0, (insets.bottom - insets.top) / 2, size.width, size.height);
    } else cam.clearViewOffset();
    invalidate();
  }, [phone, covered, insets.top, insets.bottom, size, camera, invalidate]);

  /** Vertical and horizontal half field of view of the free area (radians). */
  function halfFov() {
    const cam = camera as PerspectiveCamera;
    const t = Math.tan(((cam.fov ?? 35) * Math.PI) / 360);
    const visible = Math.max(0.3, 1 - covered / size.height);
    const width = split ? Math.max(size.width - SPLIT_PANEL_PX, size.width / 2) / 2 : size.width;
    return { v: Math.atan(t * visible), h: Math.atan((t * width) / size.height), tv: t * visible, th: (t * width) / size.height };
  }

  /** Distance that fits a sphere in the visible part of the view. */
  function fitDistance(radius: number) {
    const f = halfFov();
    return (radius / Math.sin(Math.min(f.v, f.h))) * 1.15;
  }

  /** Home view: desktop keeps the fixed framing; phones fit the body to the free area. */
  function homeView() {
    if (!phone) return { target: HOME_TARGET.clone(), position: HOME_POSITION.clone() };
    const f = halfFov();
    const d = Math.max(BODY_HALF_HEIGHT / f.tv, BODY_HALF_WIDTH / f.th) * 1.04 + 0.1;
    return { target: HOME_TARGET.clone(), position: HOME_TARGET.clone().add(new Vector3(0, 0.05, d)) };
  }

  // Phones: re-fit the untouched home view whenever the free area changes.
  useEffect(() => {
    if (!controls || !phone || userMoved.current || state.view !== "body" || state.selected || flight.current) return;
    const home = homeView();
    controls.target.copy(home.target);
    camera.position.copy(home.position);
    controls.update();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, phone, covered, size.width, size.height]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      flight.current = null;
      userMoved.current = true;
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
    if (state.focusSeq === 0 || (!selection && !state.emphasis.length)) return;
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
      fly(center, center.clone().add(new Vector3(0, 0, fitDistance(radius))));
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
    const box = organBox(detailRoot.current);
    if (box.isEmpty()) return;
    frameBox(box);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.detailStatus, split, covered]);

  function frameBox(box: Box3) {
    const center = box.getCenter(new Vector3());
    const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.02);
    fly(center, center.clone().add(new Vector3(0, 0, fitDistance(radius))));
  }

  function selectionBox() {
    if (state.view === "detail" && state.detailStatus === "ready" && detailRoot.current) {
      const shown = organBox(detailRoot.current);
      if (!shown.isEmpty()) return shown;
    }
    const ids = selection?.meshes ?? state.emphasis;
    if (!ids.length) return null;
    const box = new Box3();
    for (const id of ids) {
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
      frameBox(box);
      return;
    }
    const home = homeView();
    userMoved.current = false;
    fly(home.target, home.position);
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
