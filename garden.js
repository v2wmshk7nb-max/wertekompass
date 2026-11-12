import {GardenState,plantTypes} from './garden-state.js';
import {plantArt,soilArt} from './garden-art.js';
const scene=document.querySelector('#garden-scene');
const model=new GardenState();
let config,svg,soil,plant,drag,water,digTool,buttons={},pointer=null,position=null,selectedOrigin=null,idleTimer;
const labels={sunflower:'Sonnenblume',coneflower:'Purpur-Sonnenhut',marigold:'Ringelblume'};
const origins={sunflower:[506,835],coneflower:[759,835],marigold:[1007,835]};
const NS='http://www.w3.org/2000/svg';
export const gardenSoundFiles={dig:null,pour:null,grow:null};
function sound(name){if(gardenSoundFiles[name])new Audio(gardenSoundFiles[name]).play().catch(()=>{});}
function diggingMotion(){
 sound('dig');
 digTool.innerHTML='<g transform="translate(873 575) rotate(-32)"><path d="M-8 -92 Q0 -106 8 -92 L6 -31 -6 -31Z" fill="#d99548" stroke="#63452e" stroke-width="3"/><path d="M-6 -35 -17 -11 Q-19 10 0 25 Q20 10 17 -11 L6 -35Z" fill="#c9c6bd" stroke="#5c5047" stroke-width="3"/><path d="M0 -28 0 14" stroke="#efdfcb" stroke-width="3"/></g>';
 const a=digTool.animate([{opacity:0,transform:'translate(8px,-25px)'},{opacity:1,transform:'translate(0,7px)',offset:.4},{opacity:0,transform:'translate(-20px,-15px)'}],{duration:550,easing:'ease-in-out'});
 a.finished.then(()=>{digTool.innerHTML='';});
}
function group(id){const g=document.createElementNS(NS,'g');g.id=id;svg.append(g);return g;}
function local(e){const r=scene.getBoundingClientRect();return{x:(e.clientX-r.left)*config.imageWidth/r.width,y:(e.clientY-r.top)*config.imageHeight/r.height};}
function target(p){return ((p.x-873)/162)**2+((p.y-578)/104)**2<=1;}
function hint(){clearTimeout(idleTimer);scene.classList.remove('garden-idle');if(!model.completed)idleTimer=setTimeout(()=>scene.classList.add('garden-idle'),4000);}
function setButton(id,enabled,relevant){buttons[id].disabled=!enabled;buttons[id].classList.toggle('relevant',relevant);}
function refresh(){
 const step=model.step;
 scene.dataset.step=step;
 setButton('trowel',step==='trowel',step==='trowel');
 setButton('planting_place',['dig','water'].includes(step),['dig','drag','water'].includes(step));
 setButton('watering_can',step==='can',step==='can');
 for(const type of plantTypes){const b=buttons['plant_'+type];b.disabled=!['choose','drag'].includes(step);b.classList.toggle('relevant',step==='choose');b.setAttribute('aria-pressed',String(model.plant===type));}
 soil.innerHTML=soilArt(model.digs);
 if(['can','water','watering','growing','complete'].includes(step)){
  plant.setAttribute('transform','translate(873 587)');
  if(!['growing','complete'].includes(step))plant.innerHTML=plantArt(model.plant,{prefix:'seed'});
  soil.innerHTML+=`<path d="M806 600 Q833 574 869 590 Q907 575 941 598 Q877 619 806 600" fill="#97643b" stroke="#694628" stroke-width="3"/><path d="m827 601 13-5 m53 6 18-6 m-56 10 10-4" stroke="#cb9b66" stroke-width="3"/>`;
 }
 hint();
}
function button(id,area){
 const b=document.createElement('button');b.type='button';b.className='garden-tool';b.setAttribute('aria-label',area.label);b.dataset.action=id;
 let x,y,w,h;
 if(area.type==='rect'){({x,y,w,h}=area);}
 else if(area.type==='ellipse'){x=area.cx-area.rx;y=area.cy-area.ry;w=area.rx*2;h=area.ry*2;}
 else{const xs=area.points.map(p=>p[0]),ys=area.points.map(p=>p[1]);x=Math.min(...xs);y=Math.min(...ys);w=Math.max(...xs)-x;h=Math.max(...ys)-y;}
 // Correct the supplied approximate slots to the actual pots and watering can.
 if(id.startsWith('plant_')){const [cx]=origins[id.slice(6)];x=cx-105;y=738;w=210;h=266;}
 if(id==='planting_place'){x=755;y=478;w=235;h=140;}
 if(id==='watering_can'){x=588;y=260;w=242;h=165;}
 b.style.cssText=`left:${x/1448*100}%;top:${y/1086*100}%;width:${w/1448*100}%;height:${h/1086*100}%`;
 scene.append(b);buttons[id]=b;return b;
}
function choose(type){if(!model.choose(type))return;selectedOrigin=origins[type];refresh();}
async function pour(){
 if(!model.water())return;refresh();sound('pour');
 water.innerHTML=`<g class="moving-can" transform="translate(1010 400) rotate(-28)"><path d="M-28 0 Q-60 -65 -20 -74 Q25 -84 35 -36" fill="none" stroke="#426e29" stroke-width="10"/><path d="M-40 -46 Q0 -59 42 -45 L44 25 Q2 45 -40 24Z" fill="#89b83a" stroke="#355e2a" stroke-width="4"/><path d="M-39 -30 -112 -6 -112 9 -39 1" fill="#a6cb56" stroke="#355e2a" stroke-width="4"/><ellipse cx="-115" cy="1" rx="9" ry="18" fill="#b7d870" stroke="#355e2a" stroke-width="3"/></g><g class="water-stream" fill="none" stroke="#8ed9ec" stroke-width="4" stroke-linecap="round"><path d="M910 463 Q886 496 867 570"/><path d="M915 466 Q903 502 879 574"/><path d="M905 459 Q874 498 854 573"/></g>`;
 soil.style.filter='brightness(.8)';
 await new Promise(r=>setTimeout(r,1200));water.innerHTML='';
 if(!model.grow())return;sound('grow');
 scene.dataset.step=model.step;
 plant.innerHTML=plantArt(model.plant,{bloom:true,prefix:'bloom'});
 const animation=plant.animate([{transform:'translate(873px,587px) scale(.36,.32)'},{transform:'translate(873px,587px) scale(.78,.84)',offset:.65},{transform:'translate(873px,587px) scale(1,1)'}],{duration:2100,easing:'cubic-bezier(.42,0,.58,1)',fill:'both'});
 await animation.finished;plant.style.transform='translate(873px,587px)';animation.cancel();
 if(!model.finish())return;refresh();
 scene.classList.add('garden-success');
 await new Promise(r=>setTimeout(r,1200));
 window.dispatchEvent(new CustomEvent('gardenCompleted',{detail:{plant:model.plant}}));
}
export const gardenReady=(async()=>{
 const response=await fetch('assets/garden/garten_hotspots.json');if(!response.ok)throw new Error('Garten-Konfiguration fehlt.');config=await response.json();
 const bg=scene.querySelector('img');await bg.decode();
 svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${config.imageWidth} ${config.imageHeight}`);svg.classList.add('garden-art');svg.setAttribute('aria-hidden','true');scene.append(svg);
 soil=group('garden-soil');plant=group('garden-plant');drag=group('garden-drag');water=group('garden-water');digTool=group('garden-dig-tool');
 for(const [id,area]of Object.entries(config.interactiveAreas))button(id,area);
 buttons.trowel.addEventListener('click',()=>{if(model.takeTrowel())refresh();});
 buttons.planting_place.addEventListener('click',()=>{if(model.step==='dig'){if(model.dig()){refresh();diggingMotion();soil.animate([{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:350});}}else if(model.step==='water')pour();});
 buttons.watering_can.addEventListener('click',()=>{if(model.takeCan())refresh();});
 for(const type of plantTypes){const b=buttons['plant_'+type];
  b.addEventListener('click',()=>choose(type));
  b.addEventListener('pointerdown',e=>{
   if(scene.inert||pointer!==null||!['choose','drag'].includes(model.step)||(e.pointerType==='mouse'&&e.button!==0))return;
   e.preventDefault();choose(type);pointer=e.pointerId;position=local(e);b.setPointerCapture(pointer);
   drag.innerHTML=plantArt(type,{prefix:'drag'});drag.setAttribute('transform',`translate(${position.x} ${position.y})`);
  });
  b.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();position=local(e);drag.setAttribute('transform',`translate(${position.x} ${position.y})`);buttons.planting_place.classList.toggle('drop-ready',target(position));hint();});
  function stop(e){if(e.pointerId!==pointer)return;const p=local(e);pointer=null;drag.innerHTML='';buttons.planting_place.classList.remove('drop-ready');if(e.type==='pointerup'&&model.drop(target(p)))refresh();else refresh();}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,stop);
 }
 refresh();scene.setAttribute('aria-busy','false');
 window.gardenAction={get step(){return model.step},get plant(){return model.plant},get completed(){return model.completed},get digs(){return model.digs}};
})();
gardenReady.catch(error=>{scene.querySelector('[role="alert"]').hidden=false;scene.querySelector('[role="alert"]').textContent='Die Gartenszene konnte nicht geladen werden. '+error.message;});
