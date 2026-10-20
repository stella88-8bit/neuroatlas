import * as THREE from './vendor/three.js';

// Every curve is oriented from a prerequisite to the module that requires it.
// Comet heads lead their smaller tails; no reverse or decorative connections.
export function createDependencyFlows(scene, edges, { mobile, colors }) {
  const packets = mobile ? 3 : 4, tail = mobile ? 6 : 8;
  const perEdge = packets * tail;
  const attributes = {
    position: [3, []], controlA: [3, []], controlB: [3, []], end: [3, []],
    originColor: [3, []], destinationColor: [3, []], travel: [4, []], strength: [2, []]
  };
  for (const [index, edge] of edges.entries()) {
    const { curve } = edge;
    const speed = THREE.MathUtils.clamp(15 / curve.getLength(), .045, .14);
    edge.flowStart = index * perEdge;
    edge.opacity = edge.targetOpacity = .44;
    edge.emphasis = edge.targetEmphasis = 0;
    const from = new THREE.Color(colors(edge.from)).lerp(new THREE.Color('#d6e8ff'), .26);
    const to = new THREE.Color(colors(edge.to)).lerp(new THREE.Color('#ecdcff'), .26);
    for (let packet = 0; packet < packets; packet++) {
      for (let bead = 0; bead < tail; bead++) {
        for (const [name, value] of Object.entries({
          position: curve.v0.toArray(), controlA: curve.v1.toArray(),
          controlB: curve.v2.toArray(), end: curve.v3.toArray(),
          originColor: from.toArray(), destinationColor: to.toArray(),
          travel: [packet / packets + edge.phase, speed, bead / (tail - 1), .035 + speed * .14],
          strength: [.44, 0]
        })) attributes[name][1].push(...value);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, [size, values]] of Object.entries(attributes)) {
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, size));
  }
  geometry.attributes.strength.setUsage(THREE.DynamicDrawUsage);
  const uniforms = { time: { value: 0 }, pixelRatio: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: `
      attribute vec3 controlA, controlB, end, originColor, destinationColor;
      attribute vec4 travel; attribute vec2 strength;
      uniform float time, pixelRatio;
      varying vec3 tint; varying float opacity;
      void main() {
        float t = fract(time * travel.y + travel.x - travel.z * travel.w);
        float u = 1. - t;
        vec3 point = u*u*u*position + 3.*u*u*t*controlA + 3.*u*t*t*controlB + t*t*t*end;
        vec4 mv = modelViewMatrix * vec4(point, 1.);
        gl_Position = projectionMatrix * mv;
        float head = pow(1. - travel.z, 1.6);
        float size = mix(.32, 1.35, head) * (1. + strength.y * .32);
        gl_PointSize = clamp(size * pixelRatio * 1050. / max(24., -mv.z), .8, 18. * pixelRatio);
        tint = mix(originColor, destinationColor, smoothstep(.12, .88, t));
        tint = mix(tint, vec3(.91, .97, 1.), strength.y * .38 + head * .15);
        float endpoint = smoothstep(0., .025, t) * (1. - smoothstep(.975, 1., t));
        opacity = strength.x * mix(.12, 1., head) * endpoint;
      }`,
    fragmentShader: `
      varying vec3 tint; varying float opacity;
      void main() {
        float r = length(gl_PointCoord - .5) * 2.;
        if(r > 1.) discard;
        float light = exp(-r*r*5.5) + .2 * exp(-r*r*1.7);
        gl_FragColor = vec4(tint, light * opacity);
      
#include <colorspace_fragment>
}`
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'directed-dependency-streams';
  points.frustumCulled = false; scene.add(points);
  let clock = 0;
  return {
    points, perEdge,
    update(dt, reduced, pixelRatio) {
      if (!reduced) clock += dt;
      uniforms.time.value = clock;
      uniforms.pixelRatio.value = pixelRatio;
      let changed = false;
      const blend = reduced ? 1 : 1 - Math.exp(-dt * 9);
      for (const edge of edges) {
        if (Math.abs(edge.targetOpacity - edge.opacity) < .0005 && Math.abs(edge.targetEmphasis - edge.emphasis) < .0005) continue;
        edge.opacity += (edge.targetOpacity - edge.opacity) * blend;
        edge.emphasis += (edge.targetEmphasis - edge.emphasis) * blend;
        for (let i = edge.flowStart; i < edge.flowStart + perEdge; i++) {
          geometry.attributes.strength.setXY(i, edge.opacity, edge.emphasis);
        }
        changed = true;
      }
      if (changed) geometry.attributes.strength.needsUpdate = true;
      return changed;
    }
  };
}
