# Homepage launch readiness

Status as of the branch `claude/midly-website-redesign-367p8s`. Internal; excluded from deployment by `.vercelignore`. Nothing has been deployed, and no application code has been changed.

How this was checked:
- **Marketing site:** run locally in Chromium.
- **Application** (`MidlyLabsInc/midly` at `f2bf6d9`, `midly-email-worker` at `7cb225f`): read-only code review. This container cannot reach app.midly.ai, Google, PostHog or Vercel, so no feature was exercised against the live product.
- **PostHog:** the one runtime test of app behaviour was a reproduction in a browser, using the app's pinned library version and its own configuration modules.

No real tokens, client data or contract content appear in this report.

---

## A. Critical privacy and security findings (application)

These are in app.midly.ai, not in the homepage redesign. They don't block the marketing launch by themselves, but each should be fixed in its own tightly scoped app change.

### P1. PostHog's privacy configuration is very likely not in effect in production (high)

**Code:**
- `instrumentation-client.ts` calls `posthog.init(KEY, { api_host: NEXT_PUBLIC_POSTHOG_HOST, defaults: "2025-05-24" })` with no privacy settings.
- `src/app/posthog.tsx` later calls `posthog.init` again with `POSTHOG_PRIVACY_CONFIG`: masking, `before_send: scrubCapture`, `disable_session_recording`, no page titles, token paths redacted.
- Next.js 15.5 runs `instrumentation-client.ts` before application code.
- In the pinned `posthog-js@1.261.7`, a second `init` is a no-op ("You have already initialized PostHog! Re-initializing is a no-op").

**Runtime reproduction:**
- **Setup:** Chromium, `posthog-js@1.261.7`, the app's own `posthog-privacy.ts`, both init calls in Next.js order, a fake key, a fake `/cd/<token>` URL with an email in the query string, and a fake document title.
- **Effective config:** `before_send` undefined, `mask_all_text: false`, `disable_session_recording: false`, `capture_pageview: "history_change"`.
- **Events sent:** `$pageview` and `$autocapture` carried the magic-link path token, the document title, the query-string email, and the clicked element's text.
- **Session recorder:** loaded and started. In the test this was because the stubbed project settings enabled replay. In production it depends on the PostHog project's replay setting, which I could not see.
- **Control:** with the privacy init alone, the same page sent the same events with none of that data, and the recorder did not start.

**Exposure:**
- **When:** whenever `NEXT_PUBLIC_POSTHOG_KEY` is set in production.
- **What:** URLs with magic-link tokens (`/cd/`, `/sign/`, `/intake/`, `/sa/`, `/u/`, `/print/`), document and client names (as page titles), and clicked text such as document names in lists and insight cards.
- **Replay:** if replay is enabled in the PostHog project, recordings would use library defaults (inputs masked, page text **not** masked, the editor body not blocked). `posthog.tsx` calls `stopSessionRecording()` once a signed-in user loads, but token pages used by counterparties and signers have no signed-in user.

**Not verified:** actual production traffic. To confirm, open app.midly.ai with DevTools, then:
- check `window.posthog.config.before_send` and `mask_all_text`;
- inspect `/ingest` or `i.posthog.com` requests on a document page;
- check the PostHog project's session-replay setting and existing recordings.

**Fix direction (app, needs approval):** remove the `posthog.init` from `instrumentation-client.ts`, or make it the single init with `POSTHOG_PRIVACY_CONFIG`. Then review the data already collected in PostHog, and delete it if it holds tokens or document names.

### P2. GA4 in the app receives magic-link URLs and document/client names (high)

**Code:**
- `Ga4Script` is mounted unconditionally in the root layout (`src/app/layout.tsx:150`), with the shared property `G-Z3SHWTKPRF`.
- `gtag('config', id, …)` does not disable the default page view. A GA4 page view sends the full page URL (path and query string) and `document.title`.

**Data at risk:**
- **Token routes:** `/cd/[token]`, `/sign/[token]`, `/intake/[token]`, `/sa/[token]`, `/u/[token]`, `/print/[token]`. The `/pay/[invoiceId]` route also exists.
- **Page titles:**
  - `/documents/[id]` is the document name;
  - `/cd/[token]` and `/sign/[token]` are "{document name} / Powered by Midly.ai";
  - `/outside-counsel/[clientId]` is "{client name}: Outside Counsel";
  - `/customers/[id]` is the customer name.
- **Enhanced conversions:** `allow_enhanced_conversions: true`. The sign-up event passes the user's email for hashing and forwarding to Google Ads.
- **Vercel Web Analytics:** `<Analytics />` from `@vercel/analytics` is also mounted on every route and records page URLs. Check whether token paths reach it, and redact with `beforeSend` if they do.

**Not verified at runtime:** Google endpoints are unreachable from this container. The behaviour above is GA4's documented default applied to this code. To confirm, use GA4 DebugView, or the browser network tab (`collect?` requests: the `dl` and `dt` parameters) on a token page and a document page.

**Fix direction (app, needs approval):**
- send GA4 page views manually with a scrubbed `page_location` (same rules as `scrubPath`) and a generic `page_title`;
- or stop loading GA4 on authenticated and token routes;
- review GA4 data retention.

### P3. The client portal can show an attorney's unfinished drafts to the client (high: confidentiality)

**Code:**
- `src/app/cp/page.tsx:73-93` lists every document tagged to the client with **no status filter**.
- `src/app/cp/documents/[documentId]/page.tsx:51-75` loads any such document, including its `content`, and renders it (`lexicalContentToHtml(doc.content)`, line 174).
- The query that hides attorney drafts already exists (`client-portals.ts` `documentsForPortal`, lines 134-178). Its comment names exactly this risk: an engagement agreement with blanks and an unsettled rate. **Nothing in the UI calls it.**
- The cross-client and cross-firm checks look correct. This exposes a firm's own client to that firm's work in progress, not to other clients.

**Not verified at runtime.** To confirm, create a draft tagged to a test client, then sign in as that client's portal user.

**Fix direction (app, needs approval):** apply the `documentsForPortal` filter (draft only if client-submitted) in both portal pages, with a test.

### Lower severity (app), noted for the same follow-up
- **Renewal email timing:** the renewal email (`cron/contract-alerts`) is sent on the last day to give notice, but says "Act before [today]". Notice days default to 30 when none were extracted.
- **Repository page tour:** it says "Every document is indexed for full-text search". Search is a name and counterparty substring match.
- **Bulk-import error text:** it says Team is required, but the route allows Solo and above.
- **Intake failure alerts:** they always link to `/outside-counsel`, even for review-queue mail. Non-supported attachments are dropped silently.

---

## B. Feature verification (homepage claims)

**No feature could be tested end to end**, because there's no app access from here. Every verdict below comes from code review. The homepage copy has been corrected to the narrower wording where a claim was partial.

### 1. Confirmed working, code and runtime
None. Runtime testing needs a demo workspace (see section D).

### 2. Supported by code, not verified end to end
| Feature | Evidence (app repo) |
|---|---|
| Per-workspace intake address at in.midly.ai, optional readable handle | `server/intake/provision.ts`, `routers/intake.ts` (DNS/MX not checked) |
| Word (.docx) tracked changes and comments kept on intake and upload; exported back as real tracked changes | `inbound-email.ts:394-450`, `docx-tracked-changes.ts`, `docx-patch.ts` |
| Pick your side before review | `review-button.tsx`, `lib/review-side.ts` |
| Review against your playbook (built-in baselines when none), findings anchored to quoted text | `server/ai.ts`, `lexical-verify-insights.ts` |
| Every counterparty change rated low/medium/high with accept, push back or counter, plus suggested counter | `sidebar/redlines.tsx`, `ai.ts:5410` |
| Replacement language with reasoning (Ask Midly edit blocks) | `prompts/proposed-edit.ts` |
| Match doc / Plain / Legal language switch | `sidebar/formality-selector.tsx` |
| Version compare and version history | `compare/[id]`, `documents/[id]/history` |
| Secure counterparty link with filtered payload | `/cd/[token]`, `counterparty-payload.ts` |
| Built-in e-signature with audit page (not advertised on the homepage) | `documents.ts` `sendForSignature`, `stampSignatureOnPdf` |
| Client hubs per client (Counsel) | `outside-counsel/[clientId]/page.tsx` |
| Time tracking against the document (after "Will this work be billed?") and manual entries | `auto-tracker-mount.tsx`, `use-auto-tracker.ts` |
| Invoices from unbilled time, emailed with a Pay link, paid via the firm's Stripe Connect account | `invoices.ts`, `invoice-checkout.ts`, Stripe webhook (Connect platform setup not checked) |
| Standing client instructions feed AI review | `client-notes-card.tsx`, `ai.ts:1140` |
| Executed-agreement key terms: type, dates, auto-renewal and notice, governing law, payment terms, cap, uncapped indemnity | `analyze-repository-intelligence.ts`, `ai.ts:4992` |
| Ask Midly on the executed document | `routers/ai.ts:457` |
| Magic-link stakeholder sign-off without a seat; sequential chains | `sa/[token]`, `stakeholders.ts:303` (advisory: does not gate sending) |
| Approval rules by value, template or region block sending until approved | `approvalGuidance.ts`, `documents.ts:1100` (no FX conversion; evaluator error lets send through) |
| Red playbook deviations block sending until resolved or acknowledged | `documents.ts:1088`, `lexical.ts:1419` |
| Bar license certification at signup | `api/counsel-certification` (self-attested, not checked against a registry) |

### 3. Partial or unavailable (homepage wording now narrowed)
| Former claim | Reality | Homepage now says |
|---|---|---|
| Email "lands in the right client file" | Lands unassigned in the intake inbox; attorney files it; same-subject threads grouped | "Forward contracts to your Midly intake inbox, then file them to the client in one click." |
| Tracked changes "arrive intact" | .docx only; PDF/HTML as text; other attachments dropped | "Tracked changes in Word files arrive intact." |
| "Emails you when the window to act opens" / "the morning the notice window opens" | Expiry emails at 60/30/14/7 days; renewal email on the **last** notice day; 90/60/30 key-date reminders are Counsel-only and need confirmed dates | "Reminders before expiry and on the last day to give notice." |
| "Where the liability cap sits / whether indemnities sit outside the cap" | Cap amount and description; indemnity "uncapped" flag only | "The liability cap, and whether indemnities are uncapped." |
| "Searchable intelligence" | Name and counterparty search, plus filters | "A record of its key terms." |
| "If Midly cannot point to the language, it does not make the claim" | Red findings verified and dropped if unsupported; Ask Midly quotes flagged, not removed | "High-risk findings are checked against the text; a quote it cannot find is flagged." |
| "Positions carry into the next round" / "the fiftieth time you argue a clause" | Same document only | "On the same agreement…" |
| "98 changes: no risk change" bucket (illustration) | No separate bucket; every change rated | Illustration redrawn as rated changes |
| "Every version, comment and approval in one trail" | Not found; separate panels, signature audit only | "Version history, comments and approvals on every document." |
| Client summary "one button" | Requires analysis first; form, then email | "Email your client a plain-English summary." |
| Client portal | Real login (email code); read-only documents; no invoices in portal; **see P3** | "Secure portal where clients review documents, approve, and message you." |

**Wording to decide:**
- **Headline:** "Two of a hundred changes need you. You are told which two." is kept as rhetoric. The text under it states the mechanism.
- **Portal:** advertising the client portal should wait for the P3 fix, or the portal line should be removed until then.

---

## C. Marketing-site items

| Item | Status |
|---|---|
| Positioning, layout, copy | Done; copy corrected to verified behaviour (this commit) |
| Anchors `#pricing` `#for` `#features` `#how`; `/pricing` redirect target | Pass (fresh load lands below the nav) |
| Conversion links: Calendly, sign-up (team, counsel, enterprise), sign-in | Pass; UTM carry-through to both verified |
| GA4 events `cta_click`, `audience_door`, `product_tour_tab` | Pass (dataLayer) |
| SEO: title, description, canonical, OG/Twitter, single H1, valid JSON-LD | Pass |
| Keyboard: skip link, menus (Escape), tabs (arrows, Home/End), focus rings | Pass |
| Layout 320 to 1920px, no horizontal overflow | Pass (emulated) |
| Internal docs excluded from deployment | `.vercelignore` lists `docs/`. **Not yet verified on a Vercel deployment** (see D) |
| Consent management | **Not implemented**; plan in `consent-implementation-plan.md` |
| Real-device testing | **Not done**; manual checklist in D |

---

## D. Launch checklist

### Blockers (must close before production)
1. **Consent:** counsel decisions in the consent plan, CMP implementation and the test plan. The redesign itself adds no new tracking technologies (same GA4, Meta and Clarity tags, plus click events on the existing GA4 property).
2. **Deployment exclusion:** on the branch preview (or the first preview after merge), request `/docs/redesign/launch-readiness.md` and `/docs/redesign/phase-1-audit.md` and confirm **404**.
   - If either is served, add a `vercel.json` redirect for `/docs/:path*`, or move the documents out of the repo root, before merging.
   - Also confirm preview deployments are behind Vercel Authentication.
3. **Visual approval** of the final screenshots (attached in chat, full resolution in the zip).
4. **Decide the portal line** (P3): fix first, or remove the portal mention from the homepage until fixed.

### Strongly recommended before launch
5. **Real devices:** run this on iPhone Safari and an Android Chrome phone.
   - Open and close the menu.
   - Tap each tour tab, and swipe the tab row.
   - Tap "Book a demo" (Calendly opens) and a sign-up link (the app opens with `?plan=`).
   - Check text size in the comparison table and audience lists.
   - Rotate to landscape.
6. **Authentic screenshots** to replace the three illustrations, captured from a demo workspace with fictional data. Suggested setup:
   - upload `demo-samples/CounterpartyVendor_MSA.docx` (fictional), run AI Insights, run "Analyze changes";
   - optionally run `scripts/seed-msa-demo.ts` on that document for a v1/v2 compare;
   - mark a copy executed and run repository analysis.

   Screens wanted:
   - (a) AI Insights with a playbook-deviation badge and suggested revision;
   - (b) the Redlines panel after "Analyze N changes";
   - (c) `/compare/[id]` or document history;
   - (d) the repository intelligence panel for the executed copy.

   Capture at 1600px wide, 2x, light theme. Hide workspace and personal names.
7. **App findings P1 to P3:** scope and schedule. They are independent of the marketing launch, but P1 and P2 bear on what the consent plan must disclose.

### Non-blocking improvements
- Dedicated `/pricing` page; move internal `/#pricing` links to it.
- Adopt `css/site.css` across other pages; consolidate the duplicated inline tag block (part of the consent work).
- Keep other internal-only files out of deployment too: `scripts/`, `logo design/`, `social media kit/`, `tracking.html`, `og-sprint.html`, `.githooks/`.
- Calendly booking completion as a GA4 conversion (Calendly's GA4 integration or a thank-you redirect).
- Solutions pages (`/solutions/outside-counsel`, `/solutions/in-house-legal`) per the original plan.
