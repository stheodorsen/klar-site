/* ==========================================================================
   Klar — subscription configurator
   ==========================================================================

   Everything the business changes lives in CONFIG. In production these come
   from the server, not from here — see site/README.md "What still needs a
   backend": current batch, prices, the real route calendar per postcode, and
   the serviceable-area lookup.
   ========================================================================== */

const CONFIG = {
  // the only variable copy on the can: brew month + this batch's hop
  batch: {
    brewed: '03.26',
    bestBefore: '05.26',
    hop: 'nectaron',
    hopNote: 'saftig, citrus, tør afslutning',
  },

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

const zipAnswerEl = document.getElementById('zip-answer');
const trialButtons = document.querySelectorAll('[data-action="trial"]');

function derive() {
  const price = CONFIG.plans[state.plan];
  const { batch } = CONFIG;
  const slotLabel = CONFIG.slots[state.slot];
  const freqLabel = CONFIG.frequency[state.freq];
  const firstDelivery = formatDeliveryDate(nextDeliveryDate());
  const pant = state.plan * CONFIG.pantPerCan;

  return {
    // øllen
    canBatch: `brygget ${batch.brewed} · ${batch.hop}`,
    hop: batch.hop,
    hopNote: batch.hopNote,
    brewed: batch.brewed,
    brewedNote: `drik før ${batch.bestBefore} — to måneder, som mælk`,

    // summary
    planLabel: `${state.plan} dåser · ${CONFIG.cansVolume}`,
    freqLabel,
    slotLabel,
    batchLabel: `${batch.brewed} · ${batch.hop}`,
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
      + '· leveres på ladcykel som alt andet',

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
if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(header);
else window.addEventListener('resize', syncHeaderHeight);

/* --- init ----------------------------------------------------------------- */

// Take the defaults from the markup so the HTML stays the source of truth.
const checkedPlan = document.querySelector('input[name="plan"]:checked');
const checkedFreq = document.querySelector('input[name="freq"]:checked');
const checkedSlot = document.querySelector('input[name="slot"]:checked');
if (checkedPlan) state.plan = Number(checkedPlan.value);
if (checkedFreq) state.freq = checkedFreq.value;
if (checkedSlot) state.slot = checkedSlot.value;

render();
