import { groupKey, type AnatomyIndex, type SelectionKey } from "@/lib/anatomy/types";
import type { SelectionInfo } from "@/lib/anatomy/structures";
import type { DetailOrgan } from "@/lib/anatomy/detailOrgans";

/**
 * Links finding structure ids (stable ids, Section 12) to the body model:
 * an organ-group id ("liver") or a structure id ("right_kidney").
 */
export function structureExists(index: AnatomyIndex, id: string): boolean {
  if (index.groups.has(id)) return true;
  for (const s of index.structures.values()) if (s.id === id) return true;
  return false;
}

/** Mesh element ids that draw a structure id. */
export function meshesForStructure(index: AnatomyIndex, id: string): string[] {
  const group = index.groups.get(id);
  if (group) return group.members;
  const out: string[] = [];
  for (const s of index.structures.values()) if (s.id === id) out.push(s.mesh);
  return out;
}

/** Selection key that selects a structure id in the body view. */
export function selectionKeyFor(index: AnatomyIndex, id: string): SelectionKey | null {
  if (index.groups.has(id)) return groupKey(id);
  for (const s of index.structures.values()) if (s.id === id) return s.mesh;
  return null;
}

export function structureName(index: AnatomyIndex | null, id: string): string {
  const g = index?.groups.get(id);
  if (g) return g.name;
  if (index) for (const s of index.structures.values()) if (s.id === id) return s.name;
  return id.replace(/_/g, " ");
}

/** Structure ids a selection stands for (itself and its organ group). */
export function structureIdsOfSelection(index: AnatomyIndex, selection: SelectionInfo | null, organ?: DetailOrgan): string[] {
  const ids = new Set<string>(organ?.bodyIds ?? []);
  if (selection) {
    if (selection.isGroup && selection.group) ids.add(selection.group.id);
    const s = index.structures.get(selection.key);
    if (s) {
      ids.add(s.id);
      if (s.group) ids.add(s.group);
    }
  }
  return [...ids];
}
