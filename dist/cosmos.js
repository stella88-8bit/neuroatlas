import * as THREE from './vendor/three.js';
import { createAmbientCurrents } from './ambient-currents.js';

export function createCosmos(scene, { mobile }) {
  const group = new THREE.Group(); group.name = 'cosmic-environment'; scene.add(group);
  const uniforms = { time: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1450, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false, uniforms,
    vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform float time; varying vec3 direction;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float s=0.,a=.54;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec3(7.1,3.7,2.9);a*=.49;}return s;}
      void main(){
        vec3 d=normalize(direction);vec3 p=d*3.5+vec3(time*.006,0.,time*.003);
        float clouds=fbm(p);float fold=fbm(p*1.7+clouds*1.5);
        float band=exp(-pow((d.y*.82+d.x*.3-d.z*.14+.06+(clouds-.5)*.55)*2.9,2.));
        float density=pow(max(fold*.8+clouds*.35-.29,0.),1.7)*band;
        vec3 color=vec3(.008,.013,.03);
        color+=mix(vec3(.08,.12,.28),vec3(.29,.14,.32),smoothstep(-.5,.6,d.x))*density*.7;
        color+=vec3(.055,.16,.17)*pow(clouds,3.)*band*.28;
        color*=1.-.38*pow(max(0.,1.-band),.5);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  })); sky.renderOrder=-20; sky.name='animated-nebula'; group.add(sky);
  const count = mobile ? 16000 : 32000;
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count), phases = new Float32Array(count), colors = new Float32Array(count * 3);
  const rand = n => {const x = Math.sin(n * 139.7 + 19.2) * 43758.5453; return x - Math.floor(x)};
  for(let i=0;i<count;i++){
    // Equal-area full-sphere sampling prevents bare regions, including the poles.
    const y=1-2*(i+.5)/count,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),distance=650+rand(i*5+3)*650;
    positions.set([Math.cos(a)*r*distance,y*distance,Math.sin(a)*r*distance],i*3);
    sizes[i]=rand(i*5+4)>.99?3.6: .85+rand(i*7+9)*1.5;phases[i]=rand(i+300)*Math.PI*2;
    const color=new THREE.Color().setRGB(.62+rand(i+20)*.35,.71+rand(i+27)*.25,.8+rand(i+33)*.2);colors.set([color.r,color.g,color.b],i*3);
  }
  const starGeo = new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));starGeo.setAttribute('size',new THREE.BufferAttribute(sizes,1));starGeo.setAttribute('phase',new THREE.BufferAttribute(phases,1));starGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const stars=new THREE.Points(starGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false,uniforms,
    vertexShader:`attribute float size;attribute float phase;attribute vec3 color;uniform float time;varying vec3 tint;varying float brightness;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*900./max(100.,-mv.z),1.,5.);tint=color;brightness=.78+.16*sin(time*.55+phase);}`,
    fragmentShader:`varying vec3 tint;varying float brightness;void main(){float r=length(gl_PointCoord-.5)*2.;float core=exp(-r*r*6.);float glow=exp(-r*r*2.)*.12;gl_FragColor=vec4(tint,(core+glow)*brightness);
#include <colorspace_fragment>
}`
  }));stars.name='twinkling-starfield';stars.renderOrder=-10;group.add(stars);
  populateNearbyStars(scene,{mobile,time:uniforms.time,rand});
  createAmbientCurrents(scene,{mobile,time:uniforms.time,rand});
  const updateObjects=populateDeepSpace(scene,{mobile,time:uniforms.time,rand});
  let clock=0;
  return { update(dt,camera,reduced){group.position.copy(camera.position);if(!reduced)clock+=dt;uniforms.time.value=clock;stars.rotation.y=clock*.0016;sky.rotation.y=clock*.0007;updateObjects(clock);} };
}

function populateNearbyStars(scene,{mobile,time,rand}) {
  const count=mobile?1500:3500;
  // One instanced draw for real spheres; a second draw supplies soft coronas.
  const cores=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({fog:false,toneMapped:false,depthWrite:false}),count);
  cores.name='nearby-star-spheres';
  const transform=new THREE.Object3D(),positions=[],colors=[],sizes=[],phases=[];
  const palette=['#d9eaff','#fff0d2','#b6d7ff','#e7d5ff','#c4eee8'];
  for(let i=0;i<count;i++) {
    const y=1-2*(i+.5)/count,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),distance=620+rand(i*19+1)*800;
    const position=[Math.cos(a)*r*distance,y*distance,Math.sin(a)*r*distance];
    const size=.25+Math.pow(rand(i*19+2),3)*.7,color=new THREE.Color(palette[i%palette.length]);
    transform.position.set(...position);transform.scale.setScalar(size);transform.updateMatrix();cores.setMatrixAt(i,transform.matrix);cores.setColorAt(i,color);
    positions.push(...position);colors.push(...color.toArray());sizes.push(size*5);phases.push(rand(i*19+3)*Math.PI*2);
  }
  cores.computeBoundingSphere();scene.add(cores);
  const geometry=new THREE.BufferGeometry();
  for(const [name,values,width]of [['position',positions,3],['color',colors,3],['size',sizes,1],['phase',phases,1]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,width));
  const halos=new THREE.Points(geometry,new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false,uniforms:{time},
    vertexShader:`attribute vec3 color;attribute float size,phase;uniform float time;varying vec3 tint;varying float glow;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*950./max(80.,-mv.z),2.,20.);tint=color;glow=.28+.06*sin(time*.45+phase);}`,
    fragmentShader:`varying vec3 tint;varying float glow;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(tint,exp(-r*r*5.)*glow);
      #include <colorspace_fragment>
    }`
  }));halos.name='nearby-star-coronas';scene.add(halos);
}

// Nearby scenery stays in world space: camera movement reveals real parallax.
// Distant stars/nebula sky remain centered on the camera to keep the horizon deep.
function populateDeepSpace(scene, { mobile, time, rand }) {
  const space = new THREE.Group(); space.name = 'deep-space-objects'; scene.add(space);
  const moving = [];
  const dust = (name, positions, colors, sizes, phases, opacity = .65, orbit = 0, maxSize = 18) => {
    const geometry = new THREE.BufferGeometry();
    for (const [key, values, width] of [['position',positions,3],['color',colors,3],['size',sizes,1],['phase',phases,1]]) {
      geometry.setAttribute(key, new THREE.Float32BufferAttribute(values, width));
    }
    const cloud = new THREE.Points(geometry, new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false, fog:false,
      uniforms:{time, opacity:{value:opacity}, orbit:{value:orbit}, maxSize:{value:maxSize}},
      vertexShader:`attribute float size, phase; attribute vec3 color; uniform float time, orbit, maxSize; varying vec3 tint; varying float flicker;
        void main(){vec3 p=position;float a=time*orbit/(.65+length(p.xz)*.018);float c=cos(a),s=sin(a);p.xz=mat2(c,-s,s,c)*p.xz;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*900./max(40.,-mv.z),.5,maxSize);tint=color;flicker=.82+.12*sin(time*.35+phase);}`,
      fragmentShader:`uniform float opacity;varying vec3 tint;varying float flicker;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(tint,exp(-r*r*4.5)*opacity*flicker);
#include <colorspace_fragment>
}`
    }));
    // Shader-based orbit must not move particles outside a stale CPU bounding box.
    geometry.computeBoundingSphere(); cloud.frustumCulled=false; cloud.name=name;
    return cloud;
  };
  function disk(name, inner, outer, count, warm, cool, opacity = .8) {
    const positions=[], colors=[], sizes=[], phases=[];
    for(let i=0;i<count;i++) {
      const t=rand(i*13+3), r=inner+(outer-inner)*Math.pow(t,.68), a=rand(i*13+4)*Math.PI*2;
      positions.push(Math.cos(a)*r,(rand(i*13+5)-.5)*1.7,Math.sin(a)*r);
      const color=new THREE.Color(warm).lerp(new THREE.Color(cool),t);
      colors.push(...color.toArray());sizes.push(.7+rand(i*13+6)*1.9);phases.push(a*4);
    }
    return dust(name,positions,colors,sizes,phases,opacity,.34);
  }
  function corona(radius, color, opacity) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius,32,24),new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
      uniforms:{tint:{value:new THREE.Color(color)},opacity:{value:opacity}},
      vertexShader:`varying vec3 n,v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform vec3 tint;uniform float opacity;varying vec3 n,v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint,rim*opacity);
#include <colorspace_fragment>
}`
    }));
  }
  const hole=new THREE.Group();hole.name='black-hole';hole.position.set(-300,200,-620);hole.rotation.set(.6,0,-.3);space.add(hole);
  const horizon=new THREE.Mesh(new THREE.SphereGeometry(18,48,32),new THREE.MeshBasicMaterial({color:'#010108',fog:false}));horizon.name='event-horizon';hole.add(horizon);
  const plasma=new THREE.Mesh(new THREE.RingGeometry(21,67,128,12),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,
    uniforms:{time},
    vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float time;varying vec3 p;void main(){
      float r=length(p.xy),t=clamp((r-21.)/46.,0.,1.),a=atan(p.y,p.x);
      float spiral=.65+.35*sin(a*5.-r*.65+time*.5+sin(a*3.+r*.2)*.6);
      float bands=.72+.28*sin(r*2.4-time*.3);
      vec3 color=mix(vec3(1.,.6,.23),vec3(.42,.22,.65),smoothstep(.1,1.,t));
      color=mix(color,vec3(1.,.88,.66),exp(-t*7.));
      float rim=smoothstep(0.,.08,t)*(1.-smoothstep(.65,1.,t));
      gl_FragColor=vec4(color,rim*spiral*bands*(.14+.1*(1.-t)));
      #include <colorspace_fragment>
    }`
  }));plasma.name='accretion-plasma';plasma.rotation.x=Math.PI/2;hole.add(plasma);
  hole.add(disk('accretion-disk',22,66,mobile?1100:2300,'#fff1c5','#b175dd',.88));
  const photon=new THREE.Mesh(new THREE.TorusGeometry(19.5,.55,12,160),new THREE.MeshBasicMaterial({color:'#ffe3b0',transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));photon.rotation.x=Math.PI/2;hole.add(photon);
  const lens=corona(20.5,'#ffbe8c',.46);lens.name='photon-sphere';hole.add(lens);
  hole.add(corona(28,'#bca6ee',.08));

  function jet(length, radius, color, opacity) {
    const geometry=new THREE.ConeGeometry(radius,length,24,12,true);
    // Cone tip is the source; the outward end widens and dissolves into space.
    geometry.translate(0,-length/2,0);
    return new THREE.Mesh(geometry,new THREE.ShaderMaterial({
      transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,
      uniforms:{time,length:{value:length},tint:{value:new THREE.Color(color)},opacity:{value:opacity}},
      vertexShader:`varying vec3 p,n,v;void main(){p=position;vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float time,length,opacity;uniform vec3 tint;varying vec3 p,n,v;void main(){float d=clamp(-p.y/length,0.,1.);float wave=.75+.25*sin(d*16.-time*1.4);float soft=pow(abs(dot(normalize(n),normalize(v))),1.2);gl_FragColor=vec4(tint,opacity*(1.-d)*(1.-d)*smoothstep(0.,.07,d)*wave*soft);
#include <colorspace_fragment>
}`
    }));
  }
  function emitter(name, position, color, length, tilt) {
    const body=new THREE.Group();body.name=name;body.position.set(...position);body.rotation.z=tilt;space.add(body);
    const core=new THREE.Mesh(new THREE.SphereGeometry(5,24,16),new THREE.MeshBasicMaterial({color,toneMapped:false}));body.add(core);body.add(corona(8,color,.45));
    const beam=new THREE.Group();beam.rotation.z=.28;body.add(beam);
    const north=jet(length,15,color,.16),south=jet(length,15,color,.16);north.rotation.z=Math.PI;beam.add(north,south);
    moving.push(clock=>{beam.rotation.y=clock*.17;core.scale.setScalar(1+.06*Math.sin(clock*.65));});
    return body;
  }
  emitter('pulsar',[270,190,-650],'#9cdfff',145,-.55);
  const quasar=emitter('quasar',[95,-250,-840],'#d9b2ff',200,.8);
  quasar.add(disk('quasar-disk',8,29,mobile?350:650,'#e6edff','#ad7ed4',.5));

  // Spiral arms are actual depth-distributed particles, rather than sky decals.
  const galaxyPositions=[[-520,-170,-670],[470,310,-850],[-300,350,570]];
  for(let g=0;g<galaxyPositions.length;g++) {
    const positions=[],colors=[],sizes=[],phases=[],count=mobile?550:1100;
    for(let i=0;i<count;i++) {
      const r=Math.pow(rand(i*11+g*500+1),.66)*100;
      const a=(i%3)*Math.PI*2/3+r*.075+(rand(i*11+g*500+2)-.5)*.55;
      positions.push(Math.cos(a)*r,(rand(i*11+3)-.5)*(12-r*.08),Math.sin(a)*r*.7);
      const color=new THREE.Color('#ffe4bb').lerp(new THREE.Color(g===1?'#bda6fa':'#83c7e9'),r/100);
      colors.push(...color.toArray());sizes.push(.8+rand(i*11+4)*2);phases.push(a);
    }
    const galaxy=dust('spiral-galaxy-'+g,positions,colors,sizes,phases,.6,.018);
    galaxy.position.set(...galaxyPositions[g]);galaxy.rotation.set(.75+g*.2,.2,g*.55);space.add(galaxy);
  }

  for(let g=0;g<3;g++) {
    const positions=[],colors=[],sizes=[],phases=[],count=mobile?130:260;
    const tint=new THREE.Color(['#497bb5','#9263ab','#407e91'][g]);
    for(let i=0;i<count;i++) {
      const a=rand(i*17+g*400)*Math.PI*2,y=rand(i*17+1)*2-1,r=Math.cbrt(rand(i*17+2));
      const ring=Math.sqrt(1-y*y);positions.push(Math.cos(a)*ring*r*145,y*r*65,Math.sin(a)*ring*r*90);
      colors.push(...tint.toArray());sizes.push(30+rand(i*17+3)*65);phases.push(a);
    }
    const cloud=dust('volumetric-nebula-'+g,positions,colors,sizes,phases,.018,.007,90);
    cloud.position.set(...[[-200,240,-630],[230,-190,-570],[-420,-130,250]][g]);space.add(cloud);
    moving.push(clock=>{cloud.rotation.z=Math.sin(clock*.018+g)*.08;});
  }

  const planet=new THREE.Group();planet.name='ringed-planet';planet.position.set(450,-150,160);planet.rotation.set(.35,0,-.4);space.add(planet);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(18,40,28),new THREE.ShaderMaterial({
    uniforms:{time},fog:false,
    vertexShader:`varying vec3 p,n;void main(){p=position;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float time;varying vec3 p,n;void main(){float bands=.5+.5*sin(p.y*1.1+sin(p.x*.25+time*.02)*.6);vec3 c=mix(vec3(.12,.22,.31),vec3(.34,.48,.55),bands);float light=.14+.86*max(dot(normalize(n),normalize(vec3(-.7,.5,.6))),0.);gl_FragColor=vec4(c*light,1.);
#include <colorspace_fragment>
}`
  }));planet.add(globe);
  const ring=new THREE.Mesh(new THREE.RingGeometry(25,39,96),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,
    vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 p;void main(){float r=length(p.xy);float bands=.24+.25*sin(r*5.);float edge=smoothstep(25.,27.,r)*(1.-smoothstep(37.,39.,r));gl_FragColor=vec4(.48,.58,.68,bands*edge);
#include <colorspace_fragment>
}`
  }));ring.rotation.x=Math.PI/2;planet.add(ring);
  planet.add(corona(18.8,'#70afda',.2));

  for(let g=0;g<2;g++) {
    const positions=[],colors=[],sizes=[],phases=[];
    for(let i=0;i<100;i++){const t=i/99;positions.push(-t*85,(rand(i+g*99)-.5)*t*4,(rand(i+200)-.5)*t*4);const c=new THREE.Color(g?'#e8c6ff':'#b6eaff');colors.push(...c.toArray());sizes.push((1-t)*3+.3);phases.push(t);}
    const comet=dust('comet-'+g,positions,colors,sizes,phases,.7);space.add(comet);
    const forward=new THREE.Vector3(1,0,0),tangent=new THREE.Vector3();
    moving.push(clock=>{const a=clock*.012+g*3.2+.9;comet.position.set(Math.cos(a)*720,Math.sin(a*.7+g)*370,Math.sin(a)*720);tangent.set(-Math.sin(a),.36*Math.cos(a*.7+g),Math.cos(a)).normalize();comet.quaternion.setFromUnitVectors(forward,tangent);});
  }

  const clusterPositions=[],clusterColors=[],clusterSizes=[],clusterPhases=[];
  for(let i=0;i<(mobile?450:900);i++) {
    const y=rand(i*23+1)*2-1,a=rand(i*23+2)*Math.PI*2,r=Math.pow(rand(i*23+3),1.8)*42;
    clusterPositions.push(Math.cos(a)*Math.sqrt(1-y*y)*r,y*r,Math.sin(a)*Math.sqrt(1-y*y)*r);
    clusterColors.push(...new THREE.Color('#fff0cd').lerp(new THREE.Color('#a9caff'),r/42).toArray());
    clusterSizes.push(.8+rand(i*23+4)*2);clusterPhases.push(a);
  }
  const cluster=dust('globular-cluster',clusterPositions,clusterColors,clusterSizes,clusterPhases,.72);
  cluster.position.set(-460,210,420);space.add(cluster);

  const shellPositions=[],shellColors=[],shellSizes=[],shellPhases=[];
  for(let i=0;i<(mobile?300:600);i++) {
    const y=1-2*rand(i*29+1),a=rand(i*29+2)*Math.PI*2,r=28+rand(i*29+3)*9;
    shellPositions.push(Math.cos(a)*Math.sqrt(1-y*y)*r,y*r*.7,Math.sin(a)*Math.sqrt(1-y*y)*r);
    shellColors.push(...new THREE.Color('#72ccda').lerp(new THREE.Color('#c49be8'),(y+1)/2).toArray());
    shellSizes.push(4+rand(i*29+4)*7);shellPhases.push(a);
  }
  const remnant=new THREE.Group();remnant.name='planetary-nebula';remnant.position.set(390,-270,430);space.add(remnant);
  remnant.add(dust('ionized-nebula-shell',shellPositions,shellColors,shellSizes,shellPhases,.12,.012));
  remnant.add(new THREE.Mesh(new THREE.SphereGeometry(2,16,12),new THREE.MeshBasicMaterial({color:'#d4efff',fog:false,toneMapped:false})));

  // Reuse geometry/materials, but distribute the scenery across the entire sky.
  // Nothing depends on the camera's initial position or its starting hemisphere.
  const kinds=['black-hole','pulsar','quasar','ringed-planet','spiral-galaxy-0','volumetric-nebula-0','globular-cluster','comet-0','planetary-nebula','spiral-galaxy-1','volumetric-nebula-1','spiral-galaxy-2','comet-1','volumetric-nebula-2'];
  const prototypes=kinds.map(name=>space.getObjectByName(name));
  const count=mobile?72:112;
  for(let i=0;i<count;i++) {
    const source=prototypes[i%prototypes.length],object=source.clone(true);
    object.name='surrounding-'+source.name+'-'+i;
    object.userData.cosmicKind=source.name;
    const y=1-2*(i+.5)/count,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);
    const distance=410+rand(i*31+1)*640;
    object.position.set(Math.cos(a)*r*distance,y*distance,Math.sin(a)*r*distance);
    object.rotation.set(rand(i*31+2)*Math.PI,rand(i*31+3)*Math.PI*2,rand(i*31+4)*Math.PI*2);
    object.scale.setScalar(.35+rand(i*31+5)*.45);
    space.add(object);
    if(source.name==='pulsar'||source.name==='quasar') {
      const beams=object.children[2];
      moving.push(clock=>{beams.rotation.y=clock*.12+i;});
    } else if(source.name.startsWith('volumetric-nebula')) {
      const angle=object.rotation.z;
      moving.push(clock=>{object.rotation.z=angle+Math.sin(clock*.012+i)*.07;});
    } else if(source.name.startsWith('comet')) {
      // A local drift, rather than an orbit that would empty its assigned sky sector.
      const center=object.position.clone();
      moving.push(clock=>{object.position.copy(center);object.position.x+=Math.sin(clock*.025+i)*24;object.position.y+=Math.cos(clock*.025+i)*12;});
    }
  }
  return clock=>{for(const update of moving)update(clock);};
}
