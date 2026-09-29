/** Render layers in display order. Must match scripts/anatomy/build_registry.py LAYER_ORDER. */
export const LAYER_IDS = [
  "skin",
  "muscles",
  "skeleton",
  "organs",
  "arteries",
  "veins",
  "nervous",
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export const LAYER_LABELS: Record<LayerId, string> = {
  skin: "Skin",
  muscles: "Muscles",
  skeleton: "Skeleton",
  organs: "Organs",
  arteries: "Arteries",
  veins: "Veins",
  nervous: "Nervous system",
};

export type Side = "left" | "right" | "midline";

/** One selectable mesh element from BodyParts3D. */
export interface StructureInfo {
  /** Mesh element id in the GLB (BodyParts3D "FJ" file id). */
  mesh: string;
  /** Stable structure id (Section 12). */
  id: string;
  name: string;
  layer: LayerId;
  /** Patient's side. "midline" = no body side. */
  side: Side;
  /** Organ group this element belongs to, if any. */
  group?: string;
}

/** A multi-mesh organ selectable as one structure (e.g. heart, liver). */
export interface OrganGroup {
  id: string;
  name: string;
  side: Side;
  members: string[];
}

/**
 * Selection key: a mesh element id ("FJ3147") or an organ group
 * ("group:heart"). Groups are prefixed so the two never collide.
 */
export type SelectionKey = string;

export const groupKey = (id: string): SelectionKey => `group:${id}`;

export interface AnatomyIndex {
  structures: Map<string, StructureInfo>;
  groups: Map<string, OrganGroup>;
  /** Meshes sharing one structure's name and layer (a structure split into pieces). */
  pieces: Map<string, string[]>;
}

export type QualityTier = "low" | "high";

export type LayerStatus = "idle" | "loading" | "ready" | "error";

/** Shape of public/anatomy/body/structures.json (compact, generated). */
export interface StructureIndexFile {
  layers: string[];
  fields: string[];
  items: [string, string, string, number, string, number][];
  groups: [string, string, string, string[]][];
}
