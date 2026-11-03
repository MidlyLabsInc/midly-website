/* ===========================================================================
   Site nav behaviour, shared by every page: the Solutions and Resources
   dropdowns, and the mobile menu panel. Vanilla JS, no dependencies; every
   block is guarded so a page without one of these elements still runs.
   =========================================================================== */
(function () {
  "use strict";

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
})();
