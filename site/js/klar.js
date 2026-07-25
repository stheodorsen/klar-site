/* ==========================================================================
   Klar — subscription configurator
   ==========================================================================

   Everything the business changes lives in CONFIG. In production these come
   from the server, not from here — see site/README.md "What still needs a
   backend": current batch, prices, the real route calendar per postcode, and
   the serviceable-area lookup.

   Everything above the "state" marker is pure — no DOM, no side effects.
   tools/check-dates.mjs evaluates exactly that prelude to assert the batch
   dates still cohere, so keep document/window out of it.
   ========================================================================== */

const CONFIG = {
  /* One brew month drives all three dates: the brygmåned on the can, the
     bedst før two months after it, and the freshness argument that the gap
     between them is deliberately short. Bump this and nothing else. */
  batch: {
    brewMonth: '2026-07',
    shelfLifeMonths: 2,
    hop: 'nectaron',
    hopOrigin: 'new zealand, høst 26',
    hopNote: 'saftig, citrus, tør afslutning',
  },

  // the brew after this one, announced at the foot of brygbogen
  nextBrewMonth: '2026-09',

  /* Declared strength. Bound into every labelled instance — hero spec, spec
     strip, both can faces, footer — because a declared ABV that disagrees with
     itself is a labelling problem, not a copy slip. Prose that argues about the
     number ("2,8% er altså ikke et moderne kompromis") is written out in the
     HTML; grep for it if this changes. */
  abv: '2,8%',

  cansVolume: '440 ml',

  plans: {
    6:  { total: 132, unit: 22 },
    12: { total: 240, unit: 20 },
    24: { total: 432, unit: 18 },
  },

  pantPerCan: 1, // kr, paid on delivery and refunded on return

  // one-off box, no subscription — deliberately priced above the 6-can plan
  trial: { cans: 6, price: 145 },

  frequency: {
    week:  'hver uge',
    two:   'hver 14. dag',
    month: 'hver måned',
  },

  slots: {
    early: '16 — 18',
    late:  '18 — 20',
  },

  // cargo bikes run one route day a week; order before noon the day before
  route: { weekday: 2, cutoffHour: 12 },

  // placeholder for a real serviceable-area lookup. The out-of-area branch
  // should become a waitlist capture rather than a dead end.
  serviceable: {
    ranges: [[1050, 1799]],
    postcodes: [2100, 2200, 2300, 2400, 2450],
  },
};

/* --- batch dates ---------------------------------------------------------- */

/* '2026-07' -> { year: 2026, month: 6 } (month is 0-based, as Date wants it) */
function parseBrewMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return { year, month: month - 1 };
}

/* { 2026, 6 } -> '07.26', the form printed on the can */
function monthLabel({ year, month }) {
  return `${String(month + 1).padStart(2, '0')}.${String(year % 100).padStart(2, '0')}`;
}

function addMonths({ year, month }, count) {
  const total = year * 12 + month + count;
  return { year: Math.floor(total / 12), month: total % 12 };
}

/* "drik før 09.26" is a deadline, not a window: the beer should be drunk
   before that month starts, so the effective last day is the 1st. Read the
   conservative way round on purpose — it is the number the freshness claim
   is measured against in tools/check-dates.mjs. */
function monthStartDate({ year, month }) {
  return new Date(year, month, 1);
}

function batchDates(batch = CONFIG.batch) {
  const brewed = parseBrewMonth(batch.brewMonth);
  const bestBefore = addMonths(brewed, batch.shelfLifeMonths);
  return {
    brewed,
    bestBefore,
    brewedLabel: monthLabel(brewed),
    bestBeforeLabel: monthLabel(bestBefore),
    bestBeforeDate: monthStartDate(bestBefore),
  };
}

/* --- delivery calendar ---------------------------------------------------- */

function nextDeliveryDate(now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let delta = (CONFIG.route.weekday - day.getDay() + 7) % 7 || 7;
  // missed today's cut-off for tomorrow's route
  if (delta === 1 && now.getHours() >= CONFIG.route.cutoffHour) delta += 7;
  day.setDate(day.getDate() + delta);
  return day;
}

const weekdayFormat = new Intl.DateTimeFormat('da-DK', { weekday: 'long' });

function formatDeliveryDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const weekday = weekdayFormat.format(date).toLowerCase();
  return `${weekday} ${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

function isServiceable(zip) {
  const n = Number(zip);
  if (!Number.isInteger(n)) return false;
  return CONFIG.serviceable.postcodes.includes(n)
    || CONFIG.serviceable.ranges.some(([lo, hi]) => n >= lo && n <= hi);
}

/* --- the freshness invariant ---------------------------------------------- */

/* The site promises month-fresh beer and prints a short bedst før to prove it.
   That only holds if a new subscriber's first delivery leaves them real time
   with the beer: bedst før must be at least MIN_DAYS_OF_LIFE after the first
   delivery date. A stale brewMonth silently turns the freshness pillar into a
   lie, so this is asserted rather than trusted — at runtime below, and in CI
   by tools/check-dates.mjs, which fails the deploy. */
const MIN_DAYS_OF_LIFE = 14;
const MS_PER_DAY = 86400000;

function freshnessWindow(now = new Date()) {
  const { bestBeforeLabel, bestBeforeDate } = batchDates();
  const firstDelivery = nextDeliveryDate(now);
  const days = Math.round((bestBeforeDate - firstDelivery) / MS_PER_DAY);
  return {
    days,
    ok: days >= MIN_DAYS_OF_LIFE,
    bestBeforeLabel,
    firstDelivery,
    required: MIN_DAYS_OF_LIFE,
  };
}

/* --- state ---------------------------------------------------------------- */

const state = {
  plan: 12,
  freq: 'two',
  slot: 'early',
  zip: '',
  // null until a check has run; then { zip, serviceable }
  zipCheck: null,
  subscribed: false,
  trial: false,
};

/* --- data binding --------------------------------------------------------- */

const bindings = new Map();
for (const el of document.querySelectorAll('[data-bind]')) {
  const key = el.dataset.bind;
  if (!bindings.has(key)) bindings.set(key, []);
  bindings.get(key).push(el);
}

/* The can renders are role="img", so their aria-label carries the whole face as
   one string — including the batch dates and the ABV that CONFIG owns. Binding
   the attribute keeps the spoken can and the printed can from drifting apart. */
const labelBindings = new Map();
for (const el of document.querySelectorAll('[data-bind-label]')) {
  const key = el.dataset.bindLabel;
  if (!labelBindings.has(key)) labelBindings.set(key, []);
  labelBindings.get(key).push(el);
}

const zipAnswerEl = document.getElementById('zip-answer');
const trialButtons = document.querySelectorAll('[data-action="trial"]');

function derive() {
  const price = CONFIG.plans[state.plan];
  const { batch } = CONFIG;
  const { brewedLabel, bestBeforeLabel } = batchDates();
  const slotLabel = CONFIG.slots[state.slot];
  const freqLabel = CONFIG.frequency[state.freq];
  const firstDelivery = formatDeliveryDate(nextDeliveryDate());
  const pant = state.plan * CONFIG.pantPerCan;

  return {
    // øllen
    abv: CONFIG.abv,
    abvVol: `${CONFIG.abv} vol.`,
    canBatch: `brygget ${brewedLabel} · ${batch.hop}`,
    canBestBefore: `${CONFIG.cansVolume} · øko · drik før ${bestBeforeLabel}`,
    canVolumeAbv: `${CONFIG.cansVolume} · ${CONFIG.abv} vol.`,
    canLegal: `brygget af klar bryghus aps, københavn n · bedst før: ${bestBeforeLabel}`,
    hop: batch.hop,
    hopOrigin: batch.hopOrigin,
    hopNote: batch.hopNote,
    brewed: brewedLabel,
    brewedNote: `drik før ${bestBeforeLabel} — dateret som mælk, ikke som spiritus`,
    nextBrewLabel: monthLabel(parseBrewMonth(CONFIG.nextBrewMonth)),

    // the two can faces, spoken as one string each for role="img"
    canFrontLabel: 'Dåsens forside: mærket, KLAR, humlet hverdagsøl, '
      + `brygget ${brewedLabel} · ${batch.hop}, ${CONFIG.abv}, `
      + `${CONFIG.cansVolume} · øko · drik før ${bestBeforeLabel}.`,
    canBackLabel: 'Dåsens bagside: HVERDAGSØL. Stærk øl til fest, let øl til '
      + 'maden — sådan drak vi i århundreder, det her er til tirsdag. '
      + 'Uklar i glasset, klar i hovedet. '
      + `${CONFIG.cansVolume} · ${CONFIG.abv} vol. `
      + `Bedst før ${bestBeforeLabel}.`,

    // summary
    planLabel: `${state.plan} dåser · ${CONFIG.cansVolume}`,
    freqLabel,
    slotLabel,
    batchLabel: `${brewedLabel} · ${batch.hop}`,
    firstDeliveryLabel: `${firstDelivery}, ${slotLabel}`,
    totalLabel: `${price.total} kr`,
    unitPantLabel: `${price.unit} kr pr. dåse · pant ${pant} kr betales ved levering og retur`,

    ctaLabel: state.subscribed ? 'abonnement oprettet' : 'start abonnement',
    confirmLabel: state.subscribed
      ? `tak. vi sender en bekræftelse og kommer ${firstDelivery} i vinduet ${slotLabel}. `
        + 'sæt kassen ud, hvis du har tomme.'
      : '',

    trialLabel: state.trial
      ? `i kassen — ${CONFIG.trial.price} kr`
      : 'læg prøvekasse i kurv',

    trialDetail: `prøvekasse · ${CONFIG.trial.cans} dåser, én gang, ${CONFIG.trial.price} kr `
      + '· leveres kold på ladcykel som alt andet',

    cartCount: String(state.trial ? 1 : 0),

    // recomputed rather than frozen at check time, so it cannot go stale when
    // the customer changes frequency or window afterwards
    zipAnswer: zipAnswerText(freqLabel, slotLabel, firstDelivery),
  };
}

function zipAnswerText(freqLabel, slotLabel, firstDelivery) {
  if (!state.zipCheck) return '';
  if (state.zipCheck.tooShort) return 'skriv fire cifre, så tjekker vi ruten.';
  if (state.zipCheck.serviceable) {
    return `ja — vi kører hos dig. ${freqLabel}, ${slotLabel}. `
      + `første levering ${firstDelivery}.`;
  }
  return 'ikke endnu. skriv dig op, og vi siger til når cyklen når frem.';
}

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

  for (const btn of trialButtons) btn.setAttribute('aria-pressed', String(state.trial));
}

/* --- events --------------------------------------------------------------- */

// Any selection change invalidates a placed subscription.
function select(patch) {
  Object.assign(state, patch, { subscribed: false });
  render();
}

document.querySelectorAll('input[name="plan"]').forEach((input) => {
  input.addEventListener('change', () => select({ plan: Number(input.value) }));
});
document.querySelectorAll('input[name="freq"]').forEach((input) => {
  input.addEventListener('change', () => select({ freq: input.value }));
});
document.querySelectorAll('input[name="slot"]').forEach((input) => {
  input.addEventListener('change', () => select({ slot: input.value }));
});

const zipForm = document.getElementById('zip-form');
const zipInput = document.getElementById('zip-input');

zipInput.addEventListener('input', () => {
  const cleaned = zipInput.value.replace(/\D/g, '').slice(0, 4);
  if (zipInput.value !== cleaned) zipInput.value = cleaned;
  state.zip = cleaned;
  state.zipCheck = null; // typing clears the previous answer
  render();
});

zipForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.zipCheck = state.zip.length < 4
    ? { tooShort: true, serviceable: false }
    : { zip: state.zip, serviceable: isServiceable(state.zip) };
  render();
});

document.querySelectorAll('[data-action="subscribe"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Prototype boundary: in production this opens real checkout — age gate
    // (18+), address, payment and a recurring-order schedule.
    state.subscribed = true;
    render();
  });
});

trialButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.trial = !state.trial;
    render();
  });
});

/* --- replaying the mark --------------------------------------------------- */

/* The circle rising through the horizon is the only animation in the brand and
   it runs once, on load. Hovering the mark plays it again.

   It restarts the animations already declared in the stylesheet rather than
   redefining them, so the timing stays in one place: drop the animation, force
   a reflow so the removal actually lands, then hand it back. Decorative only —
   the mark is aria-hidden, so there is nothing to expose to the keyboard. */
const heroMark = document.querySelector('.mark--hero');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (heroMark) {
  const parts = heroMark.querySelectorAll('.mark__circle, .mark__horizon');

  heroMark.addEventListener('pointerenter', () => {
    // checked per event, not once, so a mid-session preference change is honoured
    if (reducedMotion.matches) return;
    for (const part of parts) part.style.animation = 'none';
    void heroMark.getBoundingClientRect().width;
    for (const part of parts) part.style.animation = '';
  });
}

/* --- header height -------------------------------------------------------- */

/* Anchor offsets and the sticky summary both key off the header, which
   changes height when the nav wraps. Measured rather than guessed. */
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
   as an ResizeObserver fallback — some embedded webviews expose the constructor
   but never deliver its callbacks, and there the listener is all there is. The
   observer is kept in a variable rather than left anonymous. */
const headerObserver = 'ResizeObserver' in window
  ? new ResizeObserver(syncHeaderHeight)
  : null;
if (headerObserver) headerObserver.observe(header);
window.addEventListener('resize', syncHeaderHeight);

/* --- init ----------------------------------------------------------------- */

// Take the defaults from the markup so the HTML stays the source of truth.
const checkedPlan = document.querySelector('input[name="plan"]:checked');
const checkedFreq = document.querySelector('input[name="freq"]:checked');
const checkedSlot = document.querySelector('input[name="slot"]:checked');
if (checkedPlan) state.plan = Number(checkedPlan.value);
if (checkedFreq) state.freq = checkedFreq.value;
if (checkedSlot) state.slot = checkedSlot.value;

render();

/* CI catches a stale brewMonth before it ships (tools/check-dates.mjs), but a
   site left running past its own bedst før would still be making the claim, so
   it says so loudly in the console rather than failing quietly. */
{
  const window_ = freshnessWindow();
  if (!window_.ok) {
    console.error(
      `[klar] batch ${CONFIG.batch.brewMonth} is stale: bedst før `
      + `${window_.bestBeforeLabel} is ${window_.days} days after the first `
      + `delivery, and the freshness copy needs at least ${window_.required}. `
      + 'Bump CONFIG.batch.brewMonth.',
    );
  }
}
