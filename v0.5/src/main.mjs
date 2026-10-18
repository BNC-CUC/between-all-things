import {SAVE_KEY,serialize,restore} from './persistence.mjs';
import * as THREE from 'three';
import {CELL_SIZE,CELLS,ORIGIN,cellAt,vertexHeight,heightAt,createEcosystem,command,step} from './world.mjs';
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
const stemGeometry=new THREE.ConeGeometry(.3,1.3,5), stemMaterial=new THREE.MeshStandardMaterial({color:'#788b67',roughness:1,flatShading:true});
let world=createEcosystem(),autoSaveAllowed=true;
try{const saved=localStorage.getItem(SAVE_KEY);if(saved){world=restore(saved);status.textContent='已恢复上次河湾；离开期间没有补跑模拟。';}}catch{autoSaveAllowed=false;status.textContent='旧记录暂不可读取，已保留；当前世界可导出。';}
const perspective=new THREE.PerspectiveCamera(35,1,.1,180),ortho=new THREE.OrthographicCamera(-20,20,20,-20,.1,180);
const plantViews=new Map(),resourceViews=new Map(),agentViews=new Map();
const fruitGeometry=new THREE.SphereGeometry(.17,10,6),fruitMaterial=new THREE.MeshStandardMaterial({color:'#edb449'});
const agentGeometry=new THREE.CapsuleGeometry(.14,.3,3,6),agentMaterial=new THREE.MeshStandardMaterial({color:'#594c3e'});
const nest=new THREE.Mesh(new THREE.CylinderGeometry(.8,1,.25,16),new THREE.MeshStandardMaterial({color:'#b08a60'}));nest.position.set(world.nest.x,world.nest.y+.1,world.nest.z);scene.add(nest);
const activity=new THREE.InstancedMesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}),CELLS*CELLS);scene.add(activity);const transform=new THREE.Object3D();
let tool='sow',hoverCell=null,overlay='activity';
function syncWorld(){
 const livingPlants=new Set(world.plants.map(p=>p.id));for(const [id,mesh]of plantViews)if(!livingPlants.has(id)){scene.remove(mesh);mesh.material.dispose();plantViews.delete(id);}
 const livingAgents=new Set(world.agents.map(a=>a.id));for(const [id,mesh]of agentViews)if(!livingAgents.has(id)){scene.remove(mesh);agentViews.delete(id);}

 for(const p of world.plants){let mesh=plantViews.get(p.id);if(!mesh){mesh=new THREE.Mesh(stemGeometry,stemMaterial.clone());scene.add(mesh);plantViews.set(p.id,mesh);}const size=.12+p.growth*.88;mesh.scale.setScalar(size);mesh.position.set(p.position.x,p.position.y+.65*size,p.position.z);mesh.material.color.set(p.blocked?'#a58e65':p.stage==='mature'?'#698753':'#91a96e');}
 const live=new Set(world.resources.map(r=>r.id));for(const [id,mesh]of resourceViews)if(!live.has(id)){scene.remove(mesh);mesh.material.dispose();resourceViews.delete(id);}
 for(const r of world.resources){let mesh=resourceViews.get(r.id);if(!mesh){mesh=new THREE.Mesh(fruitGeometry,fruitMaterial.clone());scene.add(mesh);resourceViews.set(r.id,mesh);}mesh.material.color.copy(new THREE.Color('#edb449').lerp(new THREE.Color('#795846'),Math.min(1,r.age/world.rules.fruitDecaySeconds)));mesh.position.set(r.position.x+.22,r.position.y+(r.carrierId?.5:.16),r.position.z);mesh.scale.setScalar(r.id===world.selectedResourceId?1.7:1);}
 for(const a of world.agents){let mesh=agentViews.get(a.id);if(!mesh){mesh=new THREE.Mesh(agentGeometry,agentMaterial);mesh.rotation.x=Math.PI/2;scene.add(mesh);agentViews.set(a.id,mesh);}mesh.position.set(a.position.x,a.position.y+.18,a.position.z);}
 for(const c of world.cells){transform.position.set(c.x,c.y+.025,c.z);transform.rotation.set(-Math.PI/2,0,0);transform.scale.setScalar(overlay==='activity'?c.activity:c.surfaceType==='soil'?.9:0);transform.updateMatrix();activity.setMatrixAt(c.id,transform.matrix);activity.setColorAt(c.id,new THREE.Color(overlay==='activity'?'#bf9659':overlay==='moisture'?'#689da3':'#86a46c').multiplyScalar(overlay==='activity'?1:.35+c[overlay]*.65));}activity.instanceMatrix.needsUpdate=true;if(activity.instanceColor)activity.instanceColor.needsUpdate=true;
 document.querySelector('#counts').textContent=`种植 ${world.plants.length} · 成熟 ${world.plants.filter(p=>p.stage==='mature').length} · 地面果实 ${world.resources.filter(r=>!r.carrierId).length} · 巢内食物 ${world.nest.food.toFixed(1)} · 已回肥 ${world.rotted}`;
 if(hoverCell){const c=world.cells[hoverCell.id];document.querySelector('#land').textContent=`土地 ${c.id} · 水分 ${Math.round(c.moisture*100)}% · 肥力 ${Math.round(c.fertility*100)}% · 有机物 ${c.organic.toFixed(2)} · 路径 ${Math.round(c.activity*100)}%${c.surfaceType==='water'?' · 水面':''}`;}
}
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
function mark(x,y){if(!canEdit()){status.textContent='地表下方仅供观察，不能操作。';return;}const h=hit(x,y);if(!h)return;hoverCell=cellAt(h.point.x,h.point.z);const result=command(world,tool,h.point.x,h.point.z);status.textContent=result.reason;syncWorld();}
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
 }else {const h=canEdit()?hit(e.clientX,e.clientY):null;hover.visible=!!h;if(h){hover.position.copy(h.point);hover.position.y+=.04;hoverCell=cellAt(h.point.x,h.point.z);}}
});
canvas.addEventListener('pointerup',e=>{const p=touches.get(e.pointerId);if(p&&!p.moved&&!gesture&&p.button===0)mark(e.clientX,e.clientY);touches.delete(e.pointerId);if(!touches.size)gesture=false;});
canvas.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);gesture=touches.size>0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),8,85);updateCamera();},{passive:false});
function setMode(value){mode=value;hover.visible=false;updateCamera();status.textContent=value==='bottom'?'实验底视：只观察，不放置标记。':value==='top'?'俯视建设：点击使用当前工具，拖动平移。':'自由观察：点击使用工具，拖动环绕，右键拖动平移。';}
document.querySelector('#orbit').onclick=()=>setMode('orbit');document.querySelector('#top').onclick=()=>setMode('top');document.querySelector('#bottom').onclick=()=>setMode('bottom');
document.querySelector('#reset').onclick=()=>{target.set(0,0,0);yaw=.65;elevation=.7;distance=42;setMode('orbit');};
document.querySelector('#experimental').onchange=e=>{experimental=e.target.checked;document.querySelector('#bottom').hidden=!experimental;if(!experimental){elevation=THREE.MathUtils.clamp(elevation,25*Math.PI/180,75*Math.PI/180);if(mode==='bottom')mode='orbit';}updateCamera();};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='图形上下文已丢失，请刷新灰盒；请用已保存的世界记录恢复。';});
document.querySelector('#overlay').onchange=e=>{overlay=e.target.value;};
document.querySelector('#previous-world').onclick=()=>{try{const keys=Object.keys(localStorage).filter(k=>k.startsWith(SAVE_KEY+'.previous.')).sort((a,b)=>Number(b.split('.').at(-1))-Number(a.split('.').at(-1)));let candidate=null;for(const key of keys){try{candidate=restore(localStorage.getItem(key));break;}catch{}}if(!candidate){status.textContent='没有可恢复的上一世界记录';return;}world=candidate;world.paused=true;autoSaveAllowed=false;document.querySelector('#pause').textContent='继续生长';status.textContent='已恢复历史世界并暂停；点击保存设为当前，或导出。';syncWorld();}catch{status.textContent='历史记录暂不可访问，请用导出的文件恢复';}};
document.querySelector('#new-world').onclick=()=>{try{localStorage.setItem(SAVE_KEY+'.previous.'+Date.now(),serialize(world));world=createEcosystem();autoSaveAllowed=true;document.querySelector('#pause').textContent='暂停世界';status.textContent='已开始相同初始条件的新实验；上一世界保留在本机历史记录。';save();}catch{status.textContent='无法保留旧世界，请先导出，未重置。';}};
document.querySelector('#tool').onchange=e=>{tool=e.target.value;world.selectedResourceId=null;};
document.querySelector('#pause').onclick=()=>{world.paused=!world.paused;document.querySelector('#pause').textContent=world.paused?'继续生长':'暂停世界';};
function save(){try{if(!autoSaveAllowed)return;localStorage.setItem(SAVE_KEY,serialize(world));document.querySelector('#save-note').textContent='已保存到本机';}catch{document.querySelector('#save-note').textContent='本机保存失败，请导出记录';}}
document.querySelector('#save').onclick=()=>{try{if(!autoSaveAllowed){const previous=localStorage.getItem(SAVE_KEY);if(previous)localStorage.setItem(SAVE_KEY+'.previous.'+Date.now(),previous);autoSaveAllowed=true;}save();status.textContent='当前世界已保存；被替换的原记录已留存。';}catch{status.textContent='无法安全保存，请先导出世界记录。';}};
document.querySelector('#export').onclick=()=>{const blob=new Blob([serialize(world)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='riverbend-world.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.querySelector('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>4_000_000)throw new Error('记录超过4MB');const candidate=restore(await file.text());world=candidate;world.paused=true;document.querySelector('#pause').textContent='继续生长';status.textContent='已载入并暂停；检查后继续。原本机记录尚未覆盖。';autoSaveAllowed=false;document.querySelector('#save-note').textContent='点击保存设为当前世界（会保留旧记录），或导出保留';syncWorld();}catch(error){status.textContent=error.message;}e.target.value='';};
document.querySelector('#pause').textContent=world.paused?'继续生长':'暂停世界';
let saveClock=0;
let last=performance.now(),accumulator=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();last=performance.now();accumulator=0;});addEventListener('pagehide',save);
renderer.setAnimationLoop(now=>{const elapsed=Math.min(.15,Math.max(0,(now-last)/1000));last=now;if(!document.hidden&&!world.paused){accumulator+=elapsed;while(accumulator>=1/30){step(world,1/30);accumulator-=1/30;}}else accumulator=0;saveClock+=elapsed;if(saveClock>=10){saveClock=0;save();}syncWorld();renderer.render(scene,camera);});
