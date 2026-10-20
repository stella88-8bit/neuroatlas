import * as THREE from './vendor/three.js';

// Closed, phase-continuous trajectories: particles never wrap or respawn.
export function createAmbientCurrents(scene,{mobile,time,rand}){
 const count=mobile?2600:6800,positions=[],colors=[],phases=[],sizes=[];
 const palette=['#89cddd','#b6a2df','#a9d8c2','#e2c7a0'];
 for(let i=0;i<count;i++){
 const y=1-2*(i+.5)/count,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),distance=174+rand(i*43+1)*185;
 positions.push(Math.cos(a)*r*distance,y*distance,Math.sin(a)*r*distance);
 colors.push(...new THREE.Color(palette[i%4]).toArray());phases.push(rand(i*43+2)*Math.PI*2);sizes.push(.5+rand(i*43+3)*1.15);
 }
 const geometry=new THREE.BufferGeometry();
 for(const [key,values,width]of [['position',positions,3],['color',colors,3],['phase',phases,1],['size',sizes,1]])geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,width));
 const currents=new THREE.Points(geometry,new THREE.ShaderMaterial({
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,uniforms:{time},
 vertexShader:`attribute vec3 color;attribute float phase,size;uniform float time;varying vec3 tint;varying float alpha;
 void main(){
 float layer=mod(floor(phase*13.),3.);float direction=layer<1.?1.:-1.;
 float t=time*(.009+layer*.003)*direction;
 vec3 p=position;float angle=t+sin(time*.035+phase)*.045;
 mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
 if(layer<1.)p.xz=turn*p.xz;else if(layer<2.)p.xy=turn*p.xy;else p.yz=turn*p.yz;
 p+=vec3(sin(time*.055+phase+p.y*.012),cos(time*.041+phase+p.z*.014),sin(time*.047-phase+p.x*.013))*7.;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(size*780./max(40.,-mv.z),1.,9.);
 tint=color;alpha=(.26+.10*sin(time*.11+phase))*smoothstep(18.,65.,-mv.z);
 }`,
 fragmentShader:`varying vec3 tint;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float glow=exp(-r*r*5.);gl_FragColor=vec4(tint,glow*alpha);
 #include <colorspace_fragment>
 }`
 }));
 currents.name='ambient-tidal-currents';currents.frustumCulled=false;scene.add(currents);return currents;
}
