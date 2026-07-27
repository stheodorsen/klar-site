/* ==========================================================================
   Klar — brew-to-order configurator
   ==========================================================================

   Nothing is stocked. A batch is a fixed number of cans, orders close before
   brew day, and the batch is brewed to the number ordered — so "how many are
   left" is the page's central fact, not a decoration.

   Everything the business changes lives in CONFIG. In production these come
   from the server, not from here — see site/README.md "What still needs a
   backend": the batch record, capacity and quantity ordered, prices, and the
   serviceable-area lookup.

   Everything above the "state" marker is pure — no DOM, no side effects.
   tools/check-dates.mjs evaluates exactly that prelude to assert the batch
   record still coheres, so keep document/window out of it.
   ========================================================================== */

const CONFIG = {
  /* The batch record. Dates are DD.MM.YYYY — Danish day-month-year, printed
     verbatim — batch ids are MM.YY, delivery is a Danish weekday plus date.
     The two must never look alike: a bare DD.MM reads as a batch id one token
     over. `closes` must precede `brews`, which must precede `delivers` —
     asserted in tools/check-dates.mjs.

     bestBefore is derived as the batch month + shelfLifeMonths, and the can
     artwork in the photography has it printed in: replacing a batch here
     without re-compositing the photos leaves the cans contradicting the page. */
  batches: {
    current: {
      id: '08.26', hop: 'riwaka', origin: 'new zealand',
      closes: '11.08.2026', brews: '18.08.2026', delivers: 'tirsdag 25.08.2026',
    },
    /* The hop must have actually landed by brew day — see hopArrivals. This was
       citra, which is american, and usa hops do not arrive until
       november–december: two months after this batch is brewed. Not merely
       off-message, impossible. A September brew can only use australien
       (juni–juli); tjekkiet/tyskland do not land until oktober–november.

       Note the copy claims more than the check enforces: "vi brygger med den,
       der senest er landet" promises the *freshest* arrival, and the current
       batch's riwaka (new zealand, maj–juni) is not — australien landed after
       it. Changing that one is blocked on the photography, which has riwaka
       composited into the cans. See site/README.md. */
    next: {
      id: '09.26', hop: 'galaxy', origin: 'australien',
      closes: '08.09.2026', brews: '15.09.2026', delivers: 'tirsdag 22.09.2026',
    },
  },

  shelfLifeMonths: 2,

  /* When each growing region's hops actually land in Denmark — arrival, not
     harvest, because arrival is what determines what can be brewed. `lands` is
     the month the window closes. This is the same table the årstid section
     renders, and tools/check-dates.mjs asserts the two agree and that no batch
     is brewed with a hop that has not arrived yet. Named `arrives`, not
     `window`, so the purity guard in that script does not mistake a property
     name for the DOM global. */
  hopArrivals: [
    { region: 'new zealand',        arrives: 'maj — juni',          lands: 6 },
    { region: 'australien',         arrives: 'juni — juli',         lands: 7 },
    { region: 'tjekkiet, tyskland', arrives: 'oktober — november', lands: 11 },
    { region: 'usa, england',       arrives: 'november — december', lands: 12 },
  ],

  /* A brew is a fixed number of cans. We do not brew over, so this is the
     whole commercial constraint of the business in two numbers. The meter note
     prints the capacity, so its HTML fallback must follow when this moves —
     asserted in tools/check-dates.mjs. */
  capacity: 296,
  taken: 212,

  /* Flip when the current batch is fully ordered. This rewrites the page's
     commercial state in one derived move — header, meter, the disabled current
     batch card, and forced selection of the next batch. In production it is a
     server fact (taken >= capacity), not a hand-set flag. */
  batchFull: false,

  /* Declared strength. Bound into every labelled instance — hero spec, both can
     renders, footer — because a declared ABV that disagrees with itself is a
     labelling problem, not a copy slip. */
  abv: '2,7%',

  cansVolume: '440 ml',

  /* Pricing is a ladder, derived rather than listed: the smallest box is
     basePricePerCan, and every step up the sizes takes another
     sizeDiscountPerCanPerStep off every can. A standing order takes
     standingOrderDiscountPerCan off on top of that.

       4 dåser   39 kr/can   156 kr     (standing: 37 -> 148 kr)
       8 dåser   38 kr/can   304 kr     (standing: 36 -> 288 kr)
      12 dåser   37 kr/can   444 kr     (standing: 35 -> 420 kr)

     Three numbers instead of a hand-written table, so the ladder cannot end up
     internally inconsistent and adding a size is a one-element change. Totals
     are unit x cans exactly — no rounding — because the per-can figure is
     printed next to the total on the option cards and the two must agree.
     Asserted in tools/check-dates.mjs. */
  sizes: [4, 8, 12],
  basePricePerCan: 39,
  sizeDiscountPerCanPerStep: 1,
  standingOrderDiscountPerCan: 2,

  /* Delivery, charged per delivery — a cargo bike crossing inner Copenhagen
     costs the same whether it carries four cans or twelve.

     Itemised in the summary rather than folded into the per-can price, and
     included in the headline total, because the total shown before an order is
     placed has to be what the customer actually pays. The deposit is the
     opposite case and stays out of the total: pant is collected at the door and
     refunded when the cans go back, so it is not a cost.

     Being flat, it lands hardest on the smallest box: 20% of a 4-can order
     against 8% of a 12-can one. Whether it should be waived above a threshold is
     a real pricing decision rather than a detail, so check-dates.mjs prints the
     split on every run — and at 20% it now warns. See site/README.md. */
  deliveryFee: 39,

  pantPerCan: 1, // kr, paid on delivery and refunded on return

  cadence: {
    once:  'kun denne brygning',
    every: 'hver brygning',
    other: 'hver anden brygning',
  },

  slots: {
    early: '16 — 18',
    late:  '18 — 20',
  },

  /* Placeholder for a real serviceable-area lookup. The out-of-area branch
     reveals the waitlist form; the capture itself is local state until the
     backend exists.

     The area is København and Frederiksberg (1050–2500 covers K, Frederiksberg,
     Ø, N, S/Amager, NV, SV/Sydhavn and Valby), plus the districts at the same
     ride distance that sit outside that band: Brønshøj (2700), Vanløse (2720),
     Kastrup-siden af Amager (2770) and Hellerup (2900). */
  serviceable: {
    ranges: [[1050, 2500]],
    postcodes: [2700, 2720, 2770, 2900],
  },
};

/* --- batch dates ---------------------------------------------------------- */

/* '08.26' -> { year: 2026, month: 7 } (month 0-based, as Date wants it) */
function parseBatchId(id) {
  const [month, year] = id.split('.').map(Number);
  return { year: 2000 + year, month: month - 1 };
}

/* 'DD.MM.YYYY' -> a Date */
function parseDate(value) {
  const [day, month, year] = value.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function monthLabel({ year, month }) {
  return `${String(month + 1).padStart(2, '0')}.${String(year % 100).padStart(2, '0')}`;
}

function addMonths({ year, month }, count) {
  const total = year * 12 + month + count;
  return { year: Math.floor(total / 12), month: total % 12 };
}

function bestBeforeLabel(batchId, months = CONFIG.shelfLifeMonths) {
  return monthLabel(addMonths(parseBatchId(batchId), months));
}

/* "drik før 10.26" is a deadline, not a window: the beer should be drunk before
   that month starts, so the effective last day is the 1st. Read the
   conservative way round on purpose. */
function bestBeforeDate(batchId, months = CONFIG.shelfLifeMonths) {
  const { year, month } = addMonths(parseBatchId(batchId), months);
  return new Date(year, month, 1);
}

function canDutyLine(batchId) {
  return `${CONFIG.cansVolume} · øko · drik før ${bestBeforeLabel(batchId)}`;
}

function batchLine(batch) {
  return `${batch.id} · ${batch.hop}`;
}

function isServiceable(zip) {
  const n = Number(zip);
  if (!Number.isInteger(n)) return false;
  return CONFIG.serviceable.postcodes.includes(n)
    || CONFIG.serviceable.ranges.some(([lo, hi]) => n >= lo && n <= hi);
}

/* --- pricing -------------------------------------------------------------- */

/* The per-can price for a size, before the standing-order discount. This is what
   the option cards print, because the discount is disclosed on its own card in
   step 03 rather than folded into the sizes. */
function unitPriceFor(plan) {
  const step = CONFIG.sizes.indexOf(plan);
  if (step === -1) return CONFIG.basePricePerCan;
  return CONFIG.basePricePerCan - step * CONFIG.sizeDiscountPerCanPerStep;
}

/* `beer` is the box on its own — that is what the option cards print, and it is
   the figure that has to equal unit x cans. `total` is what the customer pays:
   the box plus the ride. `pant` is neither, being refundable. */
function priceFor(plan, cadence) {
  const unit = unitPriceFor(plan)
    - (cadence === 'once' ? 0 : CONFIG.standingOrderDiscountPerCan);
  const beer = unit * plan;
  return {
    unit,
    beer,
    fee: CONFIG.deliveryFee,
    total: beer + CONFIG.deliveryFee,
    pant: plan * CONFIG.pantPerCan,
  };
}

/* --- the batch invariants ------------------------------------------------- */

/* The page promises fresh beer and prints a short bedst før to prove it. That
   only holds while the batch record is current: order-close before brew day,
   brew before delivery, and enough shelf life left after delivery to be worth
   drinking. A stale record turns the freshness argument into a false claim
   while the page still looks perfectly fine, so it is asserted rather than
   trusted — in CI by tools/check-dates.mjs, which fails the deploy. */
const MIN_DAYS_OF_LIFE = 14;
const MS_PER_DAY = 86400000;

function batchTimeline(key = 'current') {
  const batch = CONFIG.batches[key];
  const closes = parseDate(batch.closes);
  const brews = parseDate(batch.brews);
  const delivers = parseDate(batch.delivers.split(' ').pop());
  const bestBefore = bestBeforeDate(batch.id);
  return {
    batch,
    closes,
    brews,
    delivers,
    bestBefore,
    bestBeforeLabel: bestBeforeLabel(batch.id),
    daysOfLife: Math.round((bestBefore - delivers) / MS_PER_DAY),
    required: MIN_DAYS_OF_LIFE,
    ordered: closes <= brews && brews <= delivers,
  };
}

function batchOk(key = 'current') {
  const t = batchTimeline(key);
  return t.ordered && t.daysOfLife >= t.required;
}

/* --- state ---------------------------------------------------------------- */

const state = {
  batch: 'current',
  plan: 8,
  cadence: 'every',
  slot: 'early',
  zip: '',
  // null until a check has run; then { zip, serviceable } or { tooShort: true }
  zipCheck: null,
  // null until the waitlist form is submitted; then { signedUp: true } or
  // { invalid: true }. Cleared with zipCheck — it belongs to one answer.
  waitlist: null,
  ordered: false,
};

/* --- data binding --------------------------------------------------------- */

const bindings = new Map();
for (const el of document.querySelectorAll('[data-bind]')) {
  const key = el.dataset.bind;
  if (!bindings.has(key)) bindings.set(key, []);
  bindings.get(key).push(el);
}

/* The can renders are role="img", so their aria-label carries the whole face as
   one string — including the batch line and the ABV that CONFIG owns. Binding
   the attribute keeps the spoken can and the printed can from drifting apart. */
const labelBindings = new Map();
for (const el of document.querySelectorAll('[data-bind-label]')) {
  const key = el.dataset.bindLabel;
  if (!labelBindings.has(key)) labelBindings.set(key, []);
  labelBindings.get(key).push(el);
}

const zipAnswerEl = document.getElementById('zip-answer');
const waitlistFormEl = document.getElementById('waitlist-form');
const waitlistAnswerEl = document.getElementById('waitlist-answer');
const meterFillEl = document.getElementById('meter-fill');
const currentBatchInput = document.querySelector('input[name="batch"][value="current"]');
const nextBatchInput = document.querySelector('input[name="batch"][value="next"]');

/* --- derived state -------------------------------------------------------- */

/* batchFull is resolved once, here, and everything downstream reads the result.
   The handoff is explicit that this must be one derived state rather than
   scattered conditionals — otherwise the page can end up half sold out. */
function derive() {
  const full = CONFIG.batchFull === true;
  const effectiveBatch = full ? 'next' : state.batch;
  const batch = CONFIG.batches[effectiveBatch];
  const current = CONFIG.batches.current;
  const next = CONFIG.batches.next;

  const left = full ? 0 : CONFIG.capacity - CONFIG.taken;
  const price = priceFor(state.plan, state.cadence);
  const slotLabel = CONFIG.slots[state.slot];
  const cadenceLabel = CONFIG.cadence[state.cadence];

  /* The option cards print the ladder, so they read it from the same place the
     summary does — a hand-typed card that disagrees with the total the customer
     is charged is the worst kind of drift. */
  const cardPrices = {};
  for (const size of CONFIG.sizes) {
    cardPrices[`cardUnit${size}`] = `${unitPriceFor(size)} kr / dåse`;
    cardPrices[`cardTotal${size}`] = `${unitPriceFor(size) * size} kr`;
  }

  return {
    ...cardPrices,

    full,

    // header
    headStatus: full
      ? `${current.id} · udsolgt`
      : `${current.id} · bestilling lukker ${current.closes}`,

    // hero + cans + footer
    abv: CONFIG.abv,
    abvVol: `${CONFIG.abv} vol.`,
    canCurrentBatch: batchLine(current),
    canCurrentDuty: canDutyLine(current.id),
    canNextBatch: batchLine(next),
    canNextDuty: canDutyLine(next.id),
    canCurrentLabel: `Dåsen: mærket, KLAR, humlet hverdagsøl, ${batchLine(current)}, `
      + `${CONFIG.abv}, ${canDutyLine(current.id)}.`,
    canNextLabel: `Den kommende dåse: ${batchLine(next)}, ${CONFIG.abv}, `
      + `${canDutyLine(next.id)}.`,

    // the batch meter
    openStateLabel: full ? 'fuld' : 'åben',
    leftLabel: full ? 'venteliste' : `${left} dåser tilbage`,
    leftSub: full
      ? `brygningen er bestilt op. vi brygger ikke over — så du kommer med i ${next.id}.`
      : `en brygning er ${CONFIG.capacity} dåser. vi brygger ikke over.`,
    meterWidth: full ? '100%' : `${Math.round((CONFIG.taken / CONFIG.capacity) * 100)}%`,

    // 01 — which batch
    currentBatchLabel: batchLine(current),
    nextBatchLabel: batchLine(next),
    currentChip: full ? 'fuld' : `${left} tilbage`,
    currentBody: full
      ? `bestilt op. næste chance er ${next.id}.`
      : `lukker ${current.closes} · brygges ${current.brews} · kører ${current.delivers.split(' ').pop()}`,
    nextChip: full ? 'åben' : `åbner ${current.closes}`,
    nextBody: `lukker ${next.closes} · brygges ${next.brews} · kører ${next.delivers.split(' ').pop()}`,

    // summary
    summaryState: full || effectiveBatch === 'next' ? 'næste brygning' : 'åben',
    batchLabel: batch.id,
    hopLabel: batch.hop,
    closeLabel: batch.closes,
    planLabel: `${state.plan} dåser · ${CONFIG.cansVolume}`,
    deliveryLabel: `${batch.delivers}, ${slotLabel}`,
    cadenceLabel,
    feeLabel: `${price.fee} kr`,
    priceLabel: `${price.total} kr`,
    unitPantLabel: `${price.unit} kr pr. dåse · pant ${price.pant} kr`,

    termLine: state.cadence === 'once'
      ? 'ingen binding · engangskøb'
      : 'ingen binding · stop inden bestillingen lukker',

    ctaLabel: state.ordered ? `du er med i ${batch.id}` : `bestil ${batch.id}`,
    confirmLabel: state.ordered
      ? `tak. vi brygger ${batch.id} til det antal, der er bestilt, og kommer `
        + `${batch.delivers} i vinduet ${slotLabel}.`
      : '',

    // recomputed rather than frozen at check time, so it cannot go stale when
    // the customer changes batch or window afterwards
    zipAnswer: zipAnswerText(batch, slotLabel),

    // the waitlist form shows only while an out-of-area answer stands and the
    // reader has not signed up yet
    waitlistOpen: Boolean(
      state.zipCheck && !state.zipCheck.tooShort && !state.zipCheck.serviceable,
    ) && !state.waitlist?.signedUp,
    waitlistAnswer: waitlistAnswerText(),
  };
}

function waitlistAnswerText() {
  if (!state.waitlist) return '';
  if (state.waitlist.invalid) return 'skriv en rigtig e-mail-adresse, så siger vi til.';
  return `tak. vi skriver, når cyklen når ${state.zipCheck.zip}.`;
}

function zipAnswerText(batch, slotLabel) {
  if (!state.zipCheck) return '';
  if (state.zipCheck.tooShort) return 'skriv fire cifre, så tjekker vi ruten.';
  if (state.zipCheck.serviceable) {
    return `ja — vi kører hos dig. ${batch.id} kommer ${batch.delivers}, ${slotLabel}.`;
  }
  return 'ikke endnu. skriv dig op, og vi siger til når cyklen når frem.';
}

/* --- render --------------------------------------------------------------- */

function render() {
  const values = derive();

  for (const [key, elements] of bindings) {
    if (!(key in values)) continue;
    for (const el of elements) {
      if (el.textContent !== values[key]) el.textContent = values[key];
    }
  }

  for (const [key, elements] of labelBindings) {
    if (!(key in values)) continue;
    for (const el of elements) {
      if (el.getAttribute('aria-label') !== values[key]) {
        el.setAttribute('aria-label', values[key]);
      }
    }
  }

  if (zipAnswerEl.textContent !== values.zipAnswer) {
    zipAnswerEl.textContent = values.zipAnswer;
  }
  zipAnswerEl.dataset.serviceable = String(Boolean(state.zipCheck?.serviceable));

  waitlistFormEl.hidden = !values.waitlistOpen;
  if (waitlistAnswerEl.textContent !== values.waitlistAnswer) {
    waitlistAnswerEl.textContent = values.waitlistAnswer;
  }

  meterFillEl.style.width = values.meterWidth;

  /* Sold out: the current batch stops being an option at all. `disabled` also
     removes it from the tab order, so there is no focusable dead end.

     The forced selection is written back to `state`, not just to the DOM.
     Otherwise state.batch stays 'current' behind a checked 'next' radio, and if
     the flag ever cleared mid-session the summary would describe one batch while
     the selected card showed the other. Safe to do here: derive() already
     resolves to 'next' either way, so this needs no second pass. */
  if (currentBatchInput.disabled !== values.full) {
    currentBatchInput.disabled = values.full;
  }
  if (values.full) {
    state.batch = 'next';
    if (!nextBatchInput.checked) nextBatchInput.checked = true;
  }
}

/* --- events --------------------------------------------------------------- */

// Any selection change invalidates a placed order, so a confirmation can never
// linger over an order that has since changed.
function select(patch) {
  Object.assign(state, patch, { ordered: false });
  render();
}

const radioHandlers = {
  batch: (value) => select({ batch: value }),
  plan: (value) => select({ plan: Number(value) }),
  cadence: (value) => select({ cadence: value }),
  slot: (value) => select({ slot: value }),
};

for (const [name, handler] of Object.entries(radioHandlers)) {
  for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
    input.addEventListener('change', () => handler(input.value));
  }
}

const zipForm = document.getElementById('zip-form');
const zipInput = document.getElementById('zip-input');

zipInput.addEventListener('input', () => {
  const cleaned = zipInput.value.replace(/\D/g, '').slice(0, 4);
  if (zipInput.value !== cleaned) zipInput.value = cleaned;
  state.zip = cleaned;
  state.zipCheck = null; // typing clears the previous answer
  state.waitlist = null; // and the waitlist belongs to that answer
  render();
});

zipForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.zipCheck = state.zip.length < 4
    ? { tooShort: true, serviceable: false }
    : { zip: state.zip, serviceable: isServiceable(state.zip) };
  state.waitlist = null; // a new check gets a fresh form
  render();
});

const waitlistInput = document.getElementById('waitlist-input');

waitlistInput.addEventListener('input', () => {
  // typing withdraws a rejection; a confirmation hides the form, so it cannot
  // be typed away
  if (state.waitlist?.invalid) {
    state.waitlist = null;
    render();
  }
});

waitlistFormEl.addEventListener('submit', (event) => {
  event.preventDefault();
  // Prototype boundary: in production this posts to the waitlist and the
  // confirmation echoes the server's answer.
  const email = waitlistInput.value.trim();
  state.waitlist = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? { signedUp: true }
    : { invalid: true };
  render();
});

for (const btn of document.querySelectorAll('[data-action="order"]')) {
  btn.addEventListener('click', () => {
    // Prototype boundary: in production this opens real checkout — age gate
    // (18+), address, payment, and a place in the batch that decrements it.
    state.ordered = true;
    render();
  });
}

/* --- replaying the mark --------------------------------------------------- */

/* The circle rising through the horizon is the only animation in the brand and
   it runs once, on load. Hovering the mark sends the sun up again.

   Only the circle is touched, and only its transform: klar-rise-again carries no
   opacity and the horizon is left alone entirely. Replaying the load animation
   instead — which is what this used to do — blinked the circle and re-faded the
   line, and the combination read as the whole mark jumping.

   Restarting an animation needs the old one genuinely gone before the new one
   is set, hence the forced reflow between. Decorative only: the mark is
   aria-hidden, so there is nothing to expose to the keyboard. */
const heroMark = document.querySelector('.mark--hero');
const heroCircle = document.querySelector('.mark--hero .mark__circle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const MARK_REPLAY = 'klar-rise-again var(--rise-duration) var(--rise-ease) both';

if (heroMark && heroCircle) {
  heroMark.addEventListener('pointerenter', () => {
    // checked per event, not once, so a mid-session preference change is honoured
    if (reducedMotion.matches) return;

    /* A rise in progress is left alone. The mark's hover box is the svg's 230x81
       frame, so sweeping the pointer across it — or letting it jitter on the
       edge — fires pointerenter repeatedly, and at 2.2s each of those used to
       restart the animation from the bottom. The sun stuttered instead of
       rising. One rise finishes before another can begin; the load animation
       counts, so an early hover cannot cut that off either. */
    const rising = heroCircle.getAnimations().some((a) => a.playState === 'running');
    if (rising) return;

    heroCircle.style.animation = 'none';
    void heroCircle.getBoundingClientRect().width;
    heroCircle.style.animation = MARK_REPLAY;
  });
}

/* --- header height -------------------------------------------------------- */

/* Anchor offsets and the sticky summary both key off the header, which changes
   height when the nav wraps. Measured rather than guessed. */
const header = document.querySelector('.header');

function syncHeaderHeight() {
  document.documentElement.style.setProperty(
    '--header-h', `${Math.round(header.getBoundingClientRect().height)}px`,
  );
}

syncHeaderHeight();

/* --header-h feeds scroll-padding-top, so if it goes stale every anchor jump
   lands behind the sticky header the moment the nav wraps to two lines. That is
   worth two belts: the observer catches the nav rewrapping at a fixed viewport
   width, and the resize listener is attached unconditionally rather than only
   as a ResizeObserver fallback — some embedded webviews expose the constructor
   but never deliver its callbacks, and there the listener is all there is. The
   observer is kept in a variable rather than left anonymous. */
const headerObserver = 'ResizeObserver' in window
  ? new ResizeObserver(syncHeaderHeight)
  : null;
if (headerObserver) headerObserver.observe(header);
window.addEventListener('resize', syncHeaderHeight);

/* --- init ----------------------------------------------------------------- */

// Take the defaults from the markup so the HTML stays the source of truth.
for (const name of Object.keys(radioHandlers)) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  if (!checked) continue;
  state[name] = name === 'plan' ? Number(checked.value) : checked.value;
}

render();

/* CI catches a stale batch record before it ships (tools/check-dates.mjs), but a
   site left running past its own bedst før would still be making the claim, so
   it says so loudly in the console rather than failing quietly. */
for (const key of ['current', 'next']) {
  if (batchOk(key)) continue;
  const t = batchTimeline(key);
  console.error(
    `[klar] batch ${t.batch.id} (${key}) does not cohere: closes ${t.batch.closes}, `
    + `brews ${t.batch.brews}, delivers ${t.batch.delivers}, bedst før `
    + `${t.bestBeforeLabel} — ${t.daysOfLife} days of life after delivery, `
    + `minimum ${t.required}. Update CONFIG.batches.`,
  );
}
