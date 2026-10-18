import assert from 'node:assert/strict';import * as T from 'three';import {heightAt,vertexHeight,cellAt,createWorld,placeMarker} from '../src/world.mjs';
assert.equal(cellAt(16,0),null);assert.equal(cellAt(-16,-16).id,0);
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,vertexHeight(0,0),0,0,vertexHeight(0,1),1,1,vertexHeight(1,0),0],3));
const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();const destination=new T.Vector3(.2,heightAt(.2,.3),.3);
const world=createWorld();assert.equal(placeMarker(world,99,0).accepted,false);assert.equal(world.markers.length,0);assert.equal(placeMarker(world,.2,.3).accepted,true);const before=JSON.stringify(world);
for(const pos of [[5,8,7],[-7,10,-5],[0,15,0]]){const c=new T.PerspectiveCamera(35,1,.1,100);c.position.set(...pos);c.lookAt(destination);c.updateMatrixWorld();const ndc=destination.clone().project(c),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(ndc.x,ndc.y),c);const h=ray.intersectObject(mesh)[0];assert(h);assert(h.point.distanceTo(destination)<1e-6);}
assert.equal(JSON.stringify(world),before);console.log('Pure spatial checks passed: bounds, rejected operation, triangle height, multi-angle ray hit, camera/world separation. No browser/gameplay.');
