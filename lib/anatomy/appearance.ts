import appearanceData from "@/data/anatomy/appearance.json";
import type { LayerId } from "./types";

export interface TissueAppearance {
  color: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: string;
  transmission: number;
}

interface AppearanceFile {
  layers: Record<string, Partial<TissueAppearance>>;
  overrides: ({ layer: string; match: string[] } & Partial<TissueAppearance>)[];
  parts: ({ match: string[] } & Partial<TissueAppearance>)[];
}

const DEFAULTS: TissueAppearance = {
  color: "#b3584f",
  roughness: 0.5,
  clearcoat: 0,
  clearcoatRoughness: 0.3,
  sheen: 0,
  sheenColor: "#ffffff",
  transmission: 0,
};

const data = appearanceData as AppearanceFile;

/** Tissue appearance for a structure. Anatomical look only; no medical meaning. */
export function resolveAppearance(layer: LayerId, name: string): TissueAppearance {
  const n = name.toLowerCase();
  const override = data.overrides.find(
    (o) => o.layer === layer && o.match.some((m) => n.includes(m)),
  );
  return { ...DEFAULTS, ...data.layers[layer], ...pickAppearance(override) };
}

function pickAppearance(entry: Partial<TissueAppearance> | undefined): Partial<TissueAppearance> {
  const out: Partial<TissueAppearance> = {};
  if (entry) {
    for (const key of Object.keys(DEFAULTS) as (keyof TissueAppearance)[]) {
      if (entry[key] !== undefined) Object.assign(out, { [key]: entry[key] });
    }
  }
  return out;
}

/** Appearance of a part of a detailed organ model (e.g. "Renal pyramid"). */
export function resolvePartAppearance(name: string): TissueAppearance {
  const n = name.toLowerCase();
  const entry = data.parts.find((p) => p.match.some((m) => n.includes(m)));
  return { ...DEFAULTS, ...data.layers.organs, ...pickAppearance(entry) };
}
