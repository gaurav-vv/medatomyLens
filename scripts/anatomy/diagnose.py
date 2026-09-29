"""Dev helper: diagnose registry issues (unnamed, side mismatches, a structure's ancestors)."""
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

SRC = Path("assets-src/bp3d")
reg = json.loads(Path("data/anatomy/structures.json").read_text())


def tsv(name):
    with open(SRC / name, encoding="utf-8") as f:
        return list(csv.reader(f, delimiter="\t"))[1:]


up = defaultdict(set)
names = {}
for tree in ("isa", "partof"):
    for p, pn, c, cn in tsv(f"{tree}_inclusion_relation_list.txt"):
        if tree == "isa":
            up[c].add(p)
        names[p], names[c] = pn, cn
for tree in ("isa", "partof"):
    for cid, _rep, n in tsv(f"{tree}_parts_list_e.txt"):
        names.setdefault(cid, n)


def anc(c):
    s, st = set(), [c]
    while st:
        for p in up.get(st.pop(), ()):
            if p not in s:
                s.add(p)
                st.append(p)
    return s


print("== unnamed ==")
for fj, r in reg.items():
    if not r["name"]:
        print(fj, r["fma"], names.get(r["fma"]), r["layer"], [names.get(a) for a in list(up.get(r["fma"], []))])

print("\n== side mismatches (|x|>15mm) ==")
bad = []
for fj, r in reg.items():
    b = r["bounds"]
    cx = (b[0] + b[3]) / 2
    if r["side"] != "midline" and abs(cx) > 15 and (r["side"] == "left") != (cx > 0):
        bad.append((r["layer"], r["name"], round(cx)))
print(len(bad), Counter(x[0] for x in bad))
for x in sorted(bad)[:60]:
    print(" ", x)

for q in sys.argv[1:]:
    for fj, r in reg.items():
        if r["name"].lower() == q.lower():
            print(f"\n{q}: {fj} {r['fma']} layer={r['layer']}")
            print("  isa ancestors:", sorted(names.get(a, a) for a in anc(r["fma"]))[:40])
