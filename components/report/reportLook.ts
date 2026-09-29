import { Box3, Color, Mesh, type MeshPhysicalMaterial, type Object3D } from "three";

/** "Reported" look (Section 23), shared by the body and organ views. */
export const REPORTED_COLOR = new Color("#a78bfa");

/**
 * Record a detail mesh's normal look (after part highlighting) and whether it
 * gets the whole-organ reported tint, then apply the reported look.
 */
export function setMeshReportState(mesh: Mesh, tint: boolean) {
  const m = mesh.material as MeshPhysicalMaterial;
  mesh.userData.reportable = true;
  mesh.userData.baseEmissive = m.emissive.clone();
  mesh.userData.baseIntensity = m.emissiveIntensity;
  mesh.userData.reportTint = tint;
  applyMesh(mesh, true);
}

function applyMesh(mesh: Mesh, on: boolean) {
  const m = mesh.material as MeshPhysicalMaterial;
  if (on && mesh.userData.reportTint) {
    m.emissive.copy(REPORTED_COLOR);
    m.emissiveIntensity = 0.26;
  } else if (mesh.userData.baseEmissive) {
    m.emissive.copy(mesh.userData.baseEmissive as Color);
    m.emissiveIntensity = mesh.userData.baseIntensity as number;
  }
}

/**
 * Switch the organ view between its reported and normal look without
 * touching React state (used per half in side-by-side rendering).
 * Only uniforms and visibility change, so no shader recompiles.
 */
export function setReportLook(root: Object3D | null, on: boolean) {
  root?.traverse((o) => {
    if (o.userData.reportMarker) o.visible = on;
    else if (o instanceof Mesh && o.userData.reportable) applyMesh(o, on);
  });
}

/** Bounds of the organ model itself: marker subtrees are skipped. */
export function organBox(root: Object3D, onlyMeshes?: Set<string>): Box3 {
  const box = new Box3();
  root.updateWorldMatrix(true, true);
  const visit = (o: Object3D) => {
    if (o.userData.reportMarker) return;
    if (o instanceof Mesh && (!onlyMeshes || onlyMeshes.has(o.userData.mesh as string))) box.expandByObject(o);
    for (const c of o.children) visit(c);
  };
  visit(root);
  return box;
}
