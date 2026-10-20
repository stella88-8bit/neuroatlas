import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { animate } from './vendor/anime.js';
import { sphericalLayout } from './layout.js';
import { createCosmos } from './cosmos.js';
import { createDependencyFlows } from './flows.js';
import { placeLabels } from './label-layout.js';
import { createPlanetSurfaces } from './planet-surfaces.js';
export function createGraph(data,options){
 let mount,mode='overview',active=false,frame=0,selected=null,path=false,category='all',progress=new Set(),reduced=options.reduced,dirty=true,auto=false,camAnimation,visible=true,hovered=null,lastTime=0,transitioning=false,ambientTime=0,lastPaint=0;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#030612');scene.fog=new THREE.FogExp2('#080d20',.0008);
 const mobile=window.innerWidth<800;const cosmos=createCosmos(scene,{mobile});
 const camera=new THREE.PerspectiveCamera(43,1,.1,2000);camera.position.set(0,12,485);
 const pixelRatio=Math.min(devicePixelRatio,mobile?1.3:1.75);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(pixelRatio);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.domElement.setAttribute('aria-label','Трехмерная карта учебных зависимостей. Для управления с клавиатуры используйте кнопки и текстовый список.');
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=34;controls.maxDistance=1250;controls.rotateSpeed=.4;controls.panSpeed=.6;controls.zoomSpeed=.7;controls.autoRotateSpeed=.25;controls.addEventListener('change',()=>dirty=true);controls.addEventListener('start',()=>{camAnimation?.cancel();hovered=null;dirty=true});
 scene.add(new THREE.HemisphereLight('#d6e5ff','#15122b',2.4));const key=new THREE.DirectionalLight('#f4eddb',3.6);key.position.set(-100,170,200);scene.add(key);const light=new THREE.PointLight('#9baaff',18000,700);light.position.set(80,-40,130);scene.add(light);
 const layout=sphericalLayout(data);
 const catMap=new Map(data.categories.map((c,i)=>[c.id,{...c,index:i,center:new THREE.Vector3(...layout.centers.get(c.id))}]));
 const indexed=new Map(),objects=[],edges=[];const planetSurface=createPlanetSurfaces(mobile);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.14,'rgba(255,255,255,.95)');gradient.addColorStop(.26,'rgba(255,255,255,.24)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const glowTexture=new THREE.CanvasTexture(glowCanvas);
 const rand=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)};
 data.nodes.forEach((n,i)=>{const c=catMap.get(n.category);const position=new THREE.Vector3(...layout.positions.get(n.id));const size=3.05;
 const surface=planetSurface(n,i);const mat=new THREE.MeshPhysicalMaterial({map:surface.map,bumpMap:surface.bumpMap,bumpScale:.13,color:c.color,metalness:.18,roughness:.64,clearcoat:1,clearcoatRoughness:.5,emissive:c.color,emissiveIntensity:.2,transparent:true,opacity:0,depthWrite:true});const sphere=new THREE.Mesh(surface.geometry,mat);sphere.position.copy(position);sphere.scale.setScalar(size);scene.add(sphere);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:c.color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.position.copy(position);sprite.scale.setScalar(12+size);scene.add(sprite);
 const obj={node:n,position,size,sphere,sprite,alpha:1,targetAlpha:1,scale:1,targetScale:1};indexed.set(n.id,obj);objects.push(obj);
 });
 
 // Preserve the prerequisite → dependent orientation directly from the dataset.
 data.nodes.forEach(n=>n.deps.forEach(p=>{const a=indexed.get(p),b=indexed.get(n.id);if(!a||!b)return;
 const delta=b.position.clone().sub(a.position),bow=new THREE.Vector3(-delta.y,delta.x,25).normalize().multiplyScalar(Math.min(24,delta.length()*.2));
 const curve=new THREE.CubicBezierCurve3(a.position,a.position.clone().addScaledVector(delta,.32).add(bow),a.position.clone().addScaledVector(delta,.68).add(bow),b.position);
 edges.push({from:p,to:n.id,curve,highlight:false,phase:rand(edges.length)});
 }));
 const flows=createDependencyFlows(scene,edges,{mobile,colors:id=>catMap.get(indexed.get(id).node.category).color});
 const hoverLabel=document.createElement('div');hoverLabel.className='graph-label hover-label';hoverLabel.hidden=true;
 const labels=document.createElement('div');labels.className='stage-labels';labels.append(hoverLabel);const categoryLabels=data.categories.map(c=>{const el=document.createElement('span');el.className='graph-label category';el.textContent=c.en;labels.append(el);return {el,c,position:catMap.get(c.id).center.clone()}});const nodeLabels=objects.map(o=>{const el=document.createElement('span');el.className='graph-label';el.textContent=o.node.title;el.hidden=true;labels.append(el);return{el,o}});
 const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#c9e99a',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));halo.visible=false;scene.add(halo);
 const focusOrbit=new THREE.Group();focusOrbit.name='selection-orbits';const orbitMaterial=new THREE.MeshBasicMaterial({color:'#c3d6ff',transparent:true,opacity:.5,depthWrite:false});for(const angle of [0,1.12]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.012,6,80),orbitMaterial);ring.rotation.x=angle;focusOrbit.add(ring);}focusOrbit.visible=false;scene.add(focusOrbit);
 const pulse={value:0};let pulseAnimation;
 const bounds=new THREE.Mesh(new THREE.SphereGeometry(layout.radius+6,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,uniforms:{opacity:{value:.07}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform float opacity;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(.35,.54,.85,rim*opacity);}' }));bounds.name='spherical-map-envelope';bounds.renderOrder=1;scene.add(bounds);
 const project=new THREE.Vector3();let width=1,height=1;
 function updateVisibility(){const parents=new Set();function walk(id){for(const p of indexed.get(id)?.node.deps||[]){if(!parents.has(p)){parents.add(p);walk(p)}}}if(selected){if(path)walk(selected);else indexed.get(selected).node.deps.forEach(id=>parents.add(id));}
 const children=new Set(data.nodes.filter(n=>n.deps.includes(selected)).map(n=>n.id));objects.forEach(o=>{const matches=category==='all'||o.node.category===category;const relevant=!selected||o.node.id===selected||parents.has(o.node.id)||children.has(o.node.id);o.targetAlpha=matches?(relevant?1:.17):.06;if(o.node.id===selected)o.targetAlpha=1;if(reduced)o.alpha=o.targetAlpha;o.sprite.material.color.set(progress.has(o.node.id)?'#d7e6af':catMap.get(o.node.category).color);o.sphere.material.color.copy(o.sprite.material.color);o.sphere.material.emissive.copy(o.sprite.material.color)});
 edges.forEach(e=>{e.highlight=!!selected&&(path?(parents.has(e.from)&&(parents.has(e.to)||e.to===selected)):(e.to===selected||e.from===selected));const matches=category==='all'||indexed.get(e.from).node.category===category&&indexed.get(e.to).node.category===category;e.targetOpacity=e.highlight?.98:selected?.025:matches?.44:.025;e.targetEmphasis=e.highlight?1:0;});transitioning=!reduced;halo.visible=!!selected;focusOrbit.visible=!!selected;bounds.material.uniforms.opacity.value=selected?.025:.07;if(selected){halo.position.copy(indexed.get(selected).position);halo.scale.setScalar(indexed.get(selected).size*13);focusOrbit.position.copy(indexed.get(selected).position);focusOrbit.scale.setScalar(indexed.get(selected).size*2.35)}dirty=true;}
 const labelMeasurements=new WeakMap();
 document.fonts?.ready.then(()=>{for(const {el} of nodeLabels)labelMeasurements.delete(el);for(const {el} of categoryLabels)labelMeasurements.delete(el);labelMeasurements.delete(hoverLabel);dirty=true;});
 function drawLabels(){
 const close=camera.position.distanceTo(controls.target)<250,candidates=[];
 const all=[hoverLabel,...categoryLabels.map(v=>v.el),...nodeLabels.map(v=>v.el)];
 for(const el of all)el.hidden=true;
 function add(el,position,priority,offset,opacity){
 project.copy(position).project(camera);const x=(project.x*.5+.5)*width,y=(-project.y*.5+.5)*height;
 if(project.z<=-1||project.z>=1||x<0||x>width||y<0||y>height)return;
 el.hidden=false;el.style.visibility='hidden';
 candidates.push({el,x,y,priority,offset,opacity,depth:project.z});
 }
 if(hovered){const o=indexed.get(hovered);hoverLabel.textContent=o.node.title;add(hoverLabel,o.position,0,22,1);}
 for(const {el,o} of nodeLabels){
 if(o.node.id===hovered)continue; // Never draw a second name under its tooltip.
 const isSelected=o.node.id===selected;
 el.classList.toggle('selected',isSelected);
 if(isSelected||mode==='map'&&close&&o.alpha>.7&&camera.position.distanceTo(o.position)<270)add(el,o.position,isSelected?1:2,isSelected?24:18,isSelected?1:.75);
 }
 if(!close)for(const {el,position,c} of categoryLabels)if(category==='all'||category===c.id)add(el,position,3,-10,selected?.28:.6);
 // Batch writes before measuring; cache unchanged labels rather than reading layout every frame.
 for(const item of candidates){const el=item.el,key=width+':'+el.className+':'+el.textContent;let size=labelMeasurements.get(el);
 if(!size||size.key!==key){const w=el.offsetWidth,h=el.offsetHeight;size={key,width:w||Math.min(width-24,el.textContent.length*7+24),height:h||32};if(w&&h)labelMeasurements.set(el,size);}
 item.width=size.width;item.height=size.height;
 }
 for(const item of candidates)item.el.hidden=true;
 for(const item of placeLabels(candidates,width,height)){const el=item.el;el.hidden=false;el.style.visibility='visible';el.style.transform=`translate(${item.left}px,${item.top}px)`;el.style.opacity=item.opacity;el.style.zIndex=String(5-item.priority);}
 }
 function tick(time){if(!active)return;frame=requestAnimationFrame(tick);if(document.hidden||!visible)return;if(mobile&&!dirty&&time-lastPaint<32)return;lastPaint=time;const dt=Math.min((time-lastTime)/1000||.016,.05);lastTime=time;controls.update();if(!dirty&&!auto&&!transitioning&&reduced)return;transitioning=false;if(!reduced)ambientTime+=dt;cosmos.update(dt,camera,reduced);
 objects.forEach(o=>{if(Math.abs(o.targetAlpha-o.alpha)>.003){o.alpha+= (o.targetAlpha-o.alpha)*(1-Math.exp(-dt*18));transitioning=true;}else o.alpha=o.targetAlpha;o.targetScale=o.node.id===selected?1.3:o.node.id===hovered?1.15:1;if(Math.abs(o.scale-o.targetScale)>.003){o.scale+=(o.targetScale-o.scale)*(reduced?1:1-Math.exp(-dt*16));transitioning=true;}const distance=camera.position.distanceTo(o.position),lod=1-THREE.MathUtils.smoothstep(distance,160,300);o.sphere.visible=lod>.01&&o.alpha>.1;o.sphere.material.opacity=lod*o.alpha;o.sphere.material.emissiveIntensity=o.node.id===selected?.3:o.node.id===hovered?.42:.18;o.sphere.scale.setScalar(o.size*(1+lod*.65)*o.scale);o.sprite.material.opacity=(1-lod*.94)*o.alpha;o.sprite.scale.setScalar((12+o.size)*o.scale);});if(flows.update(dt,reduced,pixelRatio))transitioning=true;if(selected){focusOrbit.quaternion.copy(camera.quaternion);focusOrbit.rotateZ(ambientTime*.12);orbitMaterial.opacity=.35+pulse.value*.3;focusOrbit.scale.setScalar(7.2*(1+pulse.value*.08));halo.material.opacity=.16+pulse.value*.12;}
 renderer.render(scene,camera);drawLabels();dirty=false;}
 function start(){if(!mount)return;if(!active){active=true;frame=requestAnimationFrame(tick)}}
 function resize(){if(!mount)return;const rect=mount.getBoundingClientRect();width=Math.max(rect.width,1);height=Math.max(rect.height,1);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(!selected){const direction=camera.position.clone().sub(controls.target).normalize();camera.position.copy(controls.target).addScaledVector(direction,overviewDistance());}dirty=true;}
 const observer=new ResizeObserver(resize);let down;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hitTest(x,y){const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/width*2-1,-(y-rect.top)/height*2+1);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);let nearest=null,best=Infinity;for(const o of objects){if(o.targetAlpha<.3)continue;const radius=Math.max(o.size*o.scale*1.65,10*camera.position.distanceTo(o.position)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*2/height);const hit=raycaster.ray.intersectSphere(new THREE.Sphere(o.position,radius),new THREE.Vector3());if(hit){const distance=camera.position.distanceTo(hit);if(distance<best){best=distance;nearest=o}}}return nearest;}
 renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons)return;const id=hitTest(e.clientX,e.clientY)?.node.id||null;if(id!==hovered){hovered=id;renderer.domElement.style.cursor=id?'pointer':'grab';dirty=true}});renderer.domElement.addEventListener('pointerleave',()=>{hovered=null;hoverLabel.hidden=true;dirty=true});
 renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,time:performance.now()});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7||performance.now()-down.time>650)return;down=null;const nearest=hitTest(e.clientX,e.clientY);if(nearest){options.onSelect(nearest.node.id)}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();const hint=document.createElement('div');hint.className='fallback';hint.innerHTML='<h2>3D-представление приостановлено</h2><p>Перезагрузите страницу или используйте список и программу.</p>';mount?.append(hint)});
 function move(position,target,duration=820){camAnimation?.cancel();if(reduced){camera.position.copy(position);controls.target.copy(target);controls.update();dirty=true;return;}const p={x:camera.position.x,y:camera.position.y,z:camera.position.z,tx:controls.target.x,ty:controls.target.y,tz:controls.target.z};const apply=()=>{camera.position.set(p.x,p.y,p.z);controls.target.set(p.tx,p.ty,p.tz);controls.update();dirty=true};camAnimation=animate(p,{x:position.x,y:position.y,z:position.z,tx:target.x,ty:target.y,tz:target.z,duration:reduced?0:duration,ease:'outExpo',onUpdate:apply,onComplete:apply});}
 function focus(id){const o=indexed.get(id);if(!o)return;const direction=camera.position.clone().sub(controls.target).normalize();const target=o.position.clone();if(width>800)target.addScaledVector(new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),12);move(target.clone().addScaledVector(direction,112),target,820);}
 function overviewDistance(){const half=THREE.MathUtils.degToRad(camera.fov/2);return Math.max(460,(layout.radius+22)/(Math.tan(half)*Math.min(1,camera.aspect)))*1.06;}
 function reset(){auto=false;controls.autoRotate=false;move(new THREE.Vector3(0,12,overviewDistance()),new THREE.Vector3(0,0,0));}
 function suspend(){pulseAnimation?.cancel();observer.disconnect();inViewObserver.disconnect();active=false;cancelAnimationFrame(frame);camAnimation?.cancel();}
 const inViewObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){dirty=true;lastTime=performance.now()}},{threshold:.02});document.addEventListener('visibilitychange',()=>{if(!document.hidden){dirty=true;lastTime=performance.now()}});
 updateVisibility();return{mount(el,newMode){observer.disconnect();mount=el;mode=newMode;mount.prepend(renderer.domElement);mount.append(labels);observer.observe(mount);inViewObserver.disconnect();inViewObserver.observe(mount);visible=true;auto=newMode==='overview'&&!reduced;controls.autoRotate=auto;controls.enablePan=newMode==='map';controls.enableZoom=newMode==='map';controls.target.set(0,0,0);resize();camera.position.set(0,12,overviewDistance());dirty=true;start()},suspend,select(id,all){const changed=selected!==id;selected=id;path=all;if(changed){pulseAnimation?.cancel();pulse.value=0;if(id&&!reduced)pulseAnimation=animate(pulse,{value:[1,0],duration:650,ease:'outExpo',onUpdate:()=>dirty=true});}updateVisibility()},filter(id){category=id;updateVisibility()},focus,reset,zoom(factor){const direction=camera.position.clone().sub(controls.target);const distance=THREE.MathUtils.clamp(direction.length()*factor,controls.minDistance,controls.maxDistance);move(controls.target.clone().add(direction.normalize().multiplyScalar(distance)),controls.target.clone(),360)},toggleRotate(){auto=!auto;controls.autoRotate=auto;dirty=true;return auto},setProgress(value){progress=value;updateVisibility()},setReduced(value){reduced=value;if(value){auto=false;controls.autoRotate=false;camAnimation?.cancel();pulseAnimation?.cancel();pulse.value=0}updateVisibility()}};
}
