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
      // Smoothness comes from CSS `scroll-behavior` on the track (incl. the
      // reduced-motion override) - passing behavior:"smooth" here as a JS
      // option instead can leak into the document's own scroll in Chromium
      // when html{scroll-behavior:smooth} is set, scrolling the whole page.
      //
      // Belt-and-braces guard: some Chromium versions still nudge the outer
      // page's scroll position while a nested container smooth-scrolls after
      // a user click (observed here even with no scrollIntoView/window.scrollTo
      // call anywhere in the path). Pin the page scroll position for the
      // duration of the slide animation so that drift is corrected immediately
      // rather than left visible.
      var pageY = window.scrollY;
      var guardUntil = Date.now() + 500;
      function guard() {
        if (window.scrollY !== pageY) { window.scrollTo(0, pageY); }
        if (Date.now() < guardUntil) { requestAnimationFrame(guard); }
      }
      requestAnimationFrame(guard);
      track.scrollTo({ left: slide.offsetLeft });
    }

    // Plain buttons + aria-current, not role="tab"/"tablist": these are carousel
    // indicators, not real tabs, and Chromium auto-scrolls the page to reveal a
    // newly-aria-selected "tab" - a real bug here since the dots never move.
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

    // Desktop click-and-drag navigation (touch devices already get native swipe via scroll-snap).
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
    function endDrag(e) {
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

      // No real video source yet: show the actual preview image at full size
      // rather than a spinner implying footage is loading - a loading state
      // for something that doesn't exist would be misleading.
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
      var poster = slide.getAttribute("data-poster-src");
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
