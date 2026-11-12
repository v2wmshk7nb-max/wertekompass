const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const smooth=t=>t*t*(3-2*t);

export function planShot({dx,dy},start,hoop,interaction,misses=0){
 const length=Math.hypot(dx,dy);
 if(length<interaction.minGesturePxAtReferenceWidth)return null;
 const cap=Math.min(1,interaction.suggestedMaxGesturePxAtReferenceWidth/length);
 dx*=cap;dy*=cap;
 const up=Math.max(0,-dy),height=start.y-hoop.y;
 const assisted=misses>=interaction.maxMissesBeforeGuaranteedAssist;
 const nearAim=up>=85&&Math.abs(dx/up-(hoop.x-start.x)/height)<.30;
 let rise=clamp(130+4.15*up,130,start.y-48);
 if(assisted&&nearAim)rise=Math.max(rise,height+55);
 const range=clamp(dx*6.4,42-start.x,1406-start.x);
 const cross=rise>height?(1+Math.sqrt(1-height/rise))/2:null;
 const tolerance=assisted?155:misses>=interaction.assistAfterMisses?103:69;
 const hit=cross!==null&&up>0&&Math.abs(start.x+range*cross-hoop.x)<=tolerance;
 return {start,hoop,rise,range,cross,hit,duration:clamp(770+length*.98,820,1120),rotation:dx<0?-330:330};
}
export function flightPoint(shot,t){
 const {start,hoop,range,rise,hit,cross}=shot;
 const correction=hit?(hoop.x-start.x-range*cross)*smooth(clamp((t-cross+.23)/.23,0,1)):0;
 return {x:start.x+range*t+correction,y:start.y-4*rise*t*(1-t),angle:shot.rotation*t,scale:1-.60*Math.sin(Math.PI*t)};
}
