export class WasteSort {
 constructor(objects){this.targets=new Map(objects.map(o=>[o.id,o.correctBin]));this.sorted=new Set();}
 sort(id,bin){
  if(!this.targets.has(id)||this.sorted.has(id)||this.targets.get(id)!==bin)return false;
  this.sorted.add(id);return true;
 }
 get complete(){return this.sorted.size===this.targets.size;}
}
export function binAt(bins,x,y){
 const hits=Object.entries(bins).filter(([,b])=>{
  const [l,t,r,d]=b.dropRect;return x>=l&&x<=r&&y>=t&&y<=d;
 });
 hits.sort(([,a],[,b])=>Math.abs(x-a.targetCenter[0])-Math.abs(x-b.targetCenter[0]));
 return hits[0]?.[0]??null;
}
