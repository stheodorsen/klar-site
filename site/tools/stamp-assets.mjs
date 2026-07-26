/* Stamps a content hash onto the CSS and JS URLs in index.html.
   Run: node site/tools/stamp-assets.mjs   (no dependencies)

   Why this exists: index.html references css/klar.css and js/klar.js by bare
   path, so a browser that has them cached keeps using the old ones after a
   deploy. The page then looks current while running last week's stylesheet and
   last week's prices — which is worse than an obviously broken page, because
   nothing signals that what you are looking at is stale.

   This rewrites those references to css/klar.css?v=<hash of the file>, so the
   URL changes exactly when the file changes: a new deploy busts the cache, and
   an unchanged file keeps its cached copy.

   It runs in CI against the checkout before the Pages artifact is uploaded, so
   the committed index.html stays clean and diffable. Safe to run locally too —
   it is idempotent, and re-running after an edit just restamps.
*/

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const siteDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(siteDir, 'index.html');

const ASSETS = ['css/klar.css', 'js/klar.js'];

let html = readFileSync(htmlPath, 'utf8');
const stamped = [];

for (const asset of ASSETS) {
  const hash = createHash('sha256')
    .update(readFileSync(join(siteDir, asset)))
    .digest('hex')
    .slice(0, 10);

  /* Anchored to href="/src=" so prose is left alone — these paths also appear in
     HTML comments pointing readers at the source, and stamping a version onto a
     sentence would be quiet vandalism. Matches an already-stamped URL too, so
     re-running is idempotent. */
  const ref = new RegExp(
    `(href|src)="${asset.replace(/\./g, '\\.')}(\\?v=[0-9a-f]+)?"`, 'g',
  );
  if (!ref.test(html)) {
    console.error(`stamp-assets: no href/src reference to ${asset} in index.html`);
    process.exit(1);
  }
  ref.lastIndex = 0;
  html = html.replace(ref, `$1="${asset}?v=${hash}"`);
  stamped.push(`${asset} -> ?v=${hash}`);
}

writeFileSync(htmlPath, html);
for (const line of stamped) console.log(`  ${line}`);
console.log('\nstamp-assets: ok');
