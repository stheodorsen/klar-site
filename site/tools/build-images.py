#!/usr/bin/env python3
"""Derive the site's responsive photography from the handoff PNGs.

The handoff ships 4.6-7.5 MB PNGs at print-ish resolution. Each one is
pre-cropped here to the aspect ratio it is displayed at (using the
object-position from the design so the framing is unchanged), then written
out as WebP + JPEG at the widths the layout actually requests.

Re-run after replacing anything in design_handoff_klar_site/assets/.
"""

import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "design_handoff_klar_site" / "assets"
OUT = ROOT / "site" / "assets" / "img"

# name, source, display aspect (w/h), object-position (x%, y%), output widths
#
# Aspects come from the handoff's 1440 composition. The hero and HVERDAGSØL
# panels are each half of the page (720) by min-height 820; the freshness photo
# cards are half the 1280 content width less the 32 gap (624) by 380.
# A `trim` entry removes something from the source before the aspect crop. Only
# the hero needs one: its generator left a four-pointed watermark on the table at
# x 1636-1731, y 1896-1990, baked into the pixels. Cutting the frame at y=1890
# drops it, at the cost of the hop cone and some foreground.
#
# A later re-shoot put the watermark somewhere cheaper to crop, but its label
# typography came out corrupt — "eko" for "øko", "dnk fer" for "drik før", and a
# space for the middot in the batch line — so it was rejected. Clean Danish on the
# can beats a cheaper crop.
#
# Painting it out would be preferable in principle, but nothing in PIL does
# content-aware fill convincingly on textured wood: diffusion leaves a
# featureless rectangle, donor patches break the table's specular streak, and
# both read worse than the crop. The source file is left untouched, so a clean
# re-export only needs this trim deleted.
JOBS = [
    # hero, right half of the fold
    ("haze", "haze-klar.png", 720 / 820, (0.50, 0.50), [480, 720, 960, 1280],
     (0, 0, 1920, 1890)),
    # HVERDAGSØL, mirrored to the left half
    ("kitchen", "hero-kitchen-klar.png", 720 / 820, (0.38, 0.74), [480, 720, 960, 1280], None),
    # the two freshness cards
    ("bike", "bike-klar.png", 624 / 380, (0.50, 0.42), [420, 640, 880, 1248], None),
    ("doorstep", "doorstep-klar.png", 624 / 380, (0.52, 0.62), [420, 640, 880, 1248], None),
    # The hop yard, a full-bleed band closing VI BRYGGER EFTER ÅRSTIDEN. Its
    # generator left the same four-pointed sparkle the hero had, here at
    # x 2541-2631, y 1240-1340; the frame is cut at x=2535 to drop it, costing
    # 10% off the right edge and nothing of the composition — the receding rows
    # and the path stay centred.
    #
    # It fills the right half of its section at full height, like the hero's
    # photograph, so the display box is portrait: 640x722 at 1280x800 is 0.886,
    # 960x1002 at 1920x1080 is 0.958. Cut at 0.90, in the middle of that range,
    # so cover trims a hair either way and never upscales. The crop keeps the
    # full frame height — sky, horizon, farmhouse, rows and path — and takes
    # 55% of the width centred on the path, which is the composition's spine.
    ("hops", "hops.png", 0.90, (0.50, 0.50), [480, 720, 960, 1280],
     (0, 0, 2535, 1536)),
    # The office friday bar — the first photograph that shows the product as it
    # is actually sold, keg and tap. Its source is already watermark-cropped and
    # branded by tools/brand-photo.py, so no trim here. Cut to 1.91:1 for the
    # link preview, biased upward so the chalkboard keeps its headroom.
    # The office friday bar — the only photograph that shows the product as it
    # is actually sold, keg and tap. Its generator left the same four-pointed
    # sparkle the others had, at x 2435-2623, y 1083-1343; the frame is cut at
    # x=2430 to drop it, which costs the right-hand end of the shared table and
    # nothing of the subject.
    #
    # The keg and the blackboard are deliberately UNBRANDED. Compositing a Klar
    # label onto them was tried and rejected (30.07.2026) — see site/README.md.
    ("friday", "friday.png", 1200 / 630, (0.50, 0.30),
     [640, 960, 1200, 1600], (0, 0, 2430, 1536)),
    # The same photograph again, cut for the full-bleed band in PRØV ET FAD:
    # wider than the link-preview crop, and biased higher so the blackboard and
    # the window keep their headroom. Widths go to 1920 because the band spans
    # the viewport rather than a content column.
    ("fridayband", "friday.png", 2.2, (0.50, 0.23),
     [640, 960, 1280, 1600, 1920], (0, 0, 2430, 1536)),
]


def crop_to_aspect(im, aspect, pos):
    """Crop to `aspect`, keeping the region CSS object-fit:cover would show."""
    w, h = im.size
    if w / h > aspect:  # too wide -> trim the sides
        new_w = round(h * aspect)
        left = round((w - new_w) * pos[0])
        box = (left, 0, left + new_w, h)
    else:  # too tall -> trim top/bottom
        new_h = round(w / aspect)
        top = round((h - new_h) * pos[1])
        box = (0, top, w, top + new_h)
    return im.crop(box)


def main():
    if not SRC.is_dir():
        sys.exit(f"source assets not found: {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)

    # Optional job filter, so replacing one photograph does not rewrite the
    # other three — re-encoding them under a different Pillow build would show
    # up as a diff on files nobody touched.
    wanted = set(sys.argv[1:])
    jobs = [j for j in JOBS if not wanted or j[0] in wanted]
    if wanted:
        unknown = wanted - {j[0] for j in JOBS}
        if unknown:
            sys.exit(f"unknown job(s): {', '.join(sorted(unknown))}")

    total_src = total_out = 0
    for name, filename, aspect, pos, widths, trim in jobs:
        src = SRC / filename
        total_src += src.stat().st_size
        im = Image.open(src).convert("RGB")
        if trim:
            im = im.crop(trim)
            print(f"{name}: trimmed to {im.size[0]}x{im.size[1]} before cropping")
        base = crop_to_aspect(im, aspect, pos)

        for width in widths:
            if width > base.width:
                continue
            height = round(width * base.height / base.width)
            im = base.resize((width, height), Image.LANCZOS)

            webp = OUT / f"{name}-{width}.webp"
            jpg = OUT / f"{name}-{width}.jpg"
            im.save(webp, "WEBP", quality=76, method=6)
            im.save(jpg, "JPEG", quality=80, optimize=True, progressive=True)
            total_out += webp.stat().st_size + jpg.stat().st_size
            print(f"  {webp.name:22} {webp.stat().st_size // 1024:>5} kB"
                  f"   {jpg.name:21} {jpg.stat().st_size // 1024:>5} kB")

        print(f"{name}: crop {base.size[0]}x{base.size[1]} (aspect {aspect:.3f})")

    print(f"\nsource {total_src / 1e6:.1f} MB  ->  derived {total_out / 1e6:.2f} MB "
          f"across both formats")


if __name__ == "__main__":
    main()
