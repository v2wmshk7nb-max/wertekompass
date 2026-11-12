export const iterations=600000;
const bytes=hex=>Uint8Array.from(hex.match(/../g).map(n=>parseInt(n,16)));
const hex=buffer=>Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');

export async function derive(password,salt,rounds,provider=globalThis.crypto){
 const secret=new TextEncoder().encode(password),saltBytes=bytes(salt);
 if(provider&&provider.subtle){
  const key=await provider.subtle.importKey('raw',secret,'PBKDF2',false,['deriveBits']);
  return hex(await provider.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations:rounds},key,256));
 }
 // Web Crypto key derivation is unavailable on plain HTTP over the school LAN.
 const [{pbkdf2Async},{sha256}]=await Promise.all([import('./vendor/noble/pbkdf2.js'),import('./vendor/noble/sha2.js')]);
 return hex(await pbkdf2Async(sha256,secret,saltBytes,{c:rounds,dkLen:32,asyncTick:16}));
}
export function validCredential(c){
 return c&&c.v===1&&Number.isInteger(c.rounds)&&c.rounds>=100000&&c.rounds<=1000000&&/^[0-9a-f]{32}$/.test(c.salt)&&/^[0-9a-f]{64}$/.test(c.hash);
}
export async function createCredential(password){
 const salt=hex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
 return {v:1,rounds:iterations,salt,hash:await derive(password,salt,iterations)};
}
export async function matches(password,record){
 const actual=await derive(password,record.salt,record.rounds);
 let diff=0;
 for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^record.hash.charCodeAt(i);
 return diff===0;
}
