import { animate, createScope, createTimeline, onScroll, svg, stagger } from './vendor/anime.js';
export const storyMarkup = () => `<section class="signal-story" aria-labelledby="signalStoryTitle"><div class="signal-story-heading"><h2 id="signalStoryTitle">Как мысль становится действием.</h2><p>Четыре преобразования, которые связывают нервную систему и интерфейс. Прокрутите — и проследите путь сигнала.</p></div><div class="signal-story-grid"><figure class="signal-figure"><div class="signal-canvas" role="img" aria-label="Учебная 3D-схема: нейрон, электрический сигнал, пространство признаков и управляющая команда"></div><div class="signal-figure-caption"><span id="signalPhase">Нейронная активность</span><span class="signal-phase-number" aria-hidden="true">01 / 04</span></div><svg class="signal-trace" viewBox="0 0 600 70" fill="none" aria-hidden="true"><path d="M0 35 H80 Q96 35 102 22 T117 35 Q125 52 134 35 H178 L188 35 L195 9 L205 62 L215 25 L224 35 H278 Q294 35 300 22 T315 35 Q323 52 332 35 H390 L400 35 L407 9 L417 62 L427 25 L436 35 H600" stroke="currentColor" stroke-width="1.5"/></svg><div class="signal-controls" role="group" aria-label="Этапы преобразования"><button data-story-step="0" aria-label="К нейронной активности">01</button><button data-story-step="1" aria-label="К регистрации сигнала">02</button><button data-story-step="2" aria-label="К декодированию">03</button><button data-story-step="3" aria-label="К управлению">04</button></div><figcaption>Концептуальная модель. Геометрия и сигнал иллюстративны.</figcaption></figure><div class="signal-steps"><article class="signal-step" id="signal-step-0"><span class="signal-step-index">01</span><h3>Активность.<br>Сначала — биология.</h3><p>Нейроны обмениваются сигналами. Измеряемая активность зависит от типа записи: EEG отражает суммарные электрические поля, а внеклеточный электрод может регистрировать спайки.</p><a href="#lesson?id=N9" class="text-link">Почему возникает нейросигнал ↗</a></article><article class="signal-step" id="signal-step-1"><span class="signal-step-index">02</span><h3>Измерение.<br>Сохранить смысл сигнала.</h3><p>Дискретизация превращает непрерывное измерение в числа. Затем мы проверяем качество, время и артефакты. Фильтр меняет данные — его влияние нужно понимать.</p><a href="#lesson?id=S2" class="text-link">Разобраться в дискретизации ↗</a></article><article class="signal-step" id="signal-step-2"><span class="signal-step-index">03</span><h3>Декодирование.<br>От признаков к гипотезе.</h3><p>Модель связывает признаки с задачей. Хороший результат подтверждается на независимых данных. Соседние фрагменты одной записи нельзя считать независимыми наблюдениями.</p><a href="#lesson?id=L3" class="text-link">Собрать EEG-пайплайн ↗</a></article><article class="signal-step" id="signal-step-3"><span class="signal-step-index">04</span><h3>Действие.<br>Замкнуть обратную связь.</h3><p>Предсказание становится командой. Пользователь видит результат, меняет стратегию, а система учитывает задержку, неопределённость и возможность отказаться от действия.</p><a href="#lesson?id=U3" class="text-link">Изучить обратную связь ↗</a></article></div></div></section>`;
export function mountMotion(root, reduced) {
  let disposed=false, sceneCleanup;
  const hoverAnimations=new Map();
  function tilt(card,properties){hoverAnimations.get(card)?.cancel();hoverAnimations.set(card,animate(card,properties));}
  const abort=new AbortController(), scope=createScope({root});
  scope.add(()=>{
    if(reduced)return;
    const heading=root.querySelector('.hero h1,.page-title,.lesson-header h1');
    if(heading)createTimeline({defaults:{ease:'outExpo'}}).add(heading,{opacity:[.72,1],clipPath:['inset(0 0 18% 0)','inset(0 0 0% 0)'],duration:520});
    const hero=root.querySelector('.hero-stage');
    if(hero)animate(hero,{rotateY:[-5,0],rotateX:[2,0],perspective:1100,duration:780,ease:'outExpo'});
    const trace=root.querySelector('.signal-trace path'),story=root.querySelector('.signal-story');
    if(trace&&story)animate(svg.createDrawable(trace),{draw:['0 0','0 1'],ease:'linear',autoplay:onScroll({target:story,enter:'bottom top',leave:'top bottom',sync:true})});
    const flow=root.querySelectorAll('.route-step');
    if(flow.length)animate(flow,{opacity:[.7,1],x:[8,0],delay:stagger(45),duration:320,ease:'outExpo'});
  });
  if(!reduced&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    root.addEventListener('pointermove',e=>{
      const card=e.target.closest('.field-card,.route-card,.resource-card');if(!card)return;
      const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      card.style.setProperty('--pointer-x',`${(x+.5)*100}%`);card.style.setProperty('--pointer-y',`${(y+.5)*100}%`);
      tilt(card,{rotateX:-y*3,rotateY:x*4,perspective:900,duration:180,ease:'out(3)'});
    },{signal:abort.signal,passive:true});
    root.addEventListener('pointerout',e=>{const card=e.target.closest('.field-card,.route-card,.resource-card');if(card&&!card.contains(e.relatedTarget)){tilt(card,{rotateX:0,rotateY:0,duration:350,ease:'outExpo'});}},{signal:abort.signal});
  }
  const story=root.querySelector('.signal-story');
  if(story) {
    root.addEventListener('click',e=>{const button=e.target.closest('[data-story-step]');if(button)document.getElementById(`signal-step-${button.dataset.storyStep}`)?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});},{signal:abort.signal});
    const observer=new IntersectionObserver(entries=>{
      if(!entries[0].isIntersecting)return;observer.disconnect();
      import('./signal-scene.js').then(({createSignalScene})=>{if(!disposed)sceneCleanup=createSignalScene(story,{reduced});}).catch(()=>{const el=story.querySelector('.signal-canvas');if(el){el.innerHTML='<div class="signal-fallback"><span>Нейрон</span><i>↓</i><span>Сигнал</span><i>↓</i><span>Декодер</span><i>↓</i><span>Действие</span></div>';}});
    },{rootMargin:'250px'});observer.observe(story);abort.signal.addEventListener('abort',()=>observer.disconnect());
  }
  return ()=>{disposed=true;abort.abort();hoverAnimations.forEach((animation,card)=>{animation.cancel();card.style.removeProperty('transform');});hoverAnimations.clear();scope.revert();sceneCleanup?.();};
}
