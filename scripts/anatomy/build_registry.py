"""Build the anatomy structure registry from BodyParts3D.

Every mesh element (FJ id) is assigned to exactly one render layer using the
FMA IS-A classes it belongs to, first match in LAYER_RULES wins. The PART-OF
tree provides the body region and the compound structures (for example
"heart" = 83 elements) that are selectable as a whole.

Outputs (committed, reviewed data):
  data/anatomy/layers.json        layer -> [element ids]
  data/anatomy/structures.json    element registry (id, fma, name, layer, side, bounds)

Run: python scripts/anatomy/build_registry.py [--report]
"""
import collections
import csv
import json
import re
import sys
from pathlib import Path

SRC = Path("assets-src/bp3d")
OUT = Path("data/anatomy")

# (layer id, FMA IS-A ancestor classes). Order matters: first match wins.
# Matched against the element's own concept plus all of its IS-A ancestors.
LAYER_RULES = [
    ("skin", {
        "FMA7163",    # skin
        "FMA71012",   # skin appendage (hair of head, eyebrow, ...)
    }),
    ("nervous", {
        "FMA7157",    # nervous system
        "FMA50801",   # brain
        "FMA7647",    # spinal cord
        "FMA65132",   # nerve
        "FMA5865",    # cranial nerve
        "FMA256237",  # segment of neuraxis
        "FMA83143",   # cell part cluster of neuraxis
        "FMA11195",   # segment of neural tree organ
        "FMA83153",   # organ component of neuraxis (thalamus, ...)
        "FMA242193",  # region of cerebral cortex (hippocampus, ...)
        "FMA242789",  # region of ventricular system of neuraxis
        "FMA242770",  # region of wall of ventricular system (choroid plexus)
        "FMA84081",   # circumventricular organ of neuraxis (pineal body)
    }),
    ("arteries", {
        "FMA50720",   # artery
        "FMA66326",   # pulmonary artery
        "FMA86187",   # segment of arterial tree organ
        "FMA30313",   # arterial trunk
        "FMA63812",   # set of arteries
        "FMA66332",   # zone of artery
    }),
    ("veins", {
        "FMA50723",   # vein
        "FMA66643",   # pulmonary vein
        "FMA86188",   # segment of venous tree organ
        "FMA30314",   # venous trunk
        "FMA63814",   # set of veins
        "FMA22917",   # tributary of venous anastomosis
    }),
    ("muscles", {
        "FMA5022",    # muscle organ
        "FMA9721",    # tendon
        "FMA85453",   # head of muscle organ
        "FMA10474",   # zone of muscle organ
        "FMA32558",   # musculature
        "FMA57965",   # zone of investing fascia (iliotibial tract)
        "FMA7646",    # retinaculum
        "FMA9649",    # decussation (linea alba)
    }),
    ("skeleton", {
        "FMA5018",    # bone organ
        "FMA12516",   # tooth
        "FMA55107",   # cartilage organ
        "FMA7538",    # cartilage organ component
        "FMA21496",   # ligament organ
        "FMA86375",   # ligament organ component
        "FMA54839",   # interosseous membrane
    }),
]
# Regional parts of muscles ("Descending part of left trapezius") have no
# IS-A link to "muscle organ" in BodyParts3D 4.0. They are recognised by name:
# "<part> of <X>" where <X> is itself a muscle in this model.
MUSCLE_PART = re.compile(r"^(?:[a-z-]+ )*(?:part|head|belly|portion|fibres|fibers|slip) of (.+)$")
DEFAULT_LAYER = "organs"
LAYER_ORDER = ["skin", "muscles", "skeleton", "organs", "arteries", "veins", "nervous"]
# Minimum distance from the midline for a body-side label (see main()).
LATERAL_MIN_MM = 25

# PART-OF regions, most specific listed first.
REGION_RULES = [
    ("head", "FMA7154"),
    ("neck", "FMA7155"),
    ("thorax", "FMA9576"),
    ("abdomen", "FMA9577"),
    ("pelvis", "FMA9578"),
    ("upper_limb", "FMA7183"),
    ("lower_limb", "FMA7184"),
]


def read_tsv(name):
    with open(SRC / name, encoding="utf-8") as f:
        return list(csv.reader(f, delimiter="\t"))[1:]


def compounds(name):
    comp = collections.defaultdict(set)
    names = {}
    for cid, cname, fj in read_tsv(name):
        comp[cid].add(fj)
        names[cid] = cname
    return comp, names


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def side_of(name: str, all_names: set) -> str:
    """Patient's side for paired structures only.

    A structure is paired when its mirror name (left <-> right) also exists,
    e.g. "Left kidney" / "Right kidney". Names such as "Posterior
    interventricular branch of right coronary artery" mention a side of a
    parent structure, not of the body, so they are unpaired ("midline" here
    means "no body side", not "on the midline").
    BodyParts3D: patient's left is x > 0 (coordinate_system.png).
    """
    n = name.lower()
    has_left, has_right = bool(re.search(r"\bleft\b", n)), bool(re.search(r"\bright\b", n))
    if has_left == has_right:
        return "midline"
    mirror = re.sub(r"\bleft\b", "right", n) if has_left else re.sub(r"\bright\b", "left", n)
    if mirror not in all_names:
        return "midline"
    return "left" if has_left else "right"


def inclusion_parents(name):
    up = collections.defaultdict(set)
    names = {}
    for pid, pname, cid, cname in read_tsv(name):
        up[cid].add(pid)
        names[pid], names[cid] = pname, cname
    return up, names


def ancestors(up, cid):
    seen, stack = set(), [cid]
    while stack:
        for p in up.get(stack.pop(), ()):
            if p not in seen:
                seen.add(p)
                stack.append(p)
    return seen


def main():
    elements = json.loads((SRC / "elements.json").read_text())
    isa, _ = compounds("isa_element_parts.txt")
    partof, partof_names = compounds("partof_element_parts.txt")
    isa_up, isa_names = inclusion_parents("isa_inclusion_relation_list.txt")
    concept_names = {cid: n for cid, _rep, n in read_tsv("isa_parts_list_e.txt")}
    concept_names.update(isa_names)

    element_classes = collections.defaultdict(set)
    for cid, fjs in isa.items():
        for fj in fjs:
            element_classes[fj].add(cid)
    for fj, e in elements.items():
        element_classes[fj] |= ancestors(isa_up, e["fma"])
        if not e["name"]:
            e["name"] = concept_names.get(e["fma"], "").strip()
            e["name"] = e["name"][:1].upper() + e["name"][1:]
        if not e["name"]:
            # No name anywhere in the source: label by the most specific
            # IS-A class that contains this element, and say it is unlabelled.
            owning = [c for c, fjs in isa.items() if fj in fjs]
            best = min(owning, key=lambda c: len(isa[c]), default=None)
            cls = concept_names.get(best, "structure") if best else "structure"
            e["name"] = f"{cls[:1].upper()}{cls[1:]} (unlabelled part)"
            e["unlabelled"] = True

    corrections = {
        c["mesh"]: c for c in json.loads((OUT / "laterality_corrections.json").read_text())["corrections"]
    }
    for fj, c in corrections.items():
        e = elements[fj]
        if e["name"] != c["sourceName"]:
            raise SystemExit(f"laterality correction for {fj} no longer matches source name {e['name']!r}")
        old, new = ("Left", "Right") if c["correctedSide"] == "right" else ("Right", "Left")
        e["name"] = re.sub(rf"\b{old}\b", new, e["name"], count=1)
        e["name"] = re.sub(rf"\b{old.lower()}\b", new.lower(), e["name"], count=1)
        e["corrected"] = True
    element_regions = collections.defaultdict(set)
    for cid, fjs in partof.items():
        for fj in fjs:
            element_regions[fj].add(cid)

    layers = collections.defaultdict(list)
    registry = {}
    all_names = {e["name"].lower() for e in elements.values()}
    raw_overrides = json.loads((OUT / "layer_overrides.json").read_text())["overrides"]
    layer_overrides = {k.lower(): v for k, v in raw_overrides.items()}
    unknown = [k for k in layer_overrides if k not in all_names] + [
        v for v in layer_overrides.values() if v not in LAYER_ORDER
    ]
    if unknown:
        raise SystemExit(f"layer_overrides.json has unknown names or layers: {unknown}")
    # Names of every muscle concept (IS-A descendants of "muscle organ").
    muscle_names = {
        concept_names.get(c, "").lower()
        for c in concept_names
        if "FMA5022" in ancestors(isa_up, c)
    }
    for fj, e in sorted(elements.items()):
        classes = element_classes[fj] | {e["fma"]}
        layer = next((lid for lid, cls in LAYER_RULES if classes & cls), DEFAULT_LAYER)
        if layer == DEFAULT_LAYER:
            m = MUSCLE_PART.match(e["name"].lower())
            if m and m.group(1) in muscle_names:
                layer = "muscles"
        layer = layer_overrides.get(e["name"].lower(), layer)
        region = next((r for r, cid in REGION_RULES if cid in element_regions[fj]), None)
        side = side_of(e["name"], all_names)
        b = e["bounds"]
        centre_x = (b[0] + b[3]) / 2
        # Body side only when name and geometry agree clearly. Within 25 mm of
        # the midline, "left/right" names a side of an organ (right ventricle,
        # left hepatic duct), not a side of the body.
        if side != "midline" and (abs(centre_x) < LATERAL_MIN_MM or (side == "left") != (centre_x > 0)):
            if abs(centre_x) >= LATERAL_MIN_MM:
                raise SystemExit(f"laterality conflict: {fj} {e['name']!r} at x={centre_x:.0f} mm")
            side = "midline"
        sid = slug(e["name"])
        registry[fj] = {
            "id": sid,
            "fma": e["fma"],
            "name": e["name"],
            "layer": layer,
            "region": region,
            "side": side,
            "bounds": e["bounds"],
            "tris": e["tris"],
        }
        if e.get("unlabelled"):
            registry[fj]["unlabelled"] = True
        if e.get("corrected"):
            registry[fj]["lateralityCorrected"] = True
        layers[layer].append(fj)

    # Organ groups: multi-mesh organs selectable as one structure. Only
    # members in the organ's own tissue layers join; vessels running over
    # the organ (e.g. coronary arteries on the heart) stay separate.
    groups_file = json.loads((OUT / "groups.json").read_text())
    group_of = {}
    for g in groups_file["groups"]:
        members = sorted(
            fj for fj in partof.get(g["fma"], ())
            if fj in registry and registry[fj]["layer"] not in ("arteries", "veins") and fj not in group_of
        )
        if not members:
            raise SystemExit(f"group {g['id']} has no members")
        g["members"] = members
        for fj in members:
            group_of[fj] = g["id"]
            registry[fj]["group"] = g["id"]

    # Stable ids must be unique (Section 12).
    dupes = [k for k, v in collections.Counter(r["id"] for r in registry.values()).items() if v > 1]
    for fj, r in registry.items():
        if r["id"] in dupes:
            r["id"] = f"{r['id']}_{fj.lower()}"

    OUT.mkdir(parents=True, exist_ok=True)
    layer_json = {
        lid: {"elements": sorted(layers[lid]), "tris": sum(elements[f]["tris"] for f in layers[lid])}
        for lid in LAYER_ORDER
    }
    (OUT / "layers.json").write_text(json.dumps(layer_json, indent=1))
    (OUT / "structures.json").write_text(json.dumps(registry, indent=1))

    # Compact runtime index, fetched lazily by the viewer (not bundled into JS).
    group_ids = [g["id"] for g in groups_file["groups"]]
    client = [
        [fj, r["id"], r["name"], LAYER_ORDER.index(r["layer"]), r["side"][0],
         group_ids.index(r["group"]) if "group" in r else -1]
        for fj, r in sorted(registry.items())
    ]
    client_groups = [
        [g["id"], g["name"], g.get("side", "midline")[0], g["members"]] for g in groups_file["groups"]
    ]
    public = Path("public/anatomy/body")
    public.mkdir(parents=True, exist_ok=True)
    (public / "structures.json").write_text(
        json.dumps(
            {
                "layers": LAYER_ORDER,
                "fields": ["mesh", "id", "name", "layer", "side", "group"],
                "items": client,
                "groups": client_groups,
            },
            separators=(",", ":"),
        )
    )

    print(f"{len(registry)} elements, {len(dupes)} duplicate names disambiguated")
    for lid in LAYER_ORDER:
        print(f"  {lid:9} {len(layers[lid]):5} meshes {layer_json[lid]['tris']/1e6:5.2f}M tris")
    no_region = sum(1 for r in registry.values() if r["region"] is None)
    print(f"  without region: {no_region}")

    if "--report" in sys.argv:
        for lid in LAYER_ORDER:
            names = sorted({registry[f]["name"] for f in layers[lid]})
            print(f"\n[{lid}] sample:", "; ".join(names[:: max(1, len(names) // 25)]))


if __name__ == "__main__":
    main()
