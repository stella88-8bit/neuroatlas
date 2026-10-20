import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPlan,orderedTopics,planCalendar,parseDate,localDate} from './dist/planner.js';
const data=JSON.parse(fs.readFileSync(new URL('./dist/data.json',import.meta.url)));
const lessons=Object.fromEntries(data.nodes.map((n,i)=>[n.id,{studyHours:2+i%5}]));
let cases=0;
for(const track of [...data.tracks.map(t=>t.id),'all']) for(const hours of [2,6,12,24]) for(const days of [2,3,6]) for(const done of [new Set(),new Set(['P0','P1','M0','N0','S0'])]){
 const plan=buildPlan(data,lessons,{track,hours,days,start:'2026-12-28'},done),order=plan.nodes.map(n=>n.id),seen=new Set();
 for(const n of plan.nodes){assert(!done.has(n.id));for(const dep of n.deps)assert(seen.has(dep)||done.has(dep),`${dep} must precede ${n.id}`);seen.add(n.id);}
 let total=0,prior='';const packed=[];
 for(const w of plan.weeks){assert(w.minutes<=hours*60);assert(w.sessions.length<=days);for(const s of w.sessions){assert(s.date>prior);prior=s.date;assert.equal(s.minutes,s.parts.reduce((n,p)=>n+p.minutes,0));for(const p of s.parts){assert(p.minutes>0);if(packed.at(-1)!==p.id)packed.push(p.id);}total+=s.minutes;}}
 assert.equal(total,plan.nodes.reduce((n,node)=>n+lessons[node.id].studyHours*60,0));assert.equal(total,plan.totalMinutes);assert.deepEqual(packed,order);
 const cal=planCalendar(plan,new Date('2026-10-19T12:00:00Z'));assert.equal((cal.match(/BEGIN:VEVENT/g)||[]).length,plan.weeks.reduce((n,w)=>n+w.sessions.length,0));for(const line of cal.split('\r\n'))assert(Buffer.byteLength(line)<=75);assert(!cal.includes('undefined'));cases++;
}
assert.equal(parseDate('2026-02-30'),null);assert.equal(localDate(parseDate('2028-02-29')),'2028-02-29');
const empty=buildPlan(data,lessons,{track:'all'},new Set(data.nodes.map(n=>n.id)));assert.equal(empty.weeks.length,0);assert.equal(empty.totalMinutes,0);
assert.equal(orderedTopics(data,'all').length,116);
console.log(`PASS: ${cases} schedule combinations, all dependencies in order, exact workload and weekly budgets, skipped mastery, year boundaries, leap dates, empty states and UTF-8 calendar export.`);
