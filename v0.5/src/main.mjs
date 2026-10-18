import * as THREE from 'three';
import {CELL_SIZE,CELLS,ORIGIN,vertexHeight,heightAt,createWorld,placeMarker} from './world.mjs';
const canvas=document.querySelector('canvas'), status=document.querySelector('#status');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true}); }
catch { status.textContent='当前设备无法启动 WebGL2。请保留旧版试玩包；此灰盒未加载。'; throw new Error('WebGL2 unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setClearColor('#deded0');
const scene=new THREE.Scene();scene.fog=new THREE.Fog('#deded0',48,105);
scene.add(new THREE.HemisphereLight(0xffffef,0x657864,2.2));
const sun=new THREE.DirectionalLight(0xfff0d5,2);sun.position.set(-12,24,16);scene.add(sun);
const vertices=[],indices=[],colors=[];
for(let j=0;j<=CELLS;j++)for(let i=0;i<=CELLS;i++){
 const x=ORIGIN+i*CELL_SIZE,z=ORIGIN+j*CELL_SIZE,h=vertexHeight(x,z);vertices.push(x,h,z);
 const color=new THREE.Color(h<-.15?'#779b99':h<.25?'#a3b393':'#bec49c');colors.push(color.r,color.g,color.b);
}
for(let j=0;j<CELLS;j++)for(let i=0;i<CELLS;i++){const a=j*(CELLS+1)+i,b=a+1,c=a+CELLS+1,d=c+1;indices.push(a,c,b,b,c,d);}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
const terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));scene.add(terrain);
// Placeholder plants are static geometry, not a growth simulation.
const stemGeometry=new THREE.ConeGeometry(.3,1.3,5), stemMaterial=new THREE.MeshStandardMaterial({color:'#788b67',roughness:1,flatShading:true});
for(let i=0;i<32;i++){const x=-12+(i*7%25),z=-12+(i*11%25);const stem=new THREE.Mesh(stemGeometry,stemMaterial);stem.position.set(x,heightAt(x,z)+.65,z);scene.add(stem);}
const world=createWorld(), perspective=new THREE.PerspectiveCamera(35,1,.1,180),ortho=new THREE.OrthographicCamera(-20,20,20,-20,.1,180);
let camera=perspective, yaw=.65,elevation=.7,distance=42,mode='orbit',experimental=false;
const target=new THREE.Vector3(0,0,0),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const hover=new THREE.Mesh(new THREE.RingGeometry(.24,.32,24),new THREE.MeshBasicMaterial({color:'#fff4b7',side:THREE.DoubleSide,depthTest:false}));hover.rotation.x=-Math.PI/2;hover.renderOrder=5;hover.visible=false;scene.add(hover);
function updateCamera(){
 const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);perspective.aspect=aspect;perspective.updateProjectionMatrix();
 const half=distance*Math.tan(35*Math.PI/360);ortho.left=-half*aspect;ortho.right=half*aspect;ortho.top=half;ortho.bottom=-half;ortho.updateProjectionMatrix();
 camera=mode==='top'||mode==='bottom'?ortho:perspective;
 if(mode==='top'||mode==='bottom'){const sign=mode==='top'?1:-1;camera.position.copy(target).add(new THREE.Vector3(0,sign*distance,0));camera.up.set(0,0,-sign);}
 else {camera.position.set(target.x+distance*Math.cos(elevation)*Math.sin(yaw),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(elevation)*Math.cos(yaw));camera.up.set(0,1,0);}
 camera.lookAt(target);camera.updateMatrixWorld();
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);updateCamera();}addEventListener('resize',resize);resize();
function hit(x,y){const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(terrain,false)[0]||null;}
function canEdit(){return mode!=='bottom'&&(mode==='top'||elevation>0);}
function mark(x,y){if(!canEdit()){status.textContent='地表下方仅供观察，不能放置。';return;}const h=hit(x,y);if(!h)return;const result=placeMarker(world,h.point.x,h.point.z);if(!result.accepted)return;
 const m=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),new THREE.MeshStandardMaterial({color:'#e8b876',roughness:1}));m.position.copy(h.point);m.position.y+=.2;scene.add(m);
 status.textContent=`已放置空间标记 ${result.item.id} · 土地 ${result.item.cellId} · X ${h.point.x.toFixed(2)} / Z ${h.point.z.toFixed(2)}（非生态模拟）`;
}
function pan(dx,dy){const scale=distance*.0015,right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);right.y=0;right.normalize();const forward=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),right).normalize();target.addScaledVector(right,-dx*scale).addScaledVector(forward,-dy*scale);target.x=THREE.MathUtils.clamp(target.x,-16,16);target.z=THREE.MathUtils.clamp(target.z,-16,16);}
const touches=new Map();let gesture=false;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,button:e.button});if(touches.size>1){gesture=true;for(const p of touches.values())p.moved=true;}});
canvas.addEventListener('pointermove',e=>{
 const p=touches.get(e.pointerId);
 if(p){const before=[...touches.values()].map(q=>({...q})),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;p.moved ||= Math.hypot(p.x-p.startX,p.y-p.startY)>5;
  if(touches.size===2){const after=[...touches.values()],oldDist=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),newDist=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);if(newDist>1)distance=THREE.MathUtils.clamp(distance*oldDist/newDist,8,85);pan(dx/2,dy/2);}
  else if(p.moved){if(p.button===2||p.button===1||mode==='top'||mode==='bottom')pan(dx,dy);else {yaw-=dx*.006;const min=experimental?-Math.PI/2+.002:25*Math.PI/180,max=experimental?Math.PI/2-.002:75*Math.PI/180;elevation=THREE.MathUtils.clamp(elevation+dy*.005,min,max);}}
  updateCamera();
 }else {const h=canEdit()?hit(e.clientX,e.clientY):null;hover.visible=!!h;if(h){hover.position.copy(h.point);hover.position.y+=.04;}}
});
canvas.addEventListener('pointerup',e=>{const p=touches.get(e.pointerId);if(p&&!p.moved&&!gesture&&p.button===0)mark(e.clientX,e.clientY);touches.delete(e.pointerId);if(!touches.size)gesture=false;});
canvas.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);gesture=touches.size>0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),8,85);updateCamera();},{passive:false});
function setMode(value){mode=value;hover.visible=false;updateCamera();status.textContent=value==='bottom'?'实验底视：只观察，不放置标记。':value==='top'?'俯视建设：点击放置空间标记，拖动平移。':'自由观察：点击标记，拖动环绕，右键拖动平移。';}
document.querySelector('#orbit').onclick=()=>setMode('orbit');document.querySelector('#top').onclick=()=>setMode('top');document.querySelector('#bottom').onclick=()=>setMode('bottom');
document.querySelector('#reset').onclick=()=>{target.set(0,0,0);yaw=.65;elevation=.7;distance=42;setMode('orbit');};
document.querySelector('#experimental').onchange=e=>{experimental=e.target.checked;document.querySelector('#bottom').hidden=!experimental;if(!experimental){elevation=THREE.MathUtils.clamp(elevation,25*Math.PI/180,75*Math.PI/180);if(mode==='bottom')mode='orbit';}updateCamera();};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='图形上下文已丢失，请刷新灰盒；当前标记未保存。';});
renderer.setAnimationLoop(()=>renderer.render(scene,camera));
