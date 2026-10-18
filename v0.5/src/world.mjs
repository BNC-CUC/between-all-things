import {createWorld,CELL_SIZE,CELLS,ORIGIN,heightAt} from './terrain.mjs';
import {validateRules} from './rules.mjs';
import {clamp} from './events.mjs';
import {updateEnvironment} from './environment.mjs';
import {updateAgents} from './agents.mjs';
export * from './terrain.mjs';
export * from './rules.mjs';
export {command} from './commands.mjs';
export {findPath,travelCost} from './navigation.mjs';
export function createEcosystem(overrides={}){
 const world={...createWorld(),schemaVersion:2,grid:{cellSize:CELL_SIZE,cells:CELLS,origin:ORIGIN},rules:validateRules(overrides),consumed:0,rotted:0,time:0,eventSerial:0,events:[],plants:[],resources:[],agents:[],delivered:0,produced:0,selectedResourceId:null,paused:false};
 world.cells=Array.from({length:CELLS*CELLS},(_,id)=>{const i=id%CELLS,j=Math.floor(id/CELLS),x=ORIGIN+(i+.5)*CELL_SIZE,z=ORIGIN+(j+.5)*CELL_SIZE,y=heightAt(x,z);return {id,x,z,y,surfaceType:y<-.3?'water':'soil',moisture:clamp(.28+.42*Math.exp(-((x-2)**2)/22)),fertility:clamp(.48+.18*Math.sin(z*.3)),activity:0,organic:0,baselineMoisture:clamp(.28+.42*Math.exp(-((x-2)**2)/22))};});
 world.nest={x:-8,y:heightAt(-8,8),z:8,food:world.rules.initialFood};
 for(let i=0;i<world.rules.agentCount;i++)world.agents.push({id:`agent-${i}`,position:{...world.nest,x:-8+i*.25},cargoId:null,targetId:null,path:[],decisionIn:0,task:'search'});
 return world;
}

export function step(w,dt){if(w.paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);w.time+=dt;updateEnvironment(w,dt);updateAgents(w,dt);}
