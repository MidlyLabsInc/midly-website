# Sitewide consent implementation plan

Status: plan for review. Nothing here has been implemented. No tracking behaviour has changed on midly.ai or app.midly.ai. This document is excluded from deployment by `.vercelignore`.

This is an engineering plan. The legal conclusions it depends on (which regimes apply, what each processing activity is, what the policies must say) are decisions for counsel, and the plan marks where each one is needed.

---

## 1. Tracking inventory

### midly.ai (marketing site, this repo)

| Technology | ID | Pages | Loads | What it collects |
|---|---|---|---|---|
| Google Analytics 4 | `G-Z3SHWTKPRF` | 33 of 40 HTML files (not 6 blog posts, `tracking.html`, `og-sprint.html`) | On page load, no consent check | Page views, URL with query string (including `utm_*`, `gclid`, `src`), referrer, device data. Custom events: `cta_click`, `audience_door`, `product_tour_tab`, form-unlock events. No names, email addresses or form contents are placed in event parameters (verified in code). This does **not** mean GA4 processes no personal data: client identifiers, IP addresses, device data and interaction histories can be personal data in their own right. |
| Meta Pixel | `1648639153116554` | 32 files | On page load | `PageView` with URL and referrer. Meta cookies (`_fbp`). Used for ad measurement and audiences. |
| Microsoft Clarity | `w0xtsl38r9` | 32 files | On page load | Session recordings, heatmaps, clicks and scroll. **Captures page content unless masked.** No `data-clarity-mask` attributes exist in the repo. |

**Forms on the marketing site.** `/enterprise`, `/how-it-works`, `/red-flags` and `/sprint` collect name, email, company, team size and a free-text "challenge" field.
- **Submission:** the data is POSTed to `/api/contact`, never put in a URL, and not copied into analytics event parameters. The tags still record that the page was visited and the form interacted with, tied to the visitor's identifiers.
- **Clarity exposure:** on those four pages, what Clarity records of the typed values depends on the masking mode set in the Clarity dashboard. I could not determine that mode from the code.

**Unsubscribe page.** `/api/unsubscribe` carries the email address in the query string, but the page it returns loads no tracking. That's correct and should stay that way.

### app.midly.ai (application, `MidlyLabsInc/midly`, read-only review)

| Technology | Where | Notes |
|---|---|---|
| GA4, the **same** property `G-Z3SHWTKPRF` | `src/components/analytics/ga4-script.tsx`, mounted in the root layout (`src/app/layout.tsx`), so on **every** app route | Deliberate, for cross-domain funnel measurement (linker on `midly.ai` and `app.midly.ai`), with `allow_enhanced_conversions: true`. The sign-up event on `/welcome` passes the user's email for hashing and sending to Google Ads. **No scrubbing:** GA4's default page view sends `page_title` and `page_location`. The app's own privacy audit (`src/lib/posthog-privacy.ts`) records that a document page's title is the document's name, and that token routes (`/cd/<token>`, `/sign/<token>`, `/intake/<token>`, `/pay/<token>` and others) carry magic-link secrets in the path. PostHog is scrubbed for both of these; GA4 is not. |
| PostHog | `src/app/posthog.tsx` and `instrumentation-client.ts` | `posthog.tsx` applies a careful privacy config: no titles, no clicked text, token paths redacted, query strings dropped, session replay withheld. **But `instrumentation-client.ts` also calls `posthog.init` with no privacy config, and Next.js 15.5 runs that file first.** In the installed posthog-js, a second `init` is a no-op ("Re-initializing is a no-op"). So in production the privacy config most likely never applies. Runtime confirmation is needed in the browser network tab. | **Runtime-reproduced** (see `launch-readiness.md`, finding P1): with the app's start-up order, the privacy config is not in effect and events carry the magic-link token, the document name and clicked text. |
| Meta Pixel, Clarity | Not present in the app | Good. |

**Answer to "is app.midly.ai inadvertently included in marketing-site tracking?"** Not inadvertently. The app deliberately shares the marketing site's GA4 property. The consequence is that GA4 may be receiving document names and magic-link URLs from inside the product. That's the most sensitive data flow found in this review. Fixing it is an app change and outside the homepage scope, so it should be its own reviewed task.

---

## 2. Decisions for counsel before implementation

These are inputs to the CMP configuration, not conclusions this plan makes.

1. **Which privacy laws apply to each audience you market to.** The EU/EEA, UK and Switzerland are obvious candidates, and you also run Google Ads. But the analysis shouldn't stop at "Europe vs. the US":
   - US state laws differ from one another in thresholds, definitions and opt-out mechanics.
   - Several other jurisdictions (for example Canada and Brazil) have their own consent rules.
   - Don't assume all US tracking may run by default, or that non-European visitors follow US rules.
2. **Purpose of each technology.** Analytics, advertising measurement, retargeting and session recording are different purposes, and the CMP should present them as separate categories. In particular:
   - The Meta Pixel and Google Ads enhanced conversions are advertising.
   - Clarity is session recording.
   - GA4 is analytics, but becomes advertising-linked when Google Ads linking or enhanced conversions are on.
3. **Sale vs. sharing under California law.** These are distinct concepts. `privacy.html` says Midly does not sell personal information. Whether the Meta Pixel or Google Ads data flows amount to "sharing" for cross-context behavioural advertising has to be assessed on the actual data flows and contract terms. The answer decides whether a "Do Not Sell or Share" link and opt-out processing are required.
4. **Global Privacy Control.** `cookies.html` says Midly is "working to honor GPC." Honouring GPC means identifying every activity it applies to and stopping all of them for that visitor, plus matching disclosures. That covers more than the Meta Pixel: possibly Google Ads conversion features and GA4 advertising signals. The policy statement and site behaviour must match on release day.
5. **Session recording.** Decide whether Clarity is needed on the marketing site at all. If kept:
   - Use strict masking.
   - Don't load it on pages with forms, or mask those forms explicitly.
   - Get your sign-off on its consent category.
6. **Whether a Google-certified CMP is required.** Google requires a certified CMP for certain advertising products served to EEA/UK/CH users. Whether that applies depends on which Google advertising features Midly uses (Google Ads with conversion tracking, remarketing, enhanced conversions). Confirm against Google's current requirements before choosing a vendor.

## 3. Implementation plan (once section 2 is decided)

1. **Choose a CMP.** CookieYes, Cookiebot and Termly all support static sites, geo-based rules, script blocking, consent logs, GPC detection and Google Consent Mode v2. If decision 6 makes certification necessary, choose a certified one.
2. **Centralise the tags.** Replace the inline block in roughly 33 HTML files with:
   - one CMP script tag,
   - one `js/tags.js` that registers GA4, Meta and Clarity behind the CMP's categories.

   Every future change then touches one file.
3. **Configure Consent Mode v2 correctly.** Consent Mode is a signalling mechanism, not consent. Its defaults (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`) must match the rules decided in section 2 for each region. Tags must not fire with storage granted where consent is required and absent.
4. **Clarity:** use strict masking (dashboard setting) and add `data-clarity-mask="true"` to every form. Load it only after the category is consented to, and confirm Microsoft's current consent-signal requirements for Clarity.
5. **Footer:** add a persistent "Cookie settings" link. Add "Your Privacy Choices" or "Do Not Sell or Share" only if decision 3 requires it.
6. **Policies:** update `cookies.html`, `privacy.html` and `california.html` in the same release, so the published statements describe the deployed behaviour.
7. **App (separate task, separate repo):** apply the same consent decision to the app's GA4. Scrub `page_title` and token paths before GA4 receives them, or stop sending app page views to GA4. Fix the PostHog double init so the privacy config actually applies.

## 4. Test plan

For each region rule, using a VPN or the CMP's region preview:
- Before choosing anything, confirm in the browser network tab that no request goes to `google-analytics.com`, `facebook.com`/`connect.facebook.net` or `clarity.ms`, or only the requests the agreed rule allows.
- Accept all, reject all, and accept per category, and confirm each tag's behaviour.
- Send the GPC signal (`navigator.globalPrivacyControl = true`, or a browser that sends it) and confirm the agreed opt-out applies.
- Confirm forms, Calendly links, sign-up links and campaign carry-through (`utm_*` to app.midly.ai and Calendly) still work with every tag blocked. They don't depend on the tags, so they should.

## 5. Sequencing

This is a sitewide change that touches every page and three legal pages. Run it as its own workstream: counsel decisions, then implementation, then the test plan, before the production release of the redesigned site.
