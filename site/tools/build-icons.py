#!/usr/bin/env python3
"""Render the favicon set from the micro-mark construction.

Micro spec (brief, "Micro version"): D = 36, S = D/12 = 3, circle centre
D/4 above the horizon, which divides the circle 3:1, overhang 0.25 D each
side. In the shared viewBox coordinates that is:

    circle  cx=50 cy=26 r=18        (D = 36 on the stroke centreline)
    horizon y=35, x 23 -> 77        (lift 9 = D/4, overhang 9 = 0.25 D)

The brief requires these hand-corrected rather than auto-scaled, and
specifically that the horizon be snapped to a whole-pixel boundary at small
sizes -- a half-pixel horizon is what makes small marks look grey. So the
horizon is drawn as an integer-height band on integer boundaries, the circle
is then positioned from the *snapped* horizon so the 3:1 division survives,
and the circle carries the +3% optical compensation over the horizon.

Re-run if the icon sizes change. Not a per-build step: check the output in.
"""

import pathlib

from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parents[1] / "assets" / "icon"

INK = (38, 35, 31)
PAPER = (235, 233, 227)

SS = 8  # supersample factor

# viewBox-space micro-mark construction
CX, CY, R = 50.0, 26.0, 18.0
LINE_Y, LINE_X1, LINE_X2 = 35.0, 23.0, 77.0
S = 3.0
LIFT = LINE_Y - CY  # 9 = D/4

# mark bounding box, outer edge of stroke: 57 x 39
BBOX_X1, BBOX_X2 = LINE_X1 - S / 2, LINE_X2 + S / 2
BBOX_Y1, BBOX_Y2 = CY - R - S / 2, CY + R + S / 2
MARK_W = BBOX_X2 - BBOX_X1
MARK_H = BBOX_Y2 - BBOX_Y1

FILL = 0.86  # mark width as a fraction of the icon


def render(size, fg=INK, bg=None):
    k = FILL * size / MARK_W  # viewBox units -> device px

    horizon_px = max(1, round(S * k))          # whole-pixel horizon
    circle_px = S * k * 1.03                   # +3% optical compensation

    inset_x = (size - MARK_W * k) / 2
    # centre the mark vertically, then snap the horizon band to pixel edges
    top = (size - MARK_H * k) / 2
    y = (LINE_Y - BBOX_Y1) * k + top
    y = round(y - horizon_px / 2) + horizon_px / 2

    cy = y - LIFT * k                          # keep the 3:1 division
    cx = (CX - BBOX_X1) * k + inset_x
    x1 = (LINE_X1 - BBOX_X1) * k + inset_x
    x2 = (LINE_X2 - BBOX_X1) * k + inset_x
    r = R * k

    big = size * SS
    im = Image.new("RGBA", (big, big), (*bg, 255) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    cw = max(1, round(circle_px * SS))
    d.ellipse(
        [(cx - r) * SS + cw / 2, (cy - r) * SS + cw / 2,
         (cx + r) * SS - cw / 2, (cy + r) * SS - cw / 2],
        outline=(*fg, 255), width=cw,
    )

    # horizon: filled band on exact pixel boundaries + semicircular caps
    hw = horizon_px * SS
    d.rounded_rectangle(
        [x1 * SS - hw / 2, (y - horizon_px / 2) * SS,
         x2 * SS + hw / 2, (y + horizon_px / 2) * SS],
        radius=hw / 2, fill=(*fg, 255),
    )

    im = im.resize((size, size), Image.LANCZOS)
    return im.convert("RGB") if bg else im


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="16.85 -7.15 66.3 66.3">
  <style>
    .mark-circle {{ stroke: {ink}; stroke-width: 3.09; }}
    .mark-horizon {{ stroke: {ink}; stroke-width: 3; }}
    @media (prefers-color-scheme: dark) {{
      /* reversed artwork carries its own compensation, per the brief:
         thin strokes optically thin further light-on-dark */
      .mark-circle {{ stroke: {paper}; stroke-width: 3.18; }}
      .mark-horizon {{ stroke: {paper}; stroke-width: 3.09; }}
    }}
  </style>
  <circle class="mark-circle" cx="50" cy="26" r="18" fill="none"/>
  <line class="mark-horizon" x1="23" y1="35" x2="77" y2="35" stroke-linecap="round"/>
</svg>
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    for size in (16, 32, 48):
        render(size).save(OUT / f"favicon-{size}.png")
    render(180, bg=PAPER).save(OUT / "apple-touch-icon.png")
    for size in (192, 512):
        render(size, bg=PAPER).save(OUT / f"icon-{size}.png")

    # multi-resolution .ico for legacy / bookmark surfaces
    render(48).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    (OUT / "favicon.svg").write_text(
        SVG.format(ink="#26231F", paper="#FDFCF7"), encoding="utf-8"
    )

    for f in sorted(OUT.iterdir()):
        print(f"  {f.name:24} {f.stat().st_size:>6} B")


if __name__ == "__main__":
    main()
