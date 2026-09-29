import { withBase } from "@/lib/basePath";
import type { AnatomyIndex, SelectionKey, Side } from "./types";
import type { SelectionInfo } from "./structures";

/** One named part of a detailed organ model (e.g. "Renal pyramid"). */
export interface DetailOrganPart {
  id: string;
  name: string;
  /** UBERON id from the source crosswalk. */
  ontology: string;
  /** Mesh node names in the organ GLB. */
  meshes: string[];
  /** Outer layer that "See inside" makes see-through. */
  shell: boolean;
}

/** Detailed organ model with internal parts (public/anatomy/organs/index.json). */
export interface DetailOrgan {
  id: string;
  name: string;
  side: Side;
  /** Body-model structure or group ids this organ replaces in the detail view. */
  bodyIds: string[];
  file: string;
  parts: DetailOrganPart[];
}

export interface DetailOrganIndex {
  attribution: string;
  organs: Map<string, DetailOrgan>;
}

const PART_PREFIX = "part:";
export const partKey = (id: string): SelectionKey => `${PART_PREFIX}${id}`;
export const isPartKey = (key: string | null): key is string => !!key && key.startsWith(PART_PREFIX);
export const partIdOf = (key: string) => key.slice(PART_PREFIX.length);

const SIDES = new Set(["left", "right", "midline"]);

/** Validate the generated organ index. Throws on malformed data. */
export function parseDetailOrgans(data: unknown): DetailOrganIndex {
  const file = data as { attribution?: unknown; organs?: unknown };
  if (!file || typeof file.attribution !== "string" || !Array.isArray(file.organs)) {
    throw new Error("Detailed organ index is malformed.");
  }
  const organs = new Map<string, DetailOrgan>();
  for (const raw of file.organs as DetailOrgan[]) {
    if (!raw?.id || !raw.file || !SIDES.has(raw.side) || !Array.isArray(raw.parts) || !Array.isArray(raw.bodyIds)) {
      throw new Error(`Detailed organ entry invalid: ${raw?.id}`);
    }
    for (const bodyId of raw.bodyIds) organs.set(bodyId, raw);
  }
  return { attribution: file.attribution, organs };
}

export async function loadDetailOrgans(url = withBase("/anatomy/organs/index.json")) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Detailed organ index request failed (${res.status}).`);
  return parseDetailOrgans(await res.json());
}

/** The detailed model for a selection, if one exists. */
export function detailOrganFor(
  organs: DetailOrganIndex | null,
  index: AnatomyIndex | null,
  selection: SelectionInfo | null,
): DetailOrgan | undefined {
  if (!organs || !index || !selection) return undefined;
  const bodyId = selection.isGroup ? selection.group?.id : index.structures.get(selection.key)?.id;
  return bodyId ? organs.organs.get(bodyId) : undefined;
}

export function detailOrganUrl(organ: DetailOrgan) {
  return withBase(`/anatomy/organs/${organ.file}`);
}
