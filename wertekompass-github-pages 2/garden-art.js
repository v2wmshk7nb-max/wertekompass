// Hand-drawn SVG overlays: the supplied flat scene has no separate sprites.
// All paths are local artwork, with no external image/icon dependencies.
export function plantArt(type,{bloom=false,prefix='plant'}={}){
 const petals=type==='coneflower'?'#e869a1':type==='marigold'?'#ffae25':'#f8cc38';
 const outline='#574324';
 let flower='';
 if(bloom){
  if(type==='coneflower'){
   flower=Array.from({length:11},(_,i)=>`<path d="M0 -138 Q${(i-5)*7} -139 ${(i-5)*9} -105 Q${(i-5)*10+9} -95 ${(i-5)*8+9} -123 Q10 -144 0 -138" fill="${i%2?'#db518e':petals}" stroke="#943c66" stroke-width="1.3"/>`).join('')+'<path d="M-17 -137 Q-12 -162 2 -160 Q17 -158 19 -138 Q1 -127 -17 -137" fill="#93502c" stroke="#593a25" stroke-width="2"/><path d="M-10 -143 L-6 -149 M0 -141 L3 -153 M9 -141 L11 -149" stroke="#d4914f" stroke-width="2"/>';
  }else{
   const n=type==='marigold'?20:15;
   flower=Array.from({length:n},(_,i)=>`<ellipse cx="0" cy="-166" rx="${type==='marigold'?10:8}" ry="${type==='marigold'?20:25}" transform="rotate(${i*360/n} 0 -139)" fill="${i%2?petals:type==='marigold'?'#ed8520':'#ffe766'}" stroke="${type==='marigold'?'#bd6b22':'#bf9329'}" stroke-width="1.4"/>`).join('');
   if(type==='marigold')flower+=Array.from({length:12},(_,i)=>`<ellipse cx="0" cy="-153" rx="7" ry="12" transform="rotate(${i*30} 0 -139)" fill="#ffc94b" stroke="#d98c27"/>`).join('');
   flower+=`<ellipse cy="-139" rx="${type==='marigold'?11:23}" ry="${type==='marigold'?9:21}" fill="${type==='marigold'?'#d89223':'#7c4c28'}" stroke="${outline}" stroke-width="2"/>`;
   if(type==='sunflower')flower+=Array.from({length:17},(_,i)=>`<circle cx="${Math.cos(i*2.4)*Math.sqrt(i)*4}" cy="${-139+Math.sin(i*2.4)*Math.sqrt(i)*3.5}" r="1.5" fill="#d7a356"/>`).join('');
  }
 }
 const height=bloom?139:58;
 return `<defs><linearGradient id="${prefix}-leaf" x2=".8" y2="1"><stop stop-color="#9ac644"/><stop offset=".5" stop-color="#6ca32d"/><stop offset="1" stop-color="#356c31"/></linearGradient></defs>
 <g stroke="${outline}" stroke-linejoin="round" stroke-linecap="round"><path d="M0 0 Q-4 -${height*.5} 0 -${height}" fill="none" stroke="#3f6630" stroke-width="8"/><path d="M-1 -2 Q2 -${height*.5} 1 -${height}" fill="none" stroke="#a0b94a" stroke-width="3"/>
 <path d="M-1 -27 Q-43 -28 -56 -58 Q-19 -65 -1 -27Z" fill="url(#${prefix}-leaf)" stroke-width="2.3"/><path d="M0 -41 Q24 -77 55 -72 Q48 -41 0 -41Z" fill="url(#${prefix}-leaf)" stroke-width="2.3"/><path d="M-4 -29 -45 -53 M3 -44 44 -66" fill="none" stroke="#d2d878" stroke-width="1.7"/>
 ${bloom?'<path d="M0 -83 Q-34 -80 -36 -110 Q-10 -113 0 -83Z" fill="#6e9d35" stroke-width="2"/><path d="M1 -98 Q23 -123 39 -111 Q31 -89 1 -98Z" fill="#82ae3c" stroke-width="2"/>':''}
 ${flower}</g>`;
}
export function soilArt(digs){
 if(!digs)return '';
 return `<ellipse cx="873" cy="588" rx="${digs===1?58:83}" ry="${digs===1?16:24}" fill="#523324" stroke="#9d7046" stroke-width="4"/><ellipse cx="872" cy="584" rx="${digs===1?44:69}" ry="${digs===1?10:17}" fill="#38281e"/><path d="M790 601 Q811 584 826 601 M908 603 Q933 582 948 596" fill="#976037" stroke="#674124" stroke-width="3"/><g fill="#bd8851" stroke="#65472e" stroke-width="2"><ellipse cx="806" cy="597" rx="11" ry="6"/><ellipse cx="928" cy="598" rx="13" ry="7"/><ellipse cx="840" cy="611" rx="9" ry="4"/></g>`;
}
