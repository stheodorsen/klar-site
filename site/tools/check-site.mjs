/* Asserts the B2B page and its config still agree.
   Run: node site/tools/check-site.mjs   (no dependencies)

   The batch machinery is gone with the commerce layer, but the page still
   makes claims that can silently rot: a declared ABV printed in five places,
   exactly two public prices (resale prices are negotiated privately and must
   never appear), a form that has to stay accessible, and placeholders that
   must not go live. So they are asserted here and run in CI before the Pages
   deploy.

   Rather than reimplement the config, this evaluates the pure prelude of
   klar.js — everything above the "dom" marker, which is deliberately DOM-free.
   If you add DOM access up there, this breaks loudly, which is the intended
   pressure. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = join(here, '..');
const source = readFileSync(join(siteDir, 'js', 'klar.js'), 'utf8');

const MARKER = '/* --- dom ---';
const cut = source.indexOf(MARKER);
if (cut === -1) {
  console.error(`check-site: could not find the "${MARKER}" marker in klar.js.`);
  process.exit(1);
}

const prelude = source.slice(0, cut);

/* Scan code only — the comments up there talk *about* staying DOM-free, and
   naming the thing you are avoiding should not trip the check. */
const code = prelude.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

for (const forbidden of ['document', 'window', 'matchMedia', 'localStorage']) {
  if (new RegExp(`\\b${forbidden}\\b`).test(code)) {
    console.error(
      `check-site: klar.js touches ${forbidden} above the dom marker. `
      + 'The prelude has to stay pure for this check to evaluate it.',
    );
    process.exit(1);
  }
}

const { CONFIG, isEmail, FIELDS } = new Function(
  `${prelude}\nreturn { CONFIG, isEmail, FIELDS };`,
)();

const failures = [];   // wrong and fixable in code -> fails the deploy
const warnings = [];   // known-pending decisions -> reported, does not block
const notes = [];

const html = readFileSync(join(siteDir, 'index.html'), 'utf8');
/* comments carry build notes ("fad og hane, ikke dåse") that must not trip
   the content checks below */
const visible = html.replace(/<!--[\s\S]*?-->/g, ' ');

/* 1. the declared ABV. It is printed in the hero, the footer, the meta tags
      and the structured data — a declared strength that disagrees with itself
      is a labelling problem, not a copy slip. */
const abvs = [...new Set(visible.match(/\d+,\d+\s*%/g) ?? [])];
notes.push(`abv      ${CONFIG.abv} in config · page prints ${abvs.join(', ') || 'none'}`);
if (abvs.length === 0) {
  failures.push('the page prints no ABV at all.');
}
for (const abv of abvs) {
  if (abv !== CONFIG.abv) {
    failures.push(`the page prints "${abv}" but CONFIG.abv is "${CONFIG.abv}".`);
  }
}

/* 2. exactly the two public prices, nowhere else a kroner amount. Resale
      prices for bars and hotels are lower, negotiated individually, and must
      never be public — so any kr figure the config does not list fails the
      deploy rather than shipping. */
const allowed = new Set(CONFIG.prices.map((p) => p.kr));
const printed = visible.match(/\d[\d.]*\s*kr\b/g) ?? [];
notes.push(`prices   allowed: ${[...allowed].join(', ')} · page prints ${printed.length} amount(s)`);
for (const amount of printed) {
  if (!allowed.has(amount)) {
    failures.push(
      `the page prints "${amount}", which is not one of the two public prices `
      + `(${[...allowed].join(', ')}). Resale prices must never appear on the site.`,
    );
  }
}

/* and each configured price row must actually be rendered */
for (const { keg, serves, kr } of CONFIG.prices) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = new RegExp(
    `<dt>\\s*${esc(keg)}\\s*</dt>\\s*<dd[^>]*>\\s*${esc(serves)}\\s*</dd>\\s*`
    + `<dd[^>]*>\\s*${esc(kr)}\\s*</dd>`,
  );
  if (!row.test(html)) {
    failures.push(
      `the pris table has no row matching "${keg} · ${serves} · ${kr}" from `
      + 'CONFIG.prices — the rendered table and the config have drifted apart.',
    );
  }
}

/* 3. the pivot holds in the shop window: the metadata sells kegs, not cans.
      The old title, description and OG tags talked about dåser and
      abonnement; they must not creep back. */
const shopWindow = [
  /<title>([\s\S]*?)<\/title>/,
  /name="description" content="([^"]*)"/,
  /property="og:title" content="([^"]*)"/,
  /property="og:description" content="([^"]*)"/,
].map((re) => html.match(re)?.[1] ?? '');
if (!shopWindow.some((s) => /fad/i.test(s))) {
  failures.push('neither the title nor the descriptions mention "fad" — the metadata is not selling the product.');
}
for (const text of shopWindow) {
  if (/dåse|abonnement/i.test(text)) {
    failures.push(`metadata still sells the old product: "${text.trim()}".`);
  }
}

/* 4. the form stays accessible: a fieldset with a legend, every control
      labelled, every error wired via aria-describedby, and the exact CTA. */
if (!/<fieldset[^>]*>\s*<legend/.test(html)) {
  failures.push('the form has no <fieldset> opening with a <legend>.');
}
for (const { id } of FIELDS) {
  if (!new RegExp(`<label[^>]*for="f-${id}"`).test(html)) {
    failures.push(`field "${id}": no <label for="f-${id}">.`);
  }
  if (!new RegExp(`id="f-${id}"`).test(html)) {
    failures.push(`field "${id}": no control with id="f-${id}".`);
  }
  /* aria-describedby is a token list, not a single id — the address field is
     described by its delivery-area hint as well as its error — so test for
     membership rather than for the whole attribute. */
  const describedBy = html.match(new RegExp(`id="f-${id}"[^>]*aria-describedby="([^"]*)"`))
    ?? html.match(new RegExp(`aria-describedby="([^"]*)"[^>]*id="f-${id}"`));
  if (!describedBy || !describedBy[1].split(/\s+/).includes(`err-${id}`)) {
    failures.push(`field "${id}": control is not described by err-${id}.`);
  }
  if (!new RegExp(`id="err-${id}"`).test(html)) {
    failures.push(`field "${id}": no error element with id="err-${id}".`);
  }
}
if (!/book et gratis fad<\/button>/.test(html)) {
  failures.push('the submit button does not read "book et gratis fad".');
}

/* the office-size select must offer exactly the three brackets */
for (const bracket of ['under 20', '20–50', 'over 50']) {
  if (!html.includes(`>${bracket}</option>`)) {
    failures.push(`the kontor select is missing the "${bracket}" bracket.`);
  }
}

/* 5. heading hierarchy without jumps — the spec's quality floor. */
const headings = [...visible.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
let prev = 0;
for (const level of headings) {
  if (level > prev + 1) {
    failures.push(`heading order jumps from h${prev} to h${level}.`);
    break;
  }
  prev = level;
}
if (headings.filter((h) => h === 1).length !== 1) {
  failures.push(`the page has ${headings.filter((h) => h === 1).length} h1 elements; it needs exactly one.`);
}

/* 6. placeholders must not go live. [NAVN]/[BYDEL]/[NUMMER] are awaiting
      decisions; while the page is a noindex preview they warn, but the moment
      noindex is removed they block the deploy. */
const placeholders = [...new Set(visible.match(/\[(NAVN|BYDEL|NUMMER)\]/g) ?? [])];
const noindex = /name="robots"[^>]*noindex/.test(html);
if (placeholders.length) {
  const msg = `the page still carries ${placeholders.join(', ')} — names, bydel and CVR are pending decisions.`;
  if (noindex) warnings.push(`${msg} Fine for a noindex preview, a blocker for launch.`);
  else failures.push(`${msg} noindex has been removed, so this would go live.`);
}
notes.push(`robots   ${noindex ? 'noindex (preview)' : 'indexable'} · placeholders: ${placeholders.join(', ') || 'none'}`);

/* 7. the validators keep meaning what the errors claim */
if (!isEmail('hej@klar.dk') || isEmail('hej@klar')) {
  failures.push('isEmail no longer accepts hej@klar.dk / rejects hej@klar.');
}

for (const note of notes) console.log(`  ${note}`);

if (warnings.length) {
  console.warn(`\ncheck-site: ${warnings.length} warning(s)`);
  for (const w of warnings) console.warn(`  ! ${w}`);
}

if (failures.length) {
  console.error(`\ncheck-site: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`\ncheck-site: ok${warnings.length ? ` (${warnings.length} warning)` : ''}`);
