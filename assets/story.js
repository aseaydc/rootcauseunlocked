/* A local-only, pointer and keyboard accessible story explorer. No input is collected. */
(() => {
  const explorer = document.querySelector('.story-explorer');
  if (!explorer) return;
  const stage = explorer.querySelector('.story-stage');
  const center = explorer.querySelector('.story-center');
  const detail = explorer.querySelector('.story-detail');
  const keyArt = explorer.querySelector('.turning-key');
  const shackle = explorer.querySelector('.lock-shackle');
  let activeTopic = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const topics = {
    energy: { x:102, y:90, title:'Start with your energy.', text:'What does your energy feel like through the day? Notice when it changes and what you would like to discuss.' },
    sleep: { x:398, y:120, title:'Make room for rest.', text:'What would you like your clinician to know about your sleep? Think about your routine and how you feel when you wake up.' },
    digestion: { x:102, y:345, title:'Give digestion a voice.', text:'What questions do you have about meals and digestive comfort? Bring those questions into the conversation.' },
    focus: { x:398, y:355, title:'Consider your focus.', text:'When does concentrating feel easier or harder? Think about the situations you would like to talk through.' }
  };
  const buttons = [...explorer.querySelectorAll('.story-node')];
  const positions = Object.fromEntries(Object.entries(topics).map(([key,t]) => [key,{x:t.x,y:t.y}]));
  let drag = null;
  let suppressClickUntil = 0;
  function paint(key) {
    const p = positions[key];
    const button = buttons.find(b => b.dataset.topic === key);
    button.style.left = `${p.x / 5}%`;
    button.style.top = `${p.y / 4.6}%`;
    explorer.querySelector(`[data-connector="${key}"]`).setAttribute('d', `M250 230 Q${p.x} 230 ${p.x} ${p.y}`);
  }
  function select(key) {
    if (activeTopic === key) return;
    activeTopic = key;
    explorer.dataset.active = key || '';
    explorer.classList.toggle('is-unlocked', !!key);
    center.querySelector('.center-topic').textContent = key ? buttons.find(b=>b.dataset.topic===key).getAttribute('aria-label') : 'Worth exploring.';
    [keyArt,shackle].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
    if (key && !reducedMotion.matches) {
      keyArt.animate([{transform:'translate(16px,12px) rotate(0deg)'},{transform:'translate(0,0) rotate(0deg)',offset:.35},{transform:'translate(0,0) rotate(-65deg)'}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
      shackle.animate([{transform:'translateY(0)'},{transform:'translateY(0)',offset:.55},{transform:'translateY(-20px)'}],{duration:850,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    }
    buttons.forEach(b => { b.dataset.selected = String(b.dataset.topic === key); });
    center.setAttribute('aria-pressed', String(!key));
    explorer.querySelectorAll('[data-connector]').forEach(p => p.classList.toggle('selected', p.dataset.connector === key));
    detail.querySelector('.story-detail-label').textContent = key ? 'A QUESTION TO EXPLORE' : 'A DIFFERENT PERSPECTIVE';
    detail.querySelector('h3').textContent = key ? topics[key].title : 'Every part of your story matters.';
    detail.querySelector('p').textContent = key ? topics[key].text : 'Move over a topic and watch the key turn. Explore a question to bring to your next health conversation.';
  }
  function move(key,x,y) {
    const box = stage.getBoundingClientRect();
    const button = buttons.find(b => b.dataset.topic === key);
    // Clamp by actual button size so cards remain inside the illustration on phones.
    const marginX = (button.offsetWidth / 2 + 5) / box.width * 500;
    const marginY = (button.offsetHeight / 2 + 5) / box.height * 460;
    positions[key] = {x:Math.max(marginX,Math.min(500-marginX,x)),y:Math.max(marginY,Math.min(460-marginY,y))};
    paint(key);
  }
  buttons.forEach(button => {
    const key = button.dataset.topic;
    paint(key);
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!drag)select(key);});
    button.addEventListener('focus',()=>select(key));
    // Native links preserve Enter, touch, open-in-new-tab, and no-JavaScript navigation.
    button.addEventListener('click', event => {
      if (performance.now() <= suppressClickUntil) { event.preventDefault(); return; }
      select(key);
    });
    button.addEventListener('dragstart', event => event.preventDefault());
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      const rect = stage.getBoundingClientRect();
      drag = {key,id:event.pointerId,startX:event.clientX,startY:event.clientY,x:positions[key].x,y:positions[key].y,rect,moved:false};
      button.setPointerCapture(event.pointerId);
      button.classList.add('is-dragging');
      explorer.classList.add('is-dragging');
    });
    button.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || drag.key !== key) return;
      const dx=event.clientX-drag.startX, dy=event.clientY-drag.startY;
      if (Math.hypot(dx,dy)>5) drag.moved=true;
      if (drag.moved) move(key,drag.x+dx/drag.rect.width*500,drag.y+dy/drag.rect.height*460);
    });
    const finish = event => {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.moved) { suppressClickUntil=performance.now()+350; select(key); }
      drag=null;button.classList.remove('is-dragging');explorer.classList.remove('is-dragging');
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    button.addEventListener('pointerup',finish);
    button.addEventListener('pointercancel',finish);
    button.addEventListener('lostpointercapture',finish);
    button.addEventListener('keydown',event => {
      const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if (!deltas[event.key]) return;
      event.preventDefault();const step=event.shiftKey?25:10;const [dx,dy]=deltas[event.key];
      move(key,positions[key].x+dx*step,positions[key].y+dy*step);
    });
  });
  center.addEventListener('click',()=>select(null));
  explorer.querySelector('.story-reset').addEventListener('click',()=> {
    Object.entries(topics).forEach(([key,t])=>move(key,t.x,t.y));select(null);
  });
  reducedMotion.addEventListener('change',()=>[keyArt,shackle].forEach(el=>el.getAnimations().forEach(a=>a.cancel())));
  explorer.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&!drag)select(null);});
  explorer.addEventListener('focusout',event=>{if(!explorer.contains(event.relatedTarget))select(null);});
  new ResizeObserver(()=>Object.entries(positions).forEach(([key,p])=>move(key,p.x,p.y))).observe(stage);
})();
