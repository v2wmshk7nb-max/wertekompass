import {spielschritt} from './spielsignale.js';
import {flightPoint,planShot,smooth} from './basketball-flight.js';

const scene=document.querySelector('#basketball-scene');
const field=scene.querySelector('.basketball-field'),ball=scene.querySelector('.basketball-ball');
const shadow=scene.querySelector('.basketball-shadow'),front=scene.querySelector('.basketball-front');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const asset='assets/basketball/';
const rim='M986 202 Q1009 224 1062 220 Q1114 221 1131 201';
const cords='M997 207 1022 313 1033 317 1092 318 1101 311 1122 208 M1007 212Q1030 268 1087 316 M1023 218Q1045 269 1098 311 M1041 220Q1065 267 1098 292 M1060 221Q1078 253 1106 272 M1080 219Q1093 245 1112 251 M1116 210Q1091 272 1037 316 M1101 216Q1080 271 1023 308 M1083 220Q1063 265 1022 288 M1065 221Q1045 252 1015 267 M1047 220Q1030 244 1009 248';
let config,start,hoop,net,gesture=null,phase='idle',misses=0,version=0;
const effects={};
let occlusion;
export const basketballSounds={
 wurf:'audio/basketball_wurf.mp3',
 aufprall:'audio/basketball_aufprall.mp3',
 treffer:'audio/basketball_treffer.mp3'
};
function sound(key){
 const audio=effects[key];if(!audio)return;
 audio.currentTime=0;audio.play().catch(()=>{});
}
function pct(value,axis){return value/config.referenceSize[axis]*100+'%';}
function position(el,x,y){el.style.left=pct(x,'width');el.style.top=pct(y,'height');}
function setPhase(next){phase=next;scene.dataset.phase=next;}
function render({x,y,scale=1,angle=0}){
 position(ball,x,y);
 if(occlusion){occlusion.setAttribute('cx',x);occlusion.setAttribute('cy',y);occlusion.setAttribute('r',82*scale);}
 ball.style.setProperty('--ball-scale',String(scale));ball.style.setProperty('--ball-angle',angle+'deg');
 position(shadow,x,start.y+58);
 shadow.style.opacity=String(.44*scale*Math.max(.25,1-(start.y-y)/1100));
}
function reset(){
 version++;gesture=null;render(start);scene.classList.remove('basketball-through','basketball-score');
 setPhase('idle');
}
function point(e){
 const r=field.getBoundingClientRect(),{width,height}=config.referenceSize;
 return {x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};
}
function animate(ms,token,draw){
 return new Promise(resolve=>{
  let startTime;
  function frame(now){
   if(token!==version||scene.inert||document.hidden){resolve(false);return;}
   startTime??=now;
   const p=Math.min(1,(now-startTime)/ms);draw(p);
   if(p<1)requestAnimationFrame(frame);else resolve(true);
  }
  requestAnimationFrame(frame);
 });
}
async function throwBall(shot){
 const token=++version;
 setPhase('flight');sound('wurf');
 const end=shot.hit?shot.cross:1;
 if(!await animate(shot.duration*end,token,t=>render(flightPoint(shot,t*end)))){
  if(token===version)reset();return;
 }
 const landed=flightPoint(shot,end);
 if(shot.hit){
  setPhase('net');scene.classList.add('basketball-through');sound('treffer');
  const cleared=await animate(420,token,t=>render({
   x:hoop.x+(net.x-hoop.x)*t,y:hoop.y+(net.y+51-hoop.y)*(.58*t+.42*t*t),
   scale:landed.scale+(0.39-landed.scale)*t,angle:landed.angle+82*t
  }));
  if(!cleared){if(token===version)reset();return;}
  scene.classList.remove('basketball-through');scene.classList.add('basketball-score');
  const floor={x:net.x+29,y:905,scale:.65,angle:landed.angle+240};
  const fell=await animate(540,token,t=>render({
   x:net.x+29*t,y:net.y+51+(floor.y-net.y-51)*(.55*t+.45*t*t),
   scale:.39+.26*t,angle:landed.angle+82+158*t
  }));
  if(!fell){if(token===version)reset();return;}
  setPhase('complete');window.dispatchEvent(new CustomEvent('basketballCompleted'));return;
 }
 sound('aufprall');misses++;scene.classList.toggle('basketball-help',misses>=config.interaction.assistAfterMisses);setPhase('return');
 await animate(620,token,t=>render({
  x:landed.x+(start.x-landed.x)*smooth(t),y:start.y-52*Math.sin(Math.PI*t)*(1-t),
  angle:landed.angle*(1-t)
 }));
 if(token===version){reset();spielschritt();}
}
ball.addEventListener('pointerdown',e=>{
 if(scene.inert||phase!=='idle'||gesture||e.button!==0)return;
 e.preventDefault();gesture={id:e.pointerId,origin:point(e),last:point(e)};
 ball.setPointerCapture(e.pointerId);setPhase('aim');
});
ball.addEventListener('pointermove',e=>{
 if(gesture?.id!==e.pointerId)return;
 e.preventDefault();gesture.last=point(e);
});
ball.addEventListener('pointerup',e=>{
 if(gesture?.id!==e.pointerId)return;
 const {origin}=gesture;gesture=null;const p=point(e);
 const shot=planShot({dx:p.x-origin.x,dy:p.y-origin.y},start,hoop,config.interaction,misses);
 if(shot){spielschritt();throwBall(shot);}else setPhase('idle');
});
for(const event of ['pointercancel','lostpointercapture'])ball.addEventListener(event,e=>{
 if(gesture?.id===e.pointerId)reset();
});
function abort(){if(config&&!['idle','complete'].includes(phase))reset();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)abort();});
window.addEventListener('blur',()=>{if(gesture)abort();});
new MutationObserver(()=>{if(scene.inert)abort();}).observe(scene,{attributes:true,attributeFilter:['inert']});

export const basketballReady=(async()=>{
 const res=await fetch(asset+'basketball_konfiguration.json');if(!res.ok)throw new Error('Basketball-Konfiguration fehlt.');
 config=await res.json();start=config.anchorPoints.ballStartCenter;
 // Aligned with the actual illustrated ring and lower net, rather than the rough anchors.
 hoop={...config.anchorPoints.hoopCenter,x:1058,y:205};net={...config.anchorPoints.hoopNetBottom,x:1061,y:319};
 const background=field.querySelector('.background'),sprite=ball.querySelector('img');
 background.src=asset+config.assets.sceneBackground;sprite.src=asset+config.assets.ball;shadow.src=asset+config.assets.shadow;
 await Promise.all([background.decode(),sprite.decode(),shadow.decode()]);
 field.style.setProperty('--ball-width',pct(config.sprites.ball.width,'width'));
 shadow.style.width=pct(config.sprites.shadow.width,'width');
 front.innerHTML=`<defs><clipPath id="basketball-ball-overlap"><circle/></clipPath></defs><g clip-path="url(#basketball-ball-overlap)"><g class="basketball-net"><path d="${cords}" fill="none" stroke="#825f4a" stroke-width="6" stroke-linejoin="round"/><path d="${cords}" fill="none" stroke="#fff2d3" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></g><path d="${rim}" fill="none" stroke="#a5360e" stroke-width="8" stroke-linecap="round"/><path d="${rim}" fill="none" stroke="#ed6827" stroke-width="4" stroke-linecap="round"/></g>`;
 occlusion=front.querySelector('circle');
 // Optional local assets only. An absent file leaves the action silent.
 for(const [key,url] of Object.entries(basketballSounds))fetch(url,{method:'HEAD'}).then(r=>{if(r.ok)effects[key]=new Audio(url);}).catch(()=>{});
 render(start);scene.setAttribute('aria-busy','false');
})();
basketballReady.catch(error=>{const alert=scene.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;});
