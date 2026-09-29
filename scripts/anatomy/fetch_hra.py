"""Download HRA (HuBMAP Human Reference Atlas) reference organs into assets-src/hra/<organ>/.

Usage: python scripts/anatomy/fetch_hra.py kidney-male-left kidney-male-right ...
Source: https://github.com/hubmapconsortium/hra-kg (digital-objects/ref-organ), CC BY 4.0.
Downloads the latest version's GLB, crosswalk.csv and metadata.yaml, and refuses
anything whose metadata does not state CC BY 4.0.

Files are fetched through the GitHub contents API in raw mode (works for files
up to 100 MB and when raw.githubusercontent.com is unreachable). Unauthenticated
API use is limited to 60 requests per hour; about 4 requests are used per organ.
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

REPO = "https://api.github.com/repos/hubmapconsortium/hra-kg/contents/digital-objects/ref-organ/"
OUT = Path("assets-src/hra")


def get(url: str, raw: bool = False) -> bytes:
    headers = {"Accept": "application/vnd.github.raw" if raw else "application/vnd.github+json",
               "User-Agent": "anatomylens-asset-fetch"}
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read()
        except OSError as e:
            if attempt == 4:
                raise
            wait = 2 ** attempt
            print(f"  retry in {wait}s after: {e}")
            time.sleep(wait)
    raise AssertionError("unreachable")


def latest(organ: str) -> str:
    versions = [v["name"] for v in json.loads(get(REPO + organ))]
    return max(versions, key=lambda v: [int(x) for x in re.findall(r"\d+", v)])


def main():
    for organ in sys.argv[1:]:
        dest = OUT / organ
        if (dest / "VERSION").exists():
            print(f"{organ}: already downloaded ({(dest / 'VERSION').read_text()})")
            continue
        version = latest(organ)
        base = f"{REPO}{organ}/{version}/raw"
        files = json.loads(get(base))
        dest.mkdir(parents=True, exist_ok=True)
        meta = get(f"{base}/metadata.yaml", raw=True).decode("utf-8")
        if "CC BY 4.0" not in meta:
            raise SystemExit(f"{organ}: license is not CC BY 4.0, refusing")
        (dest / "metadata.yaml").write_text(meta, encoding="utf-8")
        for f in files:
            if f["name"].endswith((".glb", ".csv")):
                data = get(f"{base}/{f['name']}", raw=True)
                if len(data) != f["size"]:
                    raise SystemExit(f"{organ}/{f['name']}: size {len(data)} != {f['size']}")
                (dest / f["name"]).write_bytes(data)
        (dest / "VERSION").write_text(version)
        print(f"{organ} {version} -> {dest}")


if __name__ == "__main__":
    main()
