import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { zoomShift } from "@/components/anatomy/ZoomToPointer";

describe("zoom towards the pointer", () => {
  const target = new Vector3(0, 0.8, 0);
  const prev = new Vector3(0, 0.8, 3); // camera looking at target along -Z
  const point = new Vector3(0.2, 1.5, 0); // e.g. the skull, above the orbit centre
  const dir = point.clone().sub(prev).normalize();

  it("keeps the point under the pointer on the same view ray", () => {
    const next = 1.5; // halve the distance
    const shift = zoomShift(prev, target, dir, 3, next)!;
    const cam = prev.clone().sub(target).multiplyScalar(next / 3).add(target).add(shift);
    const newTarget = target.clone().add(shift);
    // The point stays in front of the camera at the same angle (same screen spot).
    const ray = point.clone().sub(cam).normalize();
    expect(ray.distanceTo(dir)).toBeLessThan(1e-9);
    // The orbit centre moved towards the point.
    expect(newTarget.distanceTo(point)).toBeLessThan(target.distanceTo(point));
  });

  it("does nothing for a pointer at the centre", () => {
    const centre = target.clone().sub(prev).normalize();
    expect(zoomShift(prev, target, centre, 3, 1.5)!.length()).toBeLessThan(1e-9);
  });

  it("ignores rays that do not cross the orbit plane", () => {
    expect(zoomShift(prev, target, new Vector3(1, 0, 0), 3, 1.5)).toBeNull();
  });
});