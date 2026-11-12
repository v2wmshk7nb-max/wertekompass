// Pure pixel engine: each eligible pixel can be claimed exactly once.
export class PaintEngine {
  constructor(width,height,mask,threshold=.8){
    this.width=width;this.height=height;this.mask=mask;this.threshold=threshold;
    this.claimed=new Uint8Array(width*height);this.rgba=new Uint8ClampedArray(width*height*4);
    this.total=0;this.count=0;
    for(const value of mask)if(value>=128)this.total++;
    if(!this.total)throw new Error('Die Malmaske enthält keine Malfläche.');
  }
  get progress(){return this.count/this.total}
  stroke(a,b,color,radius=16){
    const {width:w,height:h}=this;
    const left=Math.max(0,Math.floor(Math.min(a.x,b.x)-radius)),right=Math.min(w-1,Math.ceil(Math.max(a.x,b.x)+radius));
    const top=Math.max(0,Math.floor(Math.min(a.y,b.y)-radius)),bottom=Math.min(h-1,Math.ceil(Math.max(a.y,b.y)+radius));
    const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
    let changed=false;
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const i=y*w+x;if(this.claimed[i]||this.mask[i]<128)continue;
      const t=len?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/len)):0;
      const distance=Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
      if(distance>radius)continue;
      this.claimed[i]=1;this.count++;changed=true;
      const p=i*4;this.rgba[p]=color[0];this.rgba[p+1]=color[1];this.rgba[p+2]=color[2];
      this.rgba[p+3]=Math.round(210*this.mask[i]/255);
    }
    return changed?{left,top,width:right-left+1,height:bottom-top+1}:null;
  }
}
