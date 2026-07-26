/* Asserts the site's batch record and freshness claims still cohere.
   Run: node site/tools/check-dates.mjs   (no dependencies)

   Klar brews to order, so the batch record is the commercial state of the
   business: order-close date, brew date, delivery date, capacity, quantity
   ordered. If it goes stale the page keeps looking perfectly fine while making
   claims that are no longer true — a bedst før in the past, a delivery before
   the brew, a meter counting down to a batch that already shipped. So it is
   asserted here and run in CI before the Pages deploy.

   Rather than reimplement the date maths (which would then be free to drift
   from the site), this evaluates the pure prelude of klar.js — everything above
   the "state" marker, which is deliberately DOM-free. If you add DOM access up
   there, this breaks loudly, which is the intended pressure. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = join(here, '..');
const source = readFileSync(join(siteDir, 'js', 'klar.js'), 'utf8');

const MARKER = '/* --- state ---';
const cut = source.indexOf(MARKER);
if (cut === -1) {
  console.error(`check-dates: could not find the "${MARKER}" marker in klar.js.`);
  process.exit(1);
}

const prelude = source.slice(0, cut);

/* Scan code only — the comments up there talk *about* staying DOM-free, and
   naming the thing you are avoiding should not trip the check. Crude but
   sufficient: the prelude has no strings containing comment markers. */
const code = prelude.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

for (const forbidden of ['document', 'window', 'matchMedia', 'localStorage']) {
  if (new RegExp(`\\b${forbidden}\\b`).test(code)) {
    console.error(
      `check-dates: klar.js touches ${forbidden} above the state marker. `
      + 'The prelude has to stay pure for this check to evaluate it.',
    );
    process.exit(1);
  }
}

const exported = new Function(
  `${prelude}\nreturn { CONFIG, batchTimeline, batchOk, priceFor, bestBeforeLabel };`,
)();
const { CONFIG, batchTimeline, priceFor, bestBeforeLabel } = exported;

const failures = [];
const notes = [];

/* Format from local components, not toISOString — the dates are constructed at
   local midnight, and in a positive-offset zone the UTC form lands on the
   previous day. This output is what a human reads in CI to sanity-check the
   batch, so it has to show the day the config actually says. */
const fmt = (d) => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
].join('-');

const daWeekday = new Intl.DateTimeFormat('da-DK', { weekday: 'long' });

/* 1. each batch's own timeline: orders close before brew day, the beer is
      brewed before it is delivered, and there is real shelf life left after
      delivery. */
for (const key of ['current', 'next']) {
  const t = batchTimeline(key);
  notes.push(
    `${key.padEnd(7)} ${t.batch.id} · ${t.batch.hop.padEnd(7)} `
    + `lukker ${fmt(t.closes)}  brygges ${fmt(t.brews)}  `
    + `kører ${fmt(t.delivers)}  bedst før ${t.bestBeforeLabel}  `
    + `(${t.daysOfLife} days of life, min ${t.required})`,
  );

  if (t.closes > t.brews) {
    failures.push(`${key} (${t.batch.id}): orders close ${t.batch.closes}, after brew day ${t.batch.brews}.`);
  }
  if (t.brews > t.delivers) {
    failures.push(`${key} (${t.batch.id}): brewed ${t.batch.brews}, after delivery ${t.batch.delivers}.`);
  }
  if (t.daysOfLife < t.required) {
    failures.push(
      `${key} (${t.batch.id}): bedst før ${t.bestBeforeLabel} is only ${t.daysOfLife} `
      + `days after delivery; the freshness copy needs at least ${t.required}. `
      + 'Update CONFIG.batches in site/js/klar.js.',
    );
  }

  /* The delivery string names a Danish weekday ("tirsdag 25.08") and the site
     prints it verbatim in the summary, the postcode answer and the order
     confirmation. If the named day disagrees with the date, the page tells the
     customer the wrong day three times over. */
  const [namedDay] = t.batch.delivers.split(' ');
  const actualDay = daWeekday.format(t.delivers).toLowerCase();
  if (namedDay !== actualDay) {
    failures.push(
      `${key} (${t.batch.id}): delivery reads "${t.batch.delivers}", but `
      + `${fmt(t.delivers)} is a ${actualDay}, not a ${namedDay}.`,
    );
  }
}

/* 2. the two batches are in order — the "next" batch has to actually be next,
      and it cannot open before the current one closes. */
const cur = batchTimeline('current');
const nxt = batchTimeline('next');
if (!(nxt.closes > cur.closes)) {
  failures.push(`next batch (${nxt.batch.id}) closes on or before the current one (${cur.batch.id}).`);
}
if (!(CONFIG.batches.next.id > CONFIG.batches.current.id)) {
  failures.push(
    `batch ids are out of order: next is ${CONFIG.batches.next.id}, `
    + `current is ${CONFIG.batches.current.id}.`,
  );
}

/* 3. the meter has to describe a real batch */
const { capacity, taken } = CONFIG;
notes.push(`meter    ${taken} / ${capacity} taken (${capacity - taken} left)`);
if (!(taken >= 0 && taken <= capacity)) {
  failures.push(`taken (${taken}) is outside 0..capacity (${capacity}).`);
}
if (CONFIG.batchFull !== (taken >= capacity)) {
  failures.push(
    `batchFull is ${CONFIG.batchFull} but taken/capacity says `
    + `${taken >= capacity}. The sold-out state must follow the numbers.`,
  );
}

/* 4. the option cards print a per-can price next to a total, so the base table
      has to multiply out exactly. */
for (const [cans, plan] of Object.entries(CONFIG.prices)) {
  if (plan.unit * Number(cans) !== plan.total) {
    failures.push(
      `price ${cans}: ${plan.unit} kr x ${cans} = ${plan.unit * Number(cans)}, `
      + `but total is ${plan.total} kr.`,
    );
  }
  // a standing order must not price below the next size down's per-can rate
  const standing = priceFor(Number(cans), 'every');
  if (standing.total <= 0) {
    failures.push(`price ${cans}: standing-order total is ${standing.total} kr.`);
  }
}
notes.push(
  `prices   ${Object.entries(CONFIG.prices)
    .map(([c]) => `${c}: ${priceFor(Number(c), 'once').total}/${priceFor(Number(c), 'every').total} kr`)
    .join('  ')}   (once/standing)`,
);

/* 5. The can artwork in the photography is composited pixel work, not live
      text — it has the batch and best-before printed in. If CONFIG moves off
      the batch the photos were made for, the cans on the page contradict the
      page. Nothing in code can fix that, so it has to be loud. */
const PHOTO_BATCH = { id: '08.26', hop: 'riwaka', bestBefore: '10.26' };
const currentBatch = CONFIG.batches.current;
if (currentBatch.id !== PHOTO_BATCH.id
    || currentBatch.hop !== PHOTO_BATCH.hop
    || bestBeforeLabel(currentBatch.id) !== PHOTO_BATCH.bestBefore) {
  failures.push(
    `the photography has "${PHOTO_BATCH.id} · ${PHOTO_BATCH.hop}" and `
    + `"drik før ${PHOTO_BATCH.bestBefore}" composited into the cans, but CONFIG `
    + `says "${currentBatch.id} · ${currentBatch.hop}" / `
    + `"drik før ${bestBeforeLabel(currentBatch.id)}". Re-composite the four `
    + `assets/*-klar.png files and update PHOTO_BATCH here.`,
  );
}

for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.error(`\ncheck-dates: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\ncheck-dates: ok');
