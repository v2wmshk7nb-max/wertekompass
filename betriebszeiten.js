export const days=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
export const settingsKey='wertekompass.geraet.v1';
export const credentialKey='wertekompass.admin.v1';

export function defaults(){
 return {name:'',enabled:false,days:days.map((_,i)=>({enabled:i<5,start:'07:30',end:'12:30'}))};
}
export function minutes(time){
 if(typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return NaN;
 return Number(time.slice(0,2))*60+Number(time.slice(3));
}
export function validSettings(value){
 return value&&(value.enabled===undefined||typeof value.enabled==='boolean')&&typeof value.name==='string'&&value.name.length<=80&&Array.isArray(value.days)&&value.days.length===7&&value.days.every(
  d=>d&&typeof d.enabled==='boolean'&&Number.isFinite(minutes(d.start))&&Number.isFinite(minutes(d.end))&&(!d.enabled||minutes(d.start)<minutes(d.end))
 );
}
export function activeAt(settings,date){
 if(settings.enabled===false)return true;
 const day=settings.days[(date.getDay()+6)%7],now=date.getHours()*60+date.getMinutes();
 return day.enabled&&now>=minutes(day.start)&&now<minutes(day.end);
}
export function readSettings(storage){
 const raw=storage.getItem(settingsKey);
 if(raw===null)return defaults();
 const parsed=JSON.parse(raw);
 if(!validSettings(parsed))throw new Error('Ungültige Gerätezeiten');
 // Saved schedules predating the switch were always enforced.
 return {...parsed,enabled:parsed.enabled===undefined?true:parsed.enabled};
}
