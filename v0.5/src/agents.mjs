import {cellAt,heightAt} from './terrain.mjs';
import {event,clamp} from './events.mjs';
import {findPath} from './navigation.mjs';
export function updateAgents(w,dt){
 const required=w.agents.length*w.rules.foodUsePerAgent*dt,used=Math.min(w.nest.food,required);w.nest.food-=used;w.consumed+=used;
 const nourishment=required>0?used/required:1;
 for(const a of w.agents){a.decisionIn-=dt;
  if(a.decisionIn<=0){a.decisionIn=w.rules.decisionSeconds;
   if(a.cargoId){a.path=findPath(w,a.position,w.nest)||[];a.task='return';}
   else {a.path=[];a.targetId=null;a.task='search';const candidates=w.resources.filter(r=>r.carrierId===null).sort((x,y)=>Math.hypot(x.position.x-a.position.x,x.position.z-a.position.z)-Math.hypot(y.position.x-a.position.x,y.position.z-a.position.z));
    for(const r of candidates){const path=findPath(w,a.position,r.position);if(path){a.targetId=r.id;a.path=path;a.task='fetch';break;}}
   }
  }
  const startCell=w.cells[cellAt(a.position.x,a.position.z).id];let movement=w.rules.agentSpeed*dt*(w.rules.lowFoodSpeed+(1-w.rules.lowFoodSpeed)*nourishment)*(1+w.rules.pathSpeedBonus*startCell.activity),moved=0;
  while(a.path.length&&movement>0){const next=a.path[0],dx=next.x-a.position.x,dz=next.z-a.position.z,dist=Math.hypot(dx,dz),travel=Math.min(movement,dist);if(dist>1e-8){a.position.x+=dx/dist*travel;a.position.z+=dz/dist*travel;}movement-=travel;moved+=travel;if(dist<=travel+1e-8)a.path.shift();else break;}
  a.position.y=heightAt(a.position.x,a.position.z);const at=cellAt(a.position.x,a.position.z);if(at&&moved>0)w.cells[at.id].activity=clamp(w.cells[at.id].activity+moved*w.rules.activityGain);
  if(a.cargoId){const carried=w.resources.find(r=>r.id===a.cargoId);if(carried)carried.position={...a.position};
   if(Math.hypot(a.position.x-w.nest.x,a.position.z-w.nest.z)<.3){w.resources=w.resources.filter(r=>r.id!==a.cargoId);w.delivered+=carried.amount;w.nest.food+=carried.amount;event(w,'resource.transferred',w.nest,{entityId:a.cargoId,actorKind:'autonomous',destinationKind:'nest'});a.cargoId=null;a.targetId=null;a.path=[];a.decisionIn=0;}}
  else if(a.targetId){const r=w.resources.find(r=>r.id===a.targetId&&r.carrierId===null);if(!r){a.targetId=null;a.path=[];a.decisionIn=0;}else if(Math.hypot(a.position.x-r.position.x,a.position.z-r.position.z)<.3){r.carrierId=a.id;a.cargoId=r.id;a.path=[];a.decisionIn=0;event(w,'resource.picked_up',r.position,{entityId:r.id,actorKind:'autonomous'});}}
 }
}
