# Klar

Marketing and ordering site for **Klar** — a Copenhagen brewery selling one
hoppy everyday beer (*hverdagsøl*, 2,7% vol., 440 ml) by the batch. All UI copy
is Danish.

The commercial model is the unusual part, and the page is built around it:
**nothing is stocked**. A batch is 150 litres — 296 cans. Orders close before
brew day, the batch is brewed to the number ordered, and if it fills up the only
option is the next batch.

One page, three brand pillars in sequence, ending in an order configurator:

```
header → hero #let → LET MED VILJE → HUMLE DRIKKES FRISKT #frisk
  → VI BRYGGER EFTER ÅRSTIDEN #aarstid → 04 — BESTIL #bestil → closing line → footer
```

**Live preview:** https://stheodorsen.github.io/klar-site/

Static, dependency-free, no build step.

```bash
python3 -m http.server 4173 --directory site
```

See **[site/README.md](site/README.md)** for the build notes: what matches the
design handoff, the deviations and why, and what still needs a backend.

## Layout

```
site/                 the deployable site — this is what Pages publishes
  index.html
  css/klar.css        design tokens, then sections, then responsive
  js/klar.js          CONFIG (batches, ABV, prices, area) + order configurator
  assets/img          responsive WebP + JPEG photography
  assets/icon         favicon set built from the micro-mark construction
  tools/              asset generators + check-dates.mjs
.github/workflows/    checks the batch record, then deploys site/ on push to main
```

## The batch record is load-bearing

`CONFIG.batches` in [site/js/klar.js](site/js/klar.js) is the commercial state of
the business: batch id, hop, order-close date, brew date, delivery date, plus
capacity and quantity ordered. The best-before is derived from the batch month.

A stale record does not break the page — it keeps looking perfectly fine while
making claims that are no longer true: a best-before in the past, a delivery
before the brew, a meter counting down to a batch that already shipped. So it is
asserted rather than trusted, and the deploy workflow runs the check, meaning a
stale batch fails the build instead of shipping:

```bash
node site/tools/check-dates.mjs
```

It asserts that orders close before brew day and brewing before delivery, that
each batch still has at least 14 days of shelf life left after it is delivered,
that the next batch really is next, that the named delivery weekday matches the
date, that the sold-out flag agrees with `taken / capacity`, and that every
per-can price multiplies out to its total.

It also checks the hop against the arrival calendar — **no batch may be brewed
with a hop that has not landed in Denmark yet** — and that the calendar rendered
in the årstid section still matches the data behind it. That check exists because
the failure is invisible: a variety gets picked for its flavour, and the page ends
up describing a beer brewed with hops that were still on a ship.

It also checks the batch against the **photography**, which is the one thing code
cannot fix: the can labels in the four photos are composited pixel work, not live
text, hard-coding `08.26 · riwaka`, `drik før 10.26` and `2,8%`. When `CONFIG`
moves off that, the cans in the pictures contradict the page.

That one **warns rather than fails**, and the distinction is deliberate: the
failures above are things that are wrong and fixable in code, so they should stop
a deploy. The photography is a known-pending asset already on the
replace-before-launch list, and a check that blocks every deploy on it would just
get deleted. It currently warns, because the ABV moved to 2,7% while the
photographs still say 2,8%.

Rather than reimplement the date maths, the check evaluates the pure prelude of
`klar.js` (everything above its `state` marker, which is deliberately DOM-free),
so there is one source of truth for the dates and no second copy to drift.

## This is a preview deploy

The site is a prototype and is deliberately **not indexable** — it carries
placeholder AI photography and an *økologisk* claim with no certification behind
it. Before it goes live on the real domain:

1. delete `site/robots.txt`
2. remove the `noindex` meta tag in `site/index.html`
3. point `canonical`, `og:url` and `og:image` at the real domain
4. replace the placeholder photography, and resolve the open items in
   [site/README.md](site/README.md) — above all the `økologisk` claim, which no
   longer has any certification stated behind it

## Design handoff is not in this repo

The site was built from a design handoff that is **deliberately excluded** (see
`.gitignore`). `klar-design-brief.md` contains business-sensitive material —
duty-band planning, pending Fødevarestyrelsen certification, pant registration
and supplier negotiation notes — which does not belong in a public repository.
Keep it in a private repo or outside git.

`site/tools/build-images.py` reads that folder's `assets/` to regenerate the
photography, so it needs the handoff present locally to re-run. The generated
output is checked in, so a normal clone builds and serves fine without it.
