// Gameplay handlers call these only after accepting an input.
const listeners=new Set(),active=new Set();
export function onSpielschritt(listener){listeners.add(listener);}
export function spielschritt(){for(const listener of listeners)listener();}
export function spielgeste(id,running){
 if(running)active.add(id);
 else active.delete(id);
}
export function spielgesteAktiv(){return active.size>0;}
