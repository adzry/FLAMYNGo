(function () {
  "use strict";

  var sidebar = document.getElementById("sidebar");
  var navToggle = document.getElementById("navToggle");
  var backdrop = document.getElementById("drawerBackdrop");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function closeDrawer() {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    navToggle.setAttribute("aria-expanded", "false");
  }
  function openDrawer() {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-visible");
    navToggle.setAttribute("aria-expanded", "true");
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var isOpen = sidebar.classList.contains("is-open");
      if (isOpen) { closeDrawer(); } else { openDrawer(); }
    });
  }
  if (backdrop) { backdrop.addEventListener("click", closeDrawer); }

  var sidebarLinks = Array.prototype.slice.call(document.querySelectorAll(".sidebar-nav a"));
  sidebarLinks.forEach(function (link) {
    link.addEventListener("click", function () { closeDrawer(); });
  });

  var sections = Array.prototype.slice.call(document.querySelectorAll("main .section"));

  function setActiveLink(id) {
    sidebarLinks.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", match);
      if (match) { link.setAttribute("aria-current", "true"); }
      else { link.removeAttribute("aria-current"); }
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { setActiveLink(entry.target.id); }
        });
      },
      { root: null, rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) { spy.observe(section); });

    var reveal = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            animateCounters(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    sections.forEach(function (section) { reveal.observe(section); });
  } else {
    sections.forEach(function (section) { section.classList.add("is-visible"); });
  }

  var countedSections = new WeakSet();
  function animateCounters(section) {
    if (countedSections.has(section)) { return; }
    countedSections.add(section);
    var targets = section.querySelectorAll("[data-count]");
    if (!targets.length) { return; }
    targets.forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion || isNaN(target)) {
        el.textContent = target + suffix;
        return;
      }
      var duration = 900;
      var start = null;
      function step(ts) {
        if (start === null) { start = ts; }
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(eased * target);
        el.textContent = value + suffix;
        if (progress < 1) { requestAnimationFrame(step); }
      }
      requestAnimationFrame(step);
    });
  }
})();
