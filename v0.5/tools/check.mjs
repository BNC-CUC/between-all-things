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
