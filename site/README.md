# Klar — subscription site

Static build of the Klar design handoff (kept outside this repo — see the root
README). No framework, no build step: open `index.html` or serve the folder.

```bash
python3 -m http.server 4173 --directory site
```

```
site/
  index.html            one page, Danish, semantic
  css/klar.css          design tokens at the top, then sections, then responsive
  js/klar.js            CONFIG (batch, ABV, prices, route, area) + configurator
  site.webmanifest
  assets/img/           responsive WebP + JPEG derived from the handoff PNGs
  assets/icon/          favicon set built from the micro-mark construction
  tools/build-images.py generates assets/img from the handoff PNGs
  tools/build-icons.py  generates assets/icon
  tools/check-dates.mjs asserts the batch dates and prices still cohere
```

The two build-* tools are one-off generators, not a build pipeline — their output
is checked in. Re-run them only when the source photography or icon sizes change.
`check-dates.mjs` is different: it runs in CI on every deploy. See the root
README.

## Fidelity

Desktop is measured against the handoff and matches: hero mark 230×81, hero
wordmark 84px, can renders 220×560 with 37px `KLAR` and 7.5px legal text,
product columns at exactly 1:1.15, summary panel 400px sticky. The delivery
cards were 405px in a 3-up; the third card is gone, so they now hold that
405×280 proportion at ~624px wide instead (see deviation 5). Colour, tracking and spacing come from the token block at the top of
`klar.css`; the font stack is one variable (`--font`) so the licensed grotesque
swaps in one place.

The can renders size every internal metric as a fraction of the can's own width
via a container query, so they scale to any width without the proportions
drifting.

## Deviations from the handoff, and why

**1. Secondary text on paper is `#71685C`, not `#7C7365`.**
The brief calls its contrast rules "measured, non-negotiable" and restricts
support grey on paper to large text (≥24px, or ≥19px at weight 400+). The
design then uses it at 15px/400 and 19px/300 throughout — option-card notes,
summary labels, step hints, ledes, the reassurance list. Those fail AA at
3.85:1. `--support-on-paper` is a darkened step in the same warm ramp that
clears 4.51:1; it is visually near-identical and introduces no accent.
`#7C7365` is retained where it passes or isn't text: the can renders (4.55:1 on
can body), and hairlines on ink. **Designer decision needed** — either ratify
this token or raise the offending sizes.

**2. Responsive layout is new.** The handoff says "not designed yet" and
suggests an approach; this follows it. Breakpoints at 900 / 760 / 520px, and the
gutter stays a clamp. The summary panel becomes a bar that sticks to the bottom
of the configurator section only (`position: sticky`, not fixed — so it never
covers the editorial sections and adds no scroll-triggered motion, which the
motion policy forbids).

The option cards and delivery cards reflow on available space
(`repeat(auto-fit, minmax(…, 1fr))`) rather than at hard breakpoints, so they go
three across → two → one as room runs out. The option cards resolve to exactly
the design's 248px on the 1440 canvas. Two things there want a designer's
eye: at mid widths the three option cards sit 2 + 1 rather than stacking, and
the can renders stay side by side all the way down (130px each at 320px) to keep
the front/back comparison intact rather than costing ~1160px of scroll.

Get the whole responsive layer reviewed — the white space is the product and
none of this was drawn.

**3. Real form controls instead of hand-built ARIA.** The prototype's
`role="radio"` divs are `<input type="radio">` in visually-hidden form
controls, as the handoff recommends. Arrow-key navigation, grouping and
`:checked` styling are now native. Buttons are `<button>`, the postcode check is
a `<form>` so Enter submits.

**4. Hero.** The two calls to action (`start abonnement`, `se øllen`) were
removed and the photograph now fills the true right half of the fold — flush to
the top, right and bottom edges, `min-height: 100svh - header`. Requested after
handoff; it is a deliberate departure from the handoff's 700px letterboxed
image and 1fr/1fr split.

**5. Section order and the freshness pillar.** The page follows the copy
restructure, not the handoff's order:

```
hero → én øl, altid → frisk → levering → sæson → hverdagsstyrke
     → abonnement → brygbogen → footer
```

Freshness leads with the measured hop-degradation figures behind it, delivery
follows as its proof, sæson as further proof, and the strength reframe lands
last, immediately before the buy — it is the final objection-handler, not an
opener. Zone rhythm stays a strict ink/paper alternation, with the one ink|ink
adjacency (brygbogen|footer) divided by the inset hairline the design specifies
for exactly that case.

Three sections are new and were not drawn: **frisk**, **sæson** and
**brygbogen**. They reuse the existing tokens and the product section's 1:1.15
measure rather than inventing a second system, but they want a designer's eye.
The two hop-loss figures are set at `--fs-lead` as a pair; "omkring" stays
inside the figure so the number cannot lose its qualifier.

The third delivery card is gone — its argument became the frisk section — which
also retires the "asset pending" panel, so nothing on the page now waits on a
shoot. With two cards instead of three each is ~624px wide, so `.dcard__media`
holds the design's 405x280 proportion as an aspect ratio; the literal 280px
height would have cropped the photographs much harder than the handoff's
framing.

**6. Copy changes** (requested after handoff, all inside the brand's rules —
lowercase, no sentence case, no jargon, `frisk` kept off the descriptor):
- product heading/lede reworked onto local + seasonal (Danish organic malt,
  hops from this year's harvest, brewed in København N).
- `levering` reworked onto freshness and the unbroken cold chain. Its first card
  is **brygget i denne måned, kørt i denne uge** — the handoff's "brygget i går,
  kørt i dag" was not possible, since grain to can is two to three weeks for a
  dry-hopped beer. The empties/pant story appears in the summary reassurance
  list, the confirmation text and the footer.
- `leveret på ladcykel` dropped from the hero spec row; the hero now carries
  `frisk øl, leveret koldt på ladcykel i københavn` as its service line.
- The wink lost its gloss. "det er hovedet ikke næste morgen" turned a pun into
  a health claim, so it is deleted. The band is now the single line **uklar i
  glasset. klar i hovedet.** — Option A, pending the Danish food-law read. The
  approved fallback, "klar til tirsdag", is a one-line swap in two places; grep
  `WINK` for both, since the band and the can back panel must match.
- Unprovable social proof is gone: "de flestes valg" and "passer de fleste"
  became "vores anbefaling" and "det vi selv ville vælge". The consumption-rate
  hint ("to om aftenen") is also gone — stating a rate in alcohol marketing is
  needless exposure under the Danish code.

**7. Favicons use the micro mark at every size.** The brief specifies micro for
the favicon set in two places; the minimum-size table can be read as wanting
the standard mark at ≥24px. Micro is used throughout because its 0.25 D
overhang gives a 57×39 bounding box that sits properly in a square icon, where
the standard mark's 73.8×37.8 leaves the icon looking squat — and a consistent
weight across 16–512px reads as one icon. `favicon.svg` carries both positive
and reversed strokes with the reversed compensation baked in (a dark-mode media
query), never by inverting the positive.

**8. Photography is 26 MB → 1.2 MB.** Each PNG is pre-cropped to the aspect
ratio it displays at, using the object-position from the design so the framing
is unchanged, then written as WebP + JPEG at the widths the layout requests. A
desktop page load pulls ~166 kB of image.

## Known gaps

- **The photography contradicts the label.** The can in the hero and kitchen
  shots has `3,0%`, `brygget 03.26` and `drik før 05.26` printed on it, baked
  into the image. The site now declares 2,8% and the 07.26 batch, so the
  photographs disagree with the page. Nothing in code can fix this — it needs
  re-generating or re-shooting, and it is the most visible thing outstanding.
- **Two photo deviations flagged in the handoff are still present**: the cans in
  frame are standard proportion, not 440 ml sleek; the cooler bag is pale canvas
  where the materials spec says reversed (can body on warm ink).
- **The custom Ø** for the `HVERDAGSØL` headline needs the licensed face. The
  standard ø is used everywhere for now, and the mark is never substituted for
  it.
- **No aggregate rating.** The copy retires per-batch reviews in favour of one
  rating for Klar near the buy action. There is no rating data, and inventing it
  would be the same unprovable social proof the option-card notes just dropped,
  so it is left out. Add it when there are real numbers.
- `.panel-headline` and `.mono` are type-scale styles with no consumer on the
  page any more; they are kept but nothing exercises them.
- Age gate, address and payment are not built — see below.

## What still needs a backend

`CONFIG` at the top of `js/klar.js` is the seam. Everything in it is currently
hard-coded and belongs on the server:

| | now | needs |
|---|---|---|
| batch | `03.26 · nectaron` | current brew month + hop as data |
| prices | 132 / 240 / 432 kr | priced server-side |
| serviceable area | 1050–1799 plus five postcodes | real lookup; the out-of-area branch should capture a waitlist rather than dead-end |
| first delivery | next Tuesday, noon cut-off | real route calendar per postcode, with capacity |
| subscribe | sets local state | real checkout: 18+ age gate, address, payment, recurring schedule |
| trial box | toggles a count | a real cart |

Also unbuilt: subscription CRUD (pause / skip / cancel), pant handling, and the
`handelsbetingelser` / `leveringsområder` / `pant og retur` pages the footer
links to (they currently point at on-page sections).

## Accessibility

Verified: no horizontal overflow at 390–1920px, focus visible on every control,
`lang="da"`, skip link, one `h1` and a correct heading order, `<dl>` for the
summary and batch facts, `role="status"` on the postcode answer and the
subscription confirmation, the postcode input labelled and described by its
answer. Selection cards keep three distinct ring states (1px edge / 1px ink
hover / 2px ink selected) plus a focus halo. Uppercase display text is written
in lowercase and transformed in CSS, so screen readers get `Klar`, not `K-L-A-R`.

The one animation — the mark rising once through the horizon — renders as its
final state under `prefers-reduced-motion: reduce`.
