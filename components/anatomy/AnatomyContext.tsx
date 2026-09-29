"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Mesh, Object3D } from "three";
import { describeSelection, loadStructureIndex, type SelectionInfo } from "@/lib/anatomy/structures";
import { loadDetailOrgans, type DetailOrganIndex } from "@/lib/anatomy/detailOrgans";
import { detectQualityTier } from "@/lib/anatomy/quality";
import {
  LAYER_IDS,
  type AnatomyIndex,
  type LayerId,
  type LayerStatus,
  type QualityTier,
  type SelectionKey,
} from "@/lib/anatomy/types";

export interface AnatomyState {
  visible: Record<LayerId, boolean>;
  status: Record<LayerId, LayerStatus>;
  /** Selected mesh element id or organ group key, or null. */
  selected: SelectionKey | null;
  /** Incremented to request a camera focus on `selected`. */
  focusSeq: number;
  /** Incremented to request a camera reset. */
  resetSeq: number;
  tier: QualityTier | null;
  index: AnatomyIndex | null;
  indexError: string | null;
  /** Viewer level (AGENTS.md Section 103): whole body, or one structure in detail. */
  view: ViewLevel;
  /** Part highlighted inside the detail view (mesh key), or null. */
  detailPart: SelectionKey | null;
  detailStatus: LayerStatus;
  /** Detailed organ models with internal parts (loaded at startup; small index). */
  detailOrgans: DetailOrganIndex | null;
  /** Detail view: outer layers see-through to show internal parts. */
  seeInside: boolean;
}

export type ViewLevel = "body" | "detail";

export type AnatomyAction =
  | { type: "toggleLayer"; layer: LayerId }
  | { type: "layerStatus"; layer: LayerId; status: LayerStatus }
  | { type: "select"; key: SelectionKey | null; focus?: boolean }
  | { type: "focus" }
  | { type: "resetCamera" }
  | { type: "init"; tier: QualityTier }
  | { type: "index"; index: AnatomyIndex }
  | { type: "indexError"; message: string }
  | { type: "openDetail" }
  | { type: "closeDetail" }
  | { type: "detailPart"; key: SelectionKey | null }
  | { type: "detailStatus"; status: LayerStatus }
  | { type: "detailOrgans"; organs: DetailOrganIndex }
  | { type: "toggleSeeInside" };

/** Layers shown on first open: the view people expect from an anatomy atlas. */
export const DEFAULT_VISIBLE: LayerId[] = ["skeleton", "organs"];

export function initialAnatomyState(): AnatomyState {
  const visible = {} as Record<LayerId, boolean>;
  const status = {} as Record<LayerId, LayerStatus>;
  for (const l of LAYER_IDS) {
    visible[l] = DEFAULT_VISIBLE.includes(l);
    status[l] = "idle";
  }
  return {
    visible,
    status,
    selected: null,
    focusSeq: 0,
    resetSeq: 0,
    tier: null,
    index: null,
    indexError: null,
    view: "body",
    detailPart: null,
    detailStatus: "idle",
    detailOrgans: null,
    seeInside: false,
  };
}

export function anatomyReducer(state: AnatomyState, action: AnatomyAction): AnatomyState {
  switch (action.type) {
    case "toggleLayer": {
      const visible = { ...state.visible, [action.layer]: !state.visible[action.layer] };
      const sel = state.index ? describeSelection(state.index, state.selected) : null;
      // Deselect when none of the selection's layers remain visible.
      const selected = sel && !sel.layers.some((l) => visible[l]) ? null : state.selected;
      return { ...state, visible, selected };
    }
    case "layerStatus":
      return { ...state, status: { ...state.status, [action.layer]: action.status } };
    case "select": {
      const sel = state.index ? describeSelection(state.index, action.key) : null;
      let visible = state.visible;
      // Selecting from search must make the structure visible.
      if (sel && !sel.layers.some((l) => visible[l])) {
        visible = { ...visible };
        for (const l of sel.layers) visible[l] = true;
      }
      return {
        ...state,
        visible,
        selected: action.key,
        focusSeq: action.focus ? state.focusSeq + 1 : state.focusSeq,
      };
    }
    case "focus":
      return { ...state, focusSeq: state.focusSeq + 1 };
    case "resetCamera":
      return { ...state, resetSeq: state.resetSeq + 1 };
    case "init":
      return { ...state, tier: action.tier };
    case "index":
      return { ...state, index: action.index, indexError: null };
    case "indexError":
      return { ...state, indexError: action.message };
    case "openDetail":
      if (!state.selected) return state;
      return { ...state, view: "detail", detailPart: null, detailStatus: "loading", seeInside: false };
    case "closeDetail":
      // Selection is kept so the body view comes back as it was (Section 103).
      return { ...state, view: "body", detailPart: null };
    case "detailPart":
      if (state.view !== "detail") return state;
      return { ...state, detailPart: action.key };
    case "detailStatus":
      return state.detailStatus === action.status ? state : { ...state, detailStatus: action.status };
    case "detailOrgans":
      return { ...state, detailOrgans: action.organs };
    case "toggleSeeInside":
      return state.view === "detail" ? { ...state, seeInside: !state.seeInside } : state;
  }
}

interface AnatomyContextValue {
  state: AnatomyState;
  dispatch: Dispatch<AnatomyAction>;
  /** Resolved selection (name, meshes, layers), derived from state. */
  selection: SelectionInfo | null;
  /** Live mesh objects by element id. Mutable registry, not React state. */
  meshes: React.RefObject<Map<string, Mesh>>;
  /** Root of the rendered detail model, for camera framing. */
  detailRoot: React.RefObject<Object3D | null>;
}

const AnatomyContext = createContext<AnatomyContextValue | null>(null);

export function AnatomyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(anatomyReducer, undefined, initialAnatomyState);
  const meshes = useRef(new Map<string, Mesh>());
  const detailRoot = useRef<Object3D | null>(null);

  useEffect(() => {
    dispatch({ type: "init", tier: detectQualityTier() });
    loadStructureIndex()
      .then((index) => dispatch({ type: "index", index }))
      .catch(() =>
        dispatch({ type: "indexError", message: "Anatomy names could not be loaded. The 3D view still works." }),
      );
    // Optional: without it, detail views use the body model's own meshes.
    loadDetailOrgans()
      .then((organs) => dispatch({ type: "detailOrgans", organs }))
      .catch(() => console.warn("Detailed organ models are unavailable."));
  }, []);

  const selection = useMemo(
    () => (state.index ? describeSelection(state.index, state.selected) : null),
    [state.index, state.selected],
  );
  const value = useMemo(() => ({ state, dispatch, selection, meshes, detailRoot }), [state, selection]);
  return <AnatomyContext.Provider value={value}>{children}</AnatomyContext.Provider>;
}

export function useAnatomy() {
  const ctx = useContext(AnatomyContext);
  if (!ctx) throw new Error("useAnatomy must be used inside AnatomyProvider");
  return ctx;
}
