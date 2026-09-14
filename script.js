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

  /* ---------- Hero video showcase (carousel + drag-to-scroll) ---------- */
  var showcase = document.querySelector("[data-showcase]");
  if (showcase) {
    var track = showcase.querySelector("[data-showcase-track]");
    var dotsHost = showcase.querySelector("[data-showcase-dots]");
    var slides = Array.prototype.slice.call(track.children);

    function goToSlide(slide) {
      var pageY = window.scrollY;
      var guardUntil = Date.now() + 500;
      function guard() {
        if (window.scrollY !== pageY) { window.scrollTo(0, pageY); }
        if (Date.now() < guardUntil) { requestAnimationFrame(guard); }
      }
      requestAnimationFrame(guard);
      track.scrollTo({ left: slide.offsetLeft });
    }

    slides.forEach(function (slide, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Slide " + (i + 1) + " of " + slides.length);
      if (i === 0) { dot.classList.add("is-active"); dot.setAttribute("aria-current", "true"); }
      dot.addEventListener("click", function () { goToSlide(slide); });
      dotsHost.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsHost.children);

    function setActiveDot(index) {
      dots.forEach(function (d, i) {
        var active = i === index;
        d.classList.toggle("is-active", active);
        if (active) { d.setAttribute("aria-current", "true"); } else { d.removeAttribute("aria-current"); }
      });
    }

    if ("IntersectionObserver" in window) {
      var slideSpy = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              setActiveDot(slides.indexOf(entry.target));
            }
          });
        },
        { root: track, threshold: [0.6] }
      );
      slides.forEach(function (s) { slideSpy.observe(s); });
    }

    var isDown = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") { return; }
      isDown = true; moved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!isDown) { return; }
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; }
      track.scrollLeft = startScroll - dx;
    });
    function endDrag() {
      if (!isDown) { return; }
      isDown = false;
      track.classList.remove("is-dragging");
      var closest = slides.reduce(function (best, slide) {
        var d = Math.abs(slide.offsetLeft - track.scrollLeft);
        return d < best.d ? { slide: slide, d: d } : best;
      }, { slide: slides[0], d: Infinity });
      goToSlide(closest.slide);
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointerleave", endDrag);
    track.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ---------- Live HYAN web-app tabs + ward-specific notification URLs ---------- */
  var liveEmbed = document.getElementById("hyan-live-embed");
  if (liveEmbed) {
    var notificationBaseUrl = "https://script.google.com/macros/s/AKfycbz03oHgzgJ042GaAHWeSLZ0H8iwcDBCjfbPXcbmdc9Abc3NO3jNVjlOVvqCxBOpQR85/exec";
    var dashboardUrl = "https://script.google.com/macros/s/AKfycbzR4h_5QEEeWVKY7eFbYnJ91eNIWLHUJRYt1VSMWvlV4LpZtAYU2JD30ZM01T8coa39uw/exec";
    var wards = [
      "Wad Lelaki 4A",
      "Wad Lelaki 4B",
      "Wad Perempuan",
      "Wad Bersalin",
      "Wad Kanak-Kanak",
      "Unit Hemodialisis",
      "Wad Test",
      "Kecemasan & Trauma",
      "Klinik Sejahtera",
      "Klinik Pakar",
      "ESWL",
      "Forensik",
      "Patologi",
      "Fisioterapi",
      "Unit Cara Kerja (Occupational Therapy)"
    ];
    var selectedWard = "Wad Lelaki 4B";
    var appTabs = Array.prototype.slice.call(liveEmbed.querySelectorAll(".live-app-tab"));
    var frame = liveEmbed.querySelector(".live-app-frame");
    var tabsHost = liveEmbed.querySelector(".live-app-tabs");

    var wardPicker = document.createElement("div");
    wardPicker.className = "live-app-ward-picker";
    wardPicker.style.cssText = "display:flex;align-items:center;gap:8px;margin-right:auto;min-width:0;";

    var wardLabel = document.createElement("label");
    wardLabel.textContent = "Wad / Unit";
    wardLabel.setAttribute("for", "hyan-ward-select");
    wardLabel.style.cssText = "font:600 .72rem/1.2 'DM Sans',system-ui,sans-serif;color:#7b7484;white-space:nowrap;";

    var wardSelect = document.createElement("select");
    wardSelect.id = "hyan-ward-select";
    wardSelect.setAttribute("aria-label", "Pilih wad atau unit untuk sistem notifikasi");
    wardSelect.style.cssText = "appearance:none;border:1px solid rgba(21,19,27,.12);border-radius:8px;background:#fff;color:#15131b;padding:8px 30px 8px 10px;font:600 .76rem/1.2 'DM Sans',system-ui,sans-serif;max-width:min(42vw,280px);cursor:pointer;";

    wards.forEach(function (ward) {
      var option = document.createElement("option");
      option.value = ward;
      option.textContent = ward;
      wardSelect.appendChild(option);
    });
    wardSelect.value = selectedWard;
    wardPicker.appendChild(wardLabel);
    wardPicker.appendChild(wardSelect);
    tabsHost.insertBefore(wardPicker, tabsHost.firstChild);

    function getNotificationUrl(ward) {
      return notificationBaseUrl + "?wad=" + encodeURIComponent(ward);
    }

    function setActiveApp(tab) {
      var isDashboard = tab.getAttribute("data-app") === "dashboard";
      if (isDashboard) {
        frame.src = dashboardUrl;
        frame.title = "Dashboard Analitik — Troli Ubat HYAN";
        wardSelect.disabled = true;
        wardSelect.style.opacity = "0.45";
        wardSelect.style.cursor = "not-allowed";
      } else {
        frame.src = getNotificationUrl(wardSelect.value);
        frame.title = "Sistem Notifikasi " + wardSelect.value + " — Troli Ubat HYAN";
        wardSelect.disabled = false;
        wardSelect.style.opacity = "1";
        wardSelect.style.cursor = "pointer";
      }
      appTabs.forEach(function (item) {
        var active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    wardSelect.addEventListener("change", function () {
      var activeTab = liveEmbed.querySelector('.live-app-tab[data-app="notification"]');
      if (activeTab && activeTab.classList.contains("is-active")) {
        frame.src = getNotificationUrl(wardSelect.value);
        frame.title = "Sistem Notifikasi " + wardSelect.value + " — Troli Ubat HYAN";
      }
    });

    appTabs.forEach(function (tab) {
      tab.addEventListener("click", function () { setActiveApp(tab); });
    });

    var initialNotificationTab = liveEmbed.querySelector('.live-app-tab[data-app="notification"]');
    if (initialNotificationTab) { setActiveApp(initialNotificationTab); }
  }

  /* ---------- Video modal ---------- */
  var modal = document.querySelector("[data-video-modal]");
  if (modal) {
    var modalBody = modal.querySelector("[data-video-modal-body]");
    var lastFocused = null;

    function buildPlayer(slide) {
      var src = slide.getAttribute("data-video-src");
      var type = slide.getAttribute("data-video-type") || "mp4";
      var title = slide.querySelector(".showcase-title");
      var titleText = title ? title.textContent : "Preview";
      var subtitle = slide.querySelector(".showcase-subtitle");
      var subtitleText = subtitle ? subtitle.textContent : "";
      var poster = slide.getAttribute("data-poster-src");

      if (!src) {
        var wrap = document.createElement("div");
        wrap.className = "preview-full";
        var img = document.createElement("img");
        img.src = poster;
        img.alt = titleText;
        wrap.appendChild(img);
        var cap = document.createElement("div");
        cap.className = "preview-full-cap";
        cap.innerHTML = '<p class="preview-full-title">' + titleText + '</p><p>' + subtitleText + '</p>';
        wrap.appendChild(cap);
        return wrap;
      }
      if (type === "youtube" || type === "vimeo") {
        var iframe = document.createElement("iframe");
        iframe.src = src;
        iframe.title = titleText;
        iframe.allow = "autoplay; fullscreen; picture-in-picture";
        iframe.allowFullscreen = true;
        return iframe;
      }
      var video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      if (poster) { video.poster = poster; }
      return video;
    }

    function openModal(slide) {
      lastFocused = document.activeElement;
      modalBody.innerHTML = "";
      modalBody.appendChild(buildPlayer(slide));
      modal.hidden = false;
      modal.querySelector(".video-modal-close").focus();
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      modal.hidden = true;
      modalBody.innerHTML = "";
      document.body.style.overflow = "";
      if (lastFocused) { lastFocused.focus(); }
    }

    document.querySelectorAll(".showcase-play").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(btn.closest(".showcase-slide"));
      });
    });
    modal.querySelectorAll("[data-video-modal-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) { closeModal(); }
    });
  }
})();
