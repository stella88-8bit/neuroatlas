import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const data=JSON.parse(readFileSync(new URL('./dist/data.json',import.meta.url)));
const ids=new Set(data.nodes.map(n=>n.id));assert.equal(ids.size,data.nodes.length);assert.equal(data.nodes.length,116);
const cats=new Set(data.categories.map(c=>c.id));const byId=new Map(data.nodes.map(n=>[n.id,n]));const visiting=new Set(),visited=new Set();
function walk(id){assert(!visiting.has(id),`Dependency cycle at ${id}`);if(visited.has(id))return;visiting.add(id);for(const dep of byId.get(id).deps){assert(ids.has(dep),`Missing ${dep}`);assert.notEqual(dep,id);walk(dep)}visiting.delete(id);visited.add(id)}
for(const n of data.nodes){assert(cats.has(n.category));assert(n.topics.length&&n.outcome);walk(n.id)}
for(const t of data.tracks){assert(ids.has(t.target));t.steps.flat().forEach(id=>assert(ids.has(id)))}
for(const p of data.projects)p.deps.forEach(id=>assert(ids.has(id)));
for(const r of data.resources)assert.equal(new URL(r.url).protocol,'https:');
assert.equal(data.nodes.reduce((s,n)=>s+n.deps.length,0),293);assert.equal(data.tracks.length,5);assert.equal(data.projects.length,13);assert.equal(data.modalities.length,11);
for(const file of ['index.html','style.css','app.js','graph.js','flows.js','cosmos.js','layout.js','vendor/anime.js','vendor/three.js','vendor/three.core.min.js','vendor/OrbitControls.js'])assert(existsSync(new URL(`./dist/${file}`,import.meta.url)));
const html=readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');assert(html.includes('name="viewport"'));assert(html.includes('lang="ru"'));
const graph=readFileSync(new URL('./dist/graph.js',import.meta.url),'utf8');assert(graph.includes('SphereGeometry'));assert(graph.includes('smoothstep(distance,160,300)'));assert(graph.includes('ResizeObserver'));
const manifest=JSON.parse(readFileSync(new URL('./.openai/hosting.json',import.meta.url)));assert(manifest.project_id);assert.equal(manifest.static.directory,'dist');
console.log(`PASS: ${ids.size} modules, 293 valid directed edges, no cycles, 5 routes, 13 projects, local assets and manifest.`);
