import {spielschritt,spielgeste} from './spielsignale.js';
import {PaintEngine} from './engine.js';
const scene=document.querySelector('#scene'),canvas=document.querySelector('#paint'),tools=document.querySelector('#tools'),meter=document.querySelector('#progress');
const ctx=canvas.getContext('2d'),meterCtx=meter.getContext('2d');
let engine,config,bitmap,selected='rot',active=false,pointer=null,last=null,done=false,frame=0,dirty=null,idleTimer,brush,brushArt,dragging=false,grip=null,paintedInDrag=false;
// Optional, local audio only. Missing entries cause no requests.
export const soundFiles={brush:null,complete:null};
function sound(name){if(soundFiles[name]){const audio=new Audio(soundFiles[name]);audio.play().catch(()=>{});}}
function activity(){scene.classList.remove('idle');clearTimeout(idleTimer);if(!done)idleTimer=setTimeout(()=>scene.classList.add('idle'),5000);}
function markTools(){scene.dataset.farbe=String(active);for(const el of tools.children)el.setAttribute('aria-pressed',String(el.dataset.color?el.dataset.color===selected:active));}
function addTool(label,x,y,w,h,color){const button=document.createElement('button');button.type='button';button.className='tool'+(color?'':' brush');button.setAttribute('aria-label',label);button.style.cssText=`left:${x/config.imageWidth*100}%;top:${y/config.imageHeight*100}%;width:${w/config.imageWidth*100}%;height:${h/config.imageHeight*100}%`;if(color)button.dataset.color=color;button.addEventListener('click',()=>{if(done||(!color&&scene.dataset.beweglicherPinsel==='true'))return;const useful=color?(!active||selected!==color):!active;if(color){selected=color;active=true;scene.classList.remove('farbe-noetig');}else active=!active;if(useful)spielschritt();markTools();activity();});tools.append(button);}
function drawMeter(){const c=meterCtx,p=engine.progress;c.clearRect(0,0,320,80);c.lineCap='round';c.shadowColor='#59452655';c.shadowBlur=5;c.fillStyle='#fff1cbdd';c.beginPath();c.roundRect(18,23,284,31,15);c.fill();c.shadowBlur=0;c.strokeStyle='#795d39';c.lineWidth=2;c.stroke();c.strokeStyle='#bba675';c.lineWidth=12;c.beginPath();c.moveTo(34,38);c.lineTo(268,38);c.stroke();if(p>0){c.strokeStyle=config.colors[selected];c.beginPath();c.moveTo(34,38);c.lineTo(34+234*Math.min(1,p/config.completionThreshold),38);c.stroke();}c.strokeStyle='#667d42';c.lineWidth=4;c.beginPath();if(done){c.moveTo(278,37);c.lineTo(283,43);c.lineTo(294,30);}else{c.arc(285,38,7,0,Math.PI*2);}c.stroke();meter.setAttribute('aria-valuenow',String(Math.round(p*100)));meter.setAttribute('aria-valuetext',`${Math.round(p*100)} Prozent gestrichen`);}
function flush(){frame=0;if(dirty){ctx.putImageData(bitmap,0,0,dirty.left,dirty.top,dirty.width,dirty.height);dirty=null;}drawMeter();}
function queue(rect){if(rect){if(!dirty)dirty=rect;else{const x=Math.min(dirty.left,rect.left),y=Math.min(dirty.top,rect.top),r=Math.max(dirty.left+dirty.width,rect.left+rect.width),b=Math.max(dirty.top+dirty.height,rect.top+rect.height);dirty={left:x,top:y,width:r-x,height:b-y};}}if(!frame)frame=requestAnimationFrame(flush);}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
function paint(p){const hex=config.colors[selected],rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16));const stroke=engine.stroke(last||p,p,rgb);queue(stroke);if(stroke){paintedInDrag=true;spielschritt();spielgeste("bank",true);}last=p;if(engine.progress>=config.completionThreshold&&!done){done=true;active=false;spielgeste("bank",false);releaseBrush();clearTimeout(idleTimer);scene.classList.remove('idle');scene.classList.add('completed');markTools();for(const tool of tools.children)tool.disabled=true;queue();setTimeout(()=>{sound('complete');window.dispatchEvent(new CustomEvent('bankCompleted',{detail:{progress:engine.progress,paintedPixels:engine.count,totalPixels:engine.total}}));},1500);}}
// All coordinates are in the original illustration, independent of letterboxing.
const brushBox={x:1124,y:760,w:261,h:134},tip={x:1129,y:834};
function positionBrush(x,y){
 brushArt.style.left=(x/config.imageWidth*100)+'%';
 brushArt.style.top=(y/config.imageHeight*100)+'%';
}
function releaseBrush(){
 if(!dragging)return;
 spielgeste("bank",false);dragging=false;pointer=null;last=null;positionBrush(brushBox.x,brushBox.y);
 scene.classList.remove('pinsel-gezogen');
}
async function installBrush(){
 const patch=new Image();patch.alt='';patch.className='pinsel-retusche';
 patch.src='assets/bank_pinsel_retusche.png';
 brushArt=document.createElement('img');brushArt.className='pinsel-grafik';brushArt.alt='';brushArt.draggable=false;
 brushArt.src='assets/bank_pinsel.svg';brushArt.style.width=(brushBox.w/config.imageWidth*100)+'%';
 await Promise.all([patch.decode(),brushArt.decode()]);
 scene.append(patch,brushArt);positionBrush(brushBox.x,brushBox.y);
 scene.dataset.beweglicherPinsel='true';scene.dataset.pinselBenutzt='false';
 brush.addEventListener('click',()=>{if(!active&&!done)tools.querySelector('[data-color="'+selected+'"]')?.focus({preventScroll:true});});
 brush.addEventListener('pointerdown',e=>{
  if(done||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
  if(!active){scene.classList.add('farbe-noetig');return;}
  e.preventDefault();pointer=e.pointerId;dragging=true;
  const p=point(e);grip={x:p.x-brushBox.x,y:p.y-brushBox.y};
  last=null;paintedInDrag=false;brush.setPointerCapture(pointer);
  scene.classList.add('pinsel-gezogen');scene.dataset.pinselBenutzt='true';spielschritt();sound('brush');
 });
 brush.addEventListener('pointermove',e=>{
  if(!dragging||e.pointerId!==pointer||done)return;
  e.preventDefault();
  const p=point(e),x=p.x-grip.x,y=p.y-grip.y;
  positionBrush(x,y);paint({x:x+tip.x-brushBox.x,y:y+tip.y-brushBox.y});
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])brush.addEventListener(name,e=>{
  if(!dragging||e.pointerId!==pointer)return;
  if(name==='pointerup'&&!done&&last){const p=point(e);paint({x:p.x-grip.x+tip.x-brushBox.x,y:p.y-grip.y+tip.y-brushBox.y});}
  if(paintedInDrag)spielschritt();
  releaseBrush();
 });
}
canvas.addEventListener('pointerdown',e=>{if(!engine||!active||done||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();activity();pointer=e.pointerId;paintedInDrag=false;last=point(e);canvas.setPointerCapture(pointer);sound('brush');paint(last);});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||done)return;e.preventDefault();activity();const coalesced=e.getCoalescedEvents?.();const events=coalesced?.length?coalesced:[e];for(const sample of events){paint(point(sample));if(done)break;}});
function stop(e){if(e.pointerId!==pointer)return;if(e.type==='pointerup'&&!done)paint(point(e));if(paintedInDrag)spielschritt();spielgeste("bank",false);pointer=null;last=null;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,stop);
window.addEventListener('blur',()=>{releaseBrush();spielgeste('bank',false);pointer=null;last=null;});
for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
async function init(){
 const response=await fetch('assets/bank_konfiguration.json');if(!response.ok)throw new Error('Konfiguration fehlt.');config=await response.json();canvas.width=config.imageWidth;canvas.height=config.imageHeight;
 const maskImage=new Image();maskImage.src='assets/'+config.maskFilename;await maskImage.decode();if(maskImage.naturalWidth!==canvas.width||maskImage.naturalHeight!==canvas.height)throw new Error('Die Maskengröße passt nicht zur Illustration.');
 const off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;const oc=off.getContext('2d',{willReadFrequently:true});oc.drawImage(maskImage,0,0);const data=oc.getImageData(0,0,off.width,off.height).data,mask=new Uint8Array(off.width*off.height);for(let i=0;i<mask.length;i++)mask[i]=data[i*4];
 // The supplied approximation misses the actual illustrated screw positions.
 // Retain its exclusions and protect the real screw heads as well.
 const screws=[[471,271,13,14],[1203,271,13,14],[463,366,13,14],[1205,366,13,14],[456,456,13,14],[1213,456,13,14],[441,525,13,7],[1227,525,13,7],[410,569,14,8],[1257,569,14,8]];
 for(const [cx,cy,rx,ry]of screws)for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)mask[y*off.width+x]=0;
 engine=new PaintEngine(canvas.width,canvas.height,mask,config.completionThreshold);bitmap=new ImageData(engine.rgba,canvas.width,canvas.height);
 addTool('Rot',424,702,160,183,'rot');addTool('Gelb',596,702,160,183,'gelb');addTool('Blau',768,702,160,183,'blau');addTool('Grün',938,702,165,183,'gruen');addTool('Pinsel aktivieren',1120,758,270,128);
 brush=tools.querySelector('.brush');
 await installBrush();brush.setAttribute('aria-label','Pinsel aufnehmen');
 markTools();drawMeter();scene.setAttribute('aria-busy','false');activity();
 // Read-only integration status, useful for the later school-world scene.
 window.bankAction={get progress(){return engine.progress},get completed(){return done}};
}
export const bankReady=init();
bankReady.catch(error=>{const el=document.querySelector('#error');el.hidden=false;el.textContent='Die Bankszene konnte nicht geladen werden. Bitte über den lokalen Webserver öffnen. '+error.message;console.error(error);});
