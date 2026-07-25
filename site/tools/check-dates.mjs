/* Asserts the site's freshness claims still hold.
   Run: node site/tools/check-dates.mjs   (no dependencies)

   The site promises month-fresh beer and prints a short bedst før to prove it.
   That only stays true while CONFIG.batch.brewMonth is current — a stale brew
   month silently turns the whole freshness pillar into a false claim, and
   nothing about the page would look broken. So it is asserted here and run in
   CI before the Pages deploy.

   Rather than reimplement the date maths (which would then be free to drift
   from the site), this evaluates the pure prelude of klar.js — everything above
   the "state" marker, which is deliberately DOM-free. If you add DOM access up
   there, this breaks loudly, which is the intended pressure. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'js', 'klar.js'), 'utf8');

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

/* eslint-disable no-new-func */
const exported = new Function(
  `${prelude}\nreturn { CONFIG, batchDates, freshnessWindow, formatDeliveryDate, nextDeliveryDate };`,
)();

const { CONFIG, batchDates, freshnessWindow, formatDeliveryDate } = exported;

const failures = [];
const notes = [];

/* 1. the freshness window: bedst før must leave a new subscriber real time
      with the beer after their first delivery */
const window_ = freshnessWindow();
const firstDelivery = formatDeliveryDate(window_.firstDelivery);
notes.push(
  `brew month      ${CONFIG.batch.brewMonth} -> brygget ${batchDates().brewedLabel}`,
  `bedst før       ${window_.bestBeforeLabel} `
  + `(${CONFIG.batch.shelfLifeMonths} months after brewing)`,
  `first delivery  ${firstDelivery}`,
  `days of life    ${window_.days} (minimum ${window_.required})`,
);

if (!window_.ok) {
  failures.push(
    `bedst før ${window_.bestBeforeLabel} is only ${window_.days} days after the `
    + `first delivery (${firstDelivery}); the freshness copy needs at least `
    + `${window_.required}. Bump CONFIG.batch.brewMonth in site/js/klar.js.`,
  );
}

/* 2. the brew has to have happened before it can be delivered */
if (batchDates().bestBeforeDate <= window_.firstDelivery) {
  failures.push('bedst før falls on or before the first delivery date.');
}

/* 3. the next brew announced in brygbogen must be later than the current one */
const current = CONFIG.batch.brewMonth;
if (!(CONFIG.nextBrewMonth > current)) {
  failures.push(
    `nextBrewMonth (${CONFIG.nextBrewMonth}) is not after the current brew `
    + `month (${current}).`,
  );
}

/* 4. the copy spells out shelfLifeMonths as a word in two places; if the
      config changes, those sentences have to change with it */
if (CONFIG.batch.shelfLifeMonths !== 2) {
  failures.push(
    `shelfLifeMonths is ${CONFIG.batch.shelfLifeMonths}, but index.html spells `
    + 'it out as "to måneder" in the frisk section. Update the copy, then this '
    + 'check.',
  );
}

/* 5. per-can price times cans should equal the plan total */
for (const [cans, plan] of Object.entries(CONFIG.plans)) {
  if (plan.unit * Number(cans) !== plan.total) {
    failures.push(
      `plan ${cans}: ${plan.unit} kr x ${cans} = ${plan.unit * Number(cans)}, `
      + `but total is ${plan.total} kr.`,
    );
  }
}

for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.error(`\ncheck-dates: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\ncheck-dates: ok');
