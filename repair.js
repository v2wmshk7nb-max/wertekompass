import {spielschritt,spielgeste} from './spielsignale.js';
import {RepairProgress,screwGeometry} from './repair-state.js';

const scene=document.querySelector('#repair-scene'),svg=scene.querySelector('svg');
const trigger=scene.querySelector('[data-trigger]');
const asset='assets/repair/';
let config,model,art=[],rotor,phase='choose',pointer=null,key=null,frame=0,last=0,completed=false,loop;
export const repairSounds={drillLoop:null,screwDone:null};
function sound(name){
 const file=repairSounds[name];if(!file)return;
 const audio=new Audio(file);audio.loop=name==='drillLoop';
 if(audio.loop)loop=audio;audio.play().catch(()=>{});
}
function stop(){
 spielgeste('repair',false);
 if(model?.running)spielschritt();
 model?.stop();cancelAnimationFrame(frame);frame=0;
 if(loop){loop.pause();loop=null;}
 scene.classList.remove('drilling');trigger.setAttribute('aria-pressed','false');
}
function cancel(){stop();pointer=null;key=null;}
function box(el,{x,y,width,height}){
 const {width:w,height:h}=config.artwork;
 Object.assign(el.style,{left:x/w*100+'%',top:y/h*100+'%',width:width/w*100+'%',height:height/h*100+'%'});
}
function draw(index,withChuck=true){
 const o=art[index],p=model.values[index],g=screwGeometry(p,o.x,o.surface);
 const start=g.x+o.radius*.61;
 o.shaft.setAttribute('transform',`translate(${start} ${o.y}) scale(${Math.max(0,o.surface-start)/46} .85)`);
 o.shaft.style.visibility=start>=o.surface?'hidden':'visible';
 o.head.setAttribute('transform',`translate(${g.x} ${o.y}) scale(${o.radius/18*.86} ${o.radius/18})`);
 o.cross.setAttribute('transform',`rotate(${g.angle} 27 35)`);
 if(withChuck){
  // Animate reflected light across the existing chuck, never a second tool.
  const turn=g.angle*Math.PI/180;
  rotor.setAttribute('transform',`translate(0 ${12*Math.sin(turn)})`);
  rotor.style.opacity=String(.25+.48*Math.cos(turn)**2);
 }
}
function setPhase(next){phase=next;scene.dataset.phase=next;}
function choose(index,event){
 if(scene.inert||phase!=='choose'||index!==model.index)return;
 spielschritt();art[index].target.disabled=true;
 setPhase('ready');trigger.disabled=false;
 if(event.detail===0)trigger.focus({preventScroll:true});
}
function tick(now){
 if(!model.running||scene.inert){cancel();return;}
 const i=model.index;
 const done=model.advance(Math.max(0,now-last));last=now;draw(i);
 if(!done){frame=requestAnimationFrame(tick);return;}
 spielschritt();
 const keyboard=key!==null;
 cancel();art[i].head.classList.add('repair-tight');sound('screwDone');trigger.disabled=true;
 setPhase('settling');
 if(model.complete){
  scene.classList.add('repair-success');
  setTimeout(()=>{if(!completed){completed=true;window.dispatchEvent(new CustomEvent('repairCompleted'));}},1100);
 }else setTimeout(()=>{
  if(scene.inert)return;
  setPhase('choose');const next=art[model.index].target;next.disabled=false;
  if(keyboard)next.focus({preventScroll:true});
 },210);
}
function start(){
 if(phase!=='ready'||scene.inert||!model.start())return;
 spielschritt();spielgeste('repair',true);
 last=performance.now();trigger.setAttribute('aria-pressed','true');scene.classList.add('drilling');sound('drillLoop');
 frame=requestAnimationFrame(tick);
}
trigger.addEventListener('pointerdown',e=>{
 if(pointer!==null||e.button!==0||phase!=='ready'||scene.inert)return;
 e.preventDefault();pointer=e.pointerId;trigger.setPointerCapture(pointer);start();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])trigger.addEventListener(name,e=>{if(e.pointerId===pointer)cancel();});
trigger.addEventListener('keydown',e=>{
 if(![' ','Enter'].includes(e.key)||e.repeat)return;
 e.preventDefault();
 key=e.key;start();
});
window.addEventListener('keyup',e=>{if(e.key===key)cancel();});
trigger.addEventListener('blur',()=>{if(key)cancel();});
window.addEventListener('blur',cancel);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
new MutationObserver(()=>{if(scene.inert)cancel();}).observe(scene,{attributes:true,attributeFilter:['inert']});

export const repairReady=(async()=>{
 const res=await fetch(asset+'reparatur_konfiguration.json');if(!res.ok)throw new Error('Reparatur-Konfiguration fehlt.');
 config=await res.json();
 model=new RepairProgress(config.gameplay.requiredScrews,config.gameplay.pressDurationMsPerScrew);
 const bg=scene.querySelector('img');bg.src=asset+config.artwork.cleanWorkingCopy;
 // Retain the supplied screw art, split into its thread and head so both can move independently.
 const sprite=fetch(asset+'schraube_ausgefahren.svg').then(r=>r.text()).then(text=>new DOMParser().parseFromString(text,'image/svg+xml').documentElement);
 const [source]=await Promise.all([sprite,bg.decode()]);
 const pieces=[...source.children],shaft=pieces[1].innerHTML,head=pieces.slice(3).map(x=>x.outerHTML).join('');
 const cleaned=bg.src;
 svg.innerHTML=`<defs>${pieces[0].innerHTML}
 <clipPath id="repair-chuck-clip"><path d="M621 484Q642 481 653 486L662 495V520L652 530L624 533Z"/></clipPath>
 <mask id="repair-grain"><path fill="white" d="M708 487 Q736 477 771 488 L773 521 708 525Z M678 571 Q703 566 765 579 L765 612 679 616Z M671 674 Q720 669 756 682 L754 713 671 717Z" filter="url(#repair-feather)"/></mask>
 <filter id="repair-feather"><feGaussianBlur stdDeviation="4"/></filter></defs>
 <g mask="url(#repair-grain)"><image href="${cleaned}" width="1448" height="1086" x="-27" y="-27"/></g>
 <g id="repair-screws">${config.screws.map(o=>`<g id="${o.id}"><g class="repair-shaft"><g transform="translate(-36 -35)">${shaft}</g></g><g class="repair-head"><g transform="translate(-27 -35)">${head}</g></g></g>`).join('')}</g>
 <g clip-path="url(#repair-chuck-clip)"><g id="repair-rotor" opacity="0"><path d="M620 486Q642 482 662 487 M620 502Q642 497 662 503 M620 518Q642 513 662 519" fill="none" stroke="#efd5b0" stroke-width="3" stroke-linecap="round"/></g></g>`;
 rotor=svg.querySelector('#repair-rotor');
 art=config.screws.map((o,i)=>{
  const root=svg.querySelector('#'+o.id),h=root.querySelector('.repair-head');
  const cross=h.firstElementChild.lastElementChild;
  // Split the Phillips recess from its translated sprite group.
  const spin=document.createElementNS('http://www.w3.org/2000/svg','g');cross.replaceWith(spin);spin.append(cross);
  const [x,y]=o.head_center,target=document.createElement('button');
  target.type='button';target.className='repair-control repair-target';target.dataset.screw=String(i+1);
  target.setAttribute('aria-label',`Schraube ${i+1} auswählen`);
  target.disabled=i!==0;box(target,{x:x-49,y:y-43,width:110,height:86});
  target.addEventListener('click',event=>choose(i,event));scene.append(target);
  return {x,y,surface:o.tip_x,radius:o.head_radius,shaft:root.querySelector('.repair-shaft'),head:h,cross:spin,target};
 });
 art.forEach((_,i)=>draw(i,false));
 box(trigger,{x:config.hitboxes.trigger.x-22,y:config.hitboxes.trigger.y-18,width:132,height:118});
 scene.setAttribute('aria-busy','false');
})();
repairReady.catch(error=>{const alert=scene.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;});
