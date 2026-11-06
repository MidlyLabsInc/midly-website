// node --test test/
//
// The Calendly half of js/consent.js: booking links carry the visitor's
// advertising consent and GA client id only when advertising is allowed.
// app.midly.ai's Calendly webhook reports a booking to Google Ads only when
// it finds both (lib/calendly-conversion.ts there), so this is the contract.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'js', 'consent.js'), 'utf8');
const DEMO = 'https://calendly.com/patience-midly/midly-demo';
const GA = 'GA1.1.123456789.1700000000';

const choice = (a, m) => encodeURIComponent(JSON.stringify({ a, m, t: 1793900000000 }));

function load(cookies, { gpc = false } = {}) {
  const jar = new Map(Object.entries(cookies));
  const listeners = {};
  const stub = () => ({ style: {}, appendChild() {}, setAttribute() {}, focus() {}, parentNode: { insertBefore() {} } });
  const document = {
    readyState: 'complete',
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(value) {
      const [pair, ...attrs] = value.split(';').map((s) => s.trim());
      const i = pair.indexOf('=');
      if (attrs.includes('max-age=0')) jar.delete(pair.slice(0, i));
      else jar.set(pair.slice(0, i), pair.slice(i + 1));
    },
    querySelector: () => null,
    getElementById: () => null,
    getElementsByTagName: () => [stub()],
    createElement: stub,
    createTextNode: stub,
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
    head: stub(),
    body: stub(),
  };
  const window = { URL };
  window.window = window;
  Object.assign(window, {
    document,
    navigator: { globalPrivacyControl: gpc },
    localStorage: { removeItem() {} },
    sessionStorage: { removeItem() {} },
    location: { hostname: 'www.midly.ai', protocol: 'https:', reload() {} },
  });
  vm.runInNewContext(SOURCE, window);
  const click = (href, type = 'click') => {
    const a = { href };
    const target = { closest: (sel) => (sel.includes('calendly.com') && href.includes('calendly.com') ? a : null) };
    (listeners[type] || []).forEach((fn) => fn({ target }));
    return a.href;
  };
  return { api: window.midlyConsent, click, jar };
}

const content = (href) => new URL(href).searchParams.get('utm_content');

// The marker ends with the click time; check it is now, then compare the rest.
const marked = (href, before = 'ga:123456789.1700000000--mc:1') => {
  const value = content(href);
  const m = /^(.*)--ts:(\d+)$/.exec(value || '');
  assert.ok(m, `no click time on ${value}`);
  assert.ok(Math.abs(Number(m[2]) - Date.now() / 1000) < 5, 'click time is not now');
  assert.equal(m[1], before);
};

test('adds the GA id and consent marker when advertising was allowed', () => {
  const { click } = load({ midly_consent: choice(true, true), _ga: GA });
  marked(click(DEMO));
});

test("keeps the campaign's own utm_content in front", () => {
  const { click } = load({ midly_consent: choice(true, true), _ga: GA });
  const href = click(`${DEMO}?utm_source=linkedin&utm_content=hero-cta`);
  marked(href, 'hero-cta--ga:123456789.1700000000--mc:1');
  assert.equal(new URL(href).searchParams.get('utm_source'), 'linkedin');
});

test('marks a middle-click into a new tab too', () => {
  const { click } = load({ midly_consent: choice(true, true), _ga: GA });
  marked(click(DEMO, 'auxclick'));
});

test('is idempotent across repeat clicks', () => {
  const { click } = load({ midly_consent: choice(true, true), _ga: GA });
  marked(click(click(DEMO)));
});

for (const [label, cookies, opts] of [
  ['no choice made', { _ga: GA }, {}],
  ['Reject all', { midly_consent: choice(false, false), _ga: GA }, {}],
  // The site counts _ga as an analytics cookie and clears it when analytics
  // is refused, so advertising alone leaves no client id to send.
  ['advertising only', { midly_consent: choice(false, true), _ga: GA }, {}],
  ['analytics only', { midly_consent: choice(true, false), _ga: GA }, {}],
  ['advertising allowed but GPC on', { midly_consent: choice(true, true), _ga: GA }, { gpc: true }],
  ['advertising allowed but no GA cookie yet', { midly_consent: choice(true, true) }, {}],
]) {
  test(`adds nothing with ${label}`, () => {
    const { click } = load(cookies, opts);
    assert.equal(click(DEMO), DEMO);
    assert.equal(content(click(`${DEMO}?utm_content=hero-cta`)), 'hero-cta');
  });
}

test('removes stale tokens from a link once consent is withdrawn', () => {
  const { click } = load({ midly_consent: choice(true, false), _ga: GA });
  assert.equal(content(click(`${DEMO}?utm_content=hero--ga:1.2--mc:1--ts:1`)), 'hero');
  assert.equal(content(click(`${DEMO}?utm_content=ga:1.2--mc:1--ts:1`)), null);
});

test('replaces an old marker with a fresh one rather than keeping both', () => {
  const { click } = load({ midly_consent: choice(true, true), _ga: GA });
  marked(click(`${DEMO}?utm_content=hero--ga:1.2--mc:1--ts:1`), 'hero--ga:123456789.1700000000--mc:1');
});

test('leaves links that are not Calendly alone', () => {
  const { api } = load({ midly_consent: choice(true, true), _ga: GA });
  const other = 'https://app.midly.ai/sign-up?utm_content=x';
  assert.equal(api.calendlyUrl(other), other);
  assert.equal(api.calendlyUrl('https://notcalendly.com.example/x'), 'https://notcalendly.com.example/x');
});
