# Midly.ai redesign: Phase 1 audit and homepage plan

Status: for review. No site code has been changed. Branch: `claude/midly-website-redesign-367p8s`.

---

## 1. What the site is today

| Area | Finding |
|---|---|
| Stack | Plain static HTML on Vercel. No framework, no build step. Each page carries its own ~1,500 to 2,000 lines of inline CSS. Shared files are tiny: `css/mobile.css`, `css/motion.css`, `js/motion.js`. |
| Routing | `vercel.json`: 40 clean-URL rewrites, ~30 redirects (old Webflow-era blog slugs etc.). `/pricing` is a 302 to `/#pricing`. |
| Serverless | `api/contact.js` (Resend email, used by enterprise, how-it-works, red-flags, sprint forms), `api/nurture.js` (daily cron email sequence), `api/unsubscribe.js`. Not touched by a redesign. |
| Pages | Home; audience: `/attorneys`, `/fractional-gc`, `/teams`, `/enterprise`; product: `/features`, `/how-it-works`; comparison: `/vs-attorney`, `/vs-ironclad`, `/vs-docusign`; lead magnets: `/red-flags`, `/sprint`; `/about`, `/security`, `/careers`, `/blog` + 14 posts; 8 legal pages. |
| Brand assets | Official logo kit in `brand/midly-ai-logo-kit/`: a **lime flower logomark + "Midly.ai" wordmark**. Brand colors in code: lime `#C8F041` (light-mode variant `#4d7500`), near-black `#0A0A0A`, warm off-white `#F2F0EB`. Fonts: Syne (display) + DM Sans (body). Dark-first with a light/dark toggle; light is the default. |
| Real product imagery | Only 3 screenshots exist, all from Review: `review-findings.webp` (editor + AI Insights panel), `review-which-side*.webp` (side picker). Founder photo: `brand/founder-patience.jpg`. Everything else on the site is hand-built HTML mockups. |
| Analytics | GA4 `G-Z3SHWTKPRF` and Meta Pixel on every page. Custom events exist only in places: `audience_door` (home), `cta_*` (fractional-gc), demo-gate events (how-it-works), `enterprise_demo_request`, `red_flags_unlocked`, `sprint_cta_click`. No sitewide CTA tracking. **No cookie consent banner**, and both tags fire on load. |
| Conversion destinations | Demo: `calendly.com/patience-midly/midly-demo` (external link, so completions are not measured). Trial: `app.midly.ai/sign-up?plan=team|counsel|enterprise`. Login: `app.midly.ai/sign-in`. All must be preserved. |
| Guardrails in repo | `.githooks/pre-commit` blocks em dashes in reader-facing copy (house style). Will follow it. |

## 2. Messaging audit

**What works and should be kept**
- The voice. Specific, plain, lawyer-credible: "Two of a hundred need you. You are told which two." "Grounded, or it says nothing." This is better than most legal-tech copy and should survive the redesign.
- The "After signature" section (repository intelligence, renewal notice windows, client summaries). It is exactly the "Beyond the signature" story the brief asks for and already has a good mock panel.
- The 4-step "How it works" tabbed visual. It extends naturally to the 5 stages.
- The founder strip and its authenticity.
- Two audience doors ("I review contracts for clients" / "I am the legal team here"), which already fire a GA event.

**What is not working**
1. **The homepage has already picked an ICP.** Title, meta and OG all say "Contract Review Software for Attorneys and Small Firms"; the "Who it's for" copy says "built first for attorneys". This contradicts the brief's instruction not to present either segment as validated.
2. **The hero sells one feature (reviewing their paper), not the process.** The brief's thesis ("the process around it is the bottleneck") is not on the page.
3. **Audience is said four times.** Audience doors, "Who it's for" (3 cards incl. Enterprise), CLM comparison ("who it assumes you are"), and the plan table all re-segment the visitor.
4. **Pricing appears twice on the homepage** (a 20-row comparison table and three plan cards), plus an "Outside Counsel is $129" banner and a FAQ. The homepage is roughly 50% pricing and objection handling.
5. **Competing CTAs.** The nav has Log in + Book a Demo + Start trial; the hero leads with "Start your 7-day trial" and demotes the demo. The brief wants one primary action.
6. **Audience pages overlap.** `/attorneys` and `/fractional-gc` serve the same buyer (Audience A) with different headlines; `/teams` is Audience B; `/enterprise` is a third audience.
7. **Product pages overlap.** `/features` and `/how-it-works` tell the same 4-step story.
8. **Time-saving claims the brief asks us to avoid**: "reviewed in 15 minutes", "Work I used to bill at ten hours I now bill at two and a half", "in minutes rather than an evening".
9. **Visual system.** Three conflicting `:root` blocks with `!important` overrides to patch light mode; noise overlay; theme toggle. Hard to extend cleanly.

## 3. Retain / remove / consolidate / redesign

| Item | Decision |
|---|---|
| Logo kit, founder photo, 3 real screenshots | **Retain** |
| Copy voice; After-signature content; founder story; FAQ content | **Retain** (edit) |
| Calendly, app sign-up/sign-in links, `/api/*`, legal pages, blog, lead magnets, vs-* pages | **Retain unchanged** |
| Homepage pricing table + plan cards + $129 banner | **Remove from homepage**, move to a real `/pricing` page (Phase 4) |
| CLM comparison table on homepage | **Remove from homepage** (it lives on `/vs-ironclad`, `/vs-docusign`) |
| Enterprise card in "Who it's for" | **Remove from homepage**, keep `/enterprise` in nav dropdown + footer |
| Theme toggle and dark-first CSS | **Remove** on redesigned pages (single light theme; see decision 1) |
| `/attorneys` + `/fractional-gc` | **Consolidate** into `/solutions/outside-counsel` (301s) |
| `/teams` | **Redesign** as `/solutions/in-house-legal` (301; also repoint the existing `/founders` redirect) |
| `/features` + `/how-it-works` | **Consolidate** into `/product` in Phase 4 (keep the how-it-works demo gate and its events) |
| Homepage hero, problem, workflow, nav, footer | **Redesign** |

## 4. Proposed sitemap and navigation

```
Midly logo   Product   Solutions v   Pricing   Resources v        Log in   [Book a demo]
                       Outside counsel & fractional GCs   Blog
                       In-house legal teams               Contract red-flag checklist
                       Enterprise                         Comparisons (vs Ironclad, vs DocuSign CLM)
                                                          Security
```

| URL | Status |
|---|---|
| `/` | Redesigned (Phase 2) |
| `/solutions/outside-counsel` | New, from `/attorneys` + `/fractional-gc` (Phase 3) |
| `/solutions/in-house-legal` | New, from `/teams` (Phase 3) |
| `/product` | New, from `/features` + `/how-it-works` (Phase 4) |
| `/pricing` | Real page replacing the `/#pricing` redirect; same plans, prices, trial terms (Phase 4) |
| `/enterprise`, `/about`, `/security`, `/blog/*`, lead magnets, legal | Kept; restyled to the new shell later |

Old URLs get permanent redirects, sitemap and canonicals updated in the same change. Nothing is removed until its replacement exists.

## 5. Homepage architecture

Messaging hierarchy: **Problem (process, not contract) -> connected workflow -> proof in the real product -> which path is yours -> value after signature -> why it exists -> one action.**

| # | Section | Content | Built from |
|---|---|---|---|
| 1 | Nav | As above. One primary CTA: Book a demo. | New shared nav |
| 2 | Hero | Eyebrow "AI-powered commercial contracting". H1 "The contract isn't the bottleneck. The process around it is." Sub: "From the first request to the next renewal, Midly brings contract review, negotiation, collaboration, and intelligence into one connected workspace." CTAs: **Book a demo** / See how Midly works (anchors to section 5). Line under CTAs: "Midly does the reading. You keep the judgment." Visual: real editor + AI Insights screenshot in a browser frame on deep green. | `review-findings.webp`, existing window-chrome frame |
| 3 | The problem | "Where contracts actually stall": 5 short items: legal comes in late; the latest version is a guess; decisions live in email; nobody can see where the negotiation stands; signed agreements are forgotten until something goes wrong. | New copy |
| 4 | How Midly works | 5 connected stages: Intake, Review, Negotiate, Execute, Understand & monitor. One line each. | Extends existing step component |
| 5 | Product tour (tabs) | Tabs: Contract editor / AI insights & playbook deviations / Ask Midly / Versions & negotiation rounds / Repository / Renewal alerts. One real screenshot + 2 lines per tab. | Needs screenshots (decision 3) |
| 6 | Built for how you work | Two cards only: "For Fractional GCs & Commercial Practices" -> `/solutions/outside-counsel`; "For In-House Legal Teams" -> `/solutions/in-house-legal`. Equal weight, no "built first for". | Existing audience doors + `audience_door` event |
| 7 | Beyond the signature | "The agreement is signed. The intelligence shouldn't stop." Key terms, deviations, renewal notice windows, client summaries. | Existing after-signature panel |
| 8 | Founder story | The brief's "legal team of one" copy, founder photo, link to `/about`. | Existing founder strip |
| 9 | Final CTA | "Make room for the work that matters." **See Midly in action** (Calendly). Small secondary link: "Prefer to try it yourself? Start a 7-day trial." | Existing CTA band |
| 10 | Footer | Unchanged links, restyled. | |

Removed from the homepage: pricing table, plan cards, CLM table, Enterprise card, FAQ (moves to `/pricing`).

## 6. Design plan

- **Palette:** deep forest green `#123B32`-range for hero/dark bands, warm ivory `#F7F4EC` page background, sage tints for cards, existing lime `#C8F041` used sparingly as the accent (CTA hovers, the logomark, small highlights). This keeps the official lime-flower logo native to the new look instead of fighting it.
- **Type:** an editorial serif for display (e.g. Fraunces or Newsreader, Google Fonts) + keep DM Sans for body. Syne is retired from redesigned pages.
- **Logo:** the official lime-flower lockup, unchanged. The "M" mark in the concept board is not used.
- **Imagery:** real product screenshots only, framed in browser chrome. The concept board's architecture/wave imagery used at most as subtle texture in audience cards, or not at all.
- **Motion:** reuse `js/motion.js` reveal-on-scroll; respect `prefers-reduced-motion`.
- **Implementation:** one new shared stylesheet with design tokens (`css/site.css`) instead of another 2,000 lines of inline CSS; no framework, no new dependencies. Redesigned pages adopt it; untouched pages keep working as they are.
- **Accessibility:** AA contrast on green and ivory, visible focus states, keyboard-operable tabs (ARIA tablist), real `<button>`s.

## 7. Measurement plan (Phase 5, summary)

Use the existing GA4 property; no new tools.
- One delegated click listener on `[data-cta]` sending `cta_click` with `cta_location`, `cta_type` (demo / trial / login / audience), `page`. Generalises what `/fractional-gc` already does.
- **Interest** events: `cta_click` (demo, trial), audience page views, pricing page views, product-tour tab views.
- **Conversion** events: `demo_booked` (needs Calendly's GA4 integration or a redirect to a thank-you page), `sign_up_completed` (fires in app.midly.ai, outside this repo). Pass UTM parameters through to Calendly and the sign-up URL so attribution survives.
- Recommend adding a consent banner before more tracking, since GA4 and Meta Pixel currently load unconditionally.

## 8. Decisions needed before Phase 2

1. **Brand direction.** The official logo is the lime flower on black with Syne/DM Sans. The concept board uses forest green, serif type and an "M" mark. I recommend section 6: forest green + ivory foundation, lime kept as the accent, official logo untouched, Syne retired. Approve, or keep the current black/lime look?
2. **Primary CTA: demo or trial?** Today the site is trial-led (self-serve 7-day trial, no card). The brief is demo-led. I recommend Book a demo as the single primary CTA in nav/hero, and keep "Start 7-day trial" as a secondary path on the final CTA, solutions pages and pricing. Agree?
3. **Screenshots.** Only Review screenshots exist. For the hero and product tour I need real captures of: contract editor with tracked changes, playbook deviations, Ask Midly, versions/negotiation rounds, repository record, renewal alert email, intake, and (for Audience A) time tracking/invoicing. Can you supply them, or give me a demo-account login with sample data so I can capture them at consistent sizes? Until then, the prototype will use the 3 real ones and clearly labelled placeholders.
4. **Feature verification.** The current site states these as existing; please confirm before I repeat them: built-in eSignature (site says "ESIGN compliant"); negotiation rounds/version history; email intake address per workspace; client onboarding/engagement letters (in your brief, not on the site); invoicing generated from tracked time; renewal emails.
5. **Time-saving claims.** Drop "15 minutes" and "ten hours to two and a half" per the brief, or keep the founder's first-person version inside the founder section only? I recommend the latter.
6. **URL changes.** Are any ads, emails or nurture sequences pointing at `/attorneys`, `/fractional-gc` or `/teams`? Redirects will cover them, but campaign landing pages may want to stay put until a campaign ends.
7. **Preview.** Is the Vercel Git integration on for this repo (branch previews)? If so, pushing Phase 2 to this branch gives you a preview URL. If not, I will send full-page screenshots at desktop and mobile widths.

## 9. Next step

On approval of section 8, Phase 2 builds only the homepage on this branch, with the new shared stylesheet and nav, without touching other pages, redirects or the app. Nothing is deployed to production.
