"""Index BodyParts3D OBJ elements: FJ id -> FMA id, name, bounds (mm), triangle count.

Input : assets-src/bp3d/isa_BP3D_4.0_obj_99.zip  (official archive, CC BY-SA 2.1 JP)
Output: assets-src/bp3d/elements.json
Run   : python scripts/anatomy/index_elements.py
"""
import json
import re
import sys
import zipfile
from pathlib import Path

SRC = Path("assets-src/bp3d")
ZIP = SRC / "isa_BP3D_4.0_obj_99.zip"
HEADER = re.compile(r"# ([^:\n]+?) : (.*)")
VERTEX = re.compile(r"^v (\S+) (\S+) (\S+)", re.M)


def main() -> None:
    if not ZIP.exists():
        raise SystemExit(
            f"missing {ZIP}. Download it from "
            "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip"
        )
    obj_dir = SRC / "obj"
    if not (obj_dir / "isa_BP3D_4.0_obj_99").exists():
        with zipfile.ZipFile(ZIP) as z:
            z.extractall(obj_dir)
        print(f"extracted meshes to {obj_dir}")
    elements = {}
    with zipfile.ZipFile(ZIP) as z:
        for info in z.infolist():
            if not info.filename.endswith(".obj"):
                continue
            text = z.read(info).decode("utf-8", "ignore")
            head = dict((k.strip(), v.strip()) for k, v in HEADER.findall(text[:2000]))
            verts = [tuple(map(float, m)) for m in VERTEX.findall(text)]
            bounds = [min(v[k] for v in verts) for k in range(3)] + [
                max(v[k] for v in verts) for k in range(3)
            ]
            elements[head["File ID"]] = {
                "fma": head["Concept ID"],
                "name": head["English name"],
                "bounds": [round(b, 2) for b in bounds],
                "tris": len(re.findall(r"^f ", text, re.M)),
            }
    (SRC / "elements.json").write_text(json.dumps(elements, indent=1))
    print(f"indexed {len(elements)} elements")

    probe = set(a.lower() for a in sys.argv[1:]) or {
        "right kidney", "left kidney", "heart", "liver", "spleen",
        "right femur", "left lens", "stomach", "skin",
    }
    for fj, e in elements.items():
        if e["name"].lower() in probe:
            b = e["bounds"]
            c = [(b[i] + b[i + 3]) / 2 for i in range(3)]
            print(f"{e['name']:14} {fj:7} {e['fma']:9} centre x={c[0]:7.1f} y={c[1]:7.1f} z={c[2]:7.1f} tris={e['tris']}")


if __name__ == "__main__":
    main()
