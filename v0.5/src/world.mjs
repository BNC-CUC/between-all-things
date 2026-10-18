// Pure spatial data. No renderer, camera, audio or ecological claims.
export const CELL_SIZE = 1;
export const CELLS = 32;
export const ORIGIN = -16;
export const vertexHeight = (x,z) => .32*Math.sin(x*.24)*Math.cos(z*.19) + .8*Math.exp(-((x+6)**2+(z-3)**2)/45) - .7*Math.exp(-((x-3)**2)/8);
export function cellAt(x,z) {
  const i=Math.floor((x-ORIGIN)/CELL_SIZE), j=Math.floor((z-ORIGIN)/CELL_SIZE);
  return i>=0&&j>=0&&i<CELLS&&j<CELLS ? {i,j,id:j*CELLS+i}:null;
}
export function heightAt(x,z) {
  const cell=cellAt(x,z); if(!cell)return null;
  const x0=ORIGIN+cell.i, z0=ORIGIN+cell.j, u=x-x0, w=z-z0;
  const a=vertexHeight(x0,z0),b=vertexHeight(x0+1,z0),c=vertexHeight(x0,z0+1),d=vertexHeight(x0+1,z0+1);
  return u+w<=1 ? a+(b-a)*u+(c-a)*w : d+(c-d)*(1-u)+(b-d)*(1-w);
}
export function createWorld(){return {schemaVersion:1,markers:[],nextId:1};}
export function placeMarker(world,x,z){const cell=cellAt(x,z); if(!cell)return {accepted:false,reason:'outside'}; const item={id:world.nextId++,position:{x,y:heightAt(x,z),z},cellId:cell.id}; world.markers.push(item); return {accepted:true,item};}

// Experimental balance values; main design has not approved production tuning.
export const RULES = Object.freeze({growthSeconds:24,fruitSeconds:12,minMoisture:.22,minFertility:.16,agentSpeed:1.6,maxResources:160});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function createEcosystem(){
 const world={...createWorld(),time:0,eventSerial:0,events:[],plants:[],resources:[],agents:[],delivered:0,produced:0,selectedResourceId:null,paused:false};
 world.cells=Array.from({length:CELLS*CELLS},(_,id)=>{const i=id%CELLS,j=Math.floor(id/CELLS),x=ORIGIN+i+.5,z=ORIGIN+j+.5,y=heightAt(x,z);return {id,x,z,y,surfaceType:y<-.3?'water':'soil',moisture:clamp(.28+.42*Math.exp(-((x-2)**2)/22)),fertility:clamp(.48+.18*Math.sin(z*.3)),activity:0};});
 world.nest={x:-8,y:heightAt(-8,8),z:8};
 for(let i=0;i<6;i++)world.agents.push({id:`agent-${i}`,position:{...world.nest,x:-8+i*.25},cargoId:null,targetId:null,path:[],decisionIn:0,task:'search'});
 return world;
}
function event(w,type,position,payload={}){w.events.push({entityId:payload.entityId,actorKind:payload.actorKind||'environment',regionId:`region-${Math.floor((position.x-ORIGIN)/8)}-${Math.floor((position.z-ORIGIN)/8)}`,tracked:false,schemaVersion:1,eventId:`event-${++w.eventSerial}`,type,simTime:w.time,position:{...position},payload});if(w.events.length>80)w.events.shift();}
export function command(w,type,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return {accepted:false,reason:'位置无效'};
 const at=cellAt(x,z);if(!at)return {accepted:false,reason:'超出土地范围'};
 const c=w.cells[at.id];if(c.surfaceType==='water')return {accepted:false,reason:'这里是水面，请选择岸地'};
 const position={x:c.x,y:c.y,z:c.z};
 if(type==='sow'){
  if(w.plants.some(p=>p.cellId===c.id))return {accepted:false,reason:'这格已有种子或植物'};
  const plant={id:`plant-${w.nextId++}`,cellId:c.id,position,growth:0,stage:'seed',fruitClock:0,blocked:false};w.plants.push(plant);event(w,'seed.placed',position,{entityId:plant.id,actorKind:'player'});
  return {accepted:true,reason:'种子已入土；水分和肥力将决定生长',entityId:plant.id};
 }
 if(type==='water'||type==='fertilize'){
  const field=type==='water'?'moisture':'fertility';let changed=0;
  for(const cell of w.cells)if(cell.surfaceType==='soil'&&Math.hypot(cell.x-c.x,cell.z-c.z)<=2){const next=clamp(cell[field]+.3);changed+=next-cell[field];cell[field]=next;}
  if(!changed)return {accepted:false,reason:'附近这一项环境条件已充足'};
  event(w,'environment.changed',position,{field,actorKind:'player'});return {accepted:true,reason:type==='water'?'附近土地已浇水':'附近土壤肥力增加'};
 }
 if(type==='move-resource'){
  if(!w.selectedResourceId){
   const nearby=w.resources.filter(r=>r.carrierId===null).sort((a,b)=>Math.hypot(a.position.x-x,a.position.z-z)-Math.hypot(b.position.x-x,b.position.z-z))[0];
   if(!nearby||Math.hypot(nearby.position.x-x,nearby.position.z-z)>1.5)return {accepted:false,reason:'先点击一枚地面金色果实，再点击目标土地'};
   w.selectedResourceId=nearby.id;return {accepted:true,reason:'已选中果实，点击另一处岸地搬放'};
  }
  const resource=w.resources.find(r=>r.id===w.selectedResourceId);w.selectedResourceId=null;
  if(!resource||resource.carrierId!==null)return {accepted:false,reason:'该果实已被搬走，请重新选择'};
  resource.position=position;resource.revision++;event(w,'resource.placed',position,{entityId:resource.id,actorKind:'player'});return {accepted:true,reason:'果实位置已改变，自主生命将重新寻取'};
 }
 return {accepted:false,reason:'未知工具'};
}
// Grid pathfinding uses the same terrain cells as plants and input; water is blocked.
export function findPath(w,from,to){
 const start=cellAt(from.x,from.z),end=cellAt(to.x,to.z);if(!start||!end||w.cells[end.id].surfaceType==='water')return null;
 const open=[start.id],cost=new Map([[start.id,0]]),prev=new Map(),closed=new Set();
 const heuristic=id=>Math.abs(id%CELLS-end.i)+Math.abs(Math.floor(id/CELLS)-end.j);
 while(open.length){open.sort((a,b)=>(cost.get(a)+heuristic(a))-(cost.get(b)+heuristic(b)));const id=open.shift();if(closed.has(id))continue;
  if(id===end.id){const path=[];let n=id;while(n!==start.id){path.push({x:w.cells[n].x,z:w.cells[n].z});n=prev.get(n);}path.reverse();path.push({x:to.x,z:to.z});return path;}
  closed.add(id);const i=id%CELLS,j=Math.floor(id/CELLS);
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=CELLS||nj>=CELLS)continue;const next=nj*CELLS+ni,c=w.cells[next];if(c.surfaceType==='water'||closed.has(next))continue;
   const step=1+Math.abs(c.y-w.cells[id].y)*2,score=cost.get(id)+step;if(score<(cost.get(next)??Infinity)){cost.set(next,score);prev.set(next,id);open.push(next);}}
 }
 return null;
}
export function step(w,dt){
 if(w.paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);w.time+=dt;
 for(const c of w.cells){if(c.surfaceType==='soil')c.moisture=Math.max(.08,c.moisture-dt*.0008);c.activity=Math.max(0,c.activity-dt*.01);}
 for(const p of w.plants){const c=w.cells[p.cellId],viable=c.moisture>=RULES.minMoisture&&c.fertility>=RULES.minFertility;p.blocked=!viable;if(!viable)continue;
  c.fertility=Math.max(0,c.fertility-dt*.0007);const rate=Math.min(1,c.moisture/.5,c.fertility/.5);
  p.growth=Math.min(1,p.growth+dt*rate/RULES.growthSeconds);const stage=p.growth<.08?'seed':p.growth<.35?'sprout':p.growth<1?'grow':'mature';
  if(stage!==p.stage){p.stage=stage;event(w,stage==='sprout'?'plant.germinated':'plant.stage_changed',p.position,{entityId:p.id,stage,actorKind:'environment'});}
  if(p.growth===1){p.fruitClock+=dt*rate;if(p.fruitClock>=RULES.fruitSeconds&&w.resources.length<RULES.maxResources){p.fruitClock-=RULES.fruitSeconds;c.fertility=Math.max(0,c.fertility-.025);const resource={id:`resource-${w.nextId++}`,kind:'fruit',amount:1,position:{...p.position},carrierId:null,originPlantId:p.id,revision:1};w.resources.push(resource);w.produced++;event(w,'resource.produced',p.position,{entityId:resource.id,originPlantId:p.id,actorKind:'environment'});}}
 }
 for(const a of w.agents){a.decisionIn-=dt;
  if(a.decisionIn<=0){a.decisionIn=1;
   if(a.cargoId){a.path=findPath(w,a.position,w.nest)||[];a.task='return';}
   else {a.path=[];a.targetId=null;a.task='search';const candidates=w.resources.filter(r=>r.carrierId===null).sort((x,y)=>Math.hypot(x.position.x-a.position.x,x.position.z-a.position.z)-Math.hypot(y.position.x-a.position.x,y.position.z-a.position.z));
    for(const r of candidates){const path=findPath(w,a.position,r.position);if(path){a.targetId=r.id;a.path=path;a.task='fetch';break;}}
   }
  }
  let movement=RULES.agentSpeed*dt;
  while(a.path.length&&movement>0){const next=a.path[0],dx=next.x-a.position.x,dz=next.z-a.position.z,dist=Math.hypot(dx,dz),travel=Math.min(movement,dist);if(dist>1e-8){a.position.x+=dx/dist*travel;a.position.z+=dz/dist*travel;}movement-=travel;if(dist<=travel+1e-8)a.path.shift();else break;}
  a.position.y=heightAt(a.position.x,a.position.z);const at=cellAt(a.position.x,a.position.z);if(at&&a.task!=='search')w.cells[at.id].activity=clamp(w.cells[at.id].activity+dt*.2);
  if(a.cargoId){const carried=w.resources.find(r=>r.id===a.cargoId);if(carried)carried.position={...a.position};
   if(Math.hypot(a.position.x-w.nest.x,a.position.z-w.nest.z)<.3){w.resources=w.resources.filter(r=>r.id!==a.cargoId);w.delivered++;event(w,'resource.transferred',w.nest,{entityId:a.cargoId,actorKind:'autonomous',destinationKind:'nest'});a.cargoId=null;a.targetId=null;a.path=[];a.decisionIn=0;}}
  else if(a.targetId){const r=w.resources.find(r=>r.id===a.targetId&&r.carrierId===null);if(!r){a.targetId=null;a.path=[];a.decisionIn=0;}else if(Math.hypot(a.position.x-r.position.x,a.position.z-r.position.z)<.3){r.carrierId=a.id;a.cargoId=r.id;a.path=[];a.decisionIn=0;event(w,'resource.picked_up',r.position,{entityId:r.id,actorKind:'autonomous'});}}
 }
}
