/* VATRA Games: four original, directly playable browser games. No external game assets. */
const gameRoot=document.getElementById('feed');
const CATALOG=[
 {id:'snake',title:'Змійка',description:'Збирайте яблука, уникайте стін і власного хвоста.',category:'Аркада',symbol:'✦',theme:'mint',keys:'Стрілки або WASD · на телефоні — кнопки'},
 {id:'merge',title:'2048',description:'Об’єднуйте однакові числа, щоб отримати плитку 2048.',category:'Головоломка',symbol:'₂₀₄₈',theme:'peach',keys:'Стрілки або WASD · на телефоні — кнопки'},
 {id:'memory',title:'Знайди пару',description:'Відкривайте картки й запам’ятовуйте однакові символи.',category:'Пам’ять',symbol:'◈',theme:'violet',keys:'Натискайте на картки'},
 {id:'xo',title:'Хрестики-нулики',description:'Переграйте комп’ютер у класичному поєдинку 3 × 3.',category:'Логіка',symbol:'✕○',theme:'sky',keys:'Оберіть клітинку · ви граєте за X'}
];
let currentUid='',activeId='',tab='home',query='',records={},dispose=null,gameRunning=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const entry=id=>CATALOG.find(g=>g.id===id);
const record=id=>records[id]||{};
const keyName=uid=>'vatra-games-progress-v1-'+uid;
function loadRecords(){
 try{const data=JSON.parse(localStorage.getItem(keyName(currentUid))||'{}');
  records=data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{records={};}
}
function writeRecords(){
 if(!currentUid)return;
 try{localStorage.setItem(keyName(currentUid),JSON.stringify(records));}
 catch(error){console.warn('[VATRA Games] Local game scores could not be saved',error);}
}
function progress(id,patch){
 if(!currentUid||!entry(id))return;
 const old=record(id);
 records[id]={...old,...patch,lastPlayed:Date.now()};
 writeRecords();
}
function begin(id){progress(id,{plays:(Number(record(id).plays)||0)+1});}
function high(id,score){
 const prev=Number(record(id).best)||0;
 if(score>prev)progress(id,{best:score});
}
function win(id){progress(id,{wins:(Number(record(id).wins)||0)+1});}
function clearGame(){if(dispose){try{dispose();}catch(error){console.warn('[VATRA Games] game shutdown',error);}dispose=null;}gameRunning=false;}
function iconSvg(){
 return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="11" rx="5"/><path d="M7 11.5v5M4.5 14h5M16 13h.01M19 16h.01"/></svg>';
}
function card(g){
 const data=record(g.id),label=data.plays?'Продовжити':'Грати';
 return '<article class="vg-game-card vg-'+g.theme+'"><div class="vg-art"><span>'+g.symbol+'</span><small>'+esc(g.category)+'</small></div><div class="vg-game-meta"><div><h3>'+esc(g.title)+'</h3><p>'+esc(g.description)+'</p></div><button data-vg-open="'+g.id+'" type="button">'+label+' →</button></div></article>';
}
function renderGames(){
 if(!gameRoot||document.body.dataset.page!=='games')return;
 if(activeId){renderActive();return;}
 const selected=CATALOG.filter(g=>(tab==='home'||(tab==='mine'&&record(g.id).plays)||tab==='records')&&((g.title+' '+g.category+' '+g.description).toLocaleLowerCase('uk-UA')).includes(query.toLocaleLowerCase('uk-UA')));
 const recent=CATALOG.filter(g=>record(g.id).lastPlayed).sort((a,b)=>(record(b.id).lastPlayed||0)-(record(a.id).lastPlayed||0)).slice(0,3);
 const tabs=[['home','Головна'],['mine','Мої ігри'],['records','Рекорди']];
 const top='<div class="vg-header"><div class="vg-tabs">'+tabs.map(([id,label])=>'<button data-vg-tab="'+id+'" class="'+(tab===id?'active':'')+'" aria-pressed="'+String(tab===id)+'">'+label+'</button>').join('')+'</div><span class="vg-header-note">Безкоштовні ігри прямо у ВАТРІ</span></div>';
 const search='<label class="vg-search"><span>⌕</span><input id="vgSearch" type="search" value="'+esc(query)+'" placeholder="Пошук ігор" aria-label="Пошук ігор"></label>';
 let content='';
 if(tab==='home'){
  content='<div class="vg-feature"><div><span class="vg-kicker">ВИБІР ВАТРИ · АРКАДА</span><h2>Змійка</h2><p>Класика, яка завжди під рукою. Збирайте яблука та побийте свій рекорд!</p><button type="button" data-vg-open="snake">▶ Грати зараз</button></div><div class="vg-feature-art" aria-hidden="true"><span>●</span><span>▦</span><span>✦</span></div></div>';
  if(recent.length)content+='<section class="vg-section"><div class="vg-section-top"><h2>Продовжити грати</h2><button data-vg-tab="mine">Мої ігри →</button></div><div class="vg-recent">'+recent.map(g=>'<button data-vg-open="'+g.id+'" class="vg-recent-item"><span class="vg-recent-icon vg-'+g.theme+'">'+g.symbol+'</span><span><b>'+esc(g.title)+'</b><small>Ваші зіграні ігри</small></span><span>Грати ›</span></button>').join('')+'</div></section>';
 }
 if(tab==='records'){
  content='<section class="vg-section"><div class="vg-section-top"><h2>Ваші рекорди</h2></div><p class="vg-local-note">Результати зберігаються лише в цьому браузері для Вашого акаунта ВАТРИ. Глобальних рейтингів поки немає.</p><div class="vg-scoreboard">'+CATALOG.map(g=>'<div class="vg-record"><span class="vg-recent-icon vg-'+g.theme+'">'+g.symbol+'</span><span><b>'+esc(g.title)+'</b><small>Партій: '+(Number(record(g.id).plays)||0)+' · Перемог: '+(Number(record(g.id).wins)||0)+'</small></span><strong>'+(record(g.id).best?'Рекорд: '+record(g.id).best:'Немає рекорду')+'</strong><button data-vg-open="'+g.id+'">Грати</button></div>').join('')+'</div></section>';
 }else{
  content+='<section class="vg-section"><div class="vg-section-top"><h2>'+(tab==='mine'?'Мої ігри':'Для Вас')+'</h2><span>'+selected.length+' '+(selected.length===1?'гра':'ігор')+'</span></div>'+
  (selected.length?'<div class="vg-cards">'+selected.map(card).join('')+'</div>':'<div class="vg-empty">Тут поки нічого немає. Спробуйте інший пошук або почніть нову гру на головній.</div>')+'</section>';
 }
 gameRoot.innerHTML='<div class="vg-app">'+top+search+content+'<footer class="vg-footer">Ігри створені для ВАТРИ. Без сторонніх ігрових серверів, платних голосів і вигаданих гравців.</footer></div>';
}
function showStatus(text){const el=document.getElementById('vgStatus');if(el)el.textContent=text;}
function setScore(text){const el=document.getElementById('vgScore');if(el)el.textContent=text;}
function renderActive(){
 if(!gameRoot||document.body.dataset.page!=='games')return;
 clearGame();
 const g=entry(activeId);if(!g)return;
 gameRoot.innerHTML='<div class="vg-app"><div class="vg-play-head"><button type="button" data-vg-back>← До всіх ігор</button><div><h2>'+esc(g.title)+'</h2><p>'+esc(g.description)+'</p></div></div><section class="vg-play-area"><div class="vg-play-toolbar"><span id="vgScore">Ваш рахунок: 0</span><span id="vgStatus" role="status" aria-live="polite">Почніть гру</span></div><div id="vgGameBoard" class="vg-board"></div><div id="vgControls" class="vg-controls"></div></section><p class="vg-instructions">'+esc(g.keys)+'</p></div>';
 if(activeId==='snake')startSnake();
 if(activeId==='merge')startMerge();
 if(activeId==='memory')startMemory();
 if(activeId==='xo')startXO();
}
function startSnake(){
 const board=document.getElementById('vgGameBoard'),controls=document.getElementById('vgControls');
 board.innerHTML='<canvas id="vgSnakeCanvas" width="360" height="360" aria-label="Поле гри Змійка, 18 на 18 клітинок"></canvas>';
 controls.innerHTML='<div class="vg-control-buttons"><button type="button" data-vg-snake-start>Почати / заново</button><button type="button" data-vg-snake-pause>Пауза</button></div><div class="vg-direction" aria-label="Керування змійкою"><button data-vg-dir="up" aria-label="Вгору">↑</button><div><button data-vg-dir="left" aria-label="Ліворуч">←</button><button data-vg-dir="down" aria-label="Вниз">↓</button><button data-vg-dir="right" aria-label="Праворуч">→</button></div></div>';
 const canvas=document.getElementById('vgSnakeCanvas'),ctx=canvas.getContext('2d'),N=18,S=20;
 let snake=[{x:7,y:9},{x:6,y:9},{x:5,y:9}],direction='right',next='right',food={x:12,y:9},timer=null,score=0,started=false,paused=false,ended=false;
 const vectors={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
 function draw(){
  ctx.fillStyle='#1b2f37';ctx.fillRect(0,0,360,360);
  ctx.strokeStyle='#28434a';ctx.lineWidth=.5;
  for(let n=0;n<=N;n++){ctx.beginPath();ctx.moveTo(n*S,0);ctx.lineTo(n*S,360);ctx.stroke();ctx.beginPath();ctx.moveTo(0,n*S);ctx.lineTo(360,n*S);ctx.stroke();}
  ctx.fillStyle='#ff6b75';ctx.beginPath();ctx.arc(food.x*S+10,food.y*S+10,7,0,Math.PI*2);ctx.fill();
  snake.forEach((part,i)=>{ctx.fillStyle=i===0?'#9cf6bd':'#40ca9c';ctx.fillRect(part.x*S+2,part.y*S+2,S-4,S-4);});
 }
 function move(){
  if(!started||paused||ended)return;
  direction=next;const v=vectors[direction],head={x:snake[0].x+v.x,y:snake[0].y+v.y};
  const eat=head.x===food.x&&head.y===food.y;
  const collision=snake.slice(0,eat?snake.length:snake.length-1).some(p=>p.x===head.x&&p.y===head.y);
  if(head.x<0||head.x>=N||head.y<0||head.y>=N||collision){
   ended=true;clearInterval(timer);timer=null;high('snake',score);showStatus('Гру завершено. Спробуйте ще раз!');return;
  }
  snake.unshift(head);if(!eat)snake.pop();else{
   score+=10;high('snake',score);setScore('Очки: '+score+' · рекорд: '+Math.max(score,Number(record('snake').best)||0));
   const free=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!snake.some(p=>p.x===x&&p.y===y))free.push({x,y});
   if(!free.length){ended=true;clearInterval(timer);timer=null;win('snake');showStatus('Ви заповнили усе поле!');draw();return;}
   food=free[Math.floor(Math.random()*free.length)];
  }draw();
 }
 function selectDir(d){
  if(!vectors[d])return;const v=vectors[d],cur=vectors[direction];
  if(v.x===-cur.x&&v.y===-cur.y)return;
  next=d;
 }
 function beginRound(){
  if(timer)clearInterval(timer);snake=[{x:7,y:9},{x:6,y:9},{x:5,y:9}];direction='right';next='right';food={x:12,y:9};score=0;paused=false;ended=false;started=true;begin('snake');draw();
  setScore('Очки: 0 · рекорд: '+(record('snake').best||0));showStatus('Гра триває');timer=setInterval(move,135);
 }
 function pause(){if(!started||ended)return;paused=!paused;showStatus(paused?'Пауза':'Гра триває');}
 const keyHandler=e=>{if(document.body.dataset.page!=='games'||activeId!=='snake')return;const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}[e.key];if(d){e.preventDefault();selectDir(d);}if(e.code==='Space'){e.preventDefault();pause();}};
 document.addEventListener('keydown',keyHandler);
 const onClick=e=>{const dir=e.target.closest('[data-vg-dir]');if(dir)selectDir(dir.dataset.vgDir);if(e.target.closest('[data-vg-snake-start]'))beginRound();if(e.target.closest('[data-vg-snake-pause]'))pause();};
 controls.addEventListener('click',onClick);
 draw();setScore('Очки: 0 · рекорд: '+(record('snake').best||0));showStatus('Натисніть «Почати»');
 dispose=()=>{if(timer)clearInterval(timer);document.removeEventListener('keydown',keyHandler);controls.removeEventListener('click',onClick);};
}
function startMerge(){
 const board=document.getElementById('vgGameBoard'),controls=document.getElementById('vgControls');
 board.innerHTML='<div id="vgMergeGrid" class="vg-merge-grid" role="grid" aria-label="Поле 2048"></div>';
 controls.innerHTML='<div class="vg-control-buttons"><button data-vg-merge-new>Нова гра</button></div><div class="vg-direction" aria-label="Керування 2048"><button data-vg-merge-dir="up">↑</button><div><button data-vg-merge-dir="left">←</button><button data-vg-merge-dir="down">↓</button><button data-vg-merge-dir="right">→</button></div></div>';
 let cells=Array(16).fill(0),score=0,locked=false;
 const grid=document.getElementById('vgMergeGrid');
 function spawn(){const empties=cells.map((v,i)=>v?null:i).filter(v=>v!==null);if(!empties.length)return;cells[empties[Math.floor(Math.random()*empties.length)]]=Math.random()<.9?2:4;}
 function draw(){grid.innerHTML=cells.map(n=>'<div class="vg-merge-tile '+(n?'value-'+Math.min(n,2048):'empty')+'" role="gridcell">'+(n||'')+'</div>').join('');setScore('Очки: '+score+' · рекорд: '+(record('merge').best||0));}
 function mergeRow(arr){let clean=arr.filter(Boolean),gain=0;for(let i=0;i<clean.length-1;i++)if(clean[i]===clean[i+1]){clean[i]*=2;gain+=clean[i];clean.splice(i+1,1);}while(clean.length<4)clean.push(0);return {row:clean,gain};}
 function move(dir){
  if(locked)return;const prev=cells.slice();let earned=0;
  for(let n=0;n<4;n++){
   const inds=dir==='left'?[n*4,n*4+1,n*4+2,n*4+3]:dir==='right'?[n*4+3,n*4+2,n*4+1,n*4]:dir==='up'?[n,n+4,n+8,n+12]:[n+12,n+8,n+4,n];
   const result=mergeRow(inds.map(i=>cells[i]));earned+=result.gain;inds.forEach((i,k)=>cells[i]=result.row[k]);
  }
  if(cells.some((x,i)=>x!==prev[i])){
   score+=earned;spawn();high('merge',score);draw();
   if(cells.includes(2048)&&!record('merge').wins){win('merge');showStatus('2048 зібрано! Можете грати далі.');}
   else showStatus('Об’єднуйте однакові плитки');
  }
  if(!cells.includes(0)&&!cells.some((x,i)=>(i%4<3&&cells[i+1]===x)||(i<12&&cells[i+4]===x))){locked=true;showStatus('Ходів більше немає. Натисніть «Нова гра».');}
 }
 function reset(){cells=Array(16).fill(0);score=0;locked=false;spawn();spawn();begin('merge');draw();showStatus('З’єднайте плитки до 2048');}
 const keyHandler=e=>{if(document.body.dataset.page!=='games'||activeId!=='merge')return;const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}[e.key];if(dir){e.preventDefault();move(dir);}};
 const onClick=e=>{const d=e.target.closest('[data-vg-merge-dir]');if(d)move(d.dataset.vgMergeDir);if(e.target.closest('[data-vg-merge-new]'))reset();};
 document.addEventListener('keydown',keyHandler);controls.addEventListener('click',onClick);
 reset();dispose=()=>{document.removeEventListener('keydown',keyHandler);controls.removeEventListener('click',onClick);};
}
function startMemory(){
 const board=document.getElementById('vgGameBoard'),controls=document.getElementById('vgControls');
 board.innerHTML='<div id="vgMemoryGrid" class="vg-memory-grid"></div>';controls.innerHTML='<button type="button" class="vg-restart" data-vg-memory-new>Нова гра</button>';
 const symbols=['🌻','🎨','🌙','🌈','🍀','🎮','🔥','💛'];let deck=[],opened=[],matched=new Set(),moves=0,locked=false,firstClick=0,timeout=null;
 const grid=document.getElementById('vgMemoryGrid');
 function reset(){
  if(timeout)clearTimeout(timeout);matched=new Set();opened=[];moves=0;locked=false;firstClick=0;
  deck=[...symbols,...symbols].map((symbol,id)=>({symbol,id}));
  for(let i=deck.length-1;i>0;i--){const n=Math.floor(Math.random()*(i+1));[deck[i],deck[n]]=[deck[n],deck[i]];}
  begin('memory');draw();showStatus('Знайдіть 8 пар');setScore('Спроби: 0 · пари: 0/8');
 }
 function draw(){
  grid.innerHTML=deck.map((card,i)=>{
   const face=opened.includes(i)||matched.has(i),done=matched.has(i);
   return '<button type="button" data-vg-memory-card="'+i+'" class="'+(face?'is-open ':'')+(done?'is-matched':'')+'" aria-label="'+(face?esc(card.symbol):'Закрита картка')+'" '+(done?'disabled':'')+'><span>'+(face?card.symbol:'?')+'</span></button>';
  }).join('');
 }
 function flip(i){
  if(locked||opened.includes(i)||matched.has(i)||!deck[i])return;
  if(!firstClick)firstClick=Date.now();
  opened.push(i);draw();
  if(opened.length===2){
   moves++;setScore('Спроби: '+moves+' · пари: '+matched.size/2+'/8');
   const [a,b]=opened;
   if(deck[a].symbol===deck[b].symbol){
    matched.add(a);matched.add(b);opened=[];draw();setScore('Спроби: '+moves+' · пари: '+matched.size/2+'/8');
    if(matched.size===16){
     const prev=Number(record('memory').best)||0;progress('memory',{best:prev?Math.min(prev,moves):moves,wins:(Number(record('memory').wins)||0)+1});showStatus('Вітаємо! Усі пари знайдено за '+moves+' спроб.');
    }else showStatus('Пару знайдено!');
   }else{
    locked=true;showStatus('Запам’ятайте розташування...');
    timeout=setTimeout(()=>{opened=[];locked=false;draw();showStatus('Шукайте наступну пару');},750);
   }
  }
 }
 const onClick=e=>{if(e.target.closest('[data-vg-memory-new]'))reset();const c=e.target.closest('[data-vg-memory-card]');if(c)flip(Number(c.dataset.vgMemoryCard));};
 board.addEventListener('click',onClick);controls.addEventListener('click',onClick);
 reset();dispose=()=>{if(timeout)clearTimeout(timeout);board.removeEventListener('click',onClick);controls.removeEventListener('click',onClick);};
}
function startXO(){
 const board=document.getElementById('vgGameBoard'),controls=document.getElementById('vgControls');
 board.innerHTML='<div id="vgXOGrid" class="vg-xo-grid" role="grid" aria-label="Хрестики-нулики"></div>';
 controls.innerHTML='<button type="button" class="vg-restart" data-vg-xo-new>Заново</button>';
 const grid=document.getElementById('vgXOGrid');let cells=Array(9).fill(''),over=false,thinking=false,timeout=null;
 const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
 function outcome(arr){for(const [a,b,c] of lines)if(arr[a]&&arr[a]===arr[b]&&arr[a]===arr[c])return arr[a];return arr.every(Boolean)?'draw':'';}
 function minimax(arr,player,depth){
  const end=outcome(arr);if(end)return end==='O'?{value:10-depth}:end==='X'?{value:depth-10}:{value:0};
  const options=[];
  for(let i=0;i<9;i++)if(!arr[i]){arr[i]=player;const sub=minimax(arr,player==='O'?'X':'O',depth+1);arr[i]='';options.push({value:sub.value,index:i});}
  options.sort((a,b)=>player==='O'?b.value-a.value:a.value-b.value);return options[0];
 }
 function draw(){grid.innerHTML=cells.map((v,i)=>'<button data-vg-xo-cell="'+i+'" type="button" '+(v||over||thinking?'disabled':'')+' aria-label="Клітинка '+(i+1)+(v?', '+v:'')+'" class="'+(v?'is-'+v.toLowerCase():'')+'">'+(v||'')+'</button>').join('');}
 function finish(result){
  over=true;draw();
  if(result==='X'){win('xo');showStatus('Перемога! Ви виграли.');}
  else if(result==='O')showStatus('Комп’ютер виграв. Спробуйте ще.');
  else showStatus('Нічия. Ще одну партію?');
  setScore('Перемог проти комп’ютера: '+(record('xo').wins||0));
 }
 function click(i){
  if(over||thinking||cells[i])return;
  cells[i]='X';let end=outcome(cells);if(end){finish(end);return;}
  thinking=true;draw();showStatus('Хід комп’ютера...');
  timeout=setTimeout(()=>{const answer=minimax(cells,'O',0);if(answer&&Number.isInteger(answer.index))cells[answer.index]='O';thinking=false;draw();end=outcome(cells);if(end)finish(end);else showStatus('Ваш хід');},260);
 }
 function reset(){if(timeout)clearTimeout(timeout);cells=Array(9).fill('');over=false;thinking=false;begin('xo');draw();setScore('Перемог проти комп’ютера: '+(record('xo').wins||0));showStatus('Ви граєте за X. Ваш хід.');}
 const onClick=e=>{if(e.target.closest('[data-vg-xo-new]'))reset();const cell=e.target.closest('[data-vg-xo-cell]');if(cell)click(Number(cell.dataset.vgXoCell));};
 board.addEventListener('click',onClick);controls.addEventListener('click',onClick);
 reset();dispose=()=>{if(timeout)clearTimeout(timeout);board.removeEventListener('click',onClick);controls.removeEventListener('click',onClick);};
}
if(gameRoot){
 gameRoot.addEventListener('click',event=>{
  if(document.body.dataset.page!=='games')return;
  const open=event.target.closest('[data-vg-open]');if(open){activeId=open.dataset.vgOpen;renderGames();return;}
  if(event.target.closest('[data-vg-back]')){clearGame();activeId='';renderGames();return;}
  const t=event.target.closest('[data-vg-tab]');if(t){clearGame();activeId='';tab=t.dataset.vgTab;renderGames();return;}
 });
 gameRoot.addEventListener('input',event=>{
  if(document.body.dataset.page!=='games'||event.target.id!=='vgSearch')return;
  query=event.target.value;const cursor=event.target.selectionStart;
  const cards=document.querySelectorAll('.vg-game-card');
  cards.forEach(card=>{const title=card.querySelector('h3')?.textContent||'';const body=card.querySelector('p')?.textContent||'';card.hidden=!(title+' '+body).toLocaleLowerCase('uk-UA').includes(query.toLocaleLowerCase('uk-UA'));});
 });
}
export function vatraShowGames(uid){
 if(document.body.dataset.page!=='games'||!gameRoot)return;
 const resolved=String(uid||'guest');
 if(currentUid!==resolved){clearGame();currentUid=resolved;activeId='';tab='home';query='';loadRecords();}
 if(gameRoot.querySelector('.vg-app'))return;
 renderGames();
}
export function vatraGamesRouteChanged(isGames){
 if(!isGames){clearGame();activeId='';}
}
