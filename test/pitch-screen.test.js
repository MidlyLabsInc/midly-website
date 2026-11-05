// node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const { screenPitch, filledTooFast } = require('../lib/pitch-screen.js');

const pitch = (challenge) => screenPitch({ email: 'a@b.com', name: 'A', company: 'C', challenge });

test('flags the data-licensing pitch', () => {
  const r = pitch(
    "Hi Patience,\n\nWe're looking to license de-identified business data from Midly Labs (email, CRM, Drive, Dropbox, Jira, Slack, etc.) for AI research. Indicative estimates for companies like yours run from about $150K to over $1M, depending on headcount and years of records.",
  );
  assert.equal(r.likelySpam, true);
});

test('flags the credit-line pitch', () => {
  const r = pitch(
    "Hi Patience,\n\nI came across Midly Labs and wanted to reach out directly. We can set you up with a line of credit anywhere from $10k to $500k, with no personal guarantee and approval usually back within 1 to 2 days.\n\nIf that's useful, give me a call at (332) 265-0855",
  );
  assert.equal(r.likelySpam, true);
});

test('flags an SEO pitch with a phone number', () => {
  assert.equal(pitch('We do SEO and backlinks for SaaS. Call 404-555-0100.').likelySpam, true);
});

test('passes a real enterprise request', () => {
  const r = pitch(
    'Our legal team of 12 reviews about 200 vendor MSAs a year. Contracts sit in legal for weeks and nobody can see deal status. We outsource the overflow to outside counsel at roughly $5,000 to $10,000 a month.',
  );
  assert.equal(r.likelySpam, false);
});

test('passes a real request with a phone number', () => {
  assert.equal(pitch('I came across your enterprise page. Too many Word versions. Call me at 404-555-0100.').likelySpam, false);
});

test('passes an empty challenge', () => {
  assert.equal(pitch('').likelySpam, false);
});

test('ignores pitch words in the company field', () => {
  const r = screenPitch({ email: 'a@b.com', company: 'Line of Credit Partners SEO', challenge: 'Redlines take too long.' });
  assert.equal(r.likelySpam, false);
});

test('fill time', () => {
  assert.equal(filledTooFast(800), true);
  assert.equal(filledTooFast('2999'), true);
  assert.equal(filledTooFast(3000), false);
  assert.equal(filledTooFast(undefined), false);
  assert.equal(filledTooFast('abc'), false);
  assert.equal(filledTooFast(-5), false);
});
