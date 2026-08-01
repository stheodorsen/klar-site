# Klar — B2B fad site

Static build of the Klar design handoff (kept outside this repo — see the root
README), restructured to the B2B fad spec: one page, no cans, no checkout, one
form. No framework, no build step: open `index.html` or serve the folder.

```bash
python3 site/tools/dev-server.py 4180
```

**Use that rather than `python3 -m http.server`.** `index.html` references
`css/klar.css` and `js/klar.js` by bare path on purpose — the content hash is
stamped on at deploy time by `stamp-assets.mjs`, so the committed HTML stays
clean and diffable. Locally that means the URL never changes when the file
does, and `http.server` sends no `Cache-Control` at all, only `Last-Modified`,
so Chrome applies its heuristic freshness rule and keeps serving the
stylesheet it already has. The failure does not look like caching: the new
HTML loads against old CSS, unstyled elements fall back to plain blocks — a
grid becomes a stacked list, a sized photograph becomes a full-width one — and
it reads as a layout bug that reproduces nowhere else. `dev-server.py` is the
same server with `Cache-Control: no-store`.

```
site/
  index.html            one page, Danish, semantic
  css/klar.css          design tokens at the top, then sections, then responsive
  js/klar.js            CONFIG (ABV, public prices, form target) + pilot form
  site.webmanifest
  assets/img/           responsive WebP + JPEG derived from the handoff PNGs
  assets/icon/          favicon set built from the micro-mark construction
  tools/build-images.py generates assets/img from the handoff PNGs
                        (pass job names to rebuild only those, e.g. `hops`)
  tools/dev-server.py   local static server that forbids caching (see below)
  tools/build-icons.py  generates assets/icon
  tools/check-site.mjs  asserts the page's claims still cohere (runs in CI)
```

## Page structure

```
header → hero #top → LET MED VILJE #let → HUMLE DRIKKES FRISKT #frisk
  → VI BRYGGER EFTER ÅRSTIDEN #aarstid
  → vi brygger kun det, der er bestilt + PRIS #pris (one merged section)
  → PRØV ET FAD #proev (form) → closing line → footer
```

Zones alternate strictly, dark/white, section by section (30.07.2026): hero
dark, let white, frisk dark, årstid white, bestilt/pris dark, prøv white,
closing dark — and the footer stays dark, divided from the closing line by
the inset hairline. The FAKTA box is a recessed `--deep` well (the tone the
photographs sit in), not a bright paper card — reworked same day.

Nav: `let · frisk · sæsonbestemt · nybrygget · prøv` — all one word, in page
order, holding one line down to 360px (the nav gap and size step down at
520px). The two long labels mean that below ~420px the header bar wraps and
the nav takes its own row under the wordmark — which is the state the mobile
CSS already assumes (`--header-h: 112px` at ≤900px), and `syncHeaderHeight()`
measures it so anchor offsets stay correct either way. The eyebrow above the
price rows still reads `PRIS`; only the nav label is `nybrygget`.

**VI BRYGGER EFTER ÅRSTIDEN is a third spread** (redesigned 30.07.2026): copy
left, the hop yard filling the **right half at full height, like the hero** —
and still exactly one viewport, like every other section.

The arrival calendar used to be four stacked rows in a 380px column beside the
copy, which costs too much height for a half panel; four across does not fit
one either. It is a **two-by-two grid** inside the text column, which is what
lets headline, copy and calendar share one fold. The section's vertical padding
is `svh` based, like the hero's, so a short window shrinks the padding rather
than pushing the section past the fold.

The photograph's box is portrait — 640×722 at 1280×800 (0.886), 960×1002 at
1920×1080 (0.958) — so the file is cut at **0.90**, in the middle of that
range: `object-fit` trims a hair either way and never upscales. The crop keeps
the full frame height (sky, horizon, farmhouse, rows, path) and takes the
middle 55% of the width, centred on the path. Below 900px it stacks like the
other two spreads, photograph under the text at 4:5.

The bestilt/pris grid is **mirrored** against årstiden above it — price table
left, argument right — so the two panels flip like the hero/let spread does.
The flip is done with grid areas, not DOM order, so the source stays
headline → eyebrow → body → table for screen readers and the mobile stack.

Deliberate departures from the spec, all requested 29.07.2026:

- `alle kan være med` is **cut** (the spec calls it the most important section;
  its copy is preserved in a comment in `index.html`).
- `hvem vi er` is **held back** until the three names, the bydel and the
  portrait photography exist (spec copy in a comment too).
- `sådan kører det`, `hane og anlæg` and `derfor fad` are **cut** (copy in
  comments in `index.html`, derfor fad together with its Kemp citation).
- `vi brygger kun det, der er bestilt` and `pris` are **merged** into one
  section: the brew-to-order argument and the price it implies.
- The one-liner `lang fredag. hel lørdag.` is **off the page entirely** — it
  was tried in the hero (as a large two-line lockup and as a quiet line) and
  in the bestilt section, and cut in every placement. It survives in the
  og:description.
- The pilot is **day-agnostic**: `prøv et fad`, `et fad. en dag. gratis.`,
  the date field is `ønsket dag`, and the button is `book et gratis fad` — a
  pilot can land on a Thursday as well as a Friday.
- The hero descriptor stays `humlet hverdagsøl` (not `… på fad`), keeping the
  handoff's original lockup metrics.

## The B2B pivot (what changed against the old B2C build)

Removed: the whole `#bestil` flow (batch picker, size ladder, cadence,
delivery window, postcode check, waitlist), the stock meter, the order
summary, the can renders, `derfor dåse`, and every pant line. The batch record
and its date machinery went with them.

Kept, untouched: the visual system (colours, typography, spacing, image style,
`#26231F`), the vertical lockup, the rise animation, `let med vilje`,
`humle drikkes friskt` with the Kemp citation, the hop calendar,
`vi brygger kun det, der er bestilt`, `uklar i glasset. klar i hovedet.`, and
lowercase throughout.

Added: `pris` (exactly two public prices, merged into the bestilt section)
and `prøv et fad` — the free pilot keg form. (`alle kan være med`,
`hvem vi er`, `sådan kører det`, `hane og anlæg` and `derfor fad` are specced
but cut or held back — see above.)

The commerce layer is gone, not the brand layer: the buyer is a person
choosing how their Friday should feel. The hop calendar and the freshness
argument are what make Klar the interesting choice rather than the cheap one.

**PRØV ET FAD opens on the friday-bar photograph** — full-bleed at 2.2, sitting
between the pitch and the form where a plain hairline used to. A photograph of
the thing being offered divides better than a rule, and it is the only shot on
the site showing the product as it is actually sold. The section keeps its
horizontal padding on its children so the band can run edge to edge. It is the
one section deliberately exempt from the one-viewport rule — it is a form.

## The form

One form, one button (`book et gratis fad`). A `<fieldset>` with a
`<legend>`, every control labelled, errors inline via `aria-describedby` —
each error says what went wrong and what to do, no apologies, no vagueness.
The confirmation is inline, in the site's voice:
`tak. vi skriver tilbage inden for en dag med en dato, der passer.`

Submission target lives in `CONFIG` in `js/klar.js`, never in the markup:

- **HubSpot** (portal + form id): posts to the Forms API. The deal pipeline is
  `Klar Fredagsbar` — **never** `Felix Pipeline`, which has non-standard stage
  ids and belongs to a different company. Stages and the custom properties
  (`klynge`, `aftaletype`, `fade_pr_uge`, `kontaktrolle`) are configured on
  the HubSpot side.
- **Fallback endpoint** (Formspree/Netlify/Tally-style) behind the same
  markup, so the integration can be swapped without touching HTML.
- With neither configured the form is a prototype: it validates and confirms
  locally and sends nothing.

The optional `ønsket dag` date is deliberately unrestricted — any day of the
week (the Friday-only check was removed 29.07.2026).

## Fidelity

The visual system survives the pivot untouched: colour, tracking and spacing
come from the token block at the top of `klar.css`; the font stack is one
variable (`--font`) so the licensed grotesque swaps in one place.

**The vertical lockup is the fussy part.** The handoff requires the horizon's
ink extent, the wordmark's glyph ink and the descriptor's glyph ink to start
and end on the same two vertical edges — measured ink, not CSS boxes. The
numbers are implemented as fractions of `--mark-w` and in `em`, so the lock
survives the responsive layer. The descriptor stays `humlet hverdagsøl`, so
the handoff's measured numbers are unchanged. **All of it is tuned to
Helvetica Neue's metrics; swapping in the licensed grotesque means
re-measuring every number in that block.**

## Deviations from the handoff, and why

**1. Secondary text on paper is `#5F5850`, not `#7C7365`.**
The handoff's `#7C7365` is 3.85:1 — it fails AA at every size the design
applies it at. All secondary *text* on paper uses `--grey-strong` (`#5F5850`,
5.77:1), which the handoff already defines as its contrast-safe grey.
`#7C7365` is kept where it isn't text: hairlines on ink.

**2. Responsive layout is new, and still undesigned.** The handoff says no
mobile design exists. Breakpoints at 900 / 760 / 520px following the handoff's
own rule — keep the gutter and the white space, drop to fewer columns rather
than squeeze. The spec's floor: responsive down to 360px, keyboard focus
visible, `prefers-reduced-motion` respected. **Get the whole layer reviewed —
none of it was drawn.**

**3. The rise is slower and steadier than the handoff's, and hovering replays
it.** 48px over 2200ms on `cubic-bezier(0.25, 0.1, 0.75, 1)` — near-constant
velocity, so it reads as a sunrise rather than a UI element snapping into
place. The replay is movement only; the horizon is never touched. All of it
collapses to 1ms under `prefers-reduced-motion`. (Full derivation lives in the
token block in `klar.css`.)

**4. The can-era photography is kept, flagged.** All four photographs (hero
glass, kitchen, ladcykel, køletaske) predate the pivot and have cans somewhere
in frame — they hold the layout until the fad/hane shoot (scheduled 10.–16.
aug) replaces them. The hero and kitchen alt texts no longer name the can; the
pixels still show one. The hero is the handoff's composition: lockup left,
photograph right, sized to exactly one viewport.

**5. The citation stays on the page.** Kemp et al. (2021), *J. Inst. Brewing*
127(4), 367–384, doi:[10.1002/jib.667](https://doi.org/10.1002/jib.667),
verified against the paper: an 80% drop in myrcene, humulene and caryophyllene
after three months at 20 °C — the FAKTA box is the fair paraphrase. The same
paper also supports the cut `derfor fad` argument (hop aroma compounds absorb
into crown-cap liners; a keg has no liner), preserved with its citation in a
comment. If a source comes off, its claim goes with it.

**6. Asset URLs are content-hashed at deploy time.** `tools/stamp-assets.mjs`
rewrites the CSS/JS URLs with a content hash in CI, so the committed HTML
stays clean while every deploy busts the cache.

## Known gaps

- **The footer has no CVR line.** It was removed rather than left as a
  placeholder, so nothing fake ships — but a Danish company invoicing
  customers has to state its CVR, so it must come back before the first
  invoice, together with `handelsbetingelser`. `check-site.mjs` still guards
  the `[NAVN]`/`[BYDEL]`/`[NUMMER]` pattern, so a placeholder reintroduced
  anywhere fails an indexable deploy.
- **Photography.** The four can-era photos (hero, kitchen, ladcykel,
  køletaske) are placeholder AI imagery with can branding baked into the
  pixels and still need replacing with fad + hane. The hop yard carries no
  can, so it stays. The friday-bar photo is the first that shows the product
  as it is actually sold; it is both the OG image and the band in PRØV ET FAD,
  cut by two separate jobs (`friday` at 1.91 for the link preview,
  `fridayband` at 2.2 for the page). When `hvem vi er` returns it needs three
  faces, never stock.
- **The friday-bar keg and blackboard are deliberately unbranded.**
  Compositing Klar branding onto them was built and rejected (30.07.2026): a
  `brand-photo.py` wrapped a paper label around the keg through the cylinder's
  own projection, relit by the steel beneath it, and lettered the board in a
  marker face. It was technically convincing and still looked wrong, so the
  tool is gone and the clean photograph ships. **If branding is wanted there,
  generate it into the photograph rather than compositing it after.** The keg
  also carries garbled embossed lettering from the generator near its top —
  raised metal, so no crop removes it; only a re-render will.
- **AI imagery leaves a watermark.** Two of the sources shipped with a
  four-pointed sparkle baked into the pixels — the hero's is trimmed off the
  bottom, the hop yard's off the right edge (see the `trim` column in
  `build-images.py`). **Check every new generated asset for it before
  shipping**, and never assume a re-export is clean.
- **`hvem vi er` is missing** against the spec — held back until the three
  names, the bydel and the portraits exist. A stranger is let into the office
  every week; the section is not decoration, so it should come back.
- **`økologisk` has nothing behind it.** In the EU it is a legally protected
  term requiring certification. It appears in the hero spec row and the meta
  description. Resolve before launch: get certified, or drop the word.
- **Open decisions from the spec** (do not code around them): fad type (corny
  vs engangs-PET) and whether depositum needs mentioning; whether a keg sold
  B2B is pantbelagt (confirm with Dansk Retursystem); whether the prices are
  final; torsdag vs fredag morning delivery (the page assumes torsdag); the
  moms/fradrag wording (do **not** claim VAT deduction — confirm with an
  accountant); fødevareregistrering and the under-2,8% duty exemption before
  the first invoice.
- **`handelsbetingelser`** must exist as a real page before invoicing; the
  footer's practical-links column was removed because none of its pages exist.
- **The Feb–April gap** in the arrival table is real and unexplained on the
  page. Also open: air-freighted NZ hops vs the delivery story, and no stated
  remedy if the cold chain fails.
- **The custom Ø** for the headlines needs the licensed face.

## What still needs a backend

| | now | needs |
|---|---|---|
| form submission | `CONFIG.hubspot` / `CONFIG.endpoint`, both empty — the form validates and confirms locally, sends nothing | HubSpot form + `Klar Fredagsbar` pipeline, or a fallback endpoint |
| capacity | nothing on the page, by design | managed in the calendar, not on the site |

## Accessibility

Verified: no horizontal overflow at 320–1920px, focus visible on every
control, `lang="da"`, skip link, one `h1` and a correct heading order
(asserted in CI), the form as a `<fieldset>`/`<legend>` with labelled
controls and `aria-describedby` errors, `role="status"` on the confirmation,
`<dl>` for the arrival and price tables, and every text node clearing AA
contrast (4,5:1) on its painted background.
