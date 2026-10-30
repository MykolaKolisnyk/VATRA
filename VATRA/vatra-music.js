/* VATRA Music - official Spotify embeds only. No audio is downloaded, proxied, or stored. */
import { getDatabase, ref, get, update } from './vatra-backend.js?v=20261030-4';

const MUSIC_LIBRARY = Object.freeze([
 {type:'playlist',id:'6TNFFJnqIFFYifyio5Wha5',title:'Топ українських пісень',artist:'Український чарт',category:'Хіти',tone:1},
 {type:'playlist',id:'1CyMR0xlnQd6QylPs9HepS',title:'600 годин українського року',artist:'Muzikoda',category:'Рок',tone:2},
 {type:'playlist',id:'3dctz0iHylItj3CVpafe36',title:'Українська музика 2026',artist:'eSounds Mixes',category:'Популярне',tone:4},
 {type:'playlist',id:'5BGtRYVJqsXfKnubyV4uAM',title:'Український реп — TOP 30',artist:'rap.ua',category:'Хіп-хоп',tone:3},
 {type:'playlist',id:'4tvXjMfKnRFOKn3gxT5G8x',title:'Український реп',artist:'Faeton',category:'Хіп-хоп',tone:2},
 {type:'playlist',id:'65caUdDzMuSxKOYLKYLWLL',title:'Топ українських хітів',artist:'Слухач UA',category:'Хіти',tone:5},
 {type:'playlist',id:'4VPbIy6r6cnvh8ItkvS5Tx',title:'Українська музика — 2026',artist:'Mystic Songs',category:'Поп',tone:4},
 {type:'playlist',id:'2rSjuobn32IEBKnczYQTHK',title:'Топ 100 українських пісень',artist:'Sound Mix',category:'Хіти',tone:1},
 {type:'playlist',id:'3dAlUrO1vJz32RBX5hSqnv',title:'Український реп — новинки',artist:'rap.ua',category:'Хіп-хоп',tone:3},
 {type:'playlist',id:'1kbv778UlCDaOqRfd6nxYB',title:'Український рок',artist:'NUAM',category:'Рок',tone:2},
 {type:'playlist',id:'0QlFZzcYfNmFp8Ss6wbbPd',title:'Українська музика 2026',artist:'Discover Playlists',category:'Новинки',tone:5},
 {type:'playlist',id:'5Wky3JBDT5jCXVPICyOtCn',title:'Трендові пісні 2026',artist:'Redlist',category:'Новинки',tone:4},
 {type:'playlist',id:'0jabNrHCdpFTgF5xl2S8BH',title:'Свіжа українська музика',artist:'Calm Vibes Charts',category:'Новинки',tone:1},
 {type:'playlist',id:'38KEb9uVmhUpL1git4qgJA',title:'Українські пісні 2026',artist:'Redlist',category:'Популярне',tone:3},
 {type:'playlist',id:'6vOlMi4hfQjfxxErClNXH2',title:'Популярні українські пісні',artist:'Redlist',category:'Хіти',tone:4},
 {type:'playlist',id:'37i9dQZF1DX5ECfKO3L7Vd',title:'Найкращі пісні солов’їною',artist:'Добірка Spotify',category:'Хіти',tone:1},
 {type:'playlist',id:'37i9dQZF1DX15i3d3upwXj',title:'Топ українських треків 2025',artist:'Добірка Spotify',category:'Популярне',tone:4},
 {type:'playlist',id:'37i9dQZF1EIVcw7iqpsHFK',title:'KALUSH Mix',artist:'Добірка Spotify',category:'Хіп-хоп',tone:2},
 {type:'playlist',id:'7GFye4AxYRqIhiOr9U1EL1',title:'Українські хіти',artist:'Добірка Solovey Media',category:'Хіти',tone:5},
 {type:'track',id:'7n3Czk07KugPQOWuqCHDmF',title:'Teresa & Maria',artist:'alyona alyona, Jerry Heil',category:'Популярне',tone:3},
 {type:'track',id:'198PqHQboOXnYfwD1cr9Sa',title:'Хартбіт',artist:'DOROFEEVA',category:'Поп',tone:4},
 {type:'track',id:'6OQLRh7hCPiSDTk47KtG5K',title:'Журавлі',artist:'The Hardkiss',category:'Рок',tone:2},
 {type:'track',id:'1G3FiU4CcsCGTF0uQLwPFM',title:'Додому',artist:'KALUSH, SKOFKA',category:'Хіп-хоп',tone:1},
 {type:'track',id:'3fsxkZeWu1EVSr9XcPtHkQ',title:'Dark Disco',artist:'Jerry Heil',category:'Поп',tone:3},
 {type:'track',id:'0XSoAtMQfxspyYHZukP1ej',title:'Різнокольорова',artist:'DOROFEEVA',category:'Поп',tone:5},
 {type:'track',id:'3q7fKo3iPXyH5Oa8VMmHNa',title:'Холодно',artist:'Океан Ельзи',category:'Рок',tone:2},
 {type:'track',id:'2VAOrrVOXAG5f74KCGhtt8',title:'Твій промінь',artist:'SadSvit',category:'Інді',tone:1},
 {type:'track',id:'2i2YuNi1RUhJnTb2ByqrmJ',title:'Де моя молодість?',artist:'Lely45',category:'Інді',tone:4},
 {type:'artist',id:'6NTzEgUmN1PIBIYEHhf1kS',title:'Океан Ельзи',artist:'Виконавець · рок',category:'Рок',tone:2},
 {type:'artist',id:'4IJcztNtY5L7G3qK4yu1qt',title:'The Hardkiss',artist:'Виконавець · рок',category:'Рок',tone:3},
 {type:'artist',id:'71DkA619tW0bpaMi4QBzmr',title:'Jerry Heil',artist:'Виконавиця · поп',category:'Поп',tone:5},
 {type:'artist',id:'7wl1m5vgWkCP3cqYVj2noM',title:'DOROFEEVA',artist:'Виконавиця · поп',category:'Поп',tone:4},
 {type:'artist',id:'46rVVJwHWNS7C7MaWXd842',title:'KALUSH',artist:'Виконавець · хіп-хоп',category:'Хіп-хоп',tone:1},
 {type:'artist',id:'2ojY7fXJxZQhg8Rx5e8h9G',title:'SadSvit',artist:'Виконавець · інді',category:'Інді',tone:3},
 {type:'artist',id:'6fNkvAT7XRYuIynD5RTSLf',title:'Kalush Orchestra',artist:'Виконавець · фольк-реп',category:'Хіп-хоп',tone:5},
 {type:'album',id:'6Ep6BXKMZjgmrumX1ntPiY',title:'HEARTBEAT',artist:'DOROFEEVA · альбом',category:'Поп',tone:4},
 {type:'album',id:'6InMqKXQItEfOy7Fm5kJwy',title:'Залізна ластівка',artist:'The Hardkiss · альбом',category:'Рок',tone:2},
 {type:'album',id:'75JDz9NzMLWYsw3K9aYXXc',title:'ЙО-ЙО',artist:'KALUSH, SKOFKA · альбом',category:'Хіп-хоп',tone:1},
 {type:'album',id:'0Wn5sHYtC7vPPX0n2AVJmF',title:'Cassette',artist:'SadSvit · альбом',category:'Інді',tone:3}
]);
const db=getDatabase(), musicIndex=new Map(MUSIC_LIBRARY.map(item=>[item.type+':'+item.id,item]));
const page=document.getElementById('feed');
const musicHeader=document.getElementById('vatraMusicHeaderButton');
const musicTopPanel=document.getElementById('vatraMusicTopPanel');
let musicTab='all',musicQuery='',musicUid='',musicFavorites=new Set(),musicLoaded=false,musicLoadError='',musicLoading=false,playerItem=null,playerExpanded=false;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[ch]));
const key=item=>item.type+':'+item.id;
const labelFor={track:'Пісня',artist:'Виконавець',playlist:'Плейлист',album:'Альбом'};
const addressFor=item=>'https://open.spotify.com/'+item.type+'/'+item.id;
function notify(text,isError=false){
 const note=document.getElementById('vatraMusicNotice');
 if(note){note.textContent=text;note.hidden=false;note.classList.toggle('is-error',isError);}
}
function activePlayer(){
 let dock=document.getElementById('vatraMusicDock');
 if(dock)return dock;
 dock=document.createElement('aside');dock.id='vatraMusicDock';dock.className='vatra-music-dock';dock.setAttribute('aria-label','Програвач Spotify');
 dock.hidden=true;
 dock.innerHTML='<div class="vatra-music-dock-head"><div><span class="vatra-music-dock-mark">♫</span><span class="vatra-music-dock-meta"><b id="vatraMusicDockTitle">Музика</b><small id="vatraMusicDockArtist">Spotify</small></span></div><div class="vatra-music-dock-tools"><button type="button" data-music-expand aria-label="Змінити висоту програвача" title="Розгорнути або згорнути">▤</button><button type="button" data-music-close aria-label="Закрити програвач" title="Зупинити музику">×</button></div></div><div class="vatra-music-frame-wrap"><iframe id="vatraMusicFrame" title="Ліцензований програвач Spotify" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><div class="vatra-music-dock-footer"><span>Відтворює Spotify</span><a id="vatraMusicSourceLink" target="_blank" rel="noopener noreferrer">Відкрити у Spotify ↗</a></div>';
 document.body.append(dock);return dock;
}
function setPlayerExpanded(flag){
 playerExpanded=!!flag;const dock=activePlayer(),frame=dock.querySelector('#vatraMusicFrame');
 dock.classList.toggle('is-expanded',playerExpanded);
 frame.height=playerExpanded?'352':'152';
 dock.querySelector('[data-music-expand]').textContent=playerExpanded?'▁':'▤';
 dock.querySelector('[data-music-expand]').title=playerExpanded?'Згорнути програвач':'Розгорнути програвач';
}

function syncHeaderMusic(){
 const playing=!!playerItem;
 const dot=document.getElementById('vatraMusicPlayingDot');if(dot)dot.hidden=!playing;
 const title=document.getElementById('vatraTopMusicTitle');if(title)title.textContent=playing?playerItem.title:'Поки нічого не вибрано';
 const artist=document.getElementById('vatraTopMusicArtist');if(artist)artist.textContent=playing?playerItem.artist:'Обери музику у каталозі';
 const playerButton=document.getElementById('vatraTopMusicPlayer');if(playerButton)playerButton.disabled=!playing;
 if(musicHeader)musicHeader.classList.toggle('has-player',playing);
}
function closeMusicMenu(){if(musicTopPanel)musicTopPanel.hidden=true;if(musicHeader)musicHeader.setAttribute('aria-expanded','false');}
function play(item){
 if(!item||!['track','album','playlist','artist'].includes(item.type)||!(/^[A-Za-z0-9]{22}$/).test(item.id))return;
 const dock=activePlayer(),frame=dock.querySelector('#vatraMusicFrame');
 const changed=!playerItem||key(playerItem)!==key(item);
 playerItem=item;dock.hidden=false;
 dock.querySelector('#vatraMusicDockTitle').textContent=item.title;
 dock.querySelector('#vatraMusicDockArtist').textContent=item.artist;
 dock.querySelector('#vatraMusicSourceLink').href=addressFor(item);
 setPlayerExpanded(item.type!=='track');
 if(changed){
  const embed='https://open.spotify.com/embed/'+item.type+'/'+item.id+'?utm_source=generator';
  frame.src=embed;
 }
 document.body.classList.add('vatra-has-music');syncHeaderMusic();closeMusicMenu();
 if(document.body.dataset.page==='music')refreshCards();
}
function stop(){
 const dock=activePlayer();dock.querySelector('#vatraMusicFrame').removeAttribute('src');
 dock.hidden=true;playerItem=null;document.body.classList.remove('vatra-has-music');syncHeaderMusic();
 if(document.body.dataset.page==='music')refreshCards();
}
function parseSpotify(input){
 const value=String(input||'').trim();
 let kind='',id='';
 const match=value.match(/^spotify:(track|album|playlist|artist):([A-Za-z0-9]{22})$/i);
 if(match){kind=match[1];id=match[2];}
 else{
  let url;try{url=new URL(value)}catch{return null}
  if(url.protocol!=='https:'||url.hostname!=='open.spotify.com')return null;
  const parts=url.pathname.split('/').filter(Boolean).filter(x=>!/^intl-[a-z-]+$/i.test(x));
  if(parts.length!==2)return null;
  [kind,id]=parts;
 }
 if(!['track','album','playlist','artist'].includes(kind)||!/^[A-Za-z0-9]{22}$/.test(id))return null;
 return musicIndex.get(kind+':'+id)||{type:kind,id,title:'Запис зі Spotify',artist:labelFor[kind]||'Spotify',category:'Spotify',tone:2};
}
async function loadFavorites(uid){
 if(!uid||musicLoading||musicLoaded)return;
 musicLoading=true;musicLoadError='';if(document.body.dataset.page==='music')renderMusic();
 try{
  const snapshot=await get(ref(db,'privateUsers/'+uid+'/musicFavorites'));
  if(musicUid!==uid)return;
  const raw=snapshot.val(),array=Array.isArray(raw)?raw:[];
  musicFavorites=new Set(array.filter(x=>typeof x==='string'&&musicIndex.has(x)).slice(0,200));
  musicLoaded=true;musicLoadError='';
 }catch(error){if(musicUid===uid){musicLoadError='Не вдалося завантажити обране з Supabase. Перевірте з’єднання.';console.warn('[ВАТРА] Обране музики:',error);}}
 finally{musicLoading=false;if(musicUid===uid&&document.body.dataset.page==='music')renderMusic();}
}
function renderMusic(){
 if(document.body.dataset.page!=='music'||!page)return;
 const oldEmpty=document.getElementById('empty');if(oldEmpty)oldEmpty.hidden=true;
 const list=MUSIC_LIBRARY.filter(item=>(musicTab==='all'||(musicTab==='mine'?musicFavorites.has(key(item)):item.type===musicTab)));
 const cards=list.map(item=>'<article class="vatra-music-card tone-'+item.tone+'" data-music-card data-music-text="'+escapeHtml((item.title+' '+item.artist+' '+item.category).toLocaleLowerCase('uk-UA'))+'"><div class="vatra-music-card-image" aria-hidden="true"><span>'+({track:'♫',artist:'♬',album:'▤',playlist:'♩'}[item.type])+'</span></div><div class="vatra-music-card-info"><small>'+labelFor[item.type]+' · '+escapeHtml(item.category)+'</small><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.artist)+'</p></div><div class="vatra-music-card-actions"><button type="button" class="vatra-music-play" data-music-play="'+escapeHtml(key(item))+'" aria-label="Відкрити програвач: '+escapeHtml(item.title)+'">'+(playerItem&&key(playerItem)===key(item)?'У програвачі':'▶ Слухати')+'</button><button type="button" class="vatra-music-favorite'+(musicFavorites.has(key(item))?' is-saved':'')+'" data-music-favorite="'+escapeHtml(key(item))+'" '+(!musicLoaded?'disabled':'')+' title="'+(musicFavorites.has(key(item))?'Прибрати з моєї музики':'Додати у мою музику')+'" aria-label="'+(musicFavorites.has(key(item))?'Прибрати з обраного: ':'Зберегти в обраному: ')+escapeHtml(item.title)+'" aria-pressed="'+String(musicFavorites.has(key(item)))+'">'+(musicFavorites.has(key(item))?'♥':'♡')+'</button><a href="'+addressFor(item)+'" target="_blank" rel="noopener noreferrer" aria-label="Відкрити '+escapeHtml(item.title)+' на Spotify" title="Spotify">↗</a></div></article>').join('');
 const tabs=[['all','Головна'],['track','Пісні'],['artist','Виконавці'],['album','Альбоми'],['playlist','Плейлисти'],['mine','Моя музика']];
 page.innerHTML='<section class="vatra-music-page">'+
  '<div class="vatra-music-banner"><div class="vatra-music-banner-copy"><p class="vatra-music-eyebrow">ВАТРА · МУЗИКА</p><h2>Слухай українське</h2><p>Пісні, артисти та плейлисти — через офіційний програвач Spotify. Без завантаження музики на сервер ВАТРИ.</p></div><div class="vatra-music-banner-art" aria-hidden="true"><span>♫</span><span>♪</span><span>♬</span></div></div>'+
  '<div class="vatra-music-search"><label class="vatra-music-search-input"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="vatraMusicQuery" type="search" autocomplete="off" placeholder="Знайти музику або виконавця" aria-label="Пошук у добірці ВАТРИ" value="'+escapeHtml(musicQuery)+'"></label><a id="vatraMusicGlobalSearch" href="https://open.spotify.com/search/" target="_blank" rel="noopener noreferrer">Шукати в Spotify ↗</a></div>'+
  '<div class="vatra-music-tabs" role="group" aria-label="Категорії музики">'+tabs.map(([v,text])=>'<button type="button" data-music-tab="'+v+'" class="'+(musicTab===v?'active':'')+'" aria-pressed="'+String(musicTab===v)+'">'+text+(v==='mine'?' <span>'+musicFavorites.size+'</span>':'')+'</button>').join('')+'</div>'+
  '<div class="vatra-music-section-head"><div><h3>'+(tabs.find(x=>x[0]===musicTab)||tabs[0])[1]+'</h3><small>Офіційний Spotify · '+list.length+' добірок і записів</small></div></div>'+
  (musicLoadError?'<div class="vatra-music-status is-error">'+escapeHtml(musicLoadError)+' <button type="button" data-music-retry>Повторити</button></div>':!musicLoaded?'<div class="vatra-music-status">Завантаження збереженої музики…</div>':'')+
  '<p id="vatraMusicNotice" class="vatra-music-status" role="status" hidden></p>'+
  '<div id="vatraMusicResults" class="vatra-music-results">'+(cards||'<div class="vatra-music-empty">У цьому розділі поки немає збережених записів. Натисніть ♡ біля композиції чи плейлиста.</div>')+'</div>'+
  '<div id="vatraMusicSearchEmpty" class="vatra-music-empty" hidden>У вибраній добірці збігів не знайдено. Можете продовжити пошук через Spotify.</div>'+
  '<section class="vatra-music-link-box"><div><h3>Вже знаєте, що хочете послухати?</h3><p>Вставте посилання на будь-яку доступну пісню, альбом, артиста або плейлист Spotify. ВАТРА відкриє офіційний програвач.</p></div><form id="vatraMusicLinkForm"><input id="vatraMusicLink" type="url" inputmode="url" placeholder="https://open.spotify.com/track/..." aria-label="Посилання Spotify" required><button type="submit">Відкрити</button></form><small>Доступні записи й тривалість відтворення визначає Spotify; інколи потрібен вхід у Spotify.</small></section>'+
  '<p class="vatra-music-legal">ВАТРА не зберігає аудіофайлів, не транслює музику самостійно та не має власних прав на ці записи. Увесь контент відтворюється сервісом Spotify згідно з його правилами. Обране зберігається у Вашому акаунті ВАТРИ.</p>'+
  '</section>';
 filterResults();
}
function filterResults(){
 const input=document.getElementById('vatraMusicQuery');if(!input)return;
 const q=musicQuery.trim().toLocaleLowerCase('uk-UA');
 let visible=0;document.querySelectorAll('#vatraMusicResults [data-music-card]').forEach(el=>{el.hidden=!!q&&!el.dataset.musicText.includes(q);if(!el.hidden)visible++;});
 const empty=document.getElementById('vatraMusicSearchEmpty');if(empty)empty.hidden=visible>0||!q;
 const link=document.getElementById('vatraMusicGlobalSearch');if(link)link.href='https://open.spotify.com/search/'+encodeURIComponent(musicQuery||'українська музика');
}
function refreshCards(){
 if(document.body.dataset.page==='music')renderMusic();
}
async function favorite(item,button){
 if(!musicUid||!musicLoaded||!item)return notify('Увійдіть до ВАТРИ та дочекайтеся завантаження музики.',true);
 button.disabled=true;
 const next=new Set(musicFavorites);
 if(next.has(key(item)))next.delete(key(item));else next.add(key(item));
 try{
  await update(ref(db,'privateUsers/'+musicUid),{musicFavorites:[...next]});
  musicFavorites=next;
  refreshCards();
  notify(next.has(key(item))?'Додано до «Моєї музики».':'Прибрано з «Моєї музики».');
 }catch(error){button.disabled=false;notify('Не вдалося зберегти у Supabase. Спробуйте ще раз.',true);console.warn('[ВАТРА] Музика не збережена:',error);}
}
if(musicHeader&&musicTopPanel){
 musicHeader.addEventListener('click',()=>{const showing=musicTopPanel.hidden;musicTopPanel.hidden=!showing;musicHeader.setAttribute('aria-expanded',String(showing));syncHeaderMusic();});
 document.getElementById('vatraTopMusicOpen')?.addEventListener('click',()=>{closeMusicMenu();document.querySelector('.sidebar button[data-page="music"]')?.click();});
 document.getElementById('vatraTopMusicPlayer')?.addEventListener('click',()=>{closeMusicMenu();if(playerItem){activePlayer().hidden=false;setPlayerExpanded(true);}});
 document.addEventListener('click',event=>{if(!event.target.closest('#vatraMusicTopPanel')&&!event.target.closest('#vatraMusicHeaderButton'))closeMusicMenu();});
 window.addEventListener('keydown',event=>{if(event.key==='Escape')closeMusicMenu();});
}
document.addEventListener('click',async event=>{
 const tab=event.target.closest('[data-music-tab]');if(tab){musicTab=tab.dataset.musicTab;renderMusic();return;}
 const listen=event.target.closest('[data-music-play]');if(listen){play(musicIndex.get(listen.dataset.musicPlay));return;}
 const heart=event.target.closest('[data-music-favorite]');if(heart){await favorite(musicIndex.get(heart.dataset.musicFavorite),heart);return;}
 const expand=event.target.closest('[data-music-expand]');if(expand){setPlayerExpanded(!playerExpanded);return;}
 if(event.target.closest('[data-music-close]')){stop();return;}
 if(event.target.closest('[data-music-retry]')){musicLoadError='';musicLoaded=false;loadFavorites(musicUid);return;}
});
document.addEventListener('input',event=>{
 if(event.target.id==='vatraMusicQuery'){musicQuery=event.target.value;filterResults();}
});
document.addEventListener('submit',event=>{
 if(event.target.id!=='vatraMusicLinkForm')return;
 event.preventDefault();
 const raw=document.getElementById('vatraMusicLink')?.value||'';
 const item=parseSpotify(raw);
 if(!item){notify('Вставте повне посилання https://open.spotify.com/track/... (або album/playlist/artist).',true);return;}
 play(item);notify('Відкрито офіційний програвач Spotify.');
});
export function vatraShowMusic(uid){
 if(!uid)return;
 if(uid!==musicUid){musicUid=uid;musicFavorites=new Set();musicLoaded=false;musicLoadError='';musicLoading=false;musicTab='all';musicQuery='';}
 renderMusic();
 if(!musicLoaded&&!musicLoading)loadFavorites(uid);
}
export function vatraMusicRouteChanged(isMusic){
 if(!isMusic&&playerItem&&playerExpanded)setPlayerExpanded(false);
}
