# Klar

Marketing and subscription site for **Klar** — a 3,0% hopped Danish everyday
beer (*hverdagsøl*) delivered cold by cargo bike to subscribers in inner
Copenhagen. One page: hero, product, wink band, delivery, subscription
configurator, heritage panel, footer. All UI copy is Danish.

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
  js/klar.js          CONFIG (batch, prices, route, serviceable area) + configurator
  assets/img          responsive WebP + JPEG photography
  assets/icon         favicon set built from the micro-mark construction
  tools/              one-off generators for the two asset folders
.github/workflows/    deploys site/ to GitHub Pages on push to main
```

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
