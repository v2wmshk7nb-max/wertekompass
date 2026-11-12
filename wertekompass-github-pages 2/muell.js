import {WasteSort,binAt} from './muell-state.js';

const scene=document.querySelector('#muell-scene');
const asset='assets/muell-v2/';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Complete silhouettes are recovered from the reference; the supplied PNG crops cut off the lower edges.
const art={
 papier:{size:[130,110],crop:[281,1102],outline:'M8 75 L18 56 Q12 47 20 39 L29 23 Q34 19 45 20 L51 10 Q61 6 69 4 L81 10 88 15 Q98 9 104 17 L108 34 119 45 119 54 114 64 125 72 116 88 107 99 91 103 79 100 65 106 53 105 45 98 34 99 23 96 14 93Z'},
 verpackung:{size:[160,110],crop:[438,1114],outline:'M4 50 L16 40 23 38 31 29 40 28 48 21 58 19 66 13 78 12 86 3 92 8 99 23 114 28 124 37 135 42 155 54 157 63 151 69 151 75 142 79 137 85 128 87 119 93 111 94 104 99 95 100 85 108 77 105 66 99 54 97 43 88 32 86 26 77 16 69 8 63Z'},
 rest:{size:[176,84]}
};
const openings={papier:[310,705],verpackung:[524,704],rest:[724,704]};
const rims={papier:'M228 728 250 680 397 680 390 729Z',verpackung:'M451 728 458 679 588 679 602 728Z',rest:'M653 726 643 680 766 680 794 726Z'};
let config,model,selected=null,gesture=null,locked=false,emitted=false;
const objects=new Map();
export const wasteSoundFiles={sorted:null,complete:null};
function sound(key){if(wasteSoundFiles[key])new Audio(wasteSoundFiles[key]).play().catch(()=>{});}
function rect(el,x,y,w,h){const {width,height}=config.coordinateSystem;Object.assign(el.style,{left:x/width*100+'%',top:y/height*100+'%',width:w/width*100+'%',height:h/height*100+'%'});}
function point(e){const r=scene.getBoundingClientRect(),{width,height}=config.coordinateSystem;return [(e.clientX-r.left)*width/r.width,(e.clientY-r.top)*height/r.height];}
function delta(dx,dy){const r=scene.getBoundingClientRect(),{width,height}=config.coordinateSystem;return `translate(${dx*r.width/width}px,${dy*r.height/height}px)`;}
function select(id){selected=id;scene.classList.toggle('waste-selected',Boolean(id));for(const [key,o] of objects)o.button.setAttribute('aria-pressed',String(key===id));}
async function animate(el,frames,duration){await el.animate(frames,{duration:reduced.matches?100:duration,easing:'ease-in-out'}).finished;}
async function drop(id,bin){
 if(locked||scene.inert||!id||model.sorted.has(id))return;
 locked=true;
 const o=objects.get(id),start=o.button.style.transform||'translate(0,0)';
 o.button.classList.add('in-flight');
 const correct=model.sort(id,bin);
 if(correct){
  const [x,y]=openings[bin];
  const [ox,oy]=o.initialPosition,[w,h]=o.size;
  const end=delta(x-ox-w/2,y-oy-h/2);
  sound('sorted');
  await animate(o.button,[{transform:start,opacity:1},{transform:end+' scale(.75)',opacity:1,offset:.7},{transform:end+' scale(.15)',opacity:0}],470);
  o.button.hidden=true;
 }else await animate(o.button,[{transform:start},{transform:'translate(0,0)'}],330);
 o.button.style.transform='';o.button.classList.remove('in-flight');select(null);
 if(model.complete&&!emitted){
  emitted=true;scene.classList.add('waste-success');sound('complete');
  await new Promise(resolve=>setTimeout(resolve,900));
  window.dispatchEvent(new CustomEvent('muellCompleted'));
 }else locked=false;
}
function bindObject(o){
 const button=o.button;
 button.addEventListener('pointerdown',e=>{
  if(scene.inert||locked||gesture||e.button!==0)return;
  select(o.id);
  gesture={id:e.pointerId,object:o.id,origin:point(e),moving:false};
  button.setPointerCapture(e.pointerId);
 });
 button.addEventListener('pointermove',e=>{
  if(gesture?.id!==e.pointerId||gesture.object!==o.id)return;
  const [x,y]=point(e),[sx,sy]=gesture.origin;
  if(Math.hypot(x-sx,y-sy)>12)gesture.moving=true;
  if(gesture.moving){button.classList.add('in-flight');button.style.transform=delta(x-sx,y-sy);}
 });
 function end(e){
  if(gesture?.id!==e.pointerId||gesture.object!==o.id)return;
  const {moving}=gesture;gesture=null;
  if(e.type==='pointerup'&&moving)drop(o.id,binAt(binZonesForHit,...point(e)));
  else if(e.type!=='pointerup')drop(o.id,null);
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);
 button.addEventListener('click',e=>{if(e.detail===0&&!locked&&!scene.inert)select(o.id);});
}
const binZonesForHit={};
export const wasteReady=(async()=>{
 const res=await fetch(asset+'muell_konfiguration.json');if(!res.ok)throw new Error('Müll-Positionsdaten fehlen.');
 const data=await res.json();
 config={coordinateSystem:data.coordinateSpace,objects:data.items.map(o=>({
  id:o.id,label:o.id==='papier'?'Zerknülltes Papier':o.label,correctBin:o.target,
  initialPosition:[o.start.x,o.start.y],size:art[o.id].size,hitAreaPadding:22
 }))};
 model=new WasteSort(config.objects);
 const bg=scene.querySelector('.background');bg.src=asset+data.reference;
 const retouch=new Image();retouch.src=asset+data.background;
 await Promise.all([bg.decode(),retouch.decode()]);
 const floor=scene.querySelector('.waste-floor');
 // Use the untouched reference outside the three floor patches. Feather the
 // useful areas of the supplied retouch, excluding the duplicated paving strip.
 floor.innerHTML=`<defs>
 <filter id="waste-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
 <mask id="waste-clean-patches" maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402">
 <path filter="url(#waste-feather)" fill="white" d="M280 1132 Q303 1099 351 1095 Q406 1102 416 1145 L428 1201 Q406 1225 342 1222 Q289 1221 262 1206Z M442 1135 Q478 1108 528 1107 Q556 1127 590 1148 L609 1189 Q609 1226 562 1235 L487 1235 Q442 1220 424 1198Z M617 1164 Q641 1140 658 1100 Q689 1089 711 1106 Q728 1135 746 1158 L792 1174 Q812 1195 807 1215 L762 1225 681 1235 Q638 1240 601 1224 Q595 1189 617 1164Z"/>
 </mask>
 <mask id="waste-small-patch" maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402"><path filter="url(#waste-feather)" fill="white" d="M624 1092 Q654 1089 694 1098 L699 1116 Q673 1128 625 1119Z"/></mask>
 <mask id="waste-leaf-fix" maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402"><path filter="url(#waste-feather)" fill="white" d="M253 1126 Q323 1115 386 1136 L395 1200 Q391 1229 321 1228 L239 1222 230 1191Z"/></mask>
 <mask id="waste-wrapper-fix" maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402"><ellipse filter="url(#waste-feather)" fill="white" cx="524" cy="1215" rx="57" ry="25"/></mask>
 <mask id="waste-peel-fix" maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402"><path filter="url(#waste-feather)" fill="white" d="M628 1189 Q662 1180 710 1195 L712 1227 Q684 1240 634 1232 Q619 1214 628 1189Z"/></mask>
 </defs>
 <image href="${retouch.src}" width="1122" height="1402" mask="url(#waste-clean-patches)"/>
 <g mask="url(#waste-small-patch)"><image href="${bg.src}" x="81" y="4" width="1122" height="1402"/></g>
 <g mask="url(#waste-leaf-fix)"><image href="${bg.src}" x="-152" y="-124" width="1122" height="1402"/></g>
 <g mask="url(#waste-wrapper-fix)"><image href="${bg.src}" y="-106" width="1122" height="1402"/></g>
 <g mask="url(#waste-peel-fix)"><image href="${bg.src}" x="-58" y="-55" width="1122" height="1402"/></g>
 <g class="waste-rims" fill="none" stroke="#fff0ab" stroke-width="5" stroke-linejoin="round">${Object.values(rims).map(d=>`<path d="${d}"/>`).join('')}</g>`;
 for(const b of data.bins){
  const bin=document.createElement('button');bin.type='button';bin.className='waste-bin';bin.setAttribute('aria-label',b.id==='rest'?'Restmüll':b.name);
  const {x,y,width,height}=b.region;
  const l=b.id==='verpackung'?420:b.id==='rest'?625:x;
  const r=b.id==='papier'?420:b.id==='verpackung'?625:x+width;
  rect(bin,l,y,r-l,height);scene.append(bin);
  binZonesForHit[b.id]={targetCenter:openings[b.id],dropRect:[l,y,r,y+height]};
  bin.addEventListener('click',()=>{if(!gesture)drop(selected,b.id);});
 }
 await Promise.all(data.items.map(async o=>{
  const image=new Image();image.src=asset+(o.id==='rest'?'kugelschreiber-spiel.svg':o.asset);await image.decode();
 }));
 for(const o of config.objects){
  const button=document.createElement('button');button.type='button';button.className='waste-object';button.setAttribute('aria-label',o.label);button.setAttribute('aria-pressed','false');
  const [x,y]=o.initialPosition,[w,h]=o.size,p=o.hitAreaPadding;
  rect(button,x-p,y-p,w+2*p,h+2*p);
  const shape=art[o.id];
  const contents=shape.crop
   ? `<defs><clipPath id="waste-cut-${o.id}"><path d="${shape.outline}"/></clipPath></defs><image href="${bg.src}" x="${-shape.crop[0]}" y="${-shape.crop[1]}" width="1122" height="1402" clip-path="url(#waste-cut-${o.id})"/>`
   : `<image href="${asset}kugelschreiber-spiel.svg" width="${w}" height="${h}"/>`;
  button.innerHTML=`<svg viewBox="${-p} ${-p} ${w+2*p} ${h+2*p}" aria-hidden="true">${contents}</svg>`;
  scene.append(button);const item={...o,button};objects.set(o.id,item);bindObject(item);
 }
 scene.setAttribute('aria-busy','false');
})();
wasteReady.catch(error=>{const alert=scene.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;});
