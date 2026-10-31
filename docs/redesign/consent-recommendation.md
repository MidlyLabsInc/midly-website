# Consent management: current state and recommended approach

Status: recommendation for review. Nothing in this document has been implemented, and no tracking behaviour has changed.

## Current state (verified in the repo)

| Tag | ID | Where | Loads |
|---|---|---|---|
| Google Analytics 4 | `G-Z3SHWTKPRF` | Inline in `<head>` on every page | Immediately, no consent check |
| Meta Pixel | `1648639153116554` | Same block | Immediately, fires `PageView` |
| Microsoft Clarity | `w0xtsl38r9` | Same block | Immediately (session recording and heatmaps) |

- There is no consent banner, no Google Consent Mode, and no "Your Privacy Choices" link.
- `cookies.html` says Midly is "working to honor GPC signals". The site does not currently read Global Privacy Control.
- `privacy.html` says "We do not sell your personal information." The Meta Pixel is the tag most likely to be treated as "sharing" for cross-context behavioural advertising under California law, so the published statement and the site's behaviour should be checked against each other.
- The tag block is pasted into roughly 38 HTML files, so any fix is a sitewide change.

**Nothing the site needs to work depends on these tags.** Forms (`/api/contact`), the nurture cron, Calendly links and app sign-up links all work without them. Campaign attribution to the app is carried in URL parameters by `js/motion.js` and `js/home.js`, not cookies, so it survives a consent gate.

## Recommended approach

1. **Use a Google-certified consent management platform (CMP)** instead of a hand-built banner. CookieYes, Cookiebot and Termly all work on static sites with one script tag. They give you:
   - geo-specific rules without writing edge code,
   - Google Consent Mode v2 signals for GA4,
   - blocking of Meta Pixel and Clarity until the right consent exists,
   - a cookie scan and an audit log of consents.

   A hand-built banner is possible (one shared `js/consent.js`) but needs Vercel Edge Middleware for geolocation and ongoing maintenance. For a single-founder team, a CMP is cheaper and easier to defend.

2. **Rules by region** (to be confirmed by you as counsel):
   - **EU/EEA, UK, Switzerland:** opt-in. GA4 runs in Consent Mode with storage denied until accepted. Meta Pixel and Clarity don't load until accepted.
   - **US:** tags may load by default, plus:
     - a "Your Privacy Choices" footer link,
     - honouring the GPC signal by suppressing the Meta Pixel and ad storage,
     - an opt-out that persists.
   - **Elsewhere:** follow the US rules unless the CMP's legal templates say otherwise.

3. **Clarity:** pass consent to Clarity through its consent API, or block it until consent. Microsoft has been tightening consent requirements for EEA/UK/CH traffic. Confirm the current requirement in the Clarity dashboard before rollout.

4. **Centralise the tag block.** Move the inline block on every page into a single include, `js/tags.js`, loaded after the CMP script. Then future changes touch one file, not 38.

5. **Update the policies in the same release.**
   - `cookies.html`: remove "working to honor GPC" once it is true, and list the CMP.
   - `privacy.html` and `california.html`: reconcile with the Meta Pixel's role.

## What to measure after rollout

Consent rates in the EU will reduce GA4 sessions. Consent Mode's modelled conversions partly fill the gap. Read conversion trends from:
- **Calendly bookings:** the Calendly dashboard, or its GA4 integration.
- **Trial sign-ups:** app.midly.ai, which is first-party and unaffected by the banner.

Don't rely on site-side counts alone.

## Suggested sequencing

Run this as its own workstream after homepage approval and **before** the production release. It touches every page and the legal pages, so it needs its own review.
