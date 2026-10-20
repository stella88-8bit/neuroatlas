import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.js';
import { sphericalLayout } from './dist/layout.js';
import { createCosmos } from './dist/cosmos.js';
import { createDependencyFlows } from './dist/flows.js';
import { placeLabels } from './dist/label-layout.js';
import { createPlanetSurfaces } from './dist/planet-surfaces.js';
const data=JSON.parse(fs.readFileSync(new URL('./dist/data.json',import.meta.url)));
const layout=sphericalLayout(data),again=sphericalLayout(data);assert.equal(layout.positions.size,116);assert.deepEqual([...layout.positions],[...again.positions]);
const positions=[...layout.positions.values()];let separation=Infinity;
for(let i=0;i<positions.length;i++){assert(positions[i].every(Number.isFinite));assert(Math.hypot(...positions[i])<=layout.radius+1e-8);for(let j=0;j<i;j++)separation=Math.min(separation,Math.hypot(...positions[i].map((v,k)=>v-positions[j][k])))}
assert(separation>14);for(let axis=0;axis<3;axis++){assert(Math.min(...positions.map(v=>v[axis]))<-110);assert(Math.max(...positions.map(v=>v[axis]))>110)}
class Element {constructor(){this.style={};this.children=[];this.listeners={};this.classList={toggle(){},add(){},remove(){}};}append(...els){this.children.push(...els)}prepend(...els){this.children.unshift(...els)}setAttribute(){}addEventListener(type,fn){this.listeners[type]=fn}getBoundingClientRect(){return{width:1100,height:720,left:0,top:0}}getContext(){return{createRadialGradient(){return{addColorStop(){}}},fillRect(){}}}}
let scene,camera,frame;const doc={hidden:false,createElement:()=>new Element(),addEventListener(){}};
class Renderer {constructor(){this.domElement=new Element()}setPixelRatio(){}setSize(){}render(s,c){scene=s;camera=c;c.updateMatrixWorld();s.updateMatrixWorld();}}
class Controls {constructor(c){this.camera=c;this.target=new THREE.Vector3()}addEventListener(){}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld()}}
class ResizeObserver {observe(){}disconnect(){}}
class IntersectionObserver {constructor(cb){this.cb=cb}observe(){this.cb([{isIntersecting:true}])}disconnect(){}}
function animate(target,params){for(const name of ['x','y','z','tx','ty','tz','value'])if(name in params)target[name]=Array.isArray(params[name])?params[name].at(-1):params[name];params.onUpdate?.();params.onComplete?.();return{cancel(){}}}
const source=fs.readFileSync(new URL('./dist/graph.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace('export function','function');
const factory=new Function('THREE','OrbitControls','animate','sphericalLayout','createCosmos','createDependencyFlows','placeLabels','createPlanetSurfaces','document','window','ResizeObserver','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio','performance','"use strict";'+source+';return createGraph;');
const createGraph=factory({...THREE,WebGLRenderer:Renderer},Controls,animate,sphericalLayout,createCosmos,createDependencyFlows,placeLabels,createPlanetSurfaces,doc,{innerWidth:1100},ResizeObserver,IntersectionObserver,fn=>(frame=fn,1),()=>{},1,performance);
let selected;const graph=createGraph(data,{reduced:false,onSelect:id=>selected=id});const mount=new Element();graph.mount(mount,'map');frame(16);
assert(scene.getObjectByName('animated-nebula'));assert(scene.getObjectByName('twinkling-starfield'));assert.equal(scene.getObjectByName('twinkling-starfield').geometry.attributes.position.count,32000);
const spheres=scene.children.filter(o=>o.material?.isMeshPhysicalMaterial);assert.equal(spheres.length,116);assert(spheres.every(s=>s.geometry.parameters.widthSegments>=32&&s.material.clearcoat===1));
const streams=scene.getObjectByName('directed-dependency-streams');
assert(streams?.isPoints);assert.equal(streams.geometry.attributes.position.count,293*32);
assert(!scene.children.some(o=>o.isLineSegments),'Legacy solid connections remain');
let edgeIndex=0;
for(const node of data.nodes)for(const parent of node.deps){
  const start=edgeIndex++*32,attrs=streams.geometry.attributes;
  assert.deepEqual(Array.from(attrs.position.array.slice(start*3,start*3+3)),layout.positions.get(parent).map(Math.fround),'Flow must start at prerequisite');
  assert.deepEqual(Array.from(attrs.end.array.slice(start*3,start*3+3)),layout.positions.get(node.id).map(Math.fround),'Flow must end at dependent');
  const vectors=['position','controlA','controlB','end'].map(key=>new THREE.Vector3().fromBufferAttribute(attrs[key],start));
  const curve=new THREE.CubicBezierCurve3(...vectors);
  for(const p of curve.getPoints(30))assert(p.length()<layout.radius+6,'Flow outside map sphere');
  const travel=attrs.travel;assert(travel.getY(start)>0,'Flow moves forward');assert.equal(travel.getZ(start),0);assert.equal(travel.getZ(start+7),1,'Bright head must lead tapering tail');
}
for(const name of ['black-hole','event-horizon','accretion-disk','accretion-plasma','photon-sphere','pulsar','quasar','quasar-disk','ringed-planet','comet-0','comet-1','spiral-galaxy-0','spiral-galaxy-1','spiral-galaxy-2','volumetric-nebula-0'])assert(scene.getObjectByName(name),name);
const space=scene.getObjectByName('deep-space-objects');assert.equal(space.parent,scene);assert.equal(space.position.length(),0,'Nearby scenery must remain in world space');
const skyStars=scene.getObjectByName('twinkling-starfield').geometry.attributes.position;
const nearStars=scene.getObjectByName('nearby-star-spheres');assert.equal(nearStars.count,3500);assert.equal(nearStars.parent,scene);
const scenery=space.children.filter(o=>o.userData.cosmicKind);assert.equal(scenery.length,112);
const octants=new Array(8).fill(0);for(const o of scenery){assert(o.position.length()>=380&&o.position.length()<=1080);octants[(o.position.x>0?1:0)+(o.position.y>0?2:0)+(o.position.z>0?4:0)]++;}
assert(octants.every(n=>n>=10),'Scenery must fill all eight spatial octants');
let minStars=Infinity,minObjects=Infinity,minSpheres=Infinity;
const viewCamera=new THREE.PerspectiveCamera(43,1,.1,2000),frustum=new THREE.Frustum(),view=new THREE.Matrix4(),point=new THREE.Vector3(),instance=new THREE.Matrix4();
for(let i=0;i<96;i++) {
 const y=1-2*(i+.5)/96,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),direction=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
 let stars=0,balls=0;for(let j=0;j<skyStars.count;j++){point.fromBufferAttribute(skyStars,j).normalize();if(point.dot(direction)>Math.cos(THREE.MathUtils.degToRad(20)))stars++;}
 for(let j=0;j<nearStars.count;j++){nearStars.getMatrixAt(j,instance);point.setFromMatrixPosition(instance).normalize();if(point.dot(direction)>Math.cos(THREE.MathUtils.degToRad(20)))balls++;}
 minStars=Math.min(minStars,stars);minSpheres=Math.min(minSpheres,balls);
 viewCamera.position.copy(direction).multiplyScalar(485);viewCamera.lookAt(0,0,0);viewCamera.updateMatrixWorld();view.multiplyMatrices(viewCamera.projectionMatrix,viewCamera.matrixWorldInverse);frustum.setFromProjectionMatrix(view);
 minObjects=Math.min(minObjects,scenery.filter(o=>frustum.containsPoint(o.position)).length);
}
assert(minStars>=900,`Bare starfield: ${minStars}`);assert(minSpheres>=90,`Bare nearby stars: ${minSpheres}`);assert(minObjects>=4,`Bare orbit view: ${minObjects}`);
const allObjects=[];scene.traverse(o=>allObjects.push(o));
for(const obj of allObjects){const attr=obj.geometry?.attributes.position;if(attr)assert(Array.from(attr.array).every(Number.isFinite),obj.name+' geometry must be finite');}
const worldScene=new THREE.Scene(),worldSky=createCosmos(worldScene,{mobile:false});worldSky.update(.016,{position:new THREE.Vector3(100,20,300)},false);assert.equal(worldScene.getObjectByName('deep-space-objects').position.length(),0);assert.deepEqual(worldScene.getObjectByName('cosmic-environment').position.toArray(),[100,20,300]);
const time=scene.getObjectByName('animated-nebula').material.uniforms.time;const before=time.value;frame(33);assert(time.value>before);
graph.select('X12',true);graph.focus('X12');for(let i=1;i<=24;i++)frame(33+i*16);assert(spheres.some(s=>s.material.opacity>.5));assert(scene.getObjectByName('selection-orbits').visible);assert(streams.geometry.attributes.strength.array.some((v,i)=>i%2===1&&v>.8),'Selected flows must brighten');
const hoveredPosition=spheres[data.nodes.findIndex(n=>n.id==='X12')].position.clone().project(camera);
mount.children[0].listeners.pointermove({pointerType:'mouse',buttons:0,clientX:(hoveredPosition.x*.5+.5)*1100,clientY:(-hoveredPosition.y*.5+.5)*720});frame(460);
const labelElements=mount.children.find(el=>el.className==='stage-labels').children;
const tooltip=labelElements.find(el=>el.className.includes('hover-label'));
assert(!tooltip.hidden,'Hover tooltip should appear');
assert.equal(labelElements.filter(el=>!el.hidden&&el.textContent===tooltip.textContent).length,1,'Hovered topic name must appear exactly once');
mount.children[0].listeners.pointerleave();frame(480);
graph.setReduced(true);frame(500);const pausedTime=time.value,flowTime=streams.material.uniforms.time.value,comet=scene.getObjectByName('comet-0').position.clone();frame(520);assert.equal(time.value,pausedTime);assert.equal(streams.material.uniforms.time.value,flowTime);assert.deepEqual(scene.getObjectByName('comet-0').position,comet);
graph.filter('M');frame(550);assert(streams.geometry.attributes.strength.array.some((v,i)=>i%2===0&&v<.03),'Unrelated flows must dim');graph.setProgress(new Set(['M0']));frame(580);graph.reset();frame(610);graph.suspend();
mount.getBoundingClientRect=()=>({width:320,height:720,left:0,top:0});graph.mount(mount,'map');graph.select(null,false);graph.reset();frame(650);const halfWidth=camera.position.distanceTo(new THREE.Vector3())*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;assert(halfWidth>layout.radius+6);graph.suspend();
const smallScene=new THREE.Scene(),smallSky=createCosmos(smallScene,{mobile:true});assert.equal(smallScene.getObjectByName('twinkling-starfield').geometry.attributes.position.count,16000);smallSky.update(.016,camera,true);
assert.equal(smallScene.getObjectByName('nearby-star-spheres').count,1500);assert.equal(smallScene.getObjectByName('deep-space-objects').children.filter(o=>o.userData.cosmicKind).length,72);
assert.equal(smallScene.getObjectByName('accretion-disk').geometry.attributes.position.count,1100);
const testEdges=[{from:'a',to:'b',phase:0,curve:new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(1,2,3),new THREE.Vector3(4,5,6),new THREE.Vector3(7,8,9))}];
const smallFlow=createDependencyFlows(smallScene,testEdges,{mobile:true,colors:()=> '#abcdee'});assert.equal(smallFlow.points.geometry.attributes.position.count,18);
console.log(`PASS: 116 spheres, ${separation.toFixed(1)} minimum spacing; all 293 flows oriented prerequisite → dependent and contained within sphere; 9,376 desktop / 5,274 mobile flow particles; ${minStars}+ stars / ${minSpheres}+ real star spheres per 20° cap, ${minObjects}+ objects across 96 orbit views, all eight octants filled; parallax, selection fade, animation freeze, mobile budget, filters, progress, reset and lifecycle. WebGL renderer/controls mocked; visual GPU output unverified.`);
