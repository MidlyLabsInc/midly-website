// Screens contact-form submissions that are sales pitches rather than leads.
//
// The honeypot in api/contact.js only catches bots that fill every field. The
// submissions getting through are people pasting a pitch into the Enterprise
// form: credit lines, "license your de-identified data", SEO, outsourcing.
// Each one was treated as a lead: it got the demo autoresponse, the gated
// Enterprise price, and a place on the marketing list.
//
// A flagged submission is NOT dropped. The team still gets the notification,
// marked "[Likely spam]", so a real lead caught by mistake costs a glance, not
// the lead. What it no longer gets is anything a real lead earns: no
// autoresponse, no list, no price.
//
// The rule is deliberately conservative. One offer phrase is not enough on its
// own, because a genuine buyer can write "we need funding approvals routed" or
// "give me a call". It takes an offer phrase plus a second signal (another
// offer phrase, a cold-outreach opener, a phone number, or a dollar range),
// which is the shape every pitch seen so far has had and no real enterprise
// request has.

// Phrases that describe something being SOLD TO us.
const OFFER_PATTERNS = [
  /\bline of credit\b/i,
  /\bworking capital\b/i,
  /\bno personal guarantee\b/i,
  /\b(business|merchant|term) (loan|funding|financing)\b/i,
  /\bapproval (usually )?(back )?within\b/i,
  /\blicen[sc]e (your |de-identified |anonymi[sz]ed |business )+data\b/i,
  /\bde-identified (business )?data\b/i,
  /\bfor ai (research|training)\b/i,
  /\bwe can set you up\b/i,
  /\b(seo|backlinks?|guest posts?|link building)\b/i,
  /\brank(ing)? (higher |#?1 |first )?on google\b/i,
  /\b(web|website|app|mobile app) (design|development) (services|agency|team)\b/i,
  /\blead generation\b/i,
  // Not "outsource": a real buyer outsources review to outside counsel.
  /\b(virtual assistants?|offshore (team|developers))\b/i,
  /\bbook (more )?(meetings|appointments) for you\b/i,
  /\bwe help (companies|businesses|startups) like yours\b/i,
  /\bindicative estimates?\b/i,
];

// Cold-outreach openers. Real buyers write these too, so they only ever
// support an offer phrase, never stand in for one.
const OPENER_PATTERNS = [
  /\bi came across (midly|your)\b/i,
  /\bwanted to reach out directly\b/i,
];

// "(332) 265-0855", "332-265-0855", "+1 332 265 0855"
const PHONE = /(\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;

// "$10k to $500k", "$150K to over $1M", "$5,000 - $20,000"
const MONEY_RANGE =
  /\$\s?\d[\d,.]*\s?[km]?\s*(to|-|–)\s*(over\s+|up to\s+)?\$\s?\d/i;

// Fields that are the submitter's own words. Everything else (email, company,
// team size, source) is too short or too structured to carry a pitch.
const CONTROL_KEYS = new Set(['email', 'name', 'company', 'source', 'team_size', '_hp', '_subject', '_elapsed']);

function freeText(fields) {
  return Object.entries(fields || {})
    .filter(([k, v]) => !CONTROL_KEYS.has(k) && typeof v === 'string')
    .map(([, v]) => v)
    .join('\n');
}

function screenPitch(fields) {
  const text = freeText(fields);
  const offers = OFFER_PATTERNS.filter((re) => re.test(text)).length;
  const reasons = [];
  if (offers) reasons.push(`${offers} offer phrase${offers === 1 ? '' : 's'}`);
  if (OPENER_PATTERNS.some((re) => re.test(text))) reasons.push('cold opener');
  if (PHONE.test(text)) reasons.push('phone number');
  if (MONEY_RANGE.test(text)) reasons.push('dollar range');
  const likelySpam = offers >= 2 || (offers === 1 && reasons.length >= 2);
  return { likelySpam, reasons };
}

// A person cannot read the form and fill it in under this. The page sends how
// long it was open (its own clock, so no skew between browser and server);
// forms that do not send it are not judged on it.
const MIN_FILL_MS = 3000;

function filledTooFast(elapsed) {
  const ms = Number(elapsed);
  return Number.isFinite(ms) && ms >= 0 && ms < MIN_FILL_MS;
}

module.exports = { screenPitch, filledTooFast, MIN_FILL_MS };
