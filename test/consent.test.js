// node --test test/
//
// Runs the real js/consent.js against a minimal stand-in for the browser: a
// cookie jar that honours max-age=0, and stubs for the DOM calls the tags make.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'js', 'consent.js'), 'utf8');

const choiceCookie = (a, m) => encodeURIComponent(JSON.stringify({ a, m, t: 1793900000000 }));

const fakeStorage = (entries) => {
  const m = new Map(Object.entries(entries));
  return { map: m, removeItem: (k) => m.delete(k) };
};

function load(cookies, { gpc = false, local = {}, session = {} } = {}) {
  const jar = new Map(Object.entries(cookies));
  const localStorage = fakeStorage(local);
  const sessionStorage = fakeStorage(session);
  const stubElement = () => ({ style: {}, appendChild() {}, setAttribute() {}, parentNode: { insertBefore() {} } });
  const document = {
    readyState: 'complete',
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(value) {
      const [pair, ...attrs] = value.split(';').map((s) => s.trim());
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      if (attrs.some((a) => a === 'max-age=0')) jar.delete(name);
      else jar.set(name, pair.slice(i + 1));
    },
    querySelector: () => null,
    getElementById: () => null,
    getElementsByTagName: () => [stubElement()],
    createElement: stubElement,
    addEventListener() {},
    head: stubElement(),
    body: stubElement(),
  };
  const window = {};
  window.window = window;
  Object.assign(window, {
    document,
    navigator: { globalPrivacyControl: gpc },
    localStorage,
    sessionStorage,
    location: { hostname: 'www.midly.ai', protocol: 'https:', reload() {} },
  });
  vm.runInNewContext(SOURCE, window);
  jar.local = localStorage.map;
  jar.session = sessionStorage.map;
  return jar;
}

const TRACKERS = {
  _ga: 'GA1.1.1',
  _ga_Z3SHWTKPRF: 'GS2.1',
  _gid: 'GA1.2.3',
  _clck: 'x',
  _clsk: 'y',
  ph_phc_uwh7VHa0qAfInMH4Cpe4xYJxCupRpOvIrDdgrE3Xz0E_posthog: '%7B%22distinct_id%22%3A%22x%22%7D',
  __ph_opt_in_out_phc_uwh7VHa0qAfInMH4Cpe4xYJxCupRpOvIrDdgrE3Xz0E: '0',
  _fbp: 'fb.1.2',
  _fbc: 'fb.1.3',
  _gcl_au: '1.1.1',
  unrelated: 'keep',
};

test('Reject all deletes every tracker cookie, keeps the choice and other cookies', () => {
  const jar = load({ ...TRACKERS, midly_consent: choiceCookie(false, false) });
  assert.deepEqual([...jar.keys()].sort(), [
    '__ph_opt_in_out_phc_uwh7VHa0qAfInMH4Cpe4xYJxCupRpOvIrDdgrE3Xz0E',
    'midly_consent',
    'unrelated',
  ]);
});

test('analytics only: analytics cookies stay, advertising cookies go', () => {
  const jar = load({ ...TRACKERS, midly_consent: choiceCookie(true, false) });
  const posthog = 'ph_phc_uwh7VHa0qAfInMH4Cpe4xYJxCupRpOvIrDdgrE3Xz0E_posthog';
  for (const kept of ['_ga', '_ga_Z3SHWTKPRF', '_gid', '_clck', '_clsk', posthog]) assert.ok(jar.has(kept), kept);
  for (const gone of ['_fbp', '_fbc', '_gcl_au']) assert.ok(!jar.has(gone), gone);
});

test('Global Privacy Control removes advertising cookies even after Accept all', () => {
  const jar = load({ ...TRACKERS, midly_consent: choiceCookie(true, true) }, { gpc: true });
  assert.ok(jar.has('_ga'));
  assert.ok(!jar.has('_fbp'));
});

test('Accept all without GPC deletes nothing', () => {
  const jar = load({ ...TRACKERS, midly_consent: choiceCookie(true, true) });
  assert.equal(jar.size, Object.keys(TRACKERS).length + 1);
});

const STORAGE = {
  local: { lastExternalReferrer: 'x', lastExternalReferrerTime: '1', siteSetting: 'keep' },
  session: { _cltk: 'x', siteSession: 'keep' },
};

test('Reject all removes the tags\' storage entries and nothing else', () => {
  const jar = load({ midly_consent: choiceCookie(false, false) }, STORAGE);
  assert.deepEqual([...jar.local.keys()], ['siteSetting']);
  assert.deepEqual([...jar.session.keys()], ['siteSession']);
});

test('analytics only: Clarity storage stays, Meta storage goes', () => {
  const jar = load({ midly_consent: choiceCookie(true, false) }, STORAGE);
  assert.ok(jar.session.has('_cltk'));
  assert.ok(!jar.local.has('lastExternalReferrer'));
});
