import * as THREE from 'three';
import { createTimeline, onScroll } from './vendor/anime.js';
export function createSignalScene(section,{reduced=false}={}) {
  const mount=section.querySelector('.signal-canvas'),mobile=innerWidth<800;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{mount.innerHTML='<div class="signal-fallback"><span>Нейрон</span><i>↓</i><span>Сигнал</span><i>↓</i><span>Декодер</span><i>↓</i><span>Действие</span></div>';return ()=>{};}
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.setAttribute('aria-hidden','true');mount.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,.5,11);
  scene.add(new THREE.HemisphereLight(0xddebc8,0x172d2c,2.7));const light=new THREE.DirectionalLight(0xf3f5e1,3);light.position.set(3,4,5);scene.add(light);
  const groups=[0,1,2,3].map(()=>{const group=new THREE.Group();scene.add(group);return group;});
  const materials=[];function material(color,metalness=.35){const m=new THREE.MeshStandardMaterial({color,metalness,roughness:.36,transparent:true});materials.push(m);return m;}
  const green=material('#b7cf8c'),blue=material('#8ab9c8'),gold=material('#e2bf7c'),pale=material('#e8efd7');
  const soma=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,3),green);groups[0].add(soma);
  for(let i=0;i<14;i++) {
    const a=i*Math.PI*(3-Math.sqrt(5)),y=1-2*(i+.5)/14,r=Math.sqrt(1-y*y),end=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r).multiplyScalar(2.3);
    const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(),end.clone().multiplyScalar(.5).add(new THREE.Vector3(0,.22,0)),end.clone().multiplyScalar(.85),end);
    groups[0].add(new THREE.Mesh(new THREE.TubeGeometry(curve,18,.025,5,false),green));
    for(let j=-1;j<=1;j+=2){const mid=end.clone().multiplyScalar(.68),tip=end.clone().add(new THREE.Vector3(j*.3,.3,j*.2));const branch=new THREE.QuadraticBezierCurve3(mid,end.clone(),tip);groups[0].add(new THREE.Mesh(new THREE.TubeGeometry(branch,10,.014,4,false),blue));}
    const terminal=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),pale);terminal.position.copy(end);groups[0].add(terminal);
  }
  const waveGeometry=new THREE.BufferGeometry(),wavePositions=new Float32Array(180*3);
  for(let i=0;i<180;i++){const x=i/179*5.7-2.85;wavePositions[i*3]=x;wavePositions[i*3+1]=Math.sin(x*5)*.43+Math.sin(x*11)*.1;wavePositions[i*3+2]=Math.cos(x*2)*.3;}
  waveGeometry.setAttribute('position',new THREE.BufferAttribute(wavePositions,3));
  const waveMaterial=new THREE.LineBasicMaterial({color:'#d9e8b0',transparent:true});materials.push(waveMaterial);groups[1].add(new THREE.Line(waveGeometry,waveMaterial));
  for(let i=0;i<28;i++){const x=i/27*5.7-2.85;const m=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),blue);m.position.set(x,Math.sin(x*5)*.43+Math.sin(x*11)*.1,Math.cos(x*2)*.3);groups[1].add(m);}
  for(let i=0;i<5;i++){const rail=new THREE.Mesh(new THREE.BoxGeometry(6,.008,.008),blue);rail.position.y=(i-2)*.5;rail.position.z=-.7;groups[1].add(rail);}
  const decoderMaterial=material('#c9d6a8');
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
    const cube=new THREE.Mesh(new THREE.BoxGeometry(.44,.44,.44),decoderMaterial);cube.position.set(x*.8,y*.8,z*.8);groups[2].add(cube);
  }
  const orbit=new THREE.Mesh(new THREE.TorusGeometry(2,.018,8,90),gold);orbit.rotation.x=.7;groups[2].add(orbit);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.65,.025,10,100),blue);groups[3].add(ring);
  const target=new THREE.Mesh(new THREE.TorusGeometry(.34,.045,12,50),gold);target.position.set(.8,.75,0);groups[3].add(target);
  const cursorShape=new THREE.Shape();cursorShape.moveTo(0,0);cursorShape.lineTo(0,-.7);cursorShape.lineTo(.17,-.5);cursorShape.lineTo(.35,-.8);cursorShape.lineTo(.48,-.72);cursorShape.lineTo(.29,-.43);cursorShape.lineTo(.55,-.38);cursorShape.closePath();
  const cursor=new THREE.Mesh(new THREE.ExtrudeGeometry(cursorShape,{depth:.09,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.02,bevelThickness:.02}),pale);groups[3].add(cursor);
  groups.forEach(group=>{const clones=new Map();group.traverse(object=>{if(object.material){if(!clones.has(object.material))clones.set(object.material,object.material.clone());object.material=clones.get(object.material);}});});
  const state={phase:0},names=['Нейронная активность','Регистрация сигнала','Пространство признаков','Управляющая команда'];let phase=-1,active=true,visible=false,frame=0,time=0,last=0,lastPaint=0;
  function draw() {
    groups.forEach((g,i)=>{
      const distance=Math.abs(state.phase-i),weight=Math.max(0,1-distance);g.visible=weight>.005;
      g.scale.setScalar(.78+weight*.22);g.position.x=(i-state.phase)*.8;g.rotation.y=i===1?Math.sin(time*.15)*.12:time*.12+(i-state.phase)*.45;
      g.rotation.z=i===0?Math.sin(time*.18)*.06:0;
      g.traverse(o=>{if(o.material){o.material.opacity=weight;o.material.depthWrite=weight>.8;}});
    });
    groups.forEach((g,i)=>{g.position.z=-Math.abs(state.phase-i)*1.8;});
    cursor.position.set(.8+Math.sin(time*.7)*.15,.75+Math.cos(time*.7)*.12,.15);
    const current=Math.min(3,Math.max(0,Math.round(state.phase)));
    if(current!==phase){phase=current;section.querySelector('#signalPhase').textContent=names[phase];section.querySelector('.signal-phase-number').textContent=`0${phase+1} / 04`;section.querySelectorAll('[data-story-step]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===phase)));section.querySelectorAll('.signal-step').forEach((el,i)=>el.classList.toggle('is-current',i===phase));}
    renderer.render(scene,camera);
  }
  function resize(){const r=mount.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.position.z=camera.aspect<1?12.5:10;camera.updateProjectionMatrix();draw();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=performance.now();draw();}},{threshold:.01});observer.observe(mount);
  const scrollObserver=!reduced?onScroll({target:section.querySelector('.signal-steps'),enter:'center top',leave:'center bottom',sync:.45}):null;
  const timeline=scrollObserver?createTimeline({autoplay:scrollObserver}).add(state,{phase:[0,3],duration:3000,ease:'linear',onUpdate:()=>{if(visible&&!document.hidden)draw();}}):null;
  function tick(now){if(!active)return;frame=requestAnimationFrame(tick);if(!visible||document.hidden||reduced){last=now;return;}if(now-lastPaint<(mobile?33:16))return;time+=Math.min(.05,(now-last)/1000||0);last=now;lastPaint=now;draw();}
  function reducedStep(e){const b=e.target.closest('[data-story-step]');if(reduced&&b){state.phase=Number(b.dataset.storyStep);draw();}}
  section.addEventListener('click',reducedStep);resize();if(!reduced)frame=requestAnimationFrame(tick);
  return ()=>{active=false;cancelAnimationFrame(frame);timeline?.revert();scrollObserver?.revert();observer.disconnect();resizeObserver.disconnect();section.removeEventListener('click',reducedStep);const geometries=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
}
