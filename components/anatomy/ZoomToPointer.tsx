"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

/**
 * Shift to apply to camera and orbit centre after one dolly step, so the
 * point under the pointer (on the plane through the orbit centre) keeps its
 * screen position. `dir` is the unit view ray under the pointer, `prev` the
 * camera position before the step, `last`/`next` the distances before/after.
 * Returns null when the ray is nearly parallel to that plane.
 */
export function zoomShift(prev: Vector3, target: Vector3, dir: Vector3, last: number, next: number): Vector3 | null {
  const fwd = target.clone().sub(prev).normalize();
  const along = dir.dot(fwd);
  if (along <= 0.05 || last <= 0) return null;
  const point = dir.clone().multiplyScalar(last / along).add(prev);
  return point.sub(target).multiplyScalar(1 - next / last);
}

/**
 * Zoom towards the point under the mouse wheel or between two pinching
 * fingers, instead of towards the orbit centre (which sits at the middle of
 * the body). Whenever OrbitControls changes the camera distance during a
 * wheel or pinch, camera and orbit centre are shifted together so the point
 * under the pointer stays where it is on screen. Rotation is untouched.
 */
export function ZoomToPointer() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    if (!controls) return;
    const el = gl.domElement;
    const touches = new Map<number, { x: number; y: number }>();
    const ndc = { x: 0, y: 0 };
    let zooming = false;
    let last = camera.position.distanceTo(controls.target);
    const dir = new Vector3();
    const prev = new Vector3();

    const setNdc = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      ndc.x = ((x - r.left) / r.width) * 2 - 1;
      ndc.y = -((y - r.top) / r.height) * 2 + 1;
    };
    const pinchCentre = () => {
      const [a, b] = [...touches.values()];
      if (a && b) setNdc((a.x + b.x) / 2, (a.y + b.y) / 2);
    };

    // Capture phase: runs before OrbitControls handles the same event.
    const onWheel = (e: WheelEvent) => {
      setNdc(e.clientX, e.clientY);
      zooming = true;
      setTimeout(() => {
        zooming = false;
      }, 0);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        pinchCentre();
        zooming = true;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) pinchCentre();
    };
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) zooming = false;
    };

    const onChange = () => {
      const r = camera.position.distanceTo(controls.target);
      if (zooming && last > 0 && Math.abs(r - last) > 1e-9) {
        // Camera position before this dolly step (dolly moves along the view axis).
        prev.copy(camera.position).sub(controls.target).multiplyScalar(last / r).add(controls.target);
        dir.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
        const shift = zoomShift(prev, controls.target, dir, last, r);
        if (shift) {
          controls.target.add(shift);
          camera.position.add(shift);
        }
      }
      last = camera.position.distanceTo(controls.target);
    };

    el.addEventListener("wheel", onWheel, { capture: true, passive: true });
    el.addEventListener("pointerdown", onDown, { capture: true });
    el.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    controls.addEventListener("change", onChange);
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("pointerdown", onDown, { capture: true });
      el.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      controls.removeEventListener("change", onChange);
    };
  }, [controls, camera, gl]);

  return null;
}
