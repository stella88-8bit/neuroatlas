// Stable spherical sectors keep scientific categories recognizable without a flat layout.
export function sphericalLayout(data, radius = 142) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const sample = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const positions = new Map(), centers = new Map();
  data.categories.forEach((category, index) => {
    const y = 1 - 2 * (index + .5) / data.categories.length;
    const side = Math.sqrt(1 - y * y), phi = index * golden;
    const direction = [Math.cos(phi) * side, y, Math.sin(phi) * side];
    const tangent = [direction[2], 0, -direction[0]];
    const length = Math.hypot(...tangent); for (let i = 0; i < 3; i++) tangent[i] /= length;
    const bitangent = [direction[1] * tangent[2], direction[2] * tangent[0] - direction[0] * tangent[2], -direction[1] * tangent[0]];
    centers.set(category.id, direction.map(v => v * (radius + 12)));
    const group = data.nodes.filter(n => n.category === category.id);
    group.forEach((node, k) => {
      const angle = .47 * Math.sqrt((k + .5) / group.length);
      const azimuth = k * golden + index * .79;
      const distance = radius * (.43 + .57 * Math.cbrt(sample(k * 17 + index * 79 + 5)));
      const point = direction.map((v, i) => distance * (v * Math.cos(angle) + Math.sin(angle) * (tangent[i] * Math.cos(azimuth) + bitangent[i] * Math.sin(azimuth))));
      positions.set(node.id, point);
    });
  });
  return { positions, centers, radius };
}
