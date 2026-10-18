import {ORIGIN} from './terrain.mjs';
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function event(w,type,position,payload={}){w.events.push({entityId:payload.entityId,actorKind:payload.actorKind||'environment',regionId:`region-${Math.floor((position.x-ORIGIN)/8)}-${Math.floor((position.z-ORIGIN)/8)}`,tracked:false,schemaVersion:1,eventId:`event-${++w.eventSerial}`,type,simTime:w.time,position:{...position},payload});if(w.events.length>80)w.events.shift();}
