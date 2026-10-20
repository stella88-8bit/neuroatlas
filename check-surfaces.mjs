import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.js';
import {createPlanetSurfaces} from './dist/planet-surfaces.js';
import {createCosmos} from './dist/cosmos.js';
const categories=['P','M','N','S','C','L','U','E','H','X'];
for(const mobile of [false,true]){
 const make=createPlanetSurfaces(mobile),signatures=new Set();
 for(const category of categories){
 const s=make({category},0);assert.equal(s,make({category},3),'Geometry/textures must be reused');
 assert.notDeepEqual(s.map.image.data,make({category},1).map.image.data,'Topics have surface variants');
 signatures.add(Buffer.from(s.map.image.data).toString('base64'));
 const p=s.geometry.attributes.position;
 let min=Infinity,max=0;
 for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));min=Math.min(min,radius);max=Math.max(max,radius);}
 assert(min>=.975&&max<=1.025);assert(max-min>.015,'Actual geometric relief required');
 assert(Array.from(s.geometry.attributes.normal.array).every(Number.isFinite));
 const {data,width,height}=s.map.image;
 for(let y=0;y<height;y++)assert.deepEqual(data.slice(y*width*4,y*width*4+4),data.slice((y*width+width-1)*4,(y*width+width)*4),'No longitude texture seam');
 }
 assert.equal(signatures.size,10,'Each area has its own texture');
 const scene=new THREE.Scene(),cosmos=createCosmos(scene,{mobile}),cloud=scene.getObjectByName('ambient-tidal-currents');
 assert.equal(cloud.geometry.attributes.position.count,mobile?2600:6800);
 const positions=cloud.geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const r=new THREE.Vector3().fromBufferAttribute(positions,i).length();assert(r>=173.99&&r<=359.01);}
 const camera={position:new THREE.Vector3()};cosmos.update(1,camera,false);const t=cloud.material.uniforms.time.value;assert(t>0);cosmos.update(1,camera,true);assert.equal(cloud.material.uniforms.time.value,t);cosmos.update(1,camera,false);assert(cloud.material.uniforms.time.value>t);

}
console.log('PASS: ten distinct seamless surface families, topic variations, bounded real relief, shared assets, desktop/mobile particle budgets and reduced-motion freeze.');
