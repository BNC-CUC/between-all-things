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
