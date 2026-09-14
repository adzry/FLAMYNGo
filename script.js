(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('[data-scene]')];
  const dots = [...document.querySelectorAll('.progress button')];
  const chapter = document.querySelector('#chapter-name');

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  if (reduce) {
    document.querySelectorAll('.intro').forEach(el => el.remove());
    document.querySelectorAll('[data-count]').forEach(el => {
      el.textContent = `${el.dataset.count}${el.dataset.suffix || ''}`;
    });
    return;
  }

  const introTl = gsap.timeline({delay: 1.35});
  introTl.to('.intro', {autoAlpha: 0, duration: 1.1, ease: 'power3.inOut', onComplete: () => document.querySelector('.intro')?.remove()});

  gsap.timeline({defaults:{ease:'power3.out'}})
    .from('.hero-copy .eyebrow',{y:20,opacity:0,duration:.7})
    .from('.hero h1',{y:70,opacity:0,duration:1.05},'-=.35')
    .from('.hero-copy .sub',{y:24,opacity:0,duration:.7},'-=.55')
    .from('.hero-copy .meta',{y:18,opacity:0,duration:.55},'-=.45')
    .from('.hero-preview',{x:70,opacity:0,scale:.96,duration:1.1},'-=1');

  gsap.to('.hero .preview-frame img',{yPercent:7,scale:1.08,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  gsap.to('.hero .signal',{xPercent:35,opacity:.15,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  gsap.to('.hero:before',{rotation:18,xPercent:-10,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});

  document.querySelectorAll('.scene-inner,.end > div').forEach(el => {
    gsap.fromTo(el,{y:45,opacity:0},{y:0,opacity:1,duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 82%',once:true}});
  });
  gsap.utils.toArray('.flow,.system,.roi-grid,.roadmap-line,.scale-line').forEach(group => {
    gsap.from(group.children,{y:28,opacity:0,stagger:.1,duration:.7,ease:'power2.out',scrollTrigger:{trigger:group,start:'top 80%',once:true}});
  });

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
      tl.to('.trolley-frame',{scale:.9,rotation:-1,xPercent:-4,duration:1,ease:'none'})
        .to('.trolley-halo',{scale:1.18,rotation:25,duration:1,ease:'none'},'<')
        .to('.trolley-signal',{xPercent:45,opacity:1,duration:1,ease:'none'},'<')
        .to('.trolley-frame',{yPercent:-5,scale:.96,rotation:1,xPercent:3,duration:1,ease:'none'})
        .to('.trolley-halo',{scale:1.05,rotation:-20,duration:1,ease:'none'},'<')
        .to('.trolley-frame',{yPercent:5,scale:1.02,rotation:-.5,xPercent:-2,duration:1,ease:'none'})
        .to('.trolley-signal',{xPercent:-20,opacity:.35,duration:1,ease:'none'},'<');
      ScrollTrigger.create({trigger:trolleyStory,start:'top top',end:'bottom bottom',onUpdate:self=>setZone(self.progress<.36?0:self.progress<.68?1:2)});
    });
    mm.add('(max-width: 850px)', () => {
      items.forEach((item,index) => {
        gsap.fromTo(item,{x:18,opacity:.25},{x:0,opacity:1,duration:.6,scrollTrigger:{trigger:item,start:'top 80%',end:'bottom 35%',scrub:true,onEnter:()=>setZone(index),onEnterBack:()=>setZone(index)}});
      });
    });
  }

  const signalScene = document.querySelector('.signal-section');
  if (signalScene) {
    const signalTl = gsap.timeline({scrollTrigger:{trigger:signalScene,start:'top 75%',end:'center center',scrub:1}});
    signalTl.from('.signal-canvas .signal-node',{y:18,opacity:0,stagger:.15,duration:.35,ease:'power2.out'})
      .from('.signal-track',{scaleX:0,transformOrigin:'left center',duration:.5,ease:'none'},'<');
    gsap.to('.packet',{left:'90%',ease:'none',scrollTrigger:{trigger:signalScene,start:'top 55%',end:'center center',scrub:1}});
    gsap.to('.packet',{scale:1.8,boxShadow:'0 0 0 12px rgba(217,60,152,.08),0 0 40px rgba(217,60,152,.95)',ease:'none',scrollTrigger:{trigger:signalScene,start:'top 55%',end:'center center',scrub:1}});
    gsap.to('.signal-canvas',{yPercent:-3,ease:'none',scrollTrigger:{trigger:signalScene,start:'top bottom',end:'bottom top',scrub:1}});
    gsap.fromTo('.signal-section .device',{y:80,scale:.94,opacity:0},{y:0,scale:1,opacity:1,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.signal-section .device',start:'top 85%',once:true}});
  }

  const dashboard = document.querySelector('.dashboard');
  if (dashboard) gsap.fromTo(dashboard,{y:70,scale:.94,opacity:0},{y:0,scale:1,opacity:1,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:dashboard,start:'top 82%',once:true}});
  document.querySelectorAll('[data-count]').forEach(el => {
    const target=parseFloat(el.dataset.count),suffix=el.dataset.suffix||'',obj={value:0};
    gsap.to(obj,{value:target,duration:1.5,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 82%',once:true},onUpdate:()=>el.textContent=Math.round(obj.value)+suffix});
  });

  sections.forEach((section,index) => {
    ScrollTrigger.create({
      trigger:section,start:'top center',end:'bottom center',
      onToggle:self=>{if(!self.isActive)return;dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));if(chapter)chapter.textContent=section.dataset.chapter||'';}
    });
  });
  dots.forEach((dot,index)=>dot.addEventListener('click',()=>sections[index]?.scrollIntoView({behavior:'smooth',block:'start'})));

  gsap.to('.pulse',{rotation:360,duration:18,repeat:-1,ease:'none',transformOrigin:'center'});
  gsap.to('.trolley-halo',{rotation:360,duration:30,repeat:-1,ease:'none'});

  window.addEventListener('load',()=>ScrollTrigger.refresh());
})();
