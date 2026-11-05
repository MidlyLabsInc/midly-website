// node --test test/
// Drives api/contact.js with a fake Resend client: nothing is sent.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const sent = [];
const contacts = [];
class FakeResend {
  constructor() {
    this.emails = { send: async (m) => { sent.push(m); return { data: { id: 'x' } }; } };
    this.contacts = {
      get: async () => ({ data: null }),
      create: async (c) => { contacts.push(c); return { data: { id: 'c' } }; },
    };
  }
}
const realLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'resend') return { Resend: FakeResend };
  return realLoad.call(this, req, ...rest);
};
process.env.RESEND_API_KEY = 'test';
const handler = require('../api/contact.js');

async function post(body) {
  sent.length = 0;
  contacts.length = 0;
  let status, json;
  const res = {
    setHeader() {},
    status(s) { status = s; return this; },
    json(j) { json = j; return this; },
    end() { return this; },
  };
  await handler({ method: 'POST', body }, res);
  return { status, json };
}

const base = { name: 'Jo Smith', email: 'jo@example.com', company: 'Acme', team_size: '11-50', source: 'Enterprise Demo', _hp: '' };

test('a real Enterprise request gets everything', async () => {
  const r = await post({ ...base, challenge: 'Contracts sit in legal for weeks.', _elapsed: 45000 });
  assert.equal(r.status, 200);
  assert.ok(r.json.pricing);
  assert.equal(sent.length, 2);
  assert.ok(!sent[0].subject.startsWith('[Likely spam]'));
  assert.equal(contacts.length, 1);
});

test('a pitch reaches the team marked, and earns nothing else', async () => {
  const r = await post({
    ...base,
    challenge: 'We can set you up with a line of credit from $10k to $500k. Call (332) 265-0855.',
    _elapsed: 60000,
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.pricing, undefined);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'patience@midly.ai');
  assert.ok(sent[0].subject.startsWith('[Likely spam] '));
  assert.equal(contacts.length, 0);
});

test('an instant submission is dropped silently', async () => {
  const r = await post({ ...base, challenge: 'hello', _elapsed: 400 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
  assert.equal(sent.length, 0);
});

test('forms that send no _elapsed are not judged on it', async () => {
  const r = await post({ ...base, source: 'Website', challenge: 'hello' });
  assert.equal(r.status, 200);
  assert.equal(sent.length, 2);
});

test('_elapsed never reaches the notification', async () => {
  await post({ ...base, challenge: 'Too many Word versions.', _elapsed: 45000 });
  assert.ok(!sent[0].html.includes('_elapsed'));
});
