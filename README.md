# Klar

Marketing site for **Klar** — a Copenhagen brewery selling one hoppy everyday
beer (*hverdagsøl*, 2,7% vol.) **on keg, B2B, to office Friday bars**. All UI
copy is Danish.

The site is one page and 100% B2B fad: no cans, no cart, no consumer checkout.
The commercial model is still the unusual part — **nothing is stocked**. A
standing weekly slot means Monday tells us what to brew on Thursday, so the
beer is always fresh. The page argues that, prices it (9 L / 20 L kegs), and
ends in one form: a free pilot Friday.

```
header → hero #top → LET MED VILJE #let → HUMLE DRIKKES FRISKT #frisk
  → VI BRYGGER EFTER ÅRSTIDEN #aarstid
  → vi brygger kun det, der er bestilt + PRIS #pris (one merged section)
  → PRØV ET FAD #proev (form) → closing line → footer
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
  js/klar.js          CONFIG (ABV, the two public prices, form target) + pilot form
  assets/img          responsive WebP + JPEG photography
  assets/icon         favicon set built from the micro-mark construction
  tools/              asset generators + check-site.mjs
.github/workflows/    checks the page's claims, then deploys site/ on push to main
```

## The page's claims are asserted, not trusted

`CONFIG` in [site/js/klar.js](site/js/klar.js) declares the ABV, the two public
keg prices and the form's submission target. The deploy workflow runs:

```bash
node site/tools/check-site.mjs
```

It asserts that every ABV printed on the page matches the declared one, that
**no kroner amount other than the two public prices appears anywhere** (resale
prices for bars and hotels are negotiated individually and must never be
public), that the metadata sells kegs rather than the old cans, that the form
stays accessible (fieldset/legend, labelled controls, errors wired via
`aria-describedby`, the exact CTA), that the heading hierarchy has no jumps —
and that the `[NAVN]`/`[BYDEL]`/`[NUMMER]` placeholders **fail the deploy the
moment the `noindex` tag is removed**. While the site is a noindex preview they
only warn.

Rather than reimplement the config, the check evaluates the pure prelude of
`klar.js` (everything above its `dom` marker, which is deliberately DOM-free),
so there is one source of truth and no second copy to drift.

## This is a preview deploy

The site is a prototype and is deliberately **not indexable**. Before it goes
live on the real domain:

1. resolve the placeholders: the CVR number in the footer (`check-site.mjs`
   blocks an indexable deploy on it), and the three names + bydel that bring
   the held-back HVEM VI ER section onto the page
2. shoot and add the photography: fad + hane (also the new OG image — it
   currently reuses the can-era hero photo), and the three faces for
   HVEM VI ER — never stock
3. wire the form: HubSpot portal/form id in `CONFIG` (pipeline
   `Klar Fredagsbar` — **never** `Felix Pipeline`, which has non-standard stage
   ids and belongs to another company), or a fallback endpoint behind the same
   markup
4. resolve the `økologisk` claim — in the EU it is a legally protected term
   that requires certification; either get certified or drop the word
5. create `handelsbetingelser` as a real page before anything is invoiced
6. delete `site/robots.txt`, remove the `noindex` meta tag, and point
   `canonical`/`og:url` at the real domain

## Design handoff is not in this repo

The site was built from a design handoff that is **deliberately excluded** (see
`.gitignore`). `klar-design-brief.md` contains business-sensitive material —
duty-band planning, pending Fødevarestyrelsen certification and supplier
negotiation notes — which does not belong in a public repository. Keep it in a
private repo or outside git.

`site/tools/build-images.py` reads that folder's `assets/` to regenerate the
photography, so it needs the handoff present locally to re-run. The generated
output is checked in, so a normal clone builds and serves fine without it.
