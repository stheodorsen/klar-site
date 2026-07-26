# Klar — brew-to-order site

Static build of the Klar design handoff (kept outside this repo — see the root
README). No framework, no build step: open `index.html` or serve the folder.

```bash
python3 -m http.server 4173 --directory site
```

```
site/
  index.html            one page, Danish, semantic
  css/klar.css          design tokens at the top, then sections, then responsive
  js/klar.js            CONFIG (batches, ABV, prices, area) + order configurator
  site.webmanifest
  assets/img/           responsive WebP + JPEG derived from the handoff PNGs
  assets/icon/          favicon set built from the micro-mark construction
  tools/build-images.py generates assets/img from the handoff PNGs
  tools/build-icons.py  generates assets/icon
  tools/check-dates.mjs asserts the batch record and prices still cohere
```

The two `build-*` tools are one-off generators, not a build pipeline — their
output is checked in. Re-run them only when the source photography or icon sizes
change. `check-dates.mjs` is different: it runs in CI on every deploy. See the
root README.

## Page structure

```
header (batch status) → hero #let → LET MED VILJE → HUMLE DRIKKES FRISKT #frisk
  → VI FØLGER HØSTEN #aarstid → 04 — BESTIL #bestil → closing line → footer
```

Zones alternate ink and paper. The hero and LET MED VILJE are both ink and read
as a spread with the photograph flipping sides, divided by the inset hairline the
design specifies for that adjacency; the closing line and footer are divided the
same way.

The pillar headline was `HVERDAGSØL`; it is now `LET MED VILJE`, requested after
handoff. `hverdagsøl` remains the product descriptor under the wordmark and in
the metadata — it is what the beer is, not what that panel argues.

## Fidelity

Measured against the 1440 composition and matching: hero and LET MED VILJE columns
720 + 720 at `min-height: 820px`, order grid 784 + 400, freshness photo cards
624 × 380, option cards 248, fact box 380, can renders 220 × 560. Colour,
tracking and spacing come from the token block at the top of `klar.css`; the font
stack is one variable (`--font`) so the licensed grotesque swaps in one place.

**The vertical lockup is the fussy part.** The handoff requires the horizon's ink
extent, the wordmark's glyph ink and the descriptor's glyph ink to start and end
on the same two vertical edges — measured ink, not CSS boxes, which include
trailing letter-space and side bearings. Verified in the browser by measuring
real glyph ink with canvas `TextMetrics`: all three edges land within 0.06px of
each other, and the horizon ink is 0.998 × the mark width as specified.

The handoff gives those numbers as pixels for a 230px mark (`90.37px`,
`-5.46px`, `-12.02px`, descriptor `22px / 4.084px`). They are implemented as
fractions of `--mark-w` and in `em`, so the lock survives the responsive layer —
re-measured at a 168px mark and the edges still land within 0.06px. **All of it
is tuned to Helvetica Neue's metrics; swapping in the licensed grotesque means
re-measuring every number in that block.**

## Deviations from the handoff, and why

**1. Secondary text on paper is `#5F5850`, not `#7C7365`.**
The handoff specifies `#7C7365` for secondary text on paper. It is 3.85:1, which
fails AA at every size the design actually uses it at — including the 22px/300
body copy, because the brief's own floor for that grey is ≥24px (or ≥19px at
weight 400+). All secondary *text* on paper therefore uses `--grey-strong`
(`#5F5850`, 5.77:1), which the handoff already defines as its contrast-safe grey
and already specifies for the `FAKTA` eyebrow. `#7C7365` is kept where it passes
or isn't text: the can renders (4.55:1 on the can body) and hairlines on ink.
Every text node on the page was checked programmatically and clears AA.
**Designer decision needed** — either ratify this or raise the sizes.

**2. Responsive layout is new, and still undesigned.** The handoff says no mobile
design exists and not to improvise it silently. This is the improvisation, stated
out loud: breakpoints at 1100 / 900 / 760 / 520px following the handoff's own
rule — keep the gutter and the white space, drop to fewer columns rather than
squeeze. The two dark spread panels stack with the photograph below the text; the
mirror flips so both panels read text-first; the summary stops being sticky; the
cans stay side by side so the same-beer comparison survives. Verified for no
horizontal overflow from 320 to 1920px. **Get the whole layer reviewed — none of
it was drawn.**

**3. Real form controls instead of hand-built ARIA.** The prototype's
`role="radio"` divs with manual Enter/Space keydown handlers are
`<input type="radio">` in visually-hidden controls. Every behaviour the handoff
asks for is then native and free: labelled radiogroups, arrow-key navigation
within a group, `:checked` styling, Space to select, and — when the current batch
sells out — `disabled`, which removes it from the tab order without a
`tabindex="-1"` dance. There are zero hand-built `role="radio"` elements left.

**4. `VI FØLGER HØSTEN` is a grid, not the two-column split.** The handoff
bottom-aligns this section like `frisk` and the order head. That works there
because the right-hand element is a filled panel — a visible edge to align to.
Here the right side is a list of hairline rows with no box, so bottom-aligning
left `LANDER I DANMARK` stranded above the headline relating to nothing, and the
centred can renders aligned to neither column. Requested after handoff.

It is now a four-cell grid: headline + eyebrow share a row, body + table share
the next. Both alignments are structural, because baseline alignment only works
on the aligned element itself — through a wrapper the browser synthesises a
baseline from the box instead, which is why the nested-flex version looked
unaligned. The cans moved flush left onto the content edge, where the pair
(476px) sits inside the lead column's 640px measure. Four real edges instead of
none. **The bottom-right of the section is now deliberately empty — worth a
designer's eye.**

**5. The hero wordmark links to the top.** In the prototype the header `KLAR` is
inert text. It is a link to `#let` here, requested after handoff. Note the anchor
is on the hero, not the header: the header is `position: sticky`, so it never
leaves the viewport and a fragment link to it is a no-op in every browser.

**6. Hovering the mark replays the rise.** Requested after handoff, and outside
the handoff's "one animation" rule — but it re-uses that animation rather than
adding a second idea. It is movement only: `klar-rise-again` carries no opacity
and the horizon is never touched, because replaying the load animation blinked
the circle and re-faded the line, which read as the whole mark jumping. Suppressed
under `prefers-reduced-motion`.

**7. Photography is 26 MB → 1.6 MB.** Each PNG is pre-cropped to the aspect ratio
it displays at, using the object-position from the design so the framing is
unchanged, then written as WebP + JPEG at the widths the layout requests.

**8. Favicons use the micro mark at every size**, and `og:type` / structured data
call the offer `PreOrder` rather than `InStock` — brew-to-order is literally
pre-ordering, and claiming stock would be wrong.

**9. Pricing is a derived ladder.** 39 kr per can at 4 cans, dropping 2 kr per
size step (37 at 8, 35 at 12), with a further 2 kr off every can on a standing
order — so 33 kr/can is the floor and 39 kr the ceiling. Requested after handoff,
which specified a flat table.

It is computed from three numbers (`sizes`, `basePricePerCan`,
`sizeDiscountPerCanPerStep`) rather than a hand-written price table, so the ladder
cannot end up internally inconsistent and adding a size is a one-element change.
Totals are `unit x cans` exactly, never rounded, because the per-can figure is
printed beside the total on the option cards. The cards are bound to the same
computation the summary uses, and `check-dates.mjs` asserts the ladder gets
cheaper as boxes get bigger, that everything multiplies out, and that the HTML
fallbacks match — a stale fallback would flash a wrong price before the script
runs.

The `pris pr. dåse falder med størrelsen` hint returns to step 02 with the
tiering; without it the reader has to compare three numbers to notice the ladder
exists.

**10. The 80% figure carries its source on the page.** The handoff records that
the client had the citation removed. It is back, because a measured quantitative
claim in public with nothing behind it is a liability — and because the figure
turned out to be accurate. Verified against the paper rather than taken on
trust:

> Kemp, O., Hofmann, S., Braumann, I., Jensen, S., Fenton, A., & Oladokun, O.
> (2021). Changes in key hop-derived compounds and their impact on perceived
> dry-hop flavour in beers after storage at cold and ambient temperature.
> *Journal of the Institute of Brewing*, **127**(4), 367–384.
> doi:[10.1002/jib.667](https://doi.org/10.1002/jib.667)

The paper stores beers at 3 °C and 20 °C for 10 months and reports a **drop of
80% in myrcene, humulene and caryophyllene after three months at 20 °C** — which
is the claim almost verbatim. Two notes for whoever owns the copy: the
measurement is those three terpenes specifically, so *"de flygtige humleolier"*
is a fair but slightly broader paraphrase; and the same paper independently
supports the can-over-bottle argument (hop aroma compounds accumulate in crown
cap liners, while cans retain them), which the page does not currently make.

**11. The footer is three columns, and the order section lost its eyebrow.**
The handoff's fourth footer column held three compliance lines; two were removed
as uncertified, which left a near-empty column making the four-column grid read
as broken. It is three columns now, and the surviving age restriction moved to
the legal strip — where a legal line belongs. The `04 — BESTIL` eyebrow is gone
too: it was the handoff's section numbering leaking onto the page, and nothing
else on the page is numbered. Both requested after handoff. The `01`–`05` labels
inside the form stay — those number steps, not sections.

**12. Asset URLs are content-hashed at deploy time.** `index.html` referenced
`css/klar.css` and `js/klar.js` by bare path, so a browser holding a cached copy
kept using the old ones after a deploy — the page looked current while running
the previous stylesheet and the previous prices, which is worse than an obviously
broken page because nothing signals it is stale. `tools/stamp-assets.mjs` rewrites
those two URLs with a hash of each file's contents, and the workflow runs it
against the checkout before uploading, so the committed HTML stays clean and
diffable while every deploy busts the cache.

## Known gaps

- **The photography is placeholder-grade and hard-codes the batch.** The label
  text on the cans — mark, `KLAR`, batch line, `2,8%`, best-before — is
  composited pixel work, not live text. It reads `08.26 · riwaka` and
  `drik før 10.26`, which currently matches `CONFIG`. Move the batch on without
  re-compositing and the cans in the photographs will contradict the page;
  `check-dates.mjs` fails the build if that happens. Replace all four with real
  photography before launch. A third delivery photo (empty cans in a crate) was
  specified but never produced.
- **The hop calendar and the current batch disagree.** The årstid copy promises
  *"vi brygger med den, der senest er landet"* — the most recently landed hop.
  The current batch is riwaka, from new zealand, which lands maj–juni; australien
  lands juni–juli, so for an August brew it is not the freshest arrival. The next
  batch was citra, which was worse than off-message: usa hops do not land until
  november–december, two months after a September brew, so it was impossible.
  That one is fixed (galaxy, australien). The current batch is **blocked on the
  photography**, which has `08.26 · riwaka` composited into the cans — so either
  re-shoot, or soften the copy from "senest landet" to something the batch can
  keep. `check-dates.mjs` enforces the hard constraint (the hop must have landed
  by brew day) and prints a note when a fresher arrival existed.
- **`økologisk` now has nothing behind it.** The øko-certification and
  pant-registration lines were removed from the footer, along with the `klar
  bryghus aps` company name. But `økologisk malt` remains in the hero spec and
  the meta description, and `øko` is composited into the can artwork in all four
  photographs. In the EU *økologisk* is a legally protected term that requires
  certification. The hero line is arguably defensible as an ingredient-sourcing
  claim if the maltster is certified; the `øko` on the can is a product claim
  about Klar and is not. The can text cannot be changed by code — it is pixels.
  **Resolve before launch: either get certified, or drop the word.**
- **The nav labels only partly match the section headlines.** `let` now matches
  `LET MED VILJE`, but `frisk` and `årstid` still do not match
  `HUMLE DRIKKES FRISKT` / `VI FØLGER HØSTEN`. The handoff raises this as an open
  question for the client, so the rest are left as designed rather than quietly
  reworded.
- **The Feb–April gap** in the harvest-arrival table is real and unexplained on
  the page. Also open: the tension between air-freighted New Zealand hops and
  cargo-bike delivery, and the fact that the "2 to 5 °C all the way" promise has
  no stated remedy when it fails.
- **The custom Ø** for the headlines needs the licensed face. The standard ø is
  used for now, and the mark is never substituted for it.
- Age gate, address and payment are not built — see below.

## What still needs a backend

`CONFIG` at the top of `js/klar.js` is the seam. Everything in it is currently
hard-coded and belongs on the server:

| | now | needs |
|---|---|---|
| batch record | two literals: id, hop, closes, brews, delivers | real brew calendar |
| capacity / taken | 296 / 212 | live count that decrements on order |
| `batchFull` | a hand-set flag | derived server-side from `taken >= capacity` |
| prices | 88 / 160 / 216 kr, 2 kr/can standing discount | priced server-side |
| serviceable area | 1050–1799 plus five postcodes | real delivery zones; the out-of-area branch should capture a waitlist rather than dead-end |
| order | sets local state | real checkout: 18+ age gate, address, payment, and a place in the batch |

Also unbuilt: order management (change, skip, cancel before close), pant
handling, waitlist capture, and the `brygkalender` / `leveringsområder` /
`pant og retur` / `handelsbetingelser` pages the footer links to — they currently
point at `#bestil`.

## Accessibility

Verified: no horizontal overflow at 320–1920px, focus visible on every control,
`lang="da"`, skip link, one `h1` and a correct heading order, real radiogroups
with native arrow-key navigation, `<dl>` for the summary and the arrival table,
`role="status"` on the postcode answer, the batch count and the order
confirmation, the postcode input labelled and described by its answer, and both
can renders exposed as a single `role="img"` with an `aria-label` bound to
`CONFIG` so the spoken can cannot drift from the printed one. Every text node
clears AA — checked programmatically against the painted background, not by eye.

The batch meter bar is `aria-hidden`: it carries no information the count line
next to it does not already say in words.
