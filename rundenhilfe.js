const select=s=>document.querySelector(s);
const point=(node,x=.5,y=.5)=>{
 const r=node.getBoundingClientRect();
 return {x:r.left+r.width*x,y:r.top+r.height*y,w:r.width,h:r.height};
};
const tap=s=>{const target=select(s);return target&&{target,kind:'tap'};};
const within=(target,x,y,w,h)=>{
 const p=point(target,x,y);return {...p,w:p.w*w,h:p.h*h};
};

function nextStep(view){
 switch(view){
  case 'world': {
   const board=select('#board-entry:not([hidden])');
   if(board)return {target:board,kind:'tap'};
   const entry=select('.world-action:enabled');
   if(!entry)return null;
   return {target:select('[data-cue="'+entry.id.replace(/-entry$/,'')+'"]')||entry,kind:'tap'};
  }
  case 'bank': {
   if(!select('#scene .brush[aria-pressed="true"]'))return tap('#scene [data-color][aria-pressed="true"]:enabled');
   const canvas=select('#paint');
   return {target:canvas,kind:'swipe',area:within(canvas,.50,.29,.18,.075),
    from:point(canvas,.43,.29),to:point(canvas,.57,.29)};
  }
  case 'garden': {
   const step=select('#garden-scene').dataset.step;
   if(step==='drag'){
    const target=select('[data-action^="plant_"][aria-pressed="true"]'),bed=select('[data-action="planting_place"]');
    return target&&bed&&{target,kind:'drag',to:point(bed,.5,.72)};
   }
   return tap({trowel:'[data-action="trowel"]',dig:'[data-action="planting_place"]',
    choose:'.garden-tool[data-action^="plant_"]:enabled',can:'[data-action="watering_can"]',
    water:'[data-action="planting_place"]'}[step]||'#unused-step');
  }
  case 'muell': {
   if(select('.waste-object.in-flight'))return null;
   const picked=select('.waste-object[aria-pressed="true"]:not([hidden])');
   const target=picked||select('.waste-object:not([hidden])');
   if(!target)return null;
   const bin=select('.waste-bin[aria-label="'+({
    'Zerknülltes Papier':'Papier','Snackverpackung':'Verpackungen','Kaputter Kugelschreiber':'Restmüll'
   }[target.getAttribute('aria-label')])+'"]');
   if(!bin)return {target,kind:'tap'};
   return picked?{target:bin,kind:'tap'}:{target,kind:'drag',to:point(bin,.5,.18)};
  }
  case 'repair': {
   const trigger=select('[data-trigger]:enabled');
   return trigger?{target:trigger,kind:'hold'}:tap('[data-screw]:enabled');
  }
  case 'basketball': {
   if(select('#basketball-scene').dataset.phase!=='idle')return null;
   const target=select('.basketball-ball'),field=select('.basketball-field'),from=point(target),r=field.getBoundingClientRect();
   return {target,kind:'swipe',from,to:{x:from.x+105*r.width/1448,y:from.y-175*r.height/1086}};
  }
  default:return null;
 }
}

export function installRoundHelp(game){
 const layer=document.createElement('div');
 layer.id='rundenhilfe';layer.hidden=true;layer.setAttribute('aria-hidden','true');
 layer.innerHTML=`<div class="hilfe-licht"></div><div class="hilfe-zeiger"><svg viewBox="0 0 52 64"><path d="M15 28V9a5 5 0 0 1 10 0v20l3-4c3-2 7 0 7 3 3-3 8-1 8 2 5-1 7 3 7 7v7c0 9-5 14-10 18H20l-9-10L3 36c-3-6 2-10 6-6l6 7Z" fill="#fff5d5" stroke="#76502f" stroke-width="2.5" stroke-linejoin="round"/></svg></div>`;
 document.body.appendChild(layer);
 const light=layer.querySelector('.hilfe-licht'),hand=layer.querySelector('.hilfe-zeiger');
 const pointers=new Set();
 let last=null,phase='',target=null,resetting=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function hide(){layer.hidden=true;delete layer.dataset.stufe;phase='';target=null;}
 function draw(hint,stage){
  if(!hint){hide();return;}
  const p=hint.area||point(hint.target),a=hint.from||p,b=hint.to||a;
  if(p.w<=0||p.h<=0){hide();return;}
  const w=Math.max(28,Math.min(p.w,window.innerWidth*.55)),h=Math.max(26,Math.min(p.h,window.innerHeight*.42));
  light.style.left=(p.x-w/2)+'px';light.style.top=(p.y-h/2)+'px';light.style.width=w+'px';light.style.height=h+'px';
  hand.style.left=a.x+'px';hand.style.top=a.y+'px';
  hand.style.setProperty('--hilfe-x',(b.x-a.x)+'px');hand.style.setProperty('--hilfe-y',(b.y-a.y)+'px');
  const signature=stage+'-'+hint.kind;
  if(phase!==signature||target!==hint.target){
   delete layer.dataset.geste;
   // Restart only when the instruction changes, never on an animation frame.
   if(!reduced.matches)void hand.offsetWidth;
   layer.dataset.geste=hint.kind;phase=signature;target=hint.target;
  }
  layer.dataset.stufe=stage;layer.hidden=false;
 }
 function refresh(){
  const view=game.dataset.view;
  if(last===null||view==='start'||view==='board'||resetting){hide();return;}
  const elapsed=Date.now()-last;
  if(elapsed>=60000){
   resetting=true;hide();window.location.reload();return;
  }
  if(elapsed<15000){hide();return;}
  draw(nextStep(view),elapsed>=30000?'geste':'licht');
 }
 function activity(event){
  if(!event.isTrusted)return;
  if(event.type==='pointerdown')pointers.add(event.pointerId);
  if(event.type==='pointermove'&&!pointers.has(event.pointerId)&&!event.buttons)return;
  if(event.type==='pointerup')pointers.delete(event.pointerId);
  const view=game.dataset.view;
  if(last===null||view==='start'||view==='board'||resetting)return;
  last=Date.now();hide();
 }
 for(const name of ['pointerdown','pointerup','pointermove','keydown','click','wheel']){
  document.addEventListener(name,activity,{capture:true,passive:true});
 }
 document.addEventListener('pointercancel',e=>pointers.delete(e.pointerId),true);
 window.addEventListener('blur',()=>pointers.clear());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(refresh,200);
 return {begin(){last=Date.now();hide();},suspend(){last=null;hide();}};
}
