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
JOBS = [
    # hero: 600x700 box on desktop, full-bleed on mobile
    ("haze", "haze-klar.png", 6 / 7, (0.26, 0.58), [480, 720, 960, 1280]),
    # heritage panel: 592x560 box
    ("kitchen", "hero-kitchen-klar.png", 592 / 560, (0.38, 0.74), [480, 720, 960, 1280]),
    # delivery cards: 405x280 box
    ("bike", "bike-klar.png", 405 / 280, (0.50, 0.42), [420, 640, 860]),
    ("doorstep", "doorstep-klar.png", 405 / 280, (0.52, 0.62), [420, 640, 860]),
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
    for name, filename, aspect, pos, widths in JOBS:
        src = SRC / filename
        total_src += src.stat().st_size
        base = crop_to_aspect(Image.open(src).convert("RGB"), aspect, pos)

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
