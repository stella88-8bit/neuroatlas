import assert from 'node:assert/strict';
import {createImmersion} from './dist/immersion.js';

function setup({fullscreen=true,reject=false}={}){
  const events={},classes=new Set();let requests=0,exits=0;
  const previous={isConnected:true,focus(){doc.activeElement=this}},button={hidden:true,focus(){doc.activeElement=this}};
  const root={};
  const doc={documentElement:root,activeElement:previous,fullscreenElement:null,
    body:{classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}},
    querySelector:s=>s==='.map-page'?{}:s==='#exitImmersion'?button:null,
    addEventListener:(name,fn)=>events[name]=fn,
    exitFullscreen:async()=>{exits++;doc.fullscreenElement=null;events.fullscreenchange()}
  };
  if(fullscreen)root.requestFullscreen=async()=>{requests++;if(reject)throw Error('Fullscreen not allowed');doc.fullscreenElement=root;events.fullscreenchange()};
  const immersion=createImmersion(doc);
  return {doc,root,button,previous,classes,events,immersion,get requests(){return requests},get exits(){return exits}};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve()};
for(const settings of [{},{fullscreen:false},{reject:true}]){
 const state=setup(settings),{immersion,classes,button,doc,events,previous}=state;
 immersion.enter();await flush();assert(classes.has('immersive'));assert(!button.hidden);assert.equal(doc.activeElement,button);
 immersion.enter();assert.equal(state.requests,settings.fullscreen===false?0:1,'Repeated entry must not request fullscreen again');
 let prevented=false,stopped=false;events.keydown({key:'Escape',preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});await flush();
 assert(prevented&&stopped);assert(!classes.has('immersive'));assert(button.hidden);assert.equal(doc.activeElement,previous);
 immersion.enter();await flush();immersion.exit();await flush();assert(!classes.has('immersive'));assert(button.hidden);
}
const native=setup();native.immersion.enter();await flush();native.doc.fullscreenElement=null;native.events.fullscreenchange();assert(!native.classes.has('immersive'),'Browser fullscreen exit must restore UI');
const pending=setup();pending.immersion.enter();pending.immersion.exit(false);await flush();assert(!pending.classes.has('immersive'));assert.equal(pending.doc.fullscreenElement,null,'Late fullscreen request must not leave browser trapped');
const existing=setup();existing.doc.fullscreenElement={};existing.immersion.enter();await flush();existing.immersion.exit();assert.equal(existing.requests,0);assert.equal(existing.exits,0,'Do not exit fullscreen owned by someone else');
console.log('PASS: immersion entry, button/Escape exit, focus restoration, native fullscreen exit, unsupported/rejected fullscreen fallback, rapid exit and existing fullscreen preservation.');
