export class RepairProgress {
 constructor(count,duration){this.values=Array(count).fill(0);this.duration=duration;this.index=0;this.running=false;}
 start(){if(this.complete||this.running)return false;this.running=true;return true;}
 stop(){this.running=false;}
 advance(ms){
  if(!this.running||ms<=0)return false;
  const next=this.values[this.index]+ms/this.duration;
  this.values[this.index]=next>=1-1e-9?1:next;
  if(this.values[this.index]<1)return false;
  this.stop();this.index++;return true;
 }
 get complete(){return this.index===this.values.length;}
}
export function screwGeometry(progress,head,surface){
 return {x:head+(surface-head)*progress,shaft:(surface-head)*(1-progress),angle:progress*1260};
}
