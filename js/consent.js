/*
 * Consent for midly.ai: no analytics or advertising tag loads until the
 * visitor allows it.
 *
 * Before this, every page loaded Google Analytics 4, the Meta Pixel and
 * Microsoft Clarity on page load, with no choice offered. This file is now the
 * only place those tags are loaded, and only after consent:
 *
 *   analytics  -> Google Analytics 4 (G-Z3SHWTKPRF), and Microsoft Clarity
 *                 (w0xtsl38r9) except on pages that contain a form, where
 *                 Clarity never runs (typed values must not be recorded).
 *   marketing  -> the Meta Pixel (1648639153116554), and Google's advertising
 *                 signals (ad_storage, ad_user_data, ad_personalization).
 *
 * The default is the cautious one everywhere: nothing until the visitor
 * chooses. Global Privacy Control (navigator.globalPrivacyControl) is honoured
 * as an opt-out of advertising: with GPC on, marketing stays off whatever is
 * chosen. Google Consent Mode v2 is set to "denied" before anything else and
 * updated only from the visitor's choice.
 *
 * The choice is kept in a first-party cookie on .midly.ai for 180 days, so
 * app.midly.ai can read the same decision. "Cookie settings" (any element with
 * data-cookie-settings, or the link added to the footer) reopens the choice.
 *
 * gtag() and fbq() are defined as queues at once, so the pages' own event
 * calls never throw; they are only sent if the matching tag loads.
 */
(function () {
  "use strict";

  var GA_ID = "G-Z3SHWTKPRF";
  var PIXEL_ID = "1648639153116554";
  var CLARITY_ID = "w0xtsl38r9";
  var COOKIE = "midly_consent";
  var MAX_AGE = 60 * 60 * 24 * 180;

  // Queues first, so page scripts calling gtag/fbq never fail.
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });

  var gpc = navigator.globalPrivacyControl === true;

  function readChoice() {
    var m = document.cookie.match(/(?:^|;\s*)midly_consent=([^;]+)/);
    if (!m) return null;
    try {
      var v = JSON.parse(decodeURIComponent(m[1]));
      if (typeof v.a !== "boolean" || typeof v.m !== "boolean") return null;
      return { analytics: v.a, marketing: v.m };
    } catch (e) {
      return null;
    }
  }

  function writeChoice(choice) {
    var value = encodeURIComponent(
      JSON.stringify({ a: choice.analytics, m: choice.marketing, t: Date.now() })
    );
    var domain = /(^|\.)midly\.ai$/.test(location.hostname)
      ? "; domain=.midly.ai"
      : "";
    document.cookie =
      COOKIE +
      "=" +
      value +
      "; path=/; max-age=" +
      MAX_AGE +
      "; samesite=lax" +
      (location.protocol === "https:" ? "; secure" : "") +
      domain;
  }

  function loadScript(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  var loaded = { ga: false, pixel: false, clarity: false };

  function apply(choice) {
    var marketing = choice.marketing && !gpc;
    window.gtag("consent", "update", {
      analytics_storage: choice.analytics ? "granted" : "denied",
      ad_storage: marketing ? "granted" : "denied",
      ad_user_data: marketing ? "granted" : "denied",
      ad_personalization: marketing ? "granted" : "denied",
    });

    if ((choice.analytics || marketing) && !loaded.ga) {
      loaded.ga = true;
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + GA_ID);
      window.gtag("js", new Date());
      window.gtag("config", GA_ID);
    }

    if (marketing && !loaded.pixel) {
      loaded.pixel = true;
      /* Meta's standard base code, unchanged apart from running here. */
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(
        window,
        document,
        "script",
        "https://connect.facebook.net/en_US/fbevents.js"
      );
      window.fbq("init", PIXEL_ID);
      window.fbq("track", "PageView");
    }

    var hasForm = !!document.querySelector("form");
    if (choice.analytics && !hasForm && !loaded.clarity) {
      loaded.clarity = true;
      window.clarity =
        window.clarity ||
        function () {
          (window.clarity.q = window.clarity.q || []).push(arguments);
        };
      loadScript("https://www.clarity.ms/tag/" + CLARITY_ID);
    }
  }

  // ---- The banner ----------------------------------------------------------

  var STYLE =
    "#midly-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;" +
    "max-width:560px;margin:0 auto;background:#fff;color:#14231f;border:1px solid #d9ded8;" +
    "border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:18px 18px 16px;" +
    "font:14px/1.5 'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif}" +
    "#midly-consent h2{font-size:15px;margin:0 0 6px;font-weight:600}" +
    "#midly-consent p{margin:0 0 12px;color:#45524d}" +
    "#midly-consent a{color:inherit;text-decoration:underline}" +
    "#midly-consent .mc-row{display:flex;flex-wrap:wrap;gap:8px}" +
    "#midly-consent button{font:inherit;font-weight:600;border-radius:10px;padding:9px 14px;" +
    "cursor:pointer;border:1px solid #14231f;background:#fff;color:#14231f}" +
    "#midly-consent button.mc-primary{background:#14231f;color:#fff}" +
    "#midly-consent fieldset{border:0;padding:0;margin:0 0 12px}" +
    "#midly-consent label{display:flex;gap:8px;align-items:flex-start;margin:6px 0}" +
    "#midly-consent .mc-note{font-size:12px;color:#6a756f;margin-top:4px}" +
    "@media (prefers-color-scheme:dark){#midly-consent{background:#14231f;color:#eef2ee;" +
    "border-color:#2c3c37}#midly-consent p,#midly-consent .mc-note{color:#c3ccc6}" +
    "#midly-consent button{background:#14231f;color:#eef2ee;border-color:#eef2ee}" +
    "#midly-consent button.mc-primary{background:#c8f041;color:#14231f;border-color:#c8f041}}";

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }

  function close(box) {
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  function decide(box, choice) {
    writeChoice(choice);
    apply(choice);
    close(box);
  }

  function open(detailed) {
    var existing = document.getElementById("midly-consent");
    if (existing) close(existing);
    if (!document.getElementById("midly-consent-style")) {
      var st = el("style", { id: "midly-consent-style" });
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    var current = readChoice() || { analytics: false, marketing: false };
    var box = el("div", {
      id: "midly-consent",
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": "midly-consent-title",
    });
    box.appendChild(el("h2", { id: "midly-consent-title" }, "Your privacy choices"));
    var p = el("p", {});
    p.appendChild(
      document.createTextNode(
        "We use analytics to understand how the site is used, and advertising tools to measure our campaigns. Neither runs unless you allow it. "
      )
    );
    var link = el("a", { href: "/cookies" }, "Cookie policy");
    p.appendChild(link);
    box.appendChild(p);

    var fs, analytics, marketing;
    if (detailed) {
      fs = el("fieldset", {});
      var la = el("label", {});
      analytics = el("input", { type: "checkbox" });
      analytics.checked = current.analytics;
      la.appendChild(analytics);
      la.appendChild(
        document.createTextNode("Analytics: Google Analytics and Microsoft Clarity")
      );
      var lm = el("label", {});
      marketing = el("input", { type: "checkbox" });
      marketing.checked = current.marketing && !gpc;
      if (gpc) marketing.disabled = true;
      lm.appendChild(marketing);
      lm.appendChild(
        document.createTextNode("Advertising: Meta Pixel and Google Ads measurement")
      );
      fs.appendChild(la);
      fs.appendChild(lm);
      if (gpc) {
        fs.appendChild(
          el(
            "div",
            { class: "mc-note" },
            "Your browser sends a Global Privacy Control signal, so advertising stays off."
          )
        );
      }
      box.appendChild(fs);
    }

    var row = el("div", { class: "mc-row" });
    var accept = el("button", { type: "button", class: "mc-primary" }, "Accept all");
    var reject = el("button", { type: "button" }, "Reject all");
    accept.onclick = function () {
      decide(box, { analytics: true, marketing: true });
    };
    reject.onclick = function () {
      decide(box, { analytics: false, marketing: false });
    };
    row.appendChild(accept);
    row.appendChild(reject);
    if (detailed) {
      var save = el("button", { type: "button" }, "Save choices");
      save.onclick = function () {
        decide(box, {
          analytics: analytics.checked,
          marketing: marketing.checked,
        });
      };
      row.appendChild(save);
    } else {
      var choose = el("button", { type: "button" }, "Choose");
      choose.onclick = function () {
        open(true);
      };
      row.appendChild(choose);
    }
    box.appendChild(row);
    document.body.appendChild(box);
    accept.focus({ preventScroll: true });
  }

  function addSettingsLink() {
    if (document.querySelector("[data-cookie-settings]")) return;
    var footer = document.querySelector("footer");
    if (!footer) return;
    var a = el("a", { href: "#", "data-cookie-settings": "" }, "Cookie settings");
    // The site footer's bottom row (copyright, location) is where it belongs;
    // appended to the footer itself it landed below the columns, at the edge.
    var base = footer.querySelector(".footer-base");
    if (base) {
      a.style.cssText = "color:inherit;text-decoration:none";
      base.appendChild(a);
      return;
    }
    a.style.cssText = "display:inline-block;margin-top:12px;font-size:13px;opacity:.8";
    footer.appendChild(a);
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-cookie-settings]");
    if (!t) return;
    e.preventDefault();
    open(true);
  });

  window.midlyConsent = { open: function () { open(true); }, read: readChoice };

  function start() {
    addSettingsLink();
    var choice = readChoice();
    if (choice) apply(choice);
    else open(false);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
