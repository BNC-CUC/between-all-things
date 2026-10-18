import assert from 'node:assert/strict';import * as T from 'three';import {heightAt,vertexHeight,cellAt,createWorld,placeMarker} from '../src/world.mjs';
assert.equal(cellAt(16,0),null);assert.equal(cellAt(-16,-16).id,0);
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,vertexHeight(0,0),0,0,vertexHeight(0,1),1,1,vertexHeight(1,0),0],3));
const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();const destination=new T.Vector3(.2,heightAt(.2,.3),.3);
const world=createWorld();assert.equal(placeMarker(world,99,0).accepted,false);assert.equal(world.markers.length,0);assert.equal(placeMarker(world,.2,.3).accepted,true);const before=JSON.stringify(world);
for(const pos of [[5,8,7],[-7,10,-5],[0,15,0]]){const c=new T.PerspectiveCamera(35,1,.1,100);c.position.set(...pos);c.lookAt(destination);c.updateMatrixWorld();const ndc=destination.clone().project(c),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(ndc.x,ndc.y),c);const h=ray.intersectObject(mesh)[0];assert(h);assert(h.point.distanceTo(destination)<1e-6);}
assert.equal(JSON.stringify(world),before);console.log('Pure spatial checks passed: bounds, rejected operation, triangle height, multi-angle ray hit, camera/world separation. No browser/gameplay.');

const {createEcosystem,command,step,findPath}=await import('../src/world.mjs');
const wet=createEcosystem(),dry=createEcosystem();
for(const w of [wet,dry])assert(command(w,'sow',-7,6).accepted);
wet.cells[wet.plants[0].cellId].moisture=.9;wet.cells[wet.plants[0].cellId].fertility=.9;
dry.cells[dry.plants[0].cellId].moisture=.05;
for(let i=0;i<30*150;i++){step(wet,1/30);step(dry,1/30);}
assert.equal(dry.plants[0].growth,0);assert.equal(dry.produced,0);
assert.equal(wet.plants[0].growth,1);assert(wet.produced>0);assert(wet.delivered>0);
assert.equal(wet.produced,wet.resources.length+wet.delivered);
assert.equal(new Set(wet.agents.map(a=>a.cargoId).filter(Boolean)).size,wet.agents.filter(a=>a.cargoId).length);
for(const a of wet.agents)if(a.cargoId)assert.equal(wet.resources.find(r=>r.id===a.cargoId).carrierId,a.id);
const frozen=JSON.stringify(wet);assert.equal(command(wet,'sow',-7,6).accepted,false);assert.equal(JSON.stringify(wet),frozen);
assert.equal(command(wet,'sow',NaN,0).accepted,false);
wet.paused=true;const paused=JSON.stringify(wet);step(wet,1/30);assert.equal(JSON.stringify(wet),paused);
const moving=createEcosystem();moving.resources.push({id:'fixture',kind:'fruit',amount:1,position:{x:-6,y:heightAt(-6,7),z:7},carrierId:null,revision:1});moving.produced=1;
assert(command(moving,'move-resource',-6,7).accepted);assert(command(moving,'move-resource',-12,10).accepted);step(moving,1/30);
assert(moving.agents.some(a=>a.targetId==='fixture'));
for(let i=0;i<30*60;i++)step(moving,1/30);
assert.equal(moving.delivered,1);assert.equal(moving.resources.length,0);
const blocked=createEcosystem();const water=blocked.cells.find(c=>c.surfaceType==='water');assert(water);
const untouched=JSON.stringify(blocked);assert.equal(command(blocked,'sow',water.x,water.z).accepted,false);assert.equal(JSON.stringify(blocked),untouched);assert.equal(findPath(blocked,blocked.nest,water),null);
console.log('Pure simulation checks passed: environmental growth, mature yield, autonomous delivery, conservation, unique cargo, relocation, water rejection, pause. No browser or gameplay automation.');

const {travelCost}=await import('../src/world.mjs');
const {serialize,restore}=await import('../src/persistence.mjs');
const audit=w=>assert(Math.abs(w.rules.initialFood+w.produced-w.resources.reduce((n,r)=>n+r.amount,0)-w.nest.food-w.consumed-w.rotted)<1e-6);
const compost=createEcosystem({fruitDecaySeconds:1,agentSpeed:0,mineralizationRate:.1});
compost.resources.push({id:'resource-1',kind:'fruit',amount:1,age:0,position:{x:-12,y:heightAt(-12,0),z:0},carrierId:null,revision:1});compost.nextId=2;compost.produced=1;
const beforeFertility=compost.cells.reduce((n,c)=>n+c.fertility,0);
for(let i=0;i<90;i++)step(compost,1/30);
assert.equal(compost.rotted,1);assert.equal(compost.resources.length,0);assert(compost.cells.reduce((n,c)=>n+c.fertility,0)>beforeFertility);audit(compost);
const road=createEcosystem();const from=road.cells[100],to=road.cells[101],slow=travelCost(road,from,to);to.activity=1;assert(travelCost(road,from,to)<slow);step(road,.1);assert(to.activity<1);audit(road);
const restored=restore(serialize(compost));assert.equal(restored.rotted,1);audit(restored);assert.throws(()=>restore('{}'));
const corrupt=JSON.parse(serialize(compost));corrupt.nest.food+=1;assert.throws(()=>restore(JSON.stringify(corrupt)));
const rich=createEcosystem({initialFood:10}),poor=createEcosystem({initialFood:0});
for(const w of [rich,poor]){w.resources.push({id:'resource-1',kind:'fruit',amount:1,age:0,position:{x:-12,y:heightAt(-12,8),z:8},carrierId:null,revision:1});w.nextId=2;w.produced=1;for(let i=0;i<15;i++)step(w,1/30);audit(w);}
assert(Math.hypot(rich.agents[0].position.x+8,rich.agents[0].position.z-8)>Math.hypot(poor.agents[0].position.x+8,poor.agents[0].position.z-8));
// Same initial terrain/config, only planting positions differ. No scenario flag enters simulation.
const layouts=[[-7,6,-6,7,-9,6,-9,8],[-13,-10,-10,-6,-13,11,-4,-11]].map(points=>{const w=createEcosystem();for(let i=0;i<points.length;i+=2){command(w,'sow',points[i],points[i+1]);const c=w.cells[w.plants.at(-1).cellId];c.moisture=.9;c.fertility=.9;}for(let i=0;i<30*200;i++)step(w,1/30);audit(w);return w;});
assert.notEqual(layouts[0].delivered,layouts[1].delivered);
for(const w of layouts){const roundtrip=restore(serialize(w));audit(roundtrip);assert.equal(roundtrip.plants.length,w.plants.length);}
console.log('V2 data checks passed: nest food/consumption, decay/mineralization, trail cost/decay, save validation and layout-dependent outcomes. Human 3–5 minute experience remains unverified.');
