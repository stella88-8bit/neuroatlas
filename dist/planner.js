// Pure planning functions. One sequential queue guarantees prerequisites finish first.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y,m,d] = value.split('-').map(Number), result = new Date(y,m-1,d,12);
  return localDate(result) === value ? result : null;
}
export function orderedTopics(data, trackId, done = new Set()) {
  const index = new Map(data.nodes.map(n => [n.id,n])), result = [], visited = new Set(), visiting = new Set();
  const track = data.tracks.find(t => t.id === trackId) || data.tracks[0];
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw Error(`Cycle: ${id}`);
    const node = index.get(id); if (!node) throw Error(`Missing topic: ${id}`);
    visiting.add(id); node.deps.forEach(visit); visiting.delete(id); visited.add(id);
    if (!done.has(id)) result.push(node);
  }
  (trackId === 'all' ? data.nodes.map(n=>n.id) : [...track.steps.flat(),track.target]).forEach(visit);
  return result;
}
export function buildPlan(data, lectures, settings, done = new Set()) {
  const hours = Math.max(2, Math.min(24, Number(settings.hours) || 6));
  const days = Math.max(2, Math.min(6, Math.round(Number(settings.days) || 3)));
  const budget = Math.round(hours * 60), sessionBudget = Math.floor(budget / days);
  const start = parseDate(settings.start) || parseDate(localDate());
  const offsets = {2:[0,3],3:[0,2,4],4:[0,1,3,5],5:[0,1,2,4,5],6:[0,1,2,3,4,5]}[days];
  const nodes = orderedTopics(data, settings.track, done), queue = [];
  for (const node of nodes) {
    const total = Math.round(Math.max(2, Math.min(8, Number(lectures[node.id]?.studyHours)||3))*60);
    const reading = Math.round(total*.25), example = Math.round(total*.20), practice = Math.round(total*.40);
    [['Лекция и конспект',reading],['Разбор примера',example],['Самостоятельная практика',practice],['Самопроверка и повторение',total-reading-example-practice]].forEach(([kind,minutes])=>queue.push({id:node.id,title:node.title,kind,minutes}));
  }
  const weeks = []; let itemIndex=0, remaining=queue[0]?.minutes || 0;
  while (itemIndex < queue.length) {
    const week = {number:weeks.length+1, sessions:[], minutes:0};
    for(let day=0; day<days && itemIndex<queue.length;day++) {
      const date=new Date(start); date.setDate(start.getDate()+weeks.length*7+offsets[day]);
      const capacity=sessionBudget+(day===days-1?budget-sessionBudget*days:0);
      const session={date:localDate(date), minutes:0, parts:[]}; let available=capacity;
      while(available>0 && itemIndex<queue.length) {
        const part=queue[itemIndex], used=Math.min(available,remaining);
        session.parts.push({...part,minutes:used,continued:remaining<part.minutes}); session.minutes+=used; available-=used; remaining-=used;
        if(remaining===0){itemIndex++;remaining=queue[itemIndex]?.minutes||0;}
      }
      week.sessions.push(session);week.minutes+=session.minutes;
    }
    weeks.push(week);
  }
  return {nodes,weeks,hours,days,totalMinutes:weeks.reduce((sum,w)=>sum+w.minutes,0),start:localDate(start),end:weeks.at(-1)?.sessions.at(-1)?.date || localDate(start)};
}
const icsEscape = value => String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function planCalendar(plan, now = new Date()) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NEUROATLAS//Study planner//RU','CALSCALE:GREGORIAN','X-WR-CALNAME:NEUROATLAS — учебный план'];
  for(const week of plan.weeks) for(const [i,session] of week.sessions.entries()) {
    const next=parseDate(session.date);next.setDate(next.getDate()+1);
    lines.push('BEGIN:VEVENT',`UID:neuroatlas-${session.date}-${week.number}-${i}@study.local`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${session.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${localDate(next).replace(/-/g,'')}`,`SUMMARY:${icsEscape(`NEUROATLAS · ${session.minutes} мин · ${session.parts[0].title}`)}`,`DESCRIPTION:${icsEscape(session.parts.map(p=>`${p.id} ${p.title}: ${p.kind}, ${p.minutes} мин`).join('\n'))}`,'TRANSP:TRANSPARENT','END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 folds at 75 octets, without splitting a UTF-8 character.
  return lines.map(line=>{let row='',bytes=0,output='';for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>74){output+=row+'\r\n ';row='';bytes=1;}row+=ch;bytes+=size;}return output+row;}).join('\r\n')+'\r\n';
}
