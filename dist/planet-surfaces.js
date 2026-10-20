import * as THREE from './vendor/three.js';

// Seamless 3D fields: no longitude seam, including bump detail at the poles.
export function surfaceHeight(category,x,y,z,seed=0){
 const p=seed*.73,grain=Math.sin(x*33+p)*Math.sin(y*29-p)*Math.sin(z*31+p);
 const folds=Math.sin(x*9+Math.sin(y*7+p)*1.4+Math.cos(z*8-p));
 const cells=Math.cos(x*14+p)*Math.cos(y*14-p)*Math.cos(z*14);
 let h;
 switch(category){
 case 'P': h=Math.pow(Math.abs(Math.sin(x*13+p)*Math.sin(z*13-p)),.22)*.7+Math.sin(y*25)*.15;break;
 case 'M': h=Math.sin(x*12+y*8+p)*Math.cos(z*12-y*8)*.8;break;
 case 'N': h=folds*.7+Math.sin(y*17+z*9+p)*.18;break;
 case 'S': h=Math.sin(y*22+Math.sin(x*5+p)*2+z*4)*.8;break;
 case 'C': h=folds*.4+cells*.5;break;
 case 'L': h=Math.tanh(cells*4)*.7+folds*.15;break;
 case 'U': h=Math.sin((Math.hypot(x,z)+y*.25)*24+p)*.8;break;
 case 'E': h=Math.sin(x*6+y*5+p)*Math.cos(z*7-y*3)*.7;break;
 case 'H': h=Math.pow(Math.abs(cells),.3)*1.4-.7;break;
 default: h=folds*.45+Math.sin(y*18+z*7+p)*.35;
 }
 return Math.max(-1,Math.min(1,h+grain*.12));
}

export function createPlanetSurfaces(mobile){
 const cache=new Map();
 return (node,index)=>{
 const variant=index%3,key=node.category+variant;
 if(cache.has(key))return cache.get(key);
 const geometry=new THREE.SphereGeometry(1,mobile?32:48,mobile?24:36);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){
 const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
 const radius=1+.024*surfaceHeight(node.category,x,y,z,variant);
 positions.setXYZ(i,x*radius,y*radius,z*radius);
 }
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const w=256,h=128,pixels=new Uint8Array(w*h*4),relief=new Uint8Array(w*h*4);
 for(let v=0;v<h;v++)for(let u=0;u<w;u++){
 const a=(u===w-1?0:u/(w-1)*Math.PI*2),b=v/(h-1)*Math.PI;
 const x=-Math.cos(a)*Math.sin(b),y=Math.cos(b),z=Math.sin(a)*Math.sin(b);
 const n=surfaceHeight(node.category,x,y,z,variant),k=(v*w+u)*4;
 const shade=Math.round(172+63*n);
 pixels.set([shade,Math.min(255,shade+5),Math.min(255,shade+10),255],k);
 const r=Math.round((n*.5+.5)*255);relief.set([r,r,r,255],k);
 }
 const texture=new THREE.DataTexture(pixels,w,h),bump=new THREE.DataTexture(relief,w,h);
 for(const t of [texture,bump]){t.wrapS=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;}
 texture.colorSpace=THREE.SRGBColorSpace;
 const result={geometry,map:texture,bumpMap:bump};cache.set(key,result);return result;
 };
}
