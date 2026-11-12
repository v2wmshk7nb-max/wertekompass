import {activeAt,credentialKey,days,defaults,minutes,readSettings,settingsKey,validSettings} from './betriebszeiten.js';
import {createCredential,matches,validCredential} from './admin-passwort.js';

const station=document.querySelector('#station'),corner=document.querySelector('#admin-ecke');
const panel=document.querySelector('#verwaltung'),auth=document.querySelector('#anmeldung');
const configForm=document.querySelector('#einstellungen'),message=document.querySelector('#meldung');
const password=document.querySelector('#passwort'),confirmation=document.querySelector('#passwort2');
const repeat=document.querySelector('#wiederholung'),authButton=document.querySelector('#auth-button');
const nameInput=document.querySelector('#geraet');
const holdMs=4000,idleMs=120000;
let settings=defaults(),settingsReadable=true,frame=null,mode='closed',epoch=0;
let credential=null,hold=null,idleTimer=0,deadline=0,busy=false,nextAttempt=0,failures=0;

function loadSettings(){
 try{settings=readSettings(localStorage);settingsReadable=true;}
 catch{settingsReadable=false;}
}
function stopGame(){
 if(!frame)return;
 // Removing the browsing context stops all game listeners, timers, animation and audio.
 frame.remove();frame=null;
}
function sync(){
 if(mode!=='closed'||!settingsReadable||!activeAt(settings,new Date())){
  stopGame();document.body.dataset.betrieb=mode!=='closed'?'verwaltung':'ruhe';return;
 }
 document.body.dataset.betrieb='aktiv';
 if(!frame){
  frame=document.createElement('iframe');frame.title='Wertekompass-Spiel';
  frame.src='spiel.html';frame.setAttribute('allow','autoplay');station.appendChild(frame);
 }
}
function cancelHold(){
 if(!hold)return;
 clearTimeout(hold.timer);hold=null;
}
function closeAdmin(){
 epoch++;mode='closed';busy=false;clearTimeout(idleTimer);deadline=0;
 auth.reset();configForm.reset();auth.hidden=true;configForm.hidden=true;panel.hidden=true;
 message.textContent='';authButton.disabled=false;corner.hidden=false;
 loadSettings();sync();
}
function checkIdle(){
 if(mode!=='closed'&&Date.now()>=deadline){closeAdmin();return;}
}
function keepAlive(){
 if(mode==='closed')return;
 deadline=Date.now()+idleMs;clearTimeout(idleTimer);idleTimer=setTimeout(checkIdle,idleMs);
}
function readCredential(){
 const raw=localStorage.getItem(credentialKey);
 if(raw===null)return null;
 const parsed=JSON.parse(raw);if(!validCredential(parsed))throw new Error('Ungültiger Passwortdatensatz');
 return parsed;
}
function openAdmin(){
 if(mode!=='closed')return;
 epoch++;mode='auth';cancelHold();sync();corner.hidden=true;
 panel.hidden=false;auth.hidden=false;auth.reset();message.textContent='';authButton.disabled=false;
 try{credential=readCredential();}
 catch{
  credential=null;repeat.hidden=true;confirmation.required=false;authButton.disabled=true;
  message.textContent='Der lokale Passwortspeicher ist nicht verfügbar oder beschädigt.';keepAlive();return;
 }
 repeat.hidden=Boolean(credential);confirmation.required=!credential;
 password.autocomplete=credential?'current-password':'new-password';
 password.minLength=credential?1:8;
 authButton.textContent=credential?'Entsperren':'Passwort festlegen';
 document.querySelector('#auth-text').textContent=credential?'Bitte das Gerätepasswort eingeben.':'Ersteinrichtung: Ein Gerätepasswort mit mindestens acht Zeichen festlegen.';
 keepAlive();
}
corner.addEventListener('pointerdown',e=>{
 if(mode!=='closed'||hold||!e.isPrimary||e.button!==0)return;
 e.preventDefault();
 const token={id:e.pointerId,x:e.clientX,y:e.clientY,timer:0};hold=token;
 corner.setPointerCapture(e.pointerId);
 token.timer=setTimeout(()=>{if(hold===token&&!document.hidden)openAdmin();},holdMs);
});
corner.addEventListener('pointermove',e=>{
 if(hold&&e.pointerId===hold.id&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>16)cancelHold();
});
for(const event of ['pointerup','pointercancel','lostpointercapture']){
 corner.addEventListener(event,e=>{if(hold&&e.pointerId===hold.id)cancelHold();});
}
corner.addEventListener('contextmenu',e=>e.preventDefault());

const fields=days.map((day,i)=>{
 const row=document.createElement('div');row.className='tag';
 row.innerHTML='<label class="aktiv"><input type="checkbox" id="tag-'+i+'"> '+day+'</label><label>Startzeit<input type="time" id="start-'+i+'" required></label><label>Endzeit<input type="time" id="ende-'+i+'" required></label>';
 document.querySelector('#wochentage').appendChild(row);
 const [enabled,start,end]=row.querySelectorAll('input');
 const refresh=()=>{start.disabled=end.disabled=!enabled.checked;};
 enabled.addEventListener('change',refresh);
 start.addEventListener('input',()=>end.setCustomValidity(''));
 end.addEventListener('input',()=>end.setCustomValidity(''));
 return {enabled,start,end,refresh};
});
function showSettings(){
 mode='settings';auth.reset();auth.hidden=true;configForm.hidden=false;
 nameInput.value=settings.name;
 fields.forEach((f,i)=>{
  const day=settings.days[i];f.enabled.checked=day.enabled;f.start.value=day.start;f.end.value=day.end;f.end.setCustomValidity('');f.refresh();
 });
 message.textContent=settingsReadable?'':'Die gespeicherten Zeiten konnten nicht gelesen werden. Bitte Zeiten neu speichern.';
 keepAlive();
}
auth.addEventListener('submit',async e=>{
 e.preventDefault();if(mode!=='auth'||busy||authButton.disabled)return;
 if(Date.now()<nextAttempt){message.textContent='Bitte kurz warten und erneut versuchen.';return;}
 const secret=password.value;
 if(!credential&&(secret.length<8||secret!==confirmation.value)){
  message.textContent='Die beiden Eingaben müssen übereinstimmen und mindestens acht Zeichen lang sein.';return;
 }
 busy=true;authButton.disabled=true;message.textContent='';keepAlive();
 const attempt=epoch;
 try{
  const newRecord=credential?null:await createCredential(secret);
  const allowed=newRecord?true:await matches(secret,credential);
  if(attempt!==epoch||mode!=='auth')return;
  if(!allowed){
   failures++;nextAttempt=Date.now()+Math.min(30000,1000*2**Math.min(failures,5));
   message.textContent='Passwort stimmt nicht. Bitte erneut versuchen.';password.value='';return;
  }
  if(newRecord)localStorage.setItem(credentialKey,JSON.stringify(newRecord));
  failures=0;nextAttempt=0;showSettings();
 }catch{
  if(attempt===epoch)message.textContent='Das Passwort konnte nicht geprüft oder gespeichert werden.';
 }finally{
  if(attempt===epoch){busy=false;authButton.disabled=false;}
 }
});
configForm.addEventListener('submit',e=>{
 e.preventDefault();if(mode!=='settings')return;
 const next={name:nameInput.value.trim(),days:fields.map(f=>({enabled:f.enabled.checked,start:f.start.value,end:f.end.value}))};
 const invalid=next.days.findIndex(d=>d.enabled&&minutes(d.end)<=minutes(d.start));
 if(invalid!==-1){
  const end=fields[invalid].end;end.setCustomValidity('Die Endzeit muss nach der Startzeit liegen.');end.reportValidity();return;
 }
 if(!validSettings(next)){message.textContent='Bitte für jeden Tag gültige Uhrzeiten eingeben.';return;}
 try{localStorage.setItem(settingsKey,JSON.stringify(next));closeAdmin();}
 catch{message.textContent='Die Einstellungen konnten lokal nicht gespeichert werden.';}
});
for(const button of panel.querySelectorAll('[data-schliessen]'))button.addEventListener('click',closeAdmin);
for(const event of ['pointerdown','keydown','input','scroll'])panel.addEventListener(event,keepAlive,true);
function refresh(){checkIdle();sync();}
window.addEventListener('focus',refresh);
window.addEventListener('blur',cancelHold);
window.addEventListener('pageshow',refresh);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHold();else refresh();});
window.addEventListener('storage',e=>{
 if(e.key===settingsKey||e.key===credentialKey||e.key===null){if(mode!=='closed')closeAdmin();else{loadSettings();sync();}}
});
setInterval(refresh,5000);
loadSettings();sync();
