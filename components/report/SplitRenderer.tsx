"use client";

import { useFrame } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { useAnatomy } from "@/components/anatomy/AnatomyContext";
import { setReportLook } from "./reportLook";

/** Desktop organ panel width plus margins (md:w-[21rem] + right-4): the split uses the rest. */
export const SPLIT_PANEL_PX = 368;

/**
 * Side-by-side organ view (AGENTS.md Section 109): the same model and the
 * same camera drawn twice, reported look on the left and the generic normal
 * reference on the right. Because both halves use one camera, rotating or
 * zooming either side moves both. Mounted only in that mode; while mounted it
 * takes over rendering (useFrame priority 1).
 */
export function SplitRenderer() {
  const { detailRoot } = useAnatomy();
  useFrame(({ gl, scene, camera, size }) => {
    const cam = camera as PerspectiveCamera;
    const usable = Math.max(size.width - SPLIT_PANEL_PX, size.width / 2);
    const half = Math.floor(usable / 2);
    const aspect = cam.aspect;
    cam.aspect = half / size.height;
    cam.updateProjectionMatrix();
    gl.setScissorTest(true);

    setReportLook(detailRoot.current, true);
    gl.setViewport(0, 0, half, size.height);
    gl.setScissor(0, 0, half, size.height);
    gl.render(scene, cam);

    setReportLook(detailRoot.current, false);
    gl.setViewport(half, 0, half, size.height);
    gl.setScissor(half, 0, half, size.height);
    gl.render(scene, cam);

    // Area under the panel: cleared, never shows a third copy.
    gl.setViewport(half * 2, 0, size.width - half * 2, size.height);
    gl.setScissor(half * 2, 0, size.width - half * 2, size.height);
    gl.clear();

    // Restore: the reported look is the scene's resting state in this mode.
    setReportLook(detailRoot.current, true);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
  }, 1);
  return null;
}
