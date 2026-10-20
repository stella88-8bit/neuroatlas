import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as THREE from './dist/vendor/three.js';
import {createTimeline} from './dist/vendor/anime.js';
// Real Anime.js interpolation is tested independently of DOM/GPU.
const state={phase:0};const timeline=createTimeline({autoplay:false}).add(state,{phase:[0,3],duration:3000,ease:'linear'});timeline.seek(1500);assert.equal(state.phase,1.5);timeline.seek(3000);assert.equal(state.phase,3);timeline.revert();
const source=fs.readFileSync(new URL('./dist/signal-scene.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace('export function','function');
for(const reduced of [false,true]) {
 const dom=new JSDOM('<section><div class="signal-canvas"></div><span id="signalPhase"></span><span class="signal-phase-number"></span><div class="signal-steps"></div>'+[0,1,2,3].map(i=>`<button data-story-step="${i}"></button><article class="signal-step"></article>`).join('')+'</section>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();
 const mount=w.document.querySelector('.signal-canvas');mount.getBoundingClientRect=()=>({width:500,height:430});
 let renderedScene,renderCount=0,disposed=false,stepState,stepParams,raf=0,frame;
 class Renderer{constructor(){this.domElement=w.document.createElement('canvas');}setPixelRatio(){}setSize(){}render(s){renderedScene=s;renderCount++;}dispose(){disposed=true;}}
 Object.assign(ctx,{THREE:{...THREE,WebGLRenderer:Renderer},innerWidth:reduced?390:1100,devicePixelRatio:2,createTimeline:()=>({add(s,p){stepState=s;stepParams=p;return this;},revert(){}}),onScroll:()=>({revert(){}}),ResizeObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{constructor(cb){this.cb=cb;}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}},requestAnimationFrame:fn=>{frame=fn;return ++raf;},cancelAnimationFrame(){}});
 vm.runInContext(source+';globalThis.makeScene=createSignalScene;',ctx);
 const cleanup=ctx.makeScene(w.document.querySelector('section'),{reduced});const groups=renderedScene.children.filter(o=>o.isGroup);assert.equal(groups.length,4);assert(groups[0].children.length>30);assert.equal(mount.children.length,1);
 if(!reduced){for(const p of [0,.5,1,1.5,2,2.5,3]){stepState.phase=p;stepParams.onUpdate();assert(groups.some(g=>g.visible));groups.forEach(g=>g.traverse(o=>{if(o.geometry){const positions=o.geometry.attributes.position;assert(Array.from(positions.array).every(Number.isFinite));}if(o.material)assert(o.material.opacity>=0&&o.material.opacity<=1);}));}assert.equal(w.document.querySelector('#signalPhase').textContent,'Управляющая команда');frame(1000);assert(raf>1);}else{assert.equal(raf,0);w.document.querySelector('[data-story-step="2"]').click();assert.equal(w.document.querySelector('#signalPhase').textContent,'Пространство признаков');}
 cleanup();assert(disposed);assert.equal(mount.children.length,0);w.close();
}
console.log('PASS: actual Anime.js timeline interpolation, 4 valid 3D phases, crossfades, explicit reduced-motion phase control, no reduced-motion loop and GPU resource cleanup. Renderer mocked; visual output unverified.');
