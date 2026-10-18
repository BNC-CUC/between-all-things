import {cellAt,CELLS} from './terrain.mjs';
export function travelCost(w,from,to){return (1+Math.abs(to.y-from.y)*2)/(1+w.rules.pathDiscount*to.activity);}
// Grid pathfinding uses the same terrain cells as plants and input; water is blocked.
export function findPath(w,from,to){
 const start=cellAt(from.x,from.z),end=cellAt(to.x,to.z);if(!start||!end||w.cells[end.id].surfaceType==='water')return null;
 const open=[start.id],cost=new Map([[start.id,0]]),prev=new Map(),closed=new Set();
 const heuristic=id=>(Math.abs(id%CELLS-end.i)+Math.abs(Math.floor(id/CELLS)-end.j))/(1+w.rules.pathDiscount);
 while(open.length){open.sort((a,b)=>(cost.get(a)+heuristic(a))-(cost.get(b)+heuristic(b)));const id=open.shift();if(closed.has(id))continue;
  if(id===end.id){const path=[];let n=id;while(n!==start.id){path.push({x:w.cells[n].x,z:w.cells[n].z});n=prev.get(n);}path.reverse();path.push({x:to.x,z:to.z});return path;}
  closed.add(id);const i=id%CELLS,j=Math.floor(id/CELLS);
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=CELLS||nj>=CELLS)continue;const next=nj*CELLS+ni,c=w.cells[next];if(c.surfaceType==='water'||closed.has(next))continue;
   const step=travelCost(w,w.cells[id],c),score=cost.get(id)+step;if(score<(cost.get(next)??Infinity)){cost.set(next,score);prev.set(next,id);open.push(next);}}
 }
 return null;
}
