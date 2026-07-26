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

/* index.html is checked too: several numbers are rendered as static fallbacks
   and must agree with the data behind them. */
const html = readFileSync(join(siteDir, 'index.html'), 'utf8');

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

/* 3. no batch may be brewed with a hop that has not landed in Denmark yet.
      This is the constraint behind the whole årstid section, and it is easy to
      break silently: a variety is picked for its flavour without checking the
      calendar, and the page ends up claiming a beer brewed with hops that were
      still on a ship. (It caught citra in a September batch — american hops do
      not arrive until november.) */
const arrivals = CONFIG.hopArrivals;
for (const key of ['current', 'next']) {
  const batch = CONFIG.batches[key];
  const brewMonth = Number(batch.brews.split('.')[1]);
  const arrival = arrivals.find((a) => a.region === batch.origin);

  if (!arrival) {
    failures.push(
      `${key} (${batch.id}): origin "${batch.origin}" is not in the arrival `
      + `calendar (${arrivals.map((a) => a.region).join('; ')}).`,
    );
    continue;
  }
  if (arrival.lands > brewMonth) {
    failures.push(
      `${key} (${batch.id}): ${batch.hop} is from ${batch.origin}, which does not `
      + `land in Denmark until month ${arrival.lands} (${arrival.arrives}), but the `
      + `batch is brewed in month ${brewMonth}. Pick a hop that has arrived.`,
    );
  }
  const freshest = arrivals
    .filter((a) => a.lands <= brewMonth)
    .sort((a, b) => b.lands - a.lands)[0];
  notes.push(
    `hop      ${batch.id} ${batch.hop.padEnd(7)} ${batch.origin.padEnd(18)} `
    + `lands ${arrival.arrives}`
    + (freshest && freshest.region !== batch.origin
      ? `   (note: ${freshest.region} landed more recently)` : ''),
  );
}

/* the årstid table is static markup, so confirm it still says what the data says */
for (const a of arrivals) {
  const row = new RegExp(
    `<dt>\\s*${a.region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</dt>\\s*<dd>\\s*`
    + `${a.arrives.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</dd>`,
  );
  if (!row.test(html)) {
    failures.push(
      `the årstid table in index.html has no row matching "${a.region} / `
      + `${a.arrives}" from CONFIG.hopArrivals — the rendered calendar and the `
      + 'data have drifted apart.',
    );
  }
}

/* 4. the meter has to describe a real batch */
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

/* 5. the price ladder. The option cards print a per-can price next to a total,
      so they have to multiply out exactly, the ladder has to actually get
      cheaper as the boxes get bigger, and nothing may price at or below zero. */
const ladder = CONFIG.sizes.map((size) => ({
  size,
  once: priceFor(size, 'once'),
  standing: priceFor(size, 'every'),
}));

notes.push(
  `prices   ${ladder.map((r) => `${r.size}: ${r.once.unit}/${r.standing.unit} kr/can`)
    .join('  ')}   (once/standing)`,
);

for (const row of ladder) {
  for (const [label, p] of [['once', row.once], ['standing', row.standing]]) {
    if (p.unit * row.size !== p.total) {
      failures.push(
        `price ${row.size} (${label}): ${p.unit} kr x ${row.size} = `
        + `${p.unit * row.size}, but total is ${p.total} kr.`,
      );
    }
    if (p.unit <= 0) {
      failures.push(`price ${row.size} (${label}): per-can price is ${p.unit} kr.`);
    }
  }
}

for (let i = 1; i < ladder.length; i++) {
  if (ladder[i].size <= ladder[i - 1].size) {
    failures.push(
      `CONFIG.sizes is not ascending: ${ladder[i - 1].size} then ${ladder[i].size}. `
      + 'The ladder derives the discount from position, so order matters.',
    );
  }
  if (!(ladder[i].once.unit < ladder[i - 1].once.unit)) {
    failures.push(
      `the ladder does not get cheaper: ${ladder[i - 1].size} cans at `
      + `${ladder[i - 1].once.unit} kr/can, ${ladder[i].size} cans at `
      + `${ladder[i].once.unit} kr/can.`,
    );
  }
}

/* The option cards are bound, but their HTML fallbacks are what a reader sees
   before the script runs — so a stale fallback flashes a wrong price. */
for (const row of ladder) {
  for (const [key, want] of [
    [`cardUnit${row.size}`, `${row.once.unit} kr / dåse`],
    [`cardTotal${row.size}`, `${row.once.total} kr`],
  ]) {
    const m = html.match(new RegExp(`data-bind="${key}"[^>]*>([^<]*)<`));
    if (!m) {
      failures.push(`index.html has no element bound to ${key}.`);
    } else if (m[1].trim() !== want) {
      failures.push(
        `index.html fallback for ${key} reads "${m[1].trim()}" but the ladder `
        + `says "${want}" — a reader would see the wrong price until the script runs.`,
      );
    }
  }
}

/* 6. The can artwork in the photography is composited pixel work, not live
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
