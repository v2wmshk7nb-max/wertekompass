export const plantTypes=['sunflower','coneflower','marigold'];
export class GardenState {
 constructor(){this.step='trowel';this.digs=0;this.plant=null;this.completed=false;}
 takeTrowel(){if(this.step!=='trowel')return false;this.step='dig';return true;}
 dig(){if(this.step!=='dig')return false;if(++this.digs===2)this.step='choose';return true;}
 choose(plant){if(!['choose','drag'].includes(this.step)||!plantTypes.includes(plant))return false;this.plant=plant;this.step='drag';return true;}
 drop(inside){if(this.step!=='drag'||!inside)return false;this.step='can';return true;}
 takeCan(){if(this.step!=='can')return false;this.step='water';return true;}
 water(){if(this.step!=='water')return false;this.step='watering';return true;}
 grow(){if(this.step!=='watering')return false;this.step='growing';return true;}
 finish(){if(this.step!=='growing'||this.completed)return false;this.completed=true;this.step='complete';return true;}
}
// Only scene completions call this ledger; gardening substeps never do.
export class RoundProgress {
 constructor(){this.activities=new Set();this.unlocked=false;}
 complete(id){if(this.activities.has(id))return false;this.activities.add(id);if(this.activities.size===3&&!this.unlocked){this.unlocked=true;return true;}return false;}
}
