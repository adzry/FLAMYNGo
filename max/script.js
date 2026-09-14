(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('[data-scene]')];
  const dots = [...document.querySelectorAll('.progress i')];
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('on'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  gsap.timeline({defaults:{ease:'power3.out'}})
    .from('.hero-copy .eyebrow',{y:20,opacity:0,duration:.7})
    .from('.hero h1',{y:70,opacity:0,duration:1.05},'-=.35')
    .from('.hero-copy .sub',{y:24,opacity:0,duration:.7},'-=.55')
    .from('.hero-copy .meta',{y:18,opacity:0,duration:.55},'-=.45')
    .from('.preview',{x:70,opacity:0,scale:.96,duration:1.1},'-=1');

  gsap.to('.hero .preview-frame img',{yPercent:7,scale:1.08,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  gsap.to('.hero .signal',{xPercent:35,opacity:.15,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});

  document.querySelectorAll('.scene-inner,.end > div').forEach(el=>gsap.fromTo(el,{y:45,opacity:0},{y:0,opacity:1,duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 82%',once:true}}));
  gsap.utils.toArray('.flow,.system').forEach(group=>gsap.from(group.children,{y:28,opacity:0,stagger:.1,duration:.7,ease:'power2.out',scrollTrigger:{trigger:group,start:'top 80%',once:true}}));

  // MAX V2: the trolley stays pinned while scroll progress moves through three physical zones.
  const trolleyStory=document.querySelector('.trolley-story');
  if(trolleyStory){
    const items=gsap.utils.toArray('.zone-item');
    const descriptions=[
      'Oral solids and return medications get a dedicated, easy-to-read physical zone.',
      'IV and injection stock is separated into protected compartments to reduce mix-ups and breakage risk.',
      'Liquids, cold-chain items and heavier stock have a dedicated lower zone for practical handling.'
    ];
    const tl=gsap.timeline({scrollTrigger:{trigger:trolleyStory,start:'top top',end:'bottom bottom',pin:'.trolley-pin',scrub:1,anticipatePin:1}});
    tl.to('.trolley-frame',{scale:.9,rotation:-1,xPercent:-4,duration:1,ease:'none'})
      .to('.trolley-halo',{scale:1.18,rotation:25,duration:1,ease:'none'},'<')
      .to('.trolley-signal',{xPercent:45,opacity:1,duration:1,ease:'none'},'<')
      .addLabel('zone2')
      .to('.zone-item',{opacity:.35,transform:'translateX(0)',duration:.15,ease:'none'})
      .to(items[0],{opacity:.35,duration:.2,ease:'none'},'<')
      .to(items[1],{opacity:1,x:8,duration:.25,ease:'none'})
      .call(()=>setZone(1),null,'<')
      .to('.trolley-frame',{yPercent:-5,scale:.96,rotation:1,xPercent:3,duration:1,ease:'none'})
      .to('.trolley-halo',{scale:1.05,rotation:-20,duration:1,ease:'none'},'<')
      .addLabel('zone3')
      .to(items[1],{opacity:.35,x:0,duration:.2,ease:'none'})
      .to(items[2],{opacity:1,x:8,duration:.25,ease:'none'})
      .call(()=>setZone(2),null,'<')
      .to('.trolley-frame',{yPercent:5,scale:1.02,rotation:-.5,xPercent:-2,duration:1,ease:'none'})
      .to('.trolley-signal',{xPercent:-20,opacity:.35,duration:1,ease:'none'},'<');

    function setZone(index){
      items.forEach((item,i)=>item.classList.toggle('active',i===index));
      const copy=document.querySelector('#trolley-description');
      if(copy) copy.textContent=descriptions[index];
    }
  }

  const signalScene=document.querySelector('.signal-section');
  if(signalScene){
    gsap.to('.signal-stage .device',{yPercent:-7,scale:1.035,ease:'none',scrollTrigger:{trigger:signalScene,start:'top bottom',end:'bottom top',scrub:1}});
    gsap.to('.scan-ring',{scale:2.4,opacity:0,ease:'none',scrollTrigger:{trigger:signalScene,start:'top 75%',end:'center center',scrub:1}});
    gsap.from('.scan-line',{xPercent:-70,opacity:0,ease:'none',scrollTrigger:{trigger:signalScene,start:'top 75%',end:'center center',scrub:1}});
  }

  const dashboard=document.querySelector('.dashboard');
  if(dashboard) gsap.fromTo(dashboard,{y:70,scale:.94,opacity:0},{y:0,scale:1,opacity:1,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:dashboard,start:'top 82%',once:true}});

  document.querySelectorAll('[data-count]').forEach(el=>{
    const target=parseFloat(el.dataset.count),suffix=el.dataset.suffix||'',obj={value:0};
    gsap.to(obj,{value:target,duration:1.5,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 82%',once:true},onUpdate:()=>el.textContent=Math.round(obj.value)+suffix});
  });

  sections.forEach((section,index)=>ScrollTrigger.create({trigger:section,start:'top center',end:'bottom center',onToggle:self=>{if(self.isActive)dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));}}));
  dots.forEach((dot,index)=>dot.addEventListener('click',()=>sections[index]?.scrollIntoView({behavior:'smooth',block:'start'})));
  window.addEventListener('load',()=>ScrollTrigger.refresh());
})();
