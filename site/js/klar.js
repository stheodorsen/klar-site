/* ==========================================================================
   Klar — B2B fad, single page
   ==========================================================================

   The commerce layer is gone: no batches, no stock meter, no checkout. What
   remains is the pilot-Friday form, the mark's rise animation, and the header
   height sync.

   Everything the business changes lives in CONFIG. Everything above the
   "dom" marker is pure — no DOM, no side effects. tools/check-site.mjs
   evaluates exactly that prelude to assert the page and the config still
   agree, so keep document/window out of it.
   ========================================================================== */

const CONFIG = {
  /* Declared strength. check-site.mjs asserts every ABV printed in the HTML
     matches this — a declared ABV that disagrees with itself is a labelling
     problem, not a copy slip. */
  abv: '2,7%',

  /* The only two prices that may appear on the page. Resale prices for bars
     and hotels are lower, negotiated individually, and must never be public —
     check-site.mjs fails the deploy if the HTML contains any kr amount not
     listed here. Amounts are printed Danish-style: 1.000 kr. */
  prices: [
    { keg: '9 liter', serves: '22 glas', kr: '500 kr' },
    { keg: '20 liter', serves: '50 glas', kr: '1.000 kr' },
  ],

  /* Where the form submits. Set exactly one of these at deploy time — ids and
     URLs live here, never in the markup, so the integration can be swapped
     without touching HTML.

     hubspot: portal + form id for the Forms API. The deal pipeline is
     `Klar Fredagsbar` — NEVER `Felix Pipeline`, which has non-standard stage
     ids and belongs to a different company. The pipeline, stages and the
     custom properties (klynge, aftaletype, fade_pr_uge, kontaktrolle) are
     configured in HubSpot on the form/workflow, not posted from here.

     endpoint: fallback (Formspree/Netlify/Tally-style) that accepts a POSTed
     form. Same markup either way.

     With neither set, the form is a prototype: it validates and confirms
     locally, and sends nothing. */
  hubspot: { portalId: '', formId: '' },
  endpoint: '',

  contactEmail: 'hej@klar.dk',
};

/* --- validation ------------------------------------------------------------ */

/* Loose on purpose: the check is "could this be an address we can reply to",
   not RFC 5322. The real gate is the reply itself. */
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* Field rules. `missing` is the error when a required field is empty;
   `check`/`invalid` is the error when a filled value is wrong. Errors say
   what went wrong and what to do — no apologies, no vagueness. The wished-for
   day is deliberately any day of the week — a pilot can land on a Thursday as
   well as a Friday (29.07.2026). */
const FIELDS = [
  { id: 'firma', missing: 'skriv firmaets navn.' },
  { id: 'navn', missing: 'skriv dit navn.' },
  {
    id: 'email',
    missing: 'skriv den e-mail, vi skal svare på.',
    check: isEmail,
    invalid: 'det ligner ikke en e-mail-adresse — tjek for tastefejl.',
  },
  { id: 'telefon' },
  { id: 'adresse', missing: 'skriv adressen, fadet skal leveres til.' },
  { id: 'kontor', missing: 'vælg, hvor mange i er på kontoret.' },
  { id: 'dag' },
  { id: 'besked' },
];

const CONFIRM_TEXT = 'tak. vi skriver tilbage inden for en dag med en dato, der passer.';

/* --- submission targets ----------------------------------------------------- */

function hubspotUrl({ portalId, formId }) {
  return `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;
}

/* The HubSpot form's field names. navn is split into firstname/lastname
   because HubSpot has no single name property; everything Danish-specific
   travels in properties the form must define. Adjust here when the form's
   fields change — never in the markup. */
function hubspotFields(values) {
  const name = values.navn.trim();
  const space = name.lastIndexOf(' ');
  return [
    { name: 'firstname', value: space === -1 ? name : name.slice(0, space) },
    { name: 'lastname', value: space === -1 ? '' : name.slice(space + 1) },
    { name: 'email', value: values.email },
    { name: 'phone', value: values.telefon },
    { name: 'company', value: values.firma },
    { name: 'address', value: values.adresse },
    { name: 'kontorstoerrelse', value: values.kontor },
    { name: 'oensket_dag', value: values.dag },
    { name: 'message', value: values.besked },
  ].filter((f) => f.value !== '');
}

/* --- dom -------------------------------------------------------------------- */

const form = document.getElementById('pilot-form');
const formError = document.getElementById('pilot-form-error');
const confirmEl = document.getElementById('pilot-confirm');
const submitBtn = form.querySelector('button[type="submit"]');

const fieldEls = new Map(FIELDS.map(({ id }) => [id, {
  input: document.getElementById(`f-${id}`),
  error: document.getElementById(`err-${id}`),
}]));

function setError(id, message) {
  const { input, error } = fieldEls.get(id);
  error.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

/* Validate everything, report everything — a form that reveals its errors one
   submit at a time is a form that gets abandoned. Returns the first invalid
   input so focus can land on it. */
function validate() {
  let firstInvalid = null;
  for (const field of FIELDS) {
    const { input } = fieldEls.get(field.id);
    const value = input.value.trim();
    let message = '';
    if (!value && input.required) message = field.missing;
    else if (value && field.check && !field.check(value)) message = field.invalid;
    setError(field.id, message);
    if (message && !firstInvalid) firstInvalid = input;
  }
  return firstInvalid;
}

// typing withdraws the field's error immediately, rather than leaving a stale
// rejection standing next to a corrected value
for (const [id, { input }] of fieldEls) {
  input.addEventListener('input', () => setError(id, ''));
}

function formValues() {
  const values = {};
  for (const [id, { input }] of fieldEls) values[id] = input.value.trim();
  return values;
}

async function send(values) {
  if (CONFIG.hubspot.portalId && CONFIG.hubspot.formId) {
    const res = await fetch(hubspotUrl(CONFIG.hubspot), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: hubspotFields(values) }),
    });
    if (!res.ok) throw new Error(`hubspot ${res.status}`);
    return;
  }
  if (CONFIG.endpoint) {
    const body = new FormData(form);
    const res = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    });
    if (!res.ok) throw new Error(`endpoint ${res.status}`);
    return;
  }
  /* Prototype boundary: no target configured, nothing is sent. The flow is
     real from the visitor's side so the page can be reviewed whole. */
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.textContent = '';

  const firstInvalid = validate();
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  submitBtn.disabled = true;
  try {
    await send(formValues());
  } catch {
    submitBtn.disabled = false;
    formError.textContent = 'beskeden kom ikke afsted — noget gik galt hos os. '
      + `prøv igen om et øjeblik, eller skriv til ${CONFIG.contactEmail}.`;
    return;
  }
  form.hidden = true;
  confirmEl.textContent = CONFIRM_TEXT;
});

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

/* Anchor offsets key off the header, which changes height when the nav wraps.
   Measured rather than guessed. */
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
   but never deliver its callbacks, and there the listener is all there is. */
const headerObserver = 'ResizeObserver' in window
  ? new ResizeObserver(syncHeaderHeight)
  : null;
if (headerObserver) headerObserver.observe(header);
window.addEventListener('resize', syncHeaderHeight);
