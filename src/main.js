import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b10);
scene.fog = new THREE.FogExp2(0x0a1118, 0.035);

const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, .05, 300);
camera.position.set(0,1.7,8);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object);

const clock = new THREE.Clock();
const keys = {};
const interactables = [];
const inventory = new Set();
const clues = new Set();
let mission = "اطراف خودرو را بررسی کنید.";
let started = false;
let near = null;
let rain;

function mat(color, rough=1, emissive=0x000000){
  return new THREE.MeshStandardMaterial({color,roughness:rough,emissive,emissiveIntensity:emissive?1.2:0});
}
function box(name,pos,size,color,opts={}){
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color,opts.rough??1,opts.emissive??0));
  m.name=name; m.position.set(...pos); m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
}
function cyl(pos,r,h,color){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat(color));
  m.position.set(...pos);m.castShadow=true;scene.add(m);return m;
}
function addInteractable(object,label,action){
  object.userData.interactable=true;object.userData.label=label;object.userData.action=action;interactables.push(object);
}

scene.add(new THREE.HemisphereLight(0x9bb7d1,0x182027,1.2));
const moon = new THREE.DirectionalLight(0xbad4ff,2);
moon.position.set(-30,35,20);moon.castShadow=true;scene.add(moon);

const ground=box("ground",[0,-.15,0],[80,.3,80],0x202a28);
ground.receiveShadow=true;

// Road
box("road",[0,.02,0],[9,.12,70],0x15191b);
for(let z=-32;z<34;z+=5) box("roadline",[0,.09,z],[.18,.03,2.2],0x8b8b72);

// Mountains / trees
for(let i=0;i<90;i++){
  const side=Math.random()<.5?-1:1, x=side*(7+Math.random()*18), z=-35+Math.random()*70;
  const h=3+Math.random()*8;
  cyl([x,h/2-.1,z],.7+Math.random()*.7,h,0x17231d);
  cyl([x,h+1,z],2+Math.random(),3+Math.random()*3,0x102019);
}

// Rain particles
const rainGeo=new THREE.BufferGeometry();
const drops=[];
for(let i=0;i<1100;i++) drops.push((Math.random()-.5)*70,Math.random()*35,Math.random()*70-35);
rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(drops,3));
rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x9bbde0,size:.08,transparent:true,opacity:.65}));
scene.add(rain);

// Car
box("car",[0,1.0,7],[4,1.1,6],0x252a2d);
box("hood",[0,1.65,4.8],[3.5,.35,2],0x30383c);
box("roof",[0,2.0,8],[3.3,.3,2.5],0x1d2428);
for(const x of [-1.55,1.55]) for(const z of [5.5,9.2]) cyl([x,.55,z],.55,.35,0x08090a).rotation.z=Math.PI/2;
box("headlightL",[-1.1,1.55,4.0],[.5,.3,.1],0xbfdfff,{emissive:0x8fbfff});
box("headlightR",[1.1,1.55,4.0],[.5,.3,.1],0xbfdfff,{emissive:0x8fbfff});

const radio=box("radio",[0,1.35,6.2],[.7,.3,.25],0x111416);
addInteractable(radio,"رادیو را بررسی کنید",()=>{
  if(!inventory.has("پیام رادیویی")){
    inventory.add("پیام رادیویی"); updateUI();
    show("«اگر این پیام را می‌شنوید... وارد منطقه نشوید.»");
    setTimeout(()=>show("«آن‌ها هنوز آنجا هستند.»"),3200);
  }
});

function makeStation(){
  box("station",[0,2.2,-13],[8,4.5,7],0x353a38);
  box("roof",[0,4.55,-13],[8.5,.35,7.5],0x202729);
  // front opening/door
  box("door",[0,1.7,-9.45],[2.1,3.4,.25],0x151b1c);
  box("windowL",[-2.3,2.6,-9.46],[1.8,1.4,.2],0x101a20,{emissive:0x07131b});
  box("windowR",[2.3,2.6,-9.46],[1.8,1.4,.2],0x101a20,{emissive:0x07131b});
  const key=box("key",[2.5,1.1,-12],[.25,.08,.7],0xd2b35d);
  addInteractable(key,"کلید قدیمی را بردارید",()=>{
    inventory.add("کلید ایستگاه");mission="با کلید وارد ایستگاه شوید.";updateUI();show("کلید قدیمی پیدا شد.");
    key.visible=false;
  });
  const photo=box("photo",[-2.3,1.4,-12.2],[.6,.04,.5],0xc9c1a9);
  addInteractable(photo,"عکس قدیمی را بررسی کنید",()=>{
    if(!clues.has("عکس")){
      clues.add("عکس");show("عکس ۲۰ سال پیش است. تعداد افراد عکس با تعداد بازیکنان برابر است.");updateUI();
    }
  });
  const tape=box("tape",[2.0,1.2,-13.1],[.35,.18,.25],0x161616);
  addInteractable(tape,"ضبط صوت را بررسی کنید",()=>{
    if(!clues.has("ضبط صوت")){clues.add("ضبط صوت");show("«اگر این فایل را پیدا کرده‌اید، یعنی سیستم دوباره فعال شده.»");updateUI();}
  });
  const map=box("map",[-.5,2.1,-16.35],[2.2,.04,1.2],0xaaa27c);
  addInteractable(map,"نقشه را بررسی کنید",()=>{
    if(!clues.has("نقشه")){clues.add("نقشه");inventory.add("نقشه ECHO");show("ECHO FACILITY — ورودی اصلی بسته است. مسیر مخفی زیر ساختمان مشخص شده.");updateUI();}
  });
}
makeStation();

// Hidden entrance path behind station
box("hiddenTunnel",[0,1,-18.7],[3,2,8],0x101518);
const tunnelDoor=box("securityDoor",[0,1.5,-22.5],[2.4,3,.3],0x252b2d);
addInteractable(tunnelDoor,"درب امنیتی را بررسی کنید",()=>{
  if(clues.size>=3){
    mission="وارد تونل شوید.";
    tunnelDoor.position.y=-8; show("SECURITY LEVEL 1 — مسیر باز شد."); updateUI();
  }else show("برای باز کردن این مسیر حداقل سه سرنخ لازم است.");
});

// Underground lab
box("lab",[0,-1.2,-31],[12,2,12],0x242b2d);
const computer=box("computer",[0,1,-31],[1.4,1.2,.6],0x10151a,{emissive:0x071018});
addInteractable(computer,"رایانه مرکزی را فعال کنید",()=>{
  if(!inventory.has("کارت دسترسی") || !inventory.has("باتری") || !inventory.has("کد امنیتی")){
    show("رایانه: نیاز به باتری، کارت دسترسی و کد امنیتی.");
  } else {
    mission="معمای رمزگذاری را حل کنید.";
    show("ECHO SYSTEM REACTIVATED");
    updateUI();
  }
});
const battery=box("battery",[-3,.4,-28],[.5,.4,.5],0x777b42);
addInteractable(battery,"باتری را بردارید",()=>{inventory.add("باتری");battery.visible=false;show("باتری پیدا شد.");updateUI();});
const card=box("card",[3,.5,-34],[.6,.05,.4],0x7191a3);
addInteractable(card,"کارت دسترسی را بردارید",()=>{inventory.add("کارت دسترسی");card.visible=false;show("کارت دسترسی پیدا شد.");updateUI();});
const code=box("code",[-4,.8,-34],[.8,.04,.5],0xbcae70);
addInteractable(code,"کد امنیتی را بررسی کنید",()=>{inventory.add("کد امنیتی");code.visible=false;show("کد امنیتی پیدا شد.");updateUI();});

function updateUI(){
  document.querySelector("#mission").textContent=mission;
  document.querySelector("#items").innerHTML=inventory.size?[...inventory].map(x=>`<span class="item">${x}</span>`).join(""):"خالی";
  document.querySelector("#clues").textContent=`${clues.size} / 3`;
}
let timer;
function show(t){const el=document.querySelector("#message");el.textContent=t;el.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>el.classList.remove("show"),4200);}
function distTo(obj){return camera.position.distanceTo(obj.getWorldPosition(new THREE.Vector3()));}

document.querySelector("#startBtn").addEventListener("click", (event) => {
  event.preventDefault();
  started = true;
  document.querySelector("#start").classList.add("fade");
  show("رادیو را بررسی کنید. سپس اطراف خودرو را بگردید.");
  // Pointer Lock is optional. The game starts even if the browser blocks it.
  try { controls.lock(); } catch (e) { console.warn("Pointer Lock unavailable:", e); }
});

// Clicking the game view can lock the mouse after the game has started.
renderer.domElement.addEventListener("click", () => {
  if (started && !controls.isLocked) {
    try { controls.lock(); } catch (e) {}
  }
});
controls.addEventListener("lock", () => { started = true; });

addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="KeyE"&&started) interact();});
addEventListener("keyup",e=>keys[e.code]=false);

const raycaster=new THREE.Raycaster();
function interact(){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=raycaster.intersectObjects(interactables,false);
  if(hits.length && hits[0].distance<4){
    hits[0].object.userData.action();
  }
}
function findNear(){
  let best=null,bestD=4;
  for(const o of interactables){if(!o.visible)continue;const d=distTo(o);if(d<bestD){best=o;bestD=d;}}
  near=best;
  const p=document.querySelector("#prompt");
  p.style.display=best?"block":"none";
  if(best)p.textContent=`E — ${best.userData.label}`;
}

function move(dt){
  if(!controls.isLocked)return;
  const speed=keys.ShiftLeft?7:4;
  const dir=new THREE.Vector3();
  if(keys.KeyW)dir.z-=1;if(keys.KeyS)dir.z+=1;if(keys.KeyA)dir.x-=1;if(keys.KeyD)dir.x+=1;
  if(dir.lengthSq())dir.normalize();
  controls.moveRight(dir.x*speed*dt);
  controls.moveForward(-dir.z*speed*dt);
  camera.position.y=Math.max(0.8,camera.position.y);
  camera.position.x=Math.max(-5.5,Math.min(5.5,camera.position.x));
  camera.position.z=Math.max(-38,Math.min(25,camera.position.z));
}

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  move(dt);
  if(rain){
    const a=rain.geometry.attributes.position.array;
    for(let i=1;i<a.length;i+=3){a[i]-=22*dt;if(a[i]<0)a[i]=35;}
    rain.geometry.attributes.position.needsUpdate=true;
  }
  findNear();
  renderer.render(scene,camera);
}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
updateUI();animate();
