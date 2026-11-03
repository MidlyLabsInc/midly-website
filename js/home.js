/* ===========================================================================
   Homepage behaviour: nav menus, product tour tabs, CTA measurement.
   Vanilla JS, no dependencies. Every block is guarded so a missing element
   cannot stop the rest from running.
   =========================================================================== */
(function () {
  "use strict";

  function track(name, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) {}
  }

  /* ---- Desktop dropdowns ------------------------------------------------ */
  var triggers = document.querySelectorAll("[data-dropdown]");
  function closeAll(except) {
    Array.prototype.forEach.call(triggers, function (t) {
      if (t === except) return;
      t.setAttribute("aria-expanded", "false");
      var m = document.getElementById(t.getAttribute("aria-controls"));
      if (m) m.classList.remove("open");
    });
  }
  Array.prototype.forEach.call(triggers, function (t) {
    var menu = document.getElementById(t.getAttribute("aria-controls"));
    if (!menu) return;
    t.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = t.getAttribute("aria-expanded") === "true";
      closeAll(t);
      t.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("open", !open);
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-dropdown")) closeAll(null);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var openTrigger = document.querySelector('[data-dropdown][aria-expanded="true"]');
    closeAll(null);
    if (openTrigger) openTrigger.focus();
    closeMobile(true);
  });

  /* ---- Mobile panel ----------------------------------------------------- */
  var toggle = document.getElementById("navToggle");
  var panel = document.getElementById("mobilePanel");
  function closeMobile(refocus) {
    if (!toggle || !panel || !panel.classList.contains("open")) return;
    panel.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    document.body.style.overflow = "";
    if (refocus) toggle.focus();
  }
  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = !panel.classList.contains("open");
      panel.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMobile(false);
    });
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
