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
  → VI BRYGGER EFTER ÅRSTIDEN #aarstid → 04 — BESTIL #bestil → closing line → footer
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

**4. `VI BRYGGER EFTER ÅRSTIDEN` is a grid, not the two-column split.** The handoff
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
none. The bottom-right of the section, which this arrangement left empty, now
holds the `DERFOR DÅSE` fact box (see deviation 10) — 380px on the right
content edge, the arrival table's own column, bottom-aligned to the cans.

**5. The hero wordmark links to the top.** In the prototype the header `KLAR` is
inert text. It is a link to `#let` here, requested after handoff. Note the anchor
is on the hero, not the header: the header is `position: sticky`, so it never
leaves the viewport and a fragment link to it is a no-op in every browser.

**6. The rise is slower and steadier than the handoff's, and hovering replays it.**
Both requested after handoff.

The handoff specifies 34px over 760ms on `cubic-bezier(0.16, 1, 0.3, 1)`. That
curve is expo-out: it covers **83% of its travel in the first quarter of the
duration**, so the sun arrived instantly and then coasted — which is why it read
as a UI element snapping into place rather than a sunrise. Stretching the
duration alone would not have fixed it; it would just have meant a longer coast.

Now 48px over 2200ms on `cubic-bezier(0.25, 0.1, 0.75, 1)`, chosen by measuring
travel distribution rather than by eye. Per eighth of the duration the sun travels
9 · 13 · 15 · 16 · 15 · 14 · 11 · 5 percent — near-constant velocity through the
middle, which is how a sun actually moves, and still visibly climbing at three
quarters through.

The second control point sits at `y=1`, so the sun decelerates to zero and settles
into its locked 2:1 position instead of still travelling when it arrives. The final
eighth of the travel is 5%, against 9% on the first pass at this curve
(`…, 0.75, 0.9`), which reached the top at 40% of average speed and then stopped
dead.

Two supporting details. Travel went up with the duration because slowing a 34px
move to 2.2s makes it *less* legible, not more; at 48px the circle starts with its
centre 29px below the horizon and **crosses the line 59% of the way through
(≈1300ms)**, so the crossing is the visible moment rather than something over
before you notice. And the opacity ramp finishes at 40% while the transform runs
the full duration, so the sun brightens low and then keeps climbing — a real
sunrise is visible while still near the horizon. The horizon line itself just
fades (900ms) and never moves: it is the ground.

The hover replay re-uses the same animation rather than adding a second idea, and
inherits the timing tokens. It is movement only: `klar-rise-again` carries no
opacity and the horizon is never touched, because replaying the load animation
blinked the circle and re-faded the line, which read as the whole mark jumping.
All of it collapses to 1ms under `prefers-reduced-motion`.

**7. Photography is 26 MB → 1.6 MB.** Each PNG is pre-cropped to the aspect ratio
it displays at, using the object-position from the design so the framing is
unchanged, then written as WebP + JPEG at the widths the layout requests.

**8. Favicons use the micro mark at every size**, and `og:type` / structured data
call the offer `PreOrder` rather than `InStock` — brew-to-order is literally
pre-ordering, and claiming stock would be wrong.

**9. Pricing is a derived ladder.** 39 kr per can at 4 cans, dropping 1 kr per
size step (38 at 8, 37 at 12), with a further 2 kr off every can on a standing
order — so 35 kr/can is the floor and 39 kr the ceiling. Requested after handoff,
which specified a flat table.

Note the standing-order discount (2 kr) is now larger than a size step (1 kr), so
committing to every brew saves more than sizing up does. That is a pricing
decision rather than a bug, but it is worth being deliberate about: it points
customers at the subscription rather than the big box.

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
cap liners, while cans retain them), which the page now makes in a second fact
box — `DERFOR DÅSE`, beside the can renders in the årstid section, where it
also closes the empty bottom-right corner deviation 4 left open.

**11. The fold is exactly one viewport.** `min-height: calc(100svh - var(--header-h))`
on the hero, replacing the handoff's fixed 820px — which happened to fill a 900px
window and nothing else. Requested after handoff, so that one scroll lands on the
next section at any window height. `svh` rather than `vh`, because `vh` is the
*largest* viewport on mobile: with the address bar showing, `100vh` overflows and
the next section starts off-screen, which is the opposite of the point.

Stacked, the hero is **flex, not grid**, and the reason is worth keeping. Its
height comes from `min-height`, which leaves the container indefinite — and a grid
`1fr` row then resolves against its own content rather than the free space, so the
photograph's intrinsic height inflated the panel about 200px past the viewport.
`minmax(0, 1fr)` does not fix it: the zero is the track's minimum, not how `fr`
resolves. Flex measures free space from the used height, so `flex: 1 1 0` hands the
photograph exactly what the text leaves.

Verified exact at 1440×900, 1680×1200 and 375×812. At 320×640 the panel runs 62px
over, because the photograph hits its 120px floor and the panel grows rather than
squeezing the image away — a deliberate floor, not a miss.

**The photograph's column is capped, which is the other half of this.** Tying the
panel to the viewport means its aspect now varies with the window, and past roughly
16:10 the panel gets wider relative to its height than the photograph's 0.878 — so
`object-fit: cover` began trimming the bottom of the frame. On a 2560×1105 window
that was about 250 source pixels: the can's base and the last line of its label.

So the photograph's column is `min(50%, calc((100svh - var(--header-h)) * 0.878))`
— the width the image can actually fill at full panel height — and the text column
absorbs the rest. Nothing is cropped vertically, nothing is letterboxed, and the
photograph still runs flush to the right edge. At 1440×900 the columns are still
exactly 720/720; at 2560×1105 they are 1658/902. **The cost is that the 50/50
spread stops being 50/50 on very wide windows** — worth a designer's eye, though
the alternatives were cropping the can or growing the panel past the fold.

One place this does not reach: stacked on a phone, the photograph is a full-width
band of whatever height the text leaves (about 230px at 375×812), so it is a
horizontal slice of a portrait frame rather than the whole thing. Showing the full
image there and keeping the fold to one viewport are mutually exclusive.

**12. Every section is one viewport, except the order form.** Requested after
handoff: `min-height: calc(100svh - var(--header-h))` on the hero, LET MED VILJE,
HUMLE DRIKKES FRISKT, VI BRYGGER EFTER ÅRSTIDEN and the closing line, so scrolling steps
section to section. `04 BESTIL` is deliberately exempt — it is a form, and forcing
it to a screen height would either strand it in dead space or clip it.

Two of them needed more than a `min-height` to get there, because `min-height` is a
floor: a section whose content is taller simply stays taller, and flex only
distributes space that is actually free.

- **HUMLE DRIKKES FRISKT overshot by 106px.** Its padding came down from 112 to
  80 and its gap from 64 to 44, and the photo wells now take a **zero flex basis**
  rather than `auto`. That last part is the subtle one: at an `auto` basis the well
  is sized from the photograph's own height, so there was no free space left to
  distribute and the section stayed 22px over. At a zero basis the well takes
  exactly what the copy above leaves. The wells resolve to 624×358 at 1440×900 and
  grow on a taller window; the handoff's 380 is what they land on around 1440×925.
- **The closing line now gets a whole screen to itself**, with the wink centred in
  it. That extra height is the point rather than a side effect.

**VI BRYGGER EFTER ÅRSTIDEN only matches on a window at least 1254px tall.** Below that it
stays taller — 1176px against an 822px fold at 1440×900. The blocker is the can
renders: 560px tall, plus a minimum 128px of section padding, a 48px gap and the
320px copy-and-table row, is 1056px before anything else. Squeezing that into 822
would leave the cans 206px tall and **81px wide**, which puts `KLAR` at 13.6px and
the batch line at **4.1px** — illegible, so it was not done.

The way to make that section fit at any height while keeping the cans full size is
to move them **beside** the copy and the arrival table rather than below them
(a two-column layout would come to 784px, inside the fold). That undoes the
alignment arrangement in deviation 4, so it is left as a decision rather than
taken unilaterally.

**12. `440 ml` is gone from the hero spec row**, requested after handoff. The
volume still appears on both can renders, in the summary's `kassen` row and in the
footer legal strip.

**11. There is a delivery fee.** 39 kr per delivery, requested after handoff —
the handoff's summary has no such line. It is itemised as `fragt` in the summary
rather than folded into the per-can price, and it **is** included in the headline
total, because the figure shown before an order is placed has to be what the
customer actually pays.

The deposit is the opposite case and deliberately stays out of the total: pant is
collected at the door and refunded when the cans come back, so it is not a cost.
It remains in the fineprint. Everything reconciles on the page — per-can × cans +
fragt = total — and `check-dates.mjs` asserts exactly that, separately from the
`unit × cans = box` assertion the option cards depend on.

**One decision is still open.** Being flat, the fee lands hardest on the smallest
box — **20% of a 4-can order** against 8% of a 12-can one — so whether it should
be waived above a threshold is a real pricing question. The check prints the split
on every run, and at 20% it now emits a warning rather than just a note. Note the
fee equals the base per-can price, so a 4-can order pays for five cans' worth.

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

- **The photography hard-codes the batch, and the four assets no longer agree with
  each other.** The label text on the cans — mark, `KLAR`, batch line, ABV,
  best-before — is composited pixel work, not live text, so none of it can be
  changed by code. `check-dates.mjs` reports the state of all four on every
  deploy, as warnings rather than failures (a failure would block every deploy on
  a known-pending asset, and the check would just get deleted). Right now:

  | asset | batch | abv | against config |
  |---|---|---|---|
  | `haze-klar.png` (hero) | `08.36` | `2,7%` | ABV right, **batch reads 08.36 — ten years out from 08.26** |
  | `hero-kitchen-klar.png` | `08.26` | `2,8%` | batch right, ABV stale |
  | `bike-klar.png` | `08.26` | `2,8%` | batch right, ABV stale |
  | `doorstep-klar.png` | `08.26` | `2,8%` | batch right, ABV stale |

  The hero was re-shot at 2,7%, which fixed the strength there and left the other
  three behind — so the page now shows cans at two different strengths, and the
  hero's own batch line is a decade off. **They have to agree with each other
  before they agree with anything else.** Update `PHOTO_LABELS` in that script
  whenever an asset is re-made.
- **The hero photograph carries a generator watermark.** A four-pointed sparkle
  sits on the table right of the glass — roughly 87% across, 90% down, beside the
  barley grain. It is the image generator's mark, baked into the pixels, and
  visible at every served width. It cannot be cropped out without losing either
  the glass or the hop cone, so it needs retouching or a clean re-export before
  launch. A third delivery photo (empty cans in a crate) was specified in the
  handoff but never produced.
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
- **The nav labels only partly match the section headlines.** `let` matches
  `LET MED VILJE` and `årstid` matches `VI BRYGGER EFTER ÅRSTIDEN`, but `frisk`
  still does not match `HUMLE DRIKKES FRISKT`. The handoff raises this as an
  open question for the client, so it is left as designed rather than quietly
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
| serviceable area | 1050–2500 plus brønshøj, vanløse, kastrup, hellerup | real delivery zones |
| waitlist | out-of-area postcodes reveal an email form; the capture is local state | real waitlist storage behind the form |
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
