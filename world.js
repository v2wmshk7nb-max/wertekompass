import {spielschritt} from './spielsignale.js';
import {installRoundHelp} from './rundenhilfe.js';
import {basketballReady} from './basketball.js';
import {repairReady} from './repair.js';
import {wasteReady} from './muell.js';
import {bankReady} from './app.js';
import {gardenReady} from './garden.js';
import {RoundProgress} from './garden-state.js';
import {plantArt} from './garden-art.js';
const game=document.querySelector('#game'),world=document.querySelector('#world'),camera=document.querySelector('#world-camera');
const activities={
 bank:{scene:document.querySelector('#scene'),entry:document.querySelector('#bench-entry'),zoom:'translate(-35%,-22%) scale(2.8)',label:'Bank fertig gestrichen',ready:bankReady},
 garden:{scene:document.querySelector('#garden-scene'),entry:document.querySelector('#garden-entry'),zoom:'translate(0%,-19%) scale(2.6)',label:'Garten fertig bepflanzt',ready:gardenReady},
 muell:{scene:document.querySelector('#muell-scene'),entry:document.querySelector('#muell-entry'),zoom:'translate(33%,-25%) scale(2.6)',label:'Müll fertig sortiert',ready:wasteReady},
 repair:{scene:document.querySelector('#repair-scene'),entry:document.querySelector('#repair-entry'),zoom:'translate(-37%,5%) scale(2.6)',label:'Spielgerät fertig repariert',ready:repairReady},
 basketball:{scene:document.querySelector('#basketball-scene'),entry:document.querySelector('#basketball-entry'),zoom:'translate(-33%,32%) scale(2.6)',label:'Basketballkorb getroffen',ready:basketballReady}
};
const fit=()=>game.style.setProperty('--stage-height',`${game.clientHeight}px`);
new ResizeObserver(fit).observe(game);fit();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const round=new RoundProgress();
let view='start',current=null;
const help=installRoundHelp(game);
function state(next){
 view=next;game.dataset.view=next;
 for(const [id,item]of Object.entries(activities)){const enabled=next===id;item.scene.inert=!enabled;item.scene.setAttribute('aria-hidden',String(!enabled));}
 world.inert=next!=='world';world.setAttribute('aria-hidden',String(next!=='world'));
}
const ease='cubic-bezier(.42,0,.58,1)';
async function animate(element,keyframes,duration,delay=0){
 const animation=element.animate(keyframes,{duration:reduced.matches?180:duration,delay:reduced.matches?0:delay,easing:ease,fill:'both'});
 await animation.finished;
 for(const [property,value]of Object.entries(keyframes[keyframes.length-1]))element.style[property]=value;
 animation.cancel();
}
const startScreen=document.querySelector('#start-screen'),startButton=document.querySelector('#start-button');
startButton.addEventListener('click',()=>{
 if(view!=='start')return;
 const keyboard=document.activeElement===startButton&&startButton.matches(':focus-visible');
 // Paint-only fade: never depend on an animation callback to unlock the hit targets.
 startScreen.inert=true;
 startScreen.classList.add('departing');
 help.begin();state('world');
 setTimeout(()=>{startScreen.hidden=true;},reduced.matches?180:480);
 if(keyboard)world.querySelector('button:enabled')?.focus({preventScroll:true});
});
for(const [id,item]of Object.entries(activities)){
 item.ready.then(()=>{item.entry.disabled=round.unlocked;}).catch(()=>{
  item.entry.disabled=round.unlocked;item.failed=true;item.entry.setAttribute('aria-label',item.entry.getAttribute('aria-label')+': Ladefehler anzeigen');
 });
 item.entry.addEventListener('click',async()=>{
  if(view!=='world'||round.unlocked||round.activities.has(id))return;
  spielschritt();current=id;game.dataset.activity=id;camera.style.transformOrigin=id==='bank'?'85% 72%':id==='garden'?'50% 69%':id==='repair'?'87% 45%':id==='basketball'?'83% 18%':'17% 75%';
  state('entering');
  await Promise.all([
   animate(camera,[{transform:'translate(0,0) scale(1)'},{transform:item.zoom}],1200),
   animate(world,[{opacity:1},{opacity:0}],800,400),
   animate(item.scene,[{opacity:0},{opacity:1}],800,400),
   animate(item.scene,[{transform:'scale(.985)'},{transform:'scale(1)'}],2000)
  ]);
  state(id);
  (id==='bank'?document.querySelector('[data-color="rot"]'):id==='garden'?document.querySelector('[data-action="trowel"]'):item.scene.querySelector(id==='repair'?'[data-screw="1"]':id==='basketball'?'.basketball-ball':'.waste-object'))?.focus({preventScroll:true});
 });
 window.addEventListener(id+'Completed',async event=>{
  if(view!==id||current!==id||round.activities.has(id))return;
  const unlocked=round.complete(id);
  if(id==='bank')world.classList.add('finished');else item.entry.classList.add('finished');
  if(id==='garden'){
   document.querySelector('#world-garden-detail').innerHTML=`<g transform="translate(772 766) scale(.48)">${plantArt(event.detail.plant,{bloom:true,prefix:'world-bloom'})}</g>`;
  }
  item.entry.disabled=true;item.entry.setAttribute('aria-label',item.label);item.entry.setAttribute('aria-disabled','true');
  state('returning');
  await Promise.all([animate(item.scene,[{opacity:1},{opacity:0}],800),animate(world,[{opacity:0},{opacity:1}],800)]);
  await animate(camera,[{transform:item.zoom},{transform:'translate(0,0) scale(1)'}],1200);
  current=null;
  world.setAttribute('aria-label','Schulwelt. '+[...round.activities].map(key=>activities[key].label).join('. ')+'.');
  // Only distinct completed scenes count. No board finale/audio is started automatically.
  if(unlocked){
   for(const item of Object.values(activities))item.entry.disabled=true;
   boardEntry.hidden=false;
  }
  state('world');
  if(unlocked)window.dispatchEvent(new CustomEvent('valuesBoardUnlocked'));
 });
}
window.wertekompassRound={get completedActivities(){return [...round.activities]},get boardUnlocked(){return round.unlocked}};


// This project previously exposed only valuesBoardUnlocked. The finale now waits for a tap.
// The supplied recording is played only after an explicit tap on the unlocked board.
export const valuesBoardSettings={question:'Wenn du was an dieser Schule verändern könntest, was wäre das?\n\nMale oder schreibe es auf.',audio:'audio/spur_werteboard.mp3',displayMs:20000};
const boardEntry=document.querySelector('#board-entry'),board=document.querySelector('#values-board');
boardEntry.addEventListener('click',()=>{
 if(view!=='world'||!round.unlocked)return;
 help.suspend();state('board');document.querySelector('#board-question').textContent=valuesBoardSettings.question;
 board.hidden=false;board.setAttribute('tabindex','-1');board.focus({preventScroll:true});
 const audio=document.querySelector('#board-audio');
 let scheduled=false;
 function resetAfter(ms){if(scheduled)return;scheduled=true;setTimeout(()=>location.reload(),ms);}
 if(!valuesBoardSettings.audio){resetAfter(valuesBoardSettings.displayMs);return;}
 audio.src=valuesBoardSettings.audio;
 audio.addEventListener('ended',()=>resetAfter(10000),{once:true});
 audio.addEventListener('error',()=>resetAfter(valuesBoardSettings.displayMs),{once:true});
 audio.play().catch(()=>resetAfter(valuesBoardSettings.displayMs));
});
