import assert from 'node:assert/strict';
import { placeLabels } from './dist/label-layout.js';
for(const width of [320,390,1100]) {
 const height=600;
 const candidates=Array.from({length:80},(_,i)=>({id:i,x:12+(i*37)%(width-24),y:8+(i*23)%570,width:i%5===0?300:90+(i*17)%150,height:i%5===0?80:28,priority:i===79?0:i===78?1:2,offset:22,depth:i/100}));
 const result=placeLabels(candidates,width,height);
 assert.equal(result[0].id,79,'Hover must reserve space before all other labels');
 for(let i=0;i<result.length;i++) {
  const a=result[i];assert(a.left>=12&&a.right<=width-12&&a.top>=12&&a.bottom<=height-12,'Label clipped by viewport');
  for(const b of result.slice(0,i))assert(!(a.left<b.right+8&&a.right+8>b.left&&a.top<b.bottom+8&&a.bottom+8>b.top),'Labels overlap');
 }
 const hover={id:'hover',x:width-2,y:590,width:300,height:90,priority:0,offset:22,depth:0};
 assert.equal(placeLabels([hover],width,height).length,1,'Tooltip must remain visible at viewport edge');
}
const sameSpot=[{id:'selected',priority:1},{id:'hover',priority:0},{id:'nearby',priority:2}].map(o=>({...o,x:160,y:180,width:180,height:40,offset:22,depth:0}));
assert.equal(placeLabels(sameSpot,320,400)[0].id,'hover');
console.log('PASS: collision-free labels across 320/390/1100px, hover priority, crowded scenes, multiline sizing and viewport edges.');
