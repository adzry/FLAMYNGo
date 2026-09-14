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
    var viewport = showcase.querySelector("[data-showcase-viewport]");
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

  /* ---------- Live HYAN web-app embed ---------- */
  var liveSection = document.getElementById("live");
  if (liveSection) {
    var notificationUrl = "https://script.google.com/macros/s/AKfycbz03oHgzgJ042GaAHWeSLZ0H8iwcDBCjfbPXcbmdc9Abc3NO3jNVjlOVvqCxBOpQR85/exec";
    var dashboardUrl = "https://script.google.com/macros/s/AKfycbzR4h_5QEEeWVKY7eFbYnJ91eNIWLHUJRYt1VSMWvlV4LpZtAYU2JD30ZM01T8coa39uw/exec";

    var embed = document.createElement("div");
    embed.className = "live-app-embed";
    embed.innerHTML =
      '<div class="live-app-head">' +
        '<div><p class="row-kicker">HYAN live system</p><h3>Troli Ubat HYAN</h3></div>' +
        '<span class="live-app-status">LIVE</span>' +
      '</div>' +
      '<div class="live-app-tabs" role="tablist" aria-label="Paparan sistem Troli Ubat HYAN">' +
        '<button type="button" class="live-app-tab is-active" role="tab" aria-selected="true" data-app="notification">Sistem Notifikasi Wad</button>' +
        '<button type="button" class="live-app-tab" role="tab" aria-selected="false" data-app="dashboard">Dashboard Analitik</button>' +
      '</div>' +
      '<div class="live-app-frame-wrap">' +
        '<iframe class="live-app-frame" title="Sistem Notifikasi Wad — Troli Ubat HYAN" src="' + notificationUrl + '" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      '</div>' +
      '<p class="live-app-note">Paparan ini dimuat terus daripada Web App operasi sebenar. Data dan sistem backend tidak disalin ke GitHub Pages.</p>';

    var liveFigure = liveSection.querySelector(".live-figure");
    var liveGrid = liveSection.querySelector(".live-grid");
    if (liveFigure) {
      liveFigure.insertAdjacentElement("afterend", embed);
    } else if (liveGrid) {
      liveGrid.insertAdjacentElement("beforebegin", embed);
    } else {
      liveSection.appendChild(embed);
    }

    var style = document.createElement("style");
    style.textContent =
      ".live-app-embed{margin:48px 0 10px;border:1px solid rgba(21,19,27,.12);border-radius:12px;background:#faf9fb;overflow:hidden;box-shadow:0 18px 50px rgba(21,19,27,.08)}" +
      ".live-app-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 22px 16px;border-bottom:1px solid rgba(21,19,27,.08);background:#fff}" +
      ".live-app-head h3{font-size:1.2rem;margin:0}" +
      ".live-app-status{font-size:.62rem;font-weight:800;letter-spacing:.14em;color:#6b3fd4;border:1px solid rgba(107,63,212,.24);border-radius:999px;padding:5px 9px}" +
      ".live-app-tabs{display:flex;gap:6px;padding:10px;background:#fff;border-bottom:1px solid rgba(21,19,27,.08)}" +
      ".live-app-tab{appearance:none;border:1px solid transparent;background:transparent;color:#5c5566;border-radius:8px;padding:9px 12px;font:600 .78rem/1.2 'DM Sans',system-ui,sans-serif;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease}" +
      ".live-app-tab:hover{background:#faf9fb;color:#15131b}" +
      ".live-app-tab.is-active{background:#15131b;color:#fff;border-color:#15131b}" +
      ".live-app-frame-wrap{position:relative;width:100%;background:#f5f4f7}" +
      ".live-app-frame{display:block;width:100%;height:680px;border:0;background:#fff}" +
      ".live-app-note{margin:0;padding:10px 16px 14px;color:#9691a0;font-size:.7rem;line-height:1.45;background:#fff}" +
      "@media(max-width:640px){.live-app-embed{margin-top:34px;border-radius:10px}.live-app-head{padding:16px}.live-app-tabs{overflow-x:auto;flex-wrap:nowrap}.live-app-tab{white-space:nowrap}.live-app-frame{height:620px}.live-app-note{font-size:.66rem}}";
    document.head.appendChild(style);

    var appTabs = Array.prototype.slice.call(embed.querySelectorAll(".live-app-tab"));
    var frame = embed.querySelector(".live-app-frame");
    appTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var isDashboard = tab.getAttribute("data-app") === "dashboard";
        var url = isDashboard ? dashboardUrl : notificationUrl;
        frame.src = url;
        frame.title = isDashboard ? "Dashboard Analitik — Troli Ubat HYAN" : "Sistem Notifikasi Wad — Troli Ubat HYAN";
        appTabs.forEach(function (item) {
          var active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
      });
    });
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
