import {event,clamp} from './events.mjs';
function addOrganic(w,position,amount){const cells=w.cells.filter(c=>c.surfaceType==='soil'&&Math.hypot(c.x-position.x,c.z-position.z)<=w.rules.compostRadius);for(const c of cells)c.organic+=amount/cells.length;}
export function updateEnvironment(w,dt){
 for(const c of w.cells){if(c.surfaceType==='soil'){c.moisture=clamp(c.moisture+dt*(w.rules.moistureRecovery*(c.baselineMoisture-c.moisture)-w.rules.evaporation),.08,1);const converted=Math.min(c.organic,w.rules.mineralizationRate*dt,1-c.fertility);c.organic-=converted;c.fertility+=converted;}c.activity=Math.max(0,c.activity-dt*w.rules.activityDecay);}
 const expired=new Set();
 for(const r of w.resources){if(r.carrierId!==null)continue;r.age+=dt;if(r.age>=w.rules.fruitDecaySeconds){expired.add(r.id);w.rotted+=r.amount;addOrganic(w,r.position,w.rules.compostPerFruit*r.amount);event(w,'resource.decayed',r.position,{entityId:r.id,actorKind:'environment'});}}
 if(expired.size){w.resources=w.resources.filter(r=>!expired.has(r.id));if(expired.has(w.selectedResourceId))w.selectedResourceId=null;}

 for(const p of w.plants){const c=w.cells[p.cellId],viable=c.moisture>=w.rules.minMoisture&&c.fertility>=w.rules.minFertility;p.blocked=!viable;if(!viable)continue;
  c.fertility=Math.max(0,c.fertility-dt*w.rules.plantFertilityUse);const rate=Math.min(1,c.moisture/.5,c.fertility/.5);
  p.growth=Math.min(1,p.growth+dt*rate/w.rules.growthSeconds);const stage=p.growth<.08?'seed':p.growth<.35?'sprout':p.growth<1?'grow':'mature';
  if(stage!==p.stage){p.stage=stage;event(w,stage==='sprout'?'plant.germinated':'plant.stage_changed',p.position,{entityId:p.id,stage,actorKind:'environment'});}
  if(p.growth===1){p.fruitClock+=dt*rate;if(p.fruitClock>=w.rules.fruitSeconds&&w.resources.length<w.rules.maxResources){p.fruitClock-=w.rules.fruitSeconds;c.fertility=Math.max(0,c.fertility-w.rules.fruitFertilityUse);const resource={id:`resource-${w.nextId++}`,kind:'fruit',amount:1,age:0,position:{...p.position},carrierId:null,originPlantId:p.id,revision:1};w.resources.push(resource);w.produced++;event(w,'resource.produced',p.position,{entityId:resource.id,originPlantId:p.id,actorKind:'environment'});}}
 }
}
