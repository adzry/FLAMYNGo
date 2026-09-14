(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('[data-scene]')];
  const dots = [...document.querySelectorAll('.progress i')];

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('on'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Entrance choreography.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero-copy .eyebrow', { y: 20, opacity: 0, duration: .7 })
    .from('.hero h1', { y: 70, opacity: 0, duration: 1.05 }, '-=.35')
    .from('.hero-copy .sub', { y: 24, opacity: 0, duration: .7 }, '-=.55')
    .from('.hero-copy .meta', { y: 18, opacity: 0, duration: .55 }, '-=.45')
    .from('.preview', { x: 70, opacity: 0, scale: .96, duration: 1.1 }, '-=1');

  // Hero image has a subtle depth shift tied to scroll.
  gsap.to('.hero .preview-frame img', {
    yPercent: 7,
    scale: 1.08,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
  });
  gsap.to('.hero .signal', {
    xPercent: 35,
    opacity: .15,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
  });

  // Section reveal + staggered children.
  document.querySelectorAll('.scene-inner, .end > div').forEach(el => {
    gsap.fromTo(el, { y: 45, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true }
    });
  });

  gsap.utils.toArray('.flow, .system').forEach(group => {
    gsap.from(group.children, {
      y: 28, opacity: 0, stagger: .1, duration: .7, ease: 'power2.out',
      scrollTrigger: { trigger: group, start: 'top 80%', once: true }
    });
  });

  // The physical/digital signal scene behaves like a product reveal.
  const signalScene = document.querySelector('.signal-section');
  if (signalScene) {
    gsap.to('.signal-stage .device', {
      yPercent: -7,
      scale: 1.035,
      ease: 'none',
      scrollTrigger: { trigger: signalScene, start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
    gsap.to('.scan-ring', {
      scale: 2.4,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: signalScene, start: 'top 75%', end: 'center center', scrub: 1 }
    });
    gsap.from('.scan-line', {
      xPercent: -70,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: signalScene, start: 'top 75%', end: 'center center', scrub: 1 }
    });
  }

  // Dashboard enters from scale/depth rather than a simple fade.
  const dashboard = document.querySelector('.dashboard');
  if (dashboard) {
    gsap.fromTo(dashboard, { y: 70, scale: .94, opacity: 0 }, {
      y: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: dashboard, start: 'top 82%', once: true }
    });
  }

  // Numbers count only when the live-data section is actually reached.
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const obj = { value: 0 };
    gsap.to(obj, {
      value: target, duration: 1.5, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      onUpdate: () => {
        const decimals = Number.isInteger(target) ? 0 : 1;
        el.textContent = obj.value.toFixed(decimals) + suffix;
      }
    });
  });

  // Quiet section indicator: useful orientation without turning into a second nav.
  sections.forEach((section, index) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: self => {
        if (self.isActive) dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
      }
    });
  });

  dots.forEach((dot, index) => dot.addEventListener('click', () => {
    sections[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
