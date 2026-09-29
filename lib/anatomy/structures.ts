import { withBase } from "@/lib/basePath";
import {
  LAYER_IDS,
  groupKey,
  type AnatomyIndex,
  type LayerId,
  type OrganGroup,
  type SelectionKey,
  type Side,
  type StructureIndexFile,
  type StructureInfo,
} from "./types";

const SIDES: Record<string, Side> = { l: "left", r: "right", m: "midline" };
const GROUP_PREFIX = "group:";

function isLayerId(value: unknown): value is LayerId {
  return typeof value === "string" && (LAYER_IDS as readonly string[]).includes(value);
}

/** Validate and expand the compact generated index. Throws on malformed data. */
export function parseStructureIndex(data: unknown): AnatomyIndex {
  const file = data as StructureIndexFile;
  if (!file || !Array.isArray(file.items) || !Array.isArray(file.layers) || !Array.isArray(file.groups)) {
    throw new Error("Anatomy index is malformed.");
  }
  const groups = new Map<string, OrganGroup>();
  const groupIds: string[] = [];
  for (const [id, name, side, members] of file.groups) {
    const s = SIDES[side];
    if (!id || !name || !s || !Array.isArray(members)) throw new Error(`Anatomy group invalid: ${id}`);
    groups.set(id, { id, name, side: s, members });
    groupIds.push(id);
  }
  const structures = new Map<string, StructureInfo>();
  for (const row of file.items) {
    const [mesh, id, name, layerIdx, side, groupIdx] = row;
    const layer = file.layers[layerIdx];
    const s = SIDES[side];
    if (!isLayerId(layer) || !s || !mesh || !id) throw new Error(`Anatomy index row invalid: ${mesh}`);
    const info: StructureInfo = { mesh, id, name, layer, side: s };
    if (groupIdx >= 0) {
      const g = groupIds[groupIdx];
      if (!g) throw new Error(`Anatomy index row has unknown group: ${mesh}`);
      info.group = g;
    }
    structures.set(mesh, info);
  }
  const byName = new Map<string, string[]>();
  for (const s of structures.values()) {
    const k = pieceKey(s);
    const list = byName.get(k);
    if (list) list.push(s.mesh);
    else byName.set(k, [s.mesh]);
  }
  const pieces = new Map<string, string[]>();
  for (const s of structures.values()) pieces.set(s.mesh, byName.get(pieceKey(s)) ?? [s.mesh]);
  return { structures, groups, pieces };
}

const pieceKey = (s: StructureInfo) => `${s.name}|${s.layer}`;

export async function loadStructureIndex(url = withBase("/anatomy/body/structures.json")) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Anatomy index request failed (${res.status}).`);
  return parseStructureIndex(await res.json());
}

export function isGroupKey(key: SelectionKey) {
  return key.startsWith(GROUP_PREFIX);
}

/** What the user sees for a selection key. */
export interface SelectionInfo {
  key: SelectionKey;
  name: string;
  side: Side;
  /** Layers the selection's meshes live in. */
  layers: LayerId[];
  /** Mesh element ids to highlight. */
  meshes: string[];
  /** Group the selection belongs to (for parts), or the group itself. */
  group?: OrganGroup;
  isGroup: boolean;
}

export function describeSelection(index: AnatomyIndex, key: SelectionKey | null): SelectionInfo | null {
  if (!key) return null;
  if (isGroupKey(key)) {
    const g = index.groups.get(key.slice(GROUP_PREFIX.length));
    if (!g) return null;
    const layers = [...new Set(g.members.map((m) => index.structures.get(m)?.layer).filter(isLayerId))];
    return { key, name: g.name, side: g.side, layers, meshes: g.members, group: g, isGroup: true };
  }
  const s = index.structures.get(key);
  if (!s) return null;
  const group = s.group ? index.groups.get(s.group) : undefined;
  const meshes = index.pieces.get(key) ?? [key];
  return { key, name: s.name, side: s.side, layers: [s.layer], meshes, group, isGroup: false };
}

/**
 * Tap behaviour: the first tap on a mesh that belongs to an organ selects the
 * whole organ; tapping the same organ again drills down to the tapped part.
 */
export function selectionForTap(
  index: AnatomyIndex | null,
  mesh: string,
  current: SelectionKey | null,
): SelectionKey | null {
  const g = index?.structures.get(mesh)?.group;
  // A piece of an already-selected structure counts as that structure.
  const samePart = current !== null && (current === mesh || (index?.pieces.get(mesh) ?? []).includes(current));
  if (!g) return samePart ? null : mesh;
  const gk = groupKey(g);
  if (current === gk) return mesh; // drill down
  if (samePart) return null; // tap the selected part again: deselect
  return gk;
}

export interface DetailPart {
  /** Mesh key of the first piece; select it to highlight all its pieces. */
  key: SelectionKey;
  name: string;
  layer: LayerId;
}

/**
 * Named parts that the model really contains for a selection (Section 104:
 * never show more parts than the model has). A structure split into several
 * mesh pieces counts as one part. Single structures return one part.
 */
export function detailParts(index: AnatomyIndex, selection: SelectionInfo): DetailPart[] {
  const seen = new Set<string>();
  const parts: DetailPart[] = [];
  for (const mesh of selection.meshes) {
    const s = index.structures.get(mesh);
    if (!s || seen.has(pieceKey(s))) continue;
    seen.add(pieceKey(s));
    parts.push({ key: s.mesh, name: s.name, layer: s.layer });
  }
  return parts.sort((a, b) => a.name.localeCompare(b.name));
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface SearchResult {
  key: SelectionKey;
  name: string;
  /** Layer label source: a layer id, or "organ" for groups. */
  kind: LayerId | "organ";
}

/**
 * Search organs and structures by name. Every query word must appear as a
 * word prefix. Ranked: organs first on ties, exact name, prefix, shorter.
 */
export function searchStructures(index: AnatomyIndex, query: string, limit = 12): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(" ");
  const scored: { r: SearchResult; score: number }[] = [];
  const consider = (r: SearchResult, bonus: number) => {
    const name = normalize(r.name);
    const tokens = name.split(" ");
    if (!words.every((w) => tokens.some((t) => t.startsWith(w)))) return;
    // Ignore a leading "left"/"right" so "kidney" ranks "Right kidney" first.
    const core = name.replace(/^(left|right) /, "");
    const rank = name === q || core === q ? 0 : core.startsWith(q) || name.startsWith(q) ? 1 : 2;
    scored.push({ r, score: rank * 1000 + name.length - bonus });
  };
  for (const g of index.groups.values()) consider({ key: groupKey(g.id), name: g.name, kind: "organ" }, 1);
  const seen = new Set<string>();
  for (const s of index.structures.values()) {
    // Structures split into several meshes share a name; list each name once.
    const dedupe = `${s.name}|${s.layer}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    consider({ key: s.mesh, name: s.name, kind: s.layer }, 0);
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.r);
}
