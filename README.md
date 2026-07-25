# Klar

Marketing and subscription site for **Klar** — a 2,8% hopped Danish everyday
beer (*hverdagsøl*) delivered cold by cargo bike to subscribers in inner
Copenhagen. All UI copy is Danish.

One page, ordered so freshness leads and the strength reframe lands last,
immediately before the buy:

```
hero → én øl, altid → frisk → levering → sæson → hverdagsstyrke
     → abonnement → brygbogen → footer
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
  js/klar.js          CONFIG (batch, ABV, prices, route, area) + configurator
  assets/img          responsive WebP + JPEG photography
  assets/icon         favicon set built from the micro-mark construction
  tools/              asset generators + check-dates.mjs
.github/workflows/    checks batch dates, then deploys site/ on push to main
```

## The batch config is load-bearing

One variable drives the dates: `CONFIG.batch.brewMonth` in
[site/js/klar.js](site/js/klar.js) produces the brygmåned on the can, the bedst
før two months after it, and the freshness argument that the gap between them is
short on purpose. `CONFIG.abv` does the same for every labelled instance of the
strength.

The site claims month-fresh beer, so a stale brew month turns the whole
freshness pillar into a false claim while the page still looks perfectly fine.
That is asserted rather than trusted — bedst før must be at least 14 days after
a new subscriber's first delivery, and the deploy workflow runs the check, so a
stale batch fails the build instead of shipping:

```bash
node site/tools/check-dates.mjs
```

It also checks that the next brew announced in brygbogen is later than the
current one, and that each plan's per-can price multiplies out to its total.

## This is a preview deploy

The site is a prototype and is deliberately **not indexable** — it carries
placeholder AI photography and *øko* / pant claims that are not yet certified.
Before it goes live on the real domain:

1. delete `site/robots.txt`
2. remove the `noindex` meta tag in `site/index.html`
3. point `canonical`, `og:url` and `og:image` at the real domain
4. replace the placeholder photography (see the known gaps in
   [site/README.md](site/README.md))

## Design handoff is not in this repo

The site was built from a design handoff that is **deliberately excluded** (see
`.gitignore`). `klar-design-brief.md` contains business-sensitive material —
duty-band planning, pending Fødevarestyrelsen certification, pant registration
and supplier negotiation notes — which does not belong in a public repository.
Keep it in a private repo or outside git.

`site/tools/build-images.py` reads that folder's `assets/` to regenerate the
photography, so it needs the handoff present locally to re-run. The generated
output is checked in, so a normal clone builds and serves fine without it.
