import {cellAt} from './terrain.mjs';
import {event,clamp} from './events.mjs';
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
  for(const cell of w.cells)if(cell.surfaceType==='soil'&&Math.hypot(cell.x-c.x,cell.z-c.z)<=w.rules.environmentRadius){const next=clamp(cell[field]+w.rules.environmentAmount);changed+=next-cell[field];cell[field]=next;}
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
