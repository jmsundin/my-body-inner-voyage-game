#!/usr/bin/env python3
"""Download and build the curated histopathology / microbiology image set.

Reads tools/asset_list.json (hand-curated: Commons file titles plus our own
captions and teaching metadata), re-checks every file's licence against the
Wikimedia Commons API, downloads it, resizes it, and writes:

  assets/path/<world>/<id>.jpg, assets/micro/<world>/<id>.jpg   (max 1400 px)
  assets/.../thumbs/<id>.jpg                                     (max 360 px)
  assets/images.json                                             (manifest)
  assets/CREDITS.md                                              (attribution)

Only public domain, CC0, CC BY and CC BY-SA files are accepted; anything else
aborts the run. Needs Python 3 and Pillow. Run from the repo root:

  python3 tools/fetch_assets.py            # download missing files + rebuild
  python3 tools/fetch_assets.py --force    # re-download everything
"""
import html
import io
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
LIST = os.path.join(ROOT, "tools", "asset_list.json")
API = "https://commons.wikimedia.org/w/api.php"
UA = "InnerVoyageAssetFetcher/1.0 (educational game; https://github.com/jmsundin/my-body-inner-voyage-game)"
FULL_PX, THUMB_PX, QUALITY = 1400, 360, 82

CTX = ssl.create_default_context()
if os.path.exists("/etc/ssl/cert.pem"):  # python.org builds on macOS ship without a CA bundle
    CTX.load_verify_locations("/etc/ssl/cert.pem")


def fetch(url):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=90, context=CTX).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 3 * 2 ** attempt)


def strip_html(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def licence_ok(name):
    n = name.strip().lower()
    if re.search(r"\bn[cd]\b|noncommercial|noderiv|fair use", n):
        return False
    return bool(re.match(r"(public domain|pd\b|pd-|cc0|cc[ -]by(-sa)?([ -]\d(\.\d)?)?( [a-z]{2})?$)", n))


def commons_info(titles):
    info = {}
    for i in range(0, len(titles), 20):
        q = dict(action="query", format="json", formatversion=2, prop="imageinfo",
                 iiprop="url|extmetadata|size", iiurlwidth=1920, titles="|".join(titles[i:i + 20]))
        data = json.loads(fetch(API + "?" + urllib.parse.urlencode(q)))
        norm = {n["to"]: n["from"] for n in data["query"].get("normalized", [])}
        for p in data["query"]["pages"]:
            info[norm.get(p["title"], p["title"])] = p
        time.sleep(1)
    return info


def save_jpeg(im, path, px):
    im = im.copy()
    im.thumbnail((px, px), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)  # no exif= → metadata stripped
    return im.size


def main():
    force = "--force" in sys.argv
    items = json.load(open(LIST, encoding="utf-8"))
    info = commons_info([it["commons_title"] for it in items])
    images = []
    for it in items:
        page = info.get(it["commons_title"])
        if not page or "imageinfo" not in page:
            sys.exit(f"missing on Commons: {it['commons_title']}")
        ii = page["imageinfo"][0]
        em = ii.get("extmetadata", {})
        lic = em.get("LicenseShortName", {}).get("value", "").strip()
        if not licence_ok(lic):
            sys.exit(f"licence not allowed ({lic!r}): {it['commons_title']}")
        lic_url = em.get("LicenseUrl", {}).get("value", "")
        if not lic_url and re.match(r"public domain|pd", lic, re.I):
            lic_url = "https://creativecommons.org/publicdomain/mark/1.0/"
        author = it.get("author") or strip_html(em.get("Artist", {}).get("value", "")) or "Unknown author"
        lic_label = "public domain" if re.match(r"public domain|pd", lic, re.I) else lic

        rel = f"{it['kind']}/{it['world']}"
        full = os.path.join(ASSETS, rel, f"{it['id']}.jpg")
        thumb = os.path.join(ASSETS, rel, "thumbs", f"{it['id']}.jpg")
        if force or not (os.path.exists(full) and os.path.exists(thumb)):
            src = ii.get("thumburl") or ii["url"]
            im = Image.open(io.BytesIO(fetch(src)))
            im = im.convert("RGB")
            save_jpeg(im, full, FULL_PX)
            save_jpeg(im, thumb, THUMB_PX)
            print("got", it["id"])
            time.sleep(0.5)
        w, h = Image.open(full).size

        rec = {k: it[k] for k in ("id", "kind", "world")}
        rec.update({k: it.get(k) for k in ("tissue", "condition")})
        if it["kind"] == "micro":
            rec["organism"] = it.get("organism")
        rec.update({k: it.get(k) for k in ("stain", "magnification")})
        rec.update({
            "file": f"{rel}/{it['id']}.jpg",
            "thumb": f"{rel}/thumbs/{it['id']}.jpg",
            "width": w, "height": h,
            "caption": it.get("caption"),
            "look_for": it.get("look_for", []),
            "tags": it.get("tags", []),
            "source_url": page.get("canonicalurl") or ii["descriptionurl"],
            "original_url": ii["url"].split("?")[0],
            "author": author,
            "license": lic,
            "license_url": lic_url,
            "credit": f"{author}, {lic_label}, via Wikimedia Commons",
        })
        images.append(rec)

    manifest = {"version": 1, "generated": time.strftime("%Y-%m-%d"), "images": images}
    with open(os.path.join(ASSETS, "images.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
        f.write("\n")
    write_credits(images)
    print(f"{len(images)} images")


def md(s):
    return (s or "").replace("|", "\\|")


def write_credits(images):
    lines = [
        "# Image credits",
        "",
        "Histopathology and microbiology images used by Inner Voyage. Every file comes from",
        "Wikimedia Commons and is in the public domain or under a Creative Commons licence",
        "(CC0, CC BY or CC BY-SA). The images were resized and re-encoded as JPEG; no other",
        "changes were made. Captions are our own.",
        "",
        "Images marked CC BY-SA remain under that licence (share-alike): reuse of those",
        "files, including our resized copies, must keep the same licence and credit the",
        "author. CC BY images require attribution as shown. This list is generated from",
        "`assets/images.json` by `tools/fetch_assets.py`.",
        "",
        "| Image | World | Author | Licence | Source |",
        "|---|---|---|---|---|",
    ]
    for im in images:
        lic = f"[{md(im['license'])}](<{im['license_url']}>)" if im["license_url"] else md(im["license"])
        lines.append(f"| `{im['file']}` | {im['world']} | {md(im['author'])} | {lic} | [Commons](<{im['source_url']}>) |")
    with open(os.path.join(ASSETS, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
