/* ===========================================================================
   Homepage behaviour: product tour tabs, CTA measurement. (Nav: nav.js.)
   Vanilla JS, no dependencies. Every block is guarded so a missing element
   cannot stop the rest from running.
   =========================================================================== */
(function () {
  "use strict";

  function track(name, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) {}
  }

  /* ---- Product tour tabs (WAI-ARIA tabs, manual activation) -------------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab, fromUser) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute("aria-controls"));
      if (p) p.hidden = !on;
    });
    if (fromUser) track("product_tour_tab", { tab: tab.getAttribute("data-tab") });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t, true); });
    t.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); next.focus(); select(next, true); }
    });
  });

  /* ---- CTA measurement --------------------------------------------------
     One listener for every [data-cta] link. cta_type separates interest
     (demo, trial, audience) so reports can tell a click from a conversion;
     the conversion itself happens on Calendly or app.midly.ai. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-cta]");
    if (!a) return;
    track("cta_click", {
      cta_type: a.getAttribute("data-cta"),
      cta_location: a.getAttribute("data-cta-location") || "",
      link_url: a.href || ""
    });
    var door = a.getAttribute("data-door");
    if (door) track("audience_door", { door: door });
  });

  /* ---- Carry campaign keys to Calendly ----------------------------------
     motion.js already does this for app.midly.ai links. Calendly accepts
     utm_* parameters and passes them into the booking, which is what makes
     a booked demo attributable to the campaign that produced it. */
  var here = new URLSearchParams(location.search);
  var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var carry = keys.filter(function (k) { return here.get(k); });
  if (carry.length) {
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="calendly.com"]'), function (a) {
      try {
        var url = new URL(a.href);
        carry.forEach(function (k) { if (!url.searchParams.has(k)) url.searchParams.set(k, here.get(k)); });
        a.href = url.toString();
      } catch (e) {}
    });
  }
})();
