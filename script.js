(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('[data-scene]')];
  const dots = [...document.querySelectorAll('.progress button')];
  const chapter = document.querySelector('#chapter-name');

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const intro = document.querySelector('.intro');
  const counts = document.querySelectorAll('[data-count]');

  if (reduce) {
    intro?.remove();
    counts.forEach(el => el.textContent = `${el.dataset.count}${el.dataset.suffix || ''}`);
    return;
  }

  // --- Opening: quiet, deliberate, then release into the product story.
  if (intro) {
    gsap.timeline({delay: .15})
      .to('.intro-mark', {opacity: 1, y: 0, duration: .8, ease: 'power3.out'})
      .to('.intro-mark', {scale: .96, duration: .7, ease: 'power2.inOut'}, '+=.25')
      .to(intro, {autoAlpha: 0, duration: 1, ease: 'power3.inOut', onComplete: () => intro.remove()});
  }

  const heroTl = gsap.timeline({defaults:{ease:'power3.out'}, delay:.35});
  heroTl
    .from('.hero-copy .eyebrow',{y:18,opacity:0,duration:.6})
    .from('.hero h1',{y:58,opacity:0,duration:.9},'-=.3')
    .from('.hero-copy .sub',{y:20,opacity:0,duration:.65},'-=.45')
    .from('.hero-copy .meta',{y:14,opacity:0,duration:.45},'-=.38')
    .from('.hero-preview',{x:48,opacity:0,scale:.975,duration:.9},'-=.75');

  // --- Hero: image behaves like the first physical layer of the system.
  gsap.to('.hero .preview-frame img',{yPercent:5,scale:1.055,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  gsap.to('.hero .signal',{xPercent:45,opacity:.15,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});

  // --- Section entrances: one shared motion language, not a collection of effects.
  gsap.utils.toArray('.scene-inner,.end > div').forEach(el => {
    gsap.fromTo(el,{y:34,opacity:0},{y:0,opacity:1,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 82%',once:true}});
  });

  gsap.utils.toArray('.flow,.system,.roi-grid,.roadmap-line,.scale-line').forEach(group => {
    gsap.from(group.children,{y:20,opacity:0,stagger:.08,duration:.65,ease:'power2.out',scrollTrigger:{trigger:group,start:'top 80%',once:true}});
  });

  // --- Physical system: the trolley is the anchor. Scroll changes its state, not the page layout.
  const trolleyStory = document.querySelector('.trolley-story');
  const items = gsap.utils.toArray('.zone-item');
  const descriptions = [
    'Oral solids and return medications get a dedicated, easy-to-read physical zone.',
    'IV and injection stock is separated into protected compartments to reduce mix-ups and breakage risk.',
    'Liquids, cold-chain items and heavier stock have a dedicated lower zone for practical handling.'
  ];
  const setZone = index => {
    items.forEach((item,i) => item.classList.toggle('active', i === index));
    const copy = document.querySelector('#trolley-description');
    if (copy) copy.textContent = descriptions[index];
  };

  if (trolleyStory) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 851px)', () => {
      const tl = gsap.timeline({
        scrollTrigger:{trigger:trolleyStory,start:'top top',end:'bottom bottom',pin:'.trolley-pin',scrub:1,anticipatePin:1}
      });
      tl.to('.trolley-frame',{scale:.93,rotation:-.7,xPercent:-3,duration:1,ease:'none'})
        .to('.trolley-halo',{scale:1.12,rotation:18,duration:1,ease:'none'},'<')
        .to('.trolley-signal',{xPercent:42,opacity:1,duration:1,ease:'none'},'<')
        .to('.trolley-frame',{yPercent:-3,scale:.97,rotation:.7,xPercent:2,duration:1,ease:'none'})
        .to('.trolley-halo',{scale:1.04,rotation:-18,duration:1,ease:'none'},'<')
        .to('.trolley-frame',{yPercent:3,scale:1,rotation:0,xPercent:-1,duration:1,ease:'none'})
        .to('.trolley-signal',{xPercent:-10,opacity:.55,duration:1,ease:'none'},'<');
      ScrollTrigger.create({trigger:trolleyStory,start:'top top',end:'bottom bottom',onUpdate:self=>setZone(self.progress<.36?0:self.progress<.68?1:2)});
    });
    mm.add('(max-width: 850px)', () => {
      items.forEach((item,index) => {
        gsap.fromTo(item,{x:14,opacity:.25},{x:0,opacity:1,duration:.5,scrollTrigger:{trigger:item,start:'top 82%',end:'bottom 36%',scrub:true,onEnter:()=>setZone(index),onEnterBack:()=>setZone(index)}});
      });
    });
  }

  // --- Digital bridge: the same signal leaves the physical system and becomes status.
  const signalScene = document.querySelector('.signal-section');
  if (signalScene) {
    const signalTl = gsap.timeline({scrollTrigger:{trigger:signalScene,start:'top 72%',end:'center center',scrub:1}});
    signalTl
      .from('.signal-canvas .signal-node',{y:14,opacity:0,stagger:.12,duration:.3,ease:'power2.out'})
      .from('.signal-track',{scaleX:0,transformOrigin:'left center',duration:.45,ease:'none'},'<');

    gsap.to('.packet',{left:'92%',ease:'none',scrollTrigger:{trigger:signalScene,start:'top 55%',end:'center center',scrub:1}});
    gsap.to('.packet',{scale:1.7,boxShadow:'0 0 0 11px rgba(214,59,150,.07),0 0 34px rgba(214,59,150,.8)',ease:'none',scrollTrigger:{trigger:signalScene,start:'top 55%',end:'center center',scrub:1}});
    gsap.fromTo('.signal-section .device',{y:55,scale:.965,opacity:0},{y:0,scale:1,opacity:1,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.signal-section .device',start:'top 82%',once:true}});
  }

  // --- Live data: the digital signal resolves into the real dashboard and real pilot data.
  const dashboard = document.querySelector('.dashboard');
  if (dashboard) {
    gsap.fromTo(dashboard,{y:55,scale:.965,opacity:0},{y:0,scale:1,opacity:1,duration:1,ease:'power3.out',scrollTrigger:{trigger:dashboard,start:'top 82%',once:true}});
  }

  counts.forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const obj = {value:0};
    gsap.to(obj,{value:target,duration:1.35,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 82%',once:true},onUpdate:()=>el.textContent=`${Math.round(obj.value)}${suffix}`});
  });

  // --- Persistent orientation: chapter + progress are navigation, not decoration.
  sections.forEach((section,index) => {
    ScrollTrigger.create({
      trigger:section,
      start:'top center',
      end:'bottom center',
      onToggle:self=>{
        if(!self.isActive) return;
        dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
        if(chapter) chapter.textContent=section.dataset.chapter || '';
      }
    });
  });

  dots.forEach((dot,index)=>dot.addEventListener('click',()=>sections[index]?.scrollIntoView({behavior:'smooth',block:'start'})));
  window.addEventListener('load',()=>ScrollTrigger.refresh());
})();
