import { buildPlan, orderedTopics, planCalendar, localDate, parseDate } from './planner.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prose = text => escape(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
const hoursLabel = minutes => `${(minutes/60).toLocaleString('ru',{maximumFractionDigits:1})} ч`;
const dateLabel = date => parseDate(date)?.toLocaleDateString('ru',{day:'numeric',month:'long'}) || date;
const sourceLink = s => /^https:\/\//.test(s.url) ? `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} <span aria-hidden="true">↗</span></a>` : escape(s.title);
export function createAcademy(data, hooks) {
  const index = new Map(data.nodes.map(n=>[n.id,n]));
  let lectures=null, pending=null, loadError='', activePage='', activeId='', noteTimer, currentPlan, readingFrame=0;
  let settings={hours:6,days:3,start:localDate(),track:hooks.track()}, saved={version:1,notes:{},quizzes:{},last:null};
  try { const x=JSON.parse(localStorage.getItem('neuroatlas-study')||'null'); if(x&&typeof x==='object'){saved.notes=x.notes&&typeof x.notes==='object'?x.notes:{};saved.quizzes=x.quizzes&&typeof x.quizzes==='object'?x.quizzes:{};saved.last=index.has(x.last)?x.last:null;} } catch{}
  try { const x=JSON.parse(localStorage.getItem('neuroatlas-plan')||'null'); if(x&&typeof x==='object')settings={...settings,hours:[2,4,6,8,10,12,16,20,24].includes(Number(x.hours))?Number(x.hours):6,days:[2,3,4,5,6].includes(Number(x.days))?Number(x.days):3,start:parseDate(x.start)?x.start:localDate(),track:data.tracks.some(t=>t.id===x.track)||x.track==='all'?x.track:hooks.track()}; } catch{}
  const storeStudy = () => {try{localStorage.setItem('neuroatlas-study',JSON.stringify(saved));return true;}catch{return false;}};
  const persistPlan = () => {try{localStorage.setItem('neuroatlas-plan',JSON.stringify(settings));}catch{hooks.toast('План доступен до закрытия страницы: браузер не разрешил сохранение.');}};
  async function load() {
    if(lectures)return lectures;
    if(!pending)pending=Promise.all(['foundations','computation','systems'].map(async group=>{const r=await fetch(`./lectures-${group}.json`);if(!r.ok)throw Error('Материалы не загрузились');return r.json();})).then(parts=>{lectures=Object.assign({},...parts);for(const n of data.nodes)if(!lectures[n.id])throw Error(`Отсутствует лекция ${n.id}`);return lectures;}).catch(e=>{loadError=e.message;pending=null;lectures=null;throw e;});
    return pending;
  }
  const lessonLink = (id,label) => `<a href="#lesson?id=${id}">${escape(label||index.get(id)?.title||id)}</a>`;
  function continueCard() {
    const id=saved.last || orderedTopics(data,hooks.track(),hooks.done())[0]?.id || 'P0';
    return `<section class="continue-study"><div><h2>${saved.last?'Вернуться к учёбе':'Начните с одного понятия.'}</h2><p>${escape(index.get(id).title)} · лекция, разобранный пример и самостоятельная практика</p></div><div class="buttons"><a class="button primary" href="#lesson?id=${id}">${saved.last?'Продолжить лекцию':'Открыть первую лекцию'}</a><a class="button" href="#schedule">Составить расписание</a></div></section>`;
  }
  function loadingView() {return `<div class="page learning-loading" role="status"><h1 class="page-title">Открываем учебные материалы.</h1><p>Загружаем лекции, упражнения и ваш план.</p></div>`;}
  function errorView() {return `<div class="page"><h1 class="page-title">Не удалось открыть лекции.</h1><p>Проверьте соединение и попробуйте ещё раз. Программа и карта остаются доступны.</p><button class="button primary" data-retry-lessons>Загрузить снова</button></div>`;}
  function lessonView(id) {
    const node=index.get(id), l=lectures[id];
    if(!node||!l)return `<div class="page"><h1 class="page-title">Тема не найдена.</h1><a class="button" href="#curriculum">Вернуться к программе</a></div>`;
    const known=hooks.done(),missing=node.deps.filter(x=>!known.has(x));
    const order=orderedTopics(data,settings.track,new Set()),position=order.findIndex(n=>n.id===id),next=position>=0?order[position+1]:null;
    const quiz=saved.quizzes[id];
    return `<div class="lesson-progress" role="progressbar" aria-label="Прочитано в лекции" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><div class="page lesson-page"><div class="lesson-breadcrumb"><a href="#curriculum">Программа</a><span aria-hidden="true">/</span><button data-topic="${id}" aria-label="Карточка и зависимости: ${escape(node.title)}">${id}</button><span>${escape(data.categories.find(c=>c.id===node.category)?.name)}</span></div><header class="lesson-header"><h1>${escape(node.title)}</h1><p class="lesson-summary">${prose(l.summary)}</p><div class="lesson-meta"><span>≈ ${l.minutes} мин с разбором</span><span>Около ${l.studyHours} ч с практикой</span><span>Модуль ${id}</span></div></header><div class="lesson-layout"><aside class="lesson-toc"><nav aria-label="Содержание лекции"><strong>В этой лекции</strong><button data-section="lesson-goals">Что вы освоите</button>${l.sections.map((s,i)=>`<button data-section="lesson-section-${i}">${escape(s.title)}</button>`).join('')}<button data-section="lesson-example">Разобранный пример</button><button data-section="lesson-exercise">Попробуйте сами</button><button data-section="lesson-quiz">Самопроверка</button><button data-section="lesson-notes">Мой конспект</button><button data-section="lesson-sources">Первоисточники</button></nav><a class="text-link" href="#map?id=${id}&path=1">Зависимости на карте ↗</a><a class="text-link" href="#schedule">Мой учебный план ↗</a><button class="button small" data-print-lesson>Сохранить / печать PDF</button></aside><article class="lesson-content"><section id="lesson-goals"><h2>После этой лекции</h2><ul class="lesson-objectives">${l.objectives.map(o=>`<li>${prose(o)}</li>`).join('')}</ul>${missing.length?`<div class="prerequisite-note"><b>Для уверенного понимания</b><p>${missing.map(x=>lessonLink(x,`${x} · ${index.get(x).title}`)).join(' · ')}. Можно вернуться к ним по ходу чтения.</p></div>`:''}</section>${l.sections.map((s,i)=>`<section id="lesson-section-${i}"><h2>${escape(s.title)}</h2>${s.paragraphs.map(p=>`<p>${prose(p)}</p>`).join('')}</section>`).join('')}<section id="lesson-example" class="worked-example"><h2>${escape(l.workedExample.title)}</h2><ol>${l.workedExample.steps.map(s=>`<li>${prose(s)}</li>`).join('')}</ol><p class="example-result"><strong>Результат.</strong> ${prose(l.workedExample.result)}</p></section><section class="misconceptions"><h2>Где легко ошибиться</h2>${l.misconceptions.map(m=>`<div><h3>${escape(m.myth)}</h3><p>${prose(m.correction)}</p></div>`).join('')}</section><section id="lesson-exercise"><h2>Попробуйте сами</h2><p>${prose(l.exercise.prompt)}</p><details class="lesson-disclosure"><summary>Нужна подсказка</summary><ul>${l.exercise.hints.map(h=>`<li>${prose(h)}</li>`).join('')}</ul></details><details class="lesson-disclosure"><summary>Разобрать решение</summary><p>${prose(l.exercise.solution)}</p></details><p class="study-tip">Сначала запишите свой ответ. Затем сравните ход рассуждений с решением.</p></section><section id="lesson-quiz"><h2>Проверьте понимание</h2><p>Можно повторять без ограничений. Результат помогает найти пробелы и не заменяет практическую работу.</p><form id="lessonQuiz" data-id="${id}">${l.quiz.map((q,i)=>`<fieldset><legend>${i+1}. ${escape(q.question)}</legend>${q.options.map((o,j)=>`<label class="quiz-option"><input type="radio" name="q${i}" value="${j}" required ${quiz?.answers?.[i]===j?'checked':''}><span>${escape(o)}</span></label>`).join('')}<div class="quiz-feedback" id="quiz-feedback-${i}"></div></fieldset>`).join('')}<button class="button primary" type="submit">Проверить ответы</button><div class="quiz-result" role="status" aria-live="polite">${quiz?`Предыдущая попытка: ${quiz.score} из ${l.quiz.length}.`:''}</div></form></section><section id="lesson-notes"><h2>Ваш конспект</h2><label for="lessonNotes">Сформулируйте идею своими словами, запишите вопрос или вывод из практики.</label><textarea id="lessonNotes" data-id="${id}" rows="7" maxlength="20000" placeholder="Главная идея, пример и то, что хочу проверить…">${escape(typeof saved.notes[id]==='string'?saved.notes[id]:'')}</textarea><p class="note-save-state" role="status">Заметки сохраняются только в этом браузере.</p></section><section id="lesson-sources"><h2>Продолжить в первоисточниках</h2><p>Авторская учебная лекция. Источники ниже помогают углубить и проверить материал.</p><ul class="lesson-sources">${l.sources.map(s=>`<li>${sourceLink(s)}</li>`).join('')}</ul></section><section class="lesson-finish"><h2>Закрепите результат</h2><p>${escape(node.outcome)}</p><div class="buttons"><button class="button primary" data-complete="${id}" aria-pressed="${known.has(id)}">${known.has(id)?'✓ Изучено':'Отметить изученным'}</button>${next?`<a class="button" href="#lesson?id=${next.id}">Далее: ${escape(next.title)}</a>`:'<a class="button" href="#schedule">К учебному плану</a>'}</div><p class="study-tip">Отмечайте тему после самостоятельного решения задачи. Эта отметка — ваша самооценка.</p></section></article></div></div>`;
  }
  function scheduleView() {
    currentPlan=buildPlan(data,lectures,settings,hooks.done());
    return `<div class="page schedule-page"><h1 class="page-title">Ритм, в котором вы учитесь.</h1><p class="lead">Выберите цель и реальное время на неделю. План сначала ставит основы, затем зависимые темы. Изученные модули пропускаются.</p><form id="planSettings" class="plan-settings"><label>Учебная цель<select name="track">${data.tracks.map(t=>`<option value="${t.id}" ${settings.track===t.id?'selected':''}>${escape(t.title)}</option>`).join('')}<option value="all" ${settings.track==='all'?'selected':''}>Полный атлас · все 116 тем</option></select></label><label>Часов в неделю<select name="hours">${[2,4,6,8,10,12,16,20,24].map(h=>`<option ${Number(settings.hours)===h?'selected':''} value="${h}">${h} ч</option>`).join('')}</select></label><label>Учебных дней<select name="days">${[2,3,4,5,6].map(d=>`<option ${Number(settings.days)===d?'selected':''} value="${d}">${d} дня / дней</option>`).join('')}</select></label><label>Начать с<input type="date" name="start" value="${escape(settings.start)}" required></label><button class="button primary" type="submit">Пересчитать план</button></form><div id="planOutput">${planOutput()}</div><section class="study-backup"><div><h2>Ваши знания остаются с вами.</h2><p>Скачайте прогресс, заметки, результаты самопроверки и настройки плана. Резервная копия переносится между браузерами.</p></div><div class="buttons"><button class="button" data-export-study>Скачать прогресс</button><label class="button import-label">Импортировать копию<input type="file" id="importStudy" accept="application/json,.json"></label></div><p id="backupStatus" role="status" aria-live="polite"></p></section></div>`;
  }
  function planOutput() {
    const p=currentPlan;
    if(!p.nodes.length)return `<div class="plan-empty"><h2>Этот маршрут уже отмечен изученным.</h2><p>Вернитесь к практике или выберите новую цель. Для повторного изучения снимите отметку в нужной теме.</p><a class="button primary" href="#practice">Открыть проекты</a></div>`;
    return `<section class="plan-overview" aria-live="polite"><div><h2>${p.weeks.length} ${p.weeks.length===1?'неделя':'нед.'} до прохождения выбранных тем</h2><p>${p.nodes.length} модулей · ${hoursLabel(p.totalMinutes)} с практикой · ${dateLabel(p.start)} — ${dateLabel(p.end)} ${parseDate(p.end).getFullYear()}</p><p class="study-tip">Это оценка нагрузки, а не срок достижения квалификации. Увеличивайте время для сложных тем и возвращайтесь к ошибкам.</p></div><a class="button primary" href="#lesson?id=${p.nodes[0].id}">Начать: ${escape(p.nodes[0].title)}</a></section><div class="study-method"><div><strong>25%</strong><span>Понять и записать</span></div><div><strong>20%</strong><span>Разобрать пример</span></div><div><strong>40%</strong><span>Решить самостоятельно</span></div><div><strong>15%</strong><span>Проверить и повторить</span></div></div><p class="study-tip">В начале занятия восстановите по памяти идею предыдущего. После сложного блока сделайте перерыв; календарь оставляет выбор времени внутри дня за вами.</p><div class="plan-actions"><button class="button" data-export-calendar>Скачать календарь .ics</button><span>События на день, без фиксированного часа</span></div><div class="plan-weeks">${p.weeks.map((week,i)=>`<details class="plan-week" ${i===0?'open':''} ${i>=6?'data-later-week hidden':''}><summary><span>Неделя ${week.number}</span><span>${dateLabel(week.sessions[0].date)} · ${hoursLabel(week.minutes)}</span></summary><div class="week-sessions">${week.sessions.map(s=>`<article class="study-session"><header><h3>${dateLabel(s.date)}</h3><span>${s.minutes} мин</span></header><ol>${s.parts.map(part=>`<li><a href="#lesson?id=${part.id}">${escape(part.title)}</a><span>${part.continued?'Продолжение · ':''}${part.kind} · ${part.minutes} мин</span></li>`).join('')}</ol></article>`).join('')}</div></details>`).join('')}</div>${p.weeks.length>6?`<button class="button show-weeks" data-show-weeks>Показать все ${p.weeks.length} недель</button>`:''}`;
  }
  function render(page,params) {activePage=page;activeId=params?.get('id')||'P0';if(loadError)return errorView();if(!lectures)return loadingView();return page==='lesson'?lessonView(activeId):scheduleView();}
  function updateReading() {
    if(activePage!=='lesson')return;
    const bar=document.querySelector('.lesson-progress'),content=document.querySelector('.lesson-content'); if(!bar||!content)return;
    const rect=content.getBoundingClientRect(),available=Math.max(1,content.offsetHeight-innerHeight+100),ratio=Math.max(0,Math.min(1,(100-rect.top)/available));
    bar.firstElementChild.style.transform=`scaleX(${ratio})`;bar.setAttribute('aria-valuenow',Math.round(ratio*100));
  }
  async function mount(page) {
    activePage=page;
    if(!['lesson','schedule'].includes(page))return;
    if(!lectures&&!loadError){try{await load();}catch{}if(['lesson','schedule'].includes(activePage))hooks.render();return;}
    if(page==='lesson'&&index.has(activeId)&&lectures){saved.last=activeId;storeStudy();updateReading();}
  }
  function download(text,name,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function backup() {const progress=hooks.progress();return {format:'neuroatlas-backup',version:1,exportedAt:new Date().toISOString(),progress,study:saved,plan:settings};}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.section)document.getElementById(b.dataset.section)?.scrollIntoView({behavior:document.documentElement.dataset.motion==='reduced'?'instant':'smooth',block:'start'});
    if(b.hasAttribute('data-print-lesson'))window.print();
    if(b.hasAttribute('data-retry-lessons')){loadError='';hooks.render();}
    if(b.hasAttribute('data-show-weeks')){document.querySelectorAll('[data-later-week]').forEach(el=>el.hidden=false);b.remove();}
    if(b.hasAttribute('data-export-calendar')&&currentPlan){download(planCalendar(currentPlan),'NEUROATLAS-план.ics','text/calendar;charset=utf-8');hooks.toast('Календарь подготовлен для импорта.');}
    if(b.hasAttribute('data-export-study'))download(JSON.stringify(backup(),null,2),'NEUROATLAS-прогресс.json');
  });
  document.addEventListener('input',e=>{
    if(e.target.id!=='lessonNotes')return;
    const id=e.target.dataset.id;saved.notes[id]=e.target.value.slice(0,20000);clearTimeout(noteTimer);
    noteTimer=setTimeout(()=>{const ok=storeStudy(),status=document.querySelector('.note-save-state');if(status)status.textContent=ok?'Конспект сохранён в этом браузере.':'Не удалось сохранить. Скачайте резервную копию на странице расписания.';},300);
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='planSettings'){
      e.preventDefault();const values=new FormData(e.target);settings={track:values.get('track'),hours:Number(values.get('hours')),days:Number(values.get('days')),start:values.get('start')};
      if(!parseDate(settings.start))return;
      persistPlan();currentPlan=buildPlan(data,lectures,settings,hooks.done());document.querySelector('#planOutput').innerHTML=planOutput();hooks.toast('План пересчитан с учётом изученных тем.');
    }
    if(e.target.id==='lessonQuiz'){
      e.preventDefault();const id=e.target.dataset.id,questions=lectures[id].quiz,values=new FormData(e.target);let score=0;const answers=[];
      questions.forEach((q,i)=>{const raw=values.get(`q${i}`),answer=raw===null?-1:Number(raw),correct=answer===q.answer;answers.push(answer);if(correct)score++;const feedback=document.getElementById(`quiz-feedback-${i}`);feedback.className=`quiz-feedback ${correct?'correct':'incorrect'}`;feedback.innerHTML=`<strong>${correct?'Верно.':'Разберём ещё раз.'}</strong> ${prose(q.explanation)}${correct?'':`<p>Верный ответ: ${escape(q.options[q.answer])}</p>`}`;});
      saved.quizzes[id]={answers,score,at:new Date().toISOString()};const ok=storeStudy();e.target.querySelector('.quiz-result').textContent=`${score} из ${questions.length}. ${score===questions.length?'Основные идеи понятны. Переходите к самостоятельной практике.':'Вернитесь к объяснениям выше и попробуйте ещё раз.'}${ok?'':' Результат не сохранён браузером.'}`;
    }
  });
  document.addEventListener('change',async e=>{
    if(e.target.id!=='importStudy'||!e.target.files[0])return;
    const status=document.querySelector('#backupStatus');if(status)status.textContent='Читаем и проверяем резервную копию…';
    try {
      const file=e.target.files[0];if(file.size>5_000_000)throw Error('Файл больше 5 МБ.');
      const imported=JSON.parse(await file.text());if(imported.format!=='neuroatlas-backup'||imported.version!==1||!imported.progress||!imported.study)throw Error('Это не поддерживаемая резервная копия NEUROATLAS.');
      await load();
      // Validate into temporary structures before modifying any live state.
      const completed=Array.isArray(imported.progress.done)?imported.progress.done.filter(id=>index.has(id)):[];
      const projects=Array.isArray(imported.progress.projects)?imported.progress.projects.filter(id=>Number.isInteger(id)&&id>=0&&id<data.projects.length):[];
      const incomingNotes={},incomingQuizzes={};
      if(imported.study.notes!=null&&(typeof imported.study.notes!=='object'||Array.isArray(imported.study.notes)))throw Error('Повреждён раздел конспектов.');
      if(imported.study.quizzes!=null&&(typeof imported.study.quizzes!=='object'||Array.isArray(imported.study.quizzes)))throw Error('Повреждён раздел самопроверки.');
      for(const [id,note] of Object.entries(imported.study.notes||{})){
        if(!index.has(id))continue;
        if(typeof note!=='string')throw Error(`Повреждён конспект ${id}.`);
        incomingNotes[id]=note.slice(0,20000);
      }
      for(const [id,q] of Object.entries(imported.study.quizzes||{})){
        const expected=lectures[id]?.quiz;if(!expected)continue;
        if(!q||!Array.isArray(q.answers)||q.answers.length!==expected.length||!q.answers.every((answer,i)=>Number.isInteger(answer)&&answer>=0&&answer<expected[i].options.length))throw Error(`Повреждены ответы ${id}.`);
        incomingQuizzes[id]={answers:q.answers,score:expected.filter((question,i)=>question.answer===q.answers[i]).length,at:new Date().toISOString()};
      }
      let incomingSettings=null;
      if(imported.plan&&parseDate(imported.plan.start)){const p=imported.plan;incomingSettings={start:p.start,hours:[2,4,6,8,10,12,16,20,24].includes(p.hours)?p.hours:6,days:[2,3,4,5,6].includes(p.days)?p.days:3,track:data.tracks.some(t=>t.id===p.track)||p.track==='all'?p.track:hooks.track()};}
      for(const [id,note] of Object.entries(incomingNotes))if(!saved.notes[id])saved.notes[id]=note;
      for(const [id,quiz] of Object.entries(incomingQuizzes))if(!saved.quizzes[id])saved.quizzes[id]=quiz;
      if(!saved.last&&index.has(imported.study.last))saved.last=imported.study.last;
      if(incomingSettings){settings=incomingSettings;persistPlan();}
      hooks.mergeProgress(completed,projects);const persisted=storeStudy();if(activePage==='schedule')hooks.render();const currentStatus=document.querySelector('#backupStatus');if(currentStatus)currentStatus.textContent=persisted?'Копия добавлена. Существующие заметки и прогресс сохранены.':'Копия прочитана, но браузер не смог сохранить заметки. Скачайте резервную копию.';
    }catch(err){if(status)status.textContent=`Импорт не выполнен: ${err.message}`;}finally{e.target.value='';}
  });
  window.addEventListener('scroll',()=>{if(!readingFrame)readingFrame=requestAnimationFrame(()=>{readingFrame=0;updateReading();});},{passive:true});
  window.addEventListener('pagehide',storeStudy);
  return {render,mount,continueCard,load,flush(){clearTimeout(noteTimer);storeStudy();},setTrack(id){settings.track=id;persistPlan();},refresh(){if(activePage==='schedule')hooks.render();},get lectures(){return lectures;}};
}
