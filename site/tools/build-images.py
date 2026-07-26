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

    total_src = total_out = 0
    for name, filename, aspect, pos, widths, trim in JOBS:
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
