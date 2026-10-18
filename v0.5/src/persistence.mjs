import {createEcosystem,cellAt,heightAt,CELLS,validateRules} from './world.mjs';
export const SAVE_KEY='between-all-things-riverbend-v2';
export function serialize(w){return JSON.stringify(w);}
export function restore(text){
 if(typeof text!=='string'||text.length>4_000_000)throw new Error('存档过大或格式无效');
 const w=JSON.parse(text),fail=()=>{throw new Error('存档版本或世界数据不匹配，原记录未覆盖');};
 if(!w||w.schemaVersion!==2||!w.rules)fail();w.rules=validateRules(w.rules);
 const finite=(n,min=0,max=Infinity)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 const position=p=>p&&finite(p.x,-16,15.999999)&&finite(p.z,-16,15.999999)&&finite(p.y,-10,10);
 for(const k of ['time','eventSerial','nextId','consumed','rotted','produced','delivered'])if(!finite(w[k]))fail();
 if(!Number.isInteger(w.nextId)||typeof w.paused!=='boolean'||!Array.isArray(w.events)||w.events.length>80)fail();
 const baseline=createEcosystem(w.rules);if(JSON.stringify(w.grid)!==JSON.stringify(baseline.grid))fail();
 if(!Array.isArray(w.cells)||w.cells.length!==CELLS*CELLS)fail();
 w.cells.forEach((c,i)=>{const b=baseline.cells[i];if(c.id!==i||c.x!==b.x||c.z!==b.z||c.y!==b.y||c.surfaceType!==b.surfaceType||c.baselineMoisture!==b.baselineMoisture)fail();for(const k of ['moisture','fertility','activity'])if(!finite(c[k],0,1))fail();if(!finite(c.organic,0,1000))fail();});
 if(!w.nest||w.nest.x!==baseline.nest.x||w.nest.z!==baseline.nest.z||w.nest.y!==baseline.nest.y||!finite(w.nest.food))fail();
 if(!Array.isArray(w.plants)||w.plants.length>CELLS*CELLS||!Array.isArray(w.resources)||w.resources.length>w.rules.maxResources||!Array.isArray(w.agents)||w.agents.length!==w.rules.agentCount)fail();
 const ids=new Set(),unique=id=>{if(typeof id!=='string'||id.length>80||ids.has(id))fail();ids.add(id);};const occupied=new Set();
 for(const p of w.plants){unique(p.id);if(!position(p.position)||!Number.isInteger(p.cellId)||cellAt(p.position.x,p.position.z)?.id!==p.cellId||occupied.has(p.cellId)||!finite(p.growth,0,1)||!finite(p.fruitClock)||!['seed','sprout','grow','mature'].includes(p.stage)||typeof p.blocked!=='boolean')fail();occupied.add(p.cellId);}
 for(const r of w.resources){unique(r.id);if(!position(r.position)||r.kind!=='fruit'||r.amount!==1||!finite(r.age)||!Number.isInteger(r.revision)||r.revision<1||(r.carrierId!==null&&typeof r.carrierId!=='string'))fail();}
 for(const a of w.agents){unique(a.id);if(!position(a.position)||!finite(a.decisionIn,-1,1e6)||!['search','fetch','return'].includes(a.task)||!Array.isArray(a.path)||a.path.length>2048)fail();for(const p of a.path)if(!finite(p.x,-16,15.999999)||!finite(p.z,-16,15.999999))fail();if(a.cargoId!==null&&!w.resources.some(r=>r.id===a.cargoId&&r.carrierId===a.id))fail();}
 for(const r of w.resources)if(r.carrierId!==null&&!w.agents.some(a=>a.id===r.carrierId&&a.cargoId===r.id))fail();
 const balance=w.rules.initialFood+w.produced-w.resources.reduce((n,r)=>n+r.amount,0)-w.nest.food-w.consumed-w.rotted;if(Math.abs(balance)>1e-5)fail();
 if([...ids].some(id=>/^(plant|resource)-\d+$/.test(id)&&Number(id.split('-')[1])>=w.nextId))fail();
 w.selectedResourceId=null;w.events=[];return w;
}
