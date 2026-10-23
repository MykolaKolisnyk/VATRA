import { supabase } from './supabase-client.js';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = { user:null, profile:null, page:'feed', posts:[], media:null };
const toast = (message) => { const el=$('#toast'); if(!el)return; el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2600); };
const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = p => ((p?.first_name||'В')[0]+(p?.last_name||'')[0]).toLocaleUpperCase('uk-UA');
const fullName = p => [p?.first_name,p?.last_name].filter(Boolean).join(' ') || p?.username || 'Учасник ВАТРИ';
const avatar = (p, cls='') => p?.avatar_url ? '<img class="avatar-img '+cls+'" src="'+esc(p.avatar_url)+'" alt="">' : '<span class="avatar '+cls+'">'+esc(initials(p))+'</span>';
const dateLabel = d => { try { return new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d)); } catch { return ''; } };

function setPage(page){
  state.page=page;
  $$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const titles={feed:['Новини','Дописи друзів і спільнот, за якими ти стежиш.'],profile:['Мій профіль','Твоя сторінка у ВАТРІ.'],friends:['Друзі','Знайомся, додавай друзів і залишайся на зв’язку.'],groups:['Спільноти','Знаходь своє коло та долучайся до спільнот.'],messages:['Повідомлення','Приватні розмови з іншими учасниками.'],saved:['Збережене','Дописи, до яких хочеш повернутися.'],settings:['Налаштування','Керуй своїм профілем і приватністю.'],notifications:['Сповіщення','Важливе про твою активність.'],videos:['Відео','Дописи з відео.'],search:['Пошук','Люди та дописи у ВАТРІ.']};
  const [t,s]=titles[page]||titles.feed; $('#title').textContent=t; $('#subtitle').textContent=s;
  const composer=$('.quick-compose'); if(composer)composer.hidden=page!=='feed'; if($('#sort'))$('#sort').hidden=page!=='feed';
  renderPage().catch(e=>{console.error(e);toast('Не вдалося завантажити розділ. Перевір підключення й права доступу бази.');});
}
async function getProfile(id){const {data,error}=await supabase.from('profiles').select('*').eq('id',id).maybeSingle();if(error)throw error;return data;}
async function refreshProfile(){
  if(!state.user)return; state.profile=await getProfile(state.user.id); const p=state.profile||{};
  ['topAvatar','composeAvatar','modalAvatar'].forEach(id=>{const el=$('#'+id);if(el)el.innerHTML=p.avatar_url?'<img class="avatar-img" src="'+esc(p.avatar_url)+'" alt="">':esc(initials(p));});
  if($('#modalName'))$('#modalName').textContent=fullName(p);
}
async function fetchPosts({userId=null,saved=false,video=false}={}){
  let q=supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(60);
  if(userId)q=q.eq('user_id',userId); if(video)q=q.eq('media_type','video');
  if(saved){const {data:marks,error}=await supabase.from('saved_posts').select('post_id').eq('user_id',state.user.id);if(error)throw error;const ids=(marks||[]).map(x=>x.post_id);if(!ids.length)return [];q=q.in('id',ids);}
  if(!userId&&!saved&&!video&&state.page==='feed'){
    const {data:rels,error:re}=await supabase.from('friendships').select('requester_id,addressee_id').eq('status','accepted').or('requester_id.eq.'+state.user.id+',addressee_id.eq.'+state.user.id);
    if(re)throw re;
    const authorIds=[state.user.id,...new Set((rels||[]).map(r=>r.requester_id===state.user.id?r.addressee_id:r.requester_id))];
    const {data:members,error:me}=await supabase.from('community_members').select('community_id').eq('user_id',state.user.id).eq('status','accepted');
    if(me)throw me;
    const communityIds=[...new Set((members||[]).map(m=>m.community_id))];
    if(communityIds.length)q=q.or('user_id.in.('+authorIds.join(',')+'),community_id.in.('+communityIds.join(',')+')');
    else q=q.in('user_id',authorIds);
  }
  const {data,error}=await q;if(error)throw error;const rows=data||[];const ids=[...new Set(rows.map(x=>x.user_id))];if(!ids.length)return rows.map(x=>({...x,author:null}));
  const {data:profiles,error:pe}=await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id',ids);if(pe)throw pe;
  const map=new Map((profiles||[]).map(p=>[p.id,p]));return rows.map(x=>({...x,author:map.get(x.user_id)}));
}
async function renderPosts(rows,host=$('#feed')){
  if(!host)return;host.innerHTML='';$('#empty').hidden=rows.length>0;
  for(const p of rows){
    let likes=[],comments=[];const [l,c]=await Promise.all([supabase.from('post_likes').select('user_id').eq('post_id',p.id),supabase.from('post_comments').select('id').eq('post_id',p.id)]);
    likes=l.data||[];comments=c.data||[];const liked=likes.some(x=>x.user_id===state.user?.id);
    const saved=state.user?await supabase.from('saved_posts').select('id').eq('user_id',state.user.id).eq('post_id',p.id).maybeSingle():{data:null};
    const {data:poll}=await supabase.from('post_polls').select('*').eq('post_id',p.id).maybeSingle();
    let pollHtml='';
    if(poll){const [opts,votes]=await Promise.all([supabase.from('poll_options').select('*').eq('poll_id',poll.id).order('position'),supabase.from('poll_votes').select('option_id,user_id').eq('poll_id',poll.id)]);const voted=(votes.data||[]).some(v=>v.user_id===state.user?.id);pollHtml='<section class="post-poll"><h4>'+esc(poll.question||'Опитування')+'</h4>'+(opts.data||[]).map(o=>'<button class="poll-option '+((votes.data||[]).some(v=>v.user_id===state.user?.id&&v.option_id===o.id)?'selected':'')+'" data-vote="'+o.id+'" data-poll="'+poll.id+'" '+(voted?'disabled':'')+'><span>'+esc(o.label)+'</span><small>'+((votes.data||[]).filter(v=>v.option_id===o.id).length)+'</small></button>').join('')+'</section>';}
    const card=document.createElement('article');card.className='post-card';
    card.innerHTML='<div class="post-head">'+avatar(p.author)+'<div class="post-by"><b>'+esc(fullName(p.author))+'</b><small>'+esc(dateLabel(p.created_at))+'</small></div><button class="post-menu" data-save="'+p.id+'" aria-label="Зберегти допис">'+(saved.data?'◆':'◇')+'</button></div>'+(p.content?'<p class="post-content">'+esc(p.content).replace(/\n/g,'<br>')+'</p>':'')+(p.media_url?'<div class="post-media">'+(p.media_type==='video'?'<video controls playsinline src="'+esc(p.media_url)+'"></video>':'<img loading="lazy" src="'+esc(p.media_url)+'" alt="Фото до допису">')+'</div>':'')+pollHtml+'<div class="post-stats"><span>'+likes.length+' вподобань</span><span>'+comments.length+' коментарів</span></div><div class="post-actions"><button data-like="'+p.id+'" class="'+(liked?'is-liked':'')+'">♡ Вподобати</button><button data-comment="'+p.id+'">◯ Коментувати</button></div><div class="comment-box" id="comments-'+p.id+'" hidden><div class="comment-list"></div><form data-comment-form="'+p.id+'"><input name="comment" maxlength="1000" placeholder="Напиши коментар…" required><button type="submit">Надіслати</button></form></div>';
    host.append(card);
  }
}
async function renderPage(){
  if(!state.user){showAuth('login');return;}
  if(['feed','videos','saved'].includes(state.page)){state.posts=await fetchPosts({saved:state.page==='saved',video:state.page==='videos'});await renderPosts(state.posts);return;}
  if(state.page==='profile'){await renderProfile(state.user.id);return;}
  if(state.page==='friends'){await renderFriends();return;}
  if(state.page==='groups'){await renderCommunities();return;}
  if(state.page==='messages'){await renderMessages();return;}
  if(state.page==='settings'){renderSettings();return;}
  if(state.page==='notifications'){await renderNotifications();return;}
  if(state.page==='search'){await doSearch($('#search').value.trim());return;}
}
async function renderNotifications(){
  const {data:items,error}=await supabase.from('notifications').select('*').eq('recipient_id',state.user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;
  const ids=[...new Set((items||[]).map(n=>n.actor_id).filter(Boolean))];const {data:people}=ids.length?await supabase.from('profiles').select('*').in('id',ids):{data:[]};const map=new Map((people||[]).map(p=>[p.id,p]));
  $('#feed').innerHTML='<div class="section-toolbar"><h2>Сповіщення</h2><button class="pill" id="markNotificationsRead">Позначити прочитаними</button></div>'+(items?.length?'<div class="notification-list">'+items.map(n=>'<button class="notification-row '+(!n.read_at?'unread':'')+'" data-notification="'+n.id+'">'+avatar(map.get(n.actor_id))+'<span><b>'+esc(fullName(map.get(n.actor_id)))+'</b><small>'+esc(n.body||({like:'Вподобав(-ла) твій допис',comment:'Прокоментував(-ла) твій допис',friend_request:'Надіслав(-ла) запит у друзі',friend_accepted:'Прийняв(-ла) запит у друзі'}[n.kind]||'Нова активність'))+'</small><small>'+esc(dateLabel(n.created_at))+'</small></span></button>').join(''):'<div class="state-panel"><h3>Поки немає сповіщень</h3><p>Коли хтось взаємодіятиме з тобою у ВАТРІ, це з’явиться тут.</p></div>');
  $('#markNotificationsRead')?.addEventListener('click',async()=>{const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',state.user.id).is('read_at',null);if(error)toast('Не вдалося оновити сповіщення.');else renderNotifications();});
}
function renderNotice(text){$('#feed').innerHTML='<section class="state-panel"><div class="state-icon">✳</div><h3>'+esc(text)+'</h3></section>';$('#empty').hidden=true;}
async function renderProfile(id){
  const p=id===state.user.id?state.profile:await getProfile(id);if(!p){renderNotice('Профіль не знайдено.');return;}
  const rows=await fetchPosts({userId:id});
  $('#feed').innerHTML='<section class="profile-hero">'+(p.cover_url?'<img class="profile-cover" src="'+esc(p.cover_url)+'" alt="">':'<div class="profile-cover profile-cover-empty"></div>')+'<div class="profile-summary">'+avatar(p,'profile-avatar')+'<div class="profile-name"><h2>'+esc(fullName(p))+'</h2><p>@'+esc(p.username||'vatra-user')+'</p><p>'+esc(p.bio||'Ще не додано опис профілю.')+'</p></div>'+(id===state.user.id?'<button class="pill" id="editProfile">Редагувати профіль</button>':'<button class="pill" data-person="'+id+'">Додати в друзі</button>')+'</div></section><h3 class="section-heading">Дописи</h3><div id="profilePosts"></div>';
  await renderPosts(rows,$('#profilePosts'));if(id===state.user.id)$('#editProfile').onclick=editProfile;
}
async function editProfile(){
  const first=prompt('Ім’я',state.profile.first_name||'');if(first===null)return;const last=prompt('Прізвище',state.profile.last_name||'');if(last===null)return;const bio=prompt('Коротко про себе',state.profile.bio||'');if(bio===null)return;const username=prompt('Унікальне ім’я користувача (без @)',state.profile.username||'');if(username===null)return;
  const {error}=await supabase.from('profiles').update({first_name:first.trim(),last_name:last.trim(),bio:bio.trim(),username:username.trim().toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,30),updated_at:new Date().toISOString()}).eq('id',state.user.id);
  if(error){toast(error.code==='23505'?'Це ім’я користувача вже зайняте.':'Не вдалося зберегти профіль.');return;}await refreshProfile();await renderProfile(state.user.id);toast('Профіль оновлено.');
}
async function renderFriends(){
  const {data:rels,error}=await supabase.from('friendships').select('*').or('requester_id.eq.'+state.user.id+',addressee_id.eq.'+state.user.id).order('created_at',{ascending:false});if(error)throw error;
  const ids=[...new Set((rels||[]).flatMap(r=>[r.requester_id,r.addressee_id]).filter(id=>id!==state.user.id))];const {data:people}=ids.length?await supabase.from('profiles').select('*').in('id',ids):{data:[]};const map=new Map((people||[]).map(p=>[p.id,p]));
  $('#feed').innerHTML='<div class="section-toolbar"><h2>Твої друзі</h2><span>'+(rels||[]).filter(r=>r.status==='accepted').length+'</span></div>'+((rels||[]).length?'<div class="people-grid">'+rels.map(r=>{const id=r.requester_id===state.user.id?r.addressee_id:r.requester_id,p=map.get(id)||{};return '<article class="person-card">'+avatar(p)+'<b>'+esc(fullName(p))+'</b><small>'+(r.status==='accepted'?'Друзі':r.addressee_id===state.user.id?'Запит на дружбу':'Очікує відповіді')+'</small>'+(r.status==='pending'&&r.addressee_id===state.user.id?'<button class="pill" data-accept="'+r.id+'">Прийняти</button>':'<button class="pill" data-open-profile="'+id+'">Профіль</button>')+'</article>';}).join('')+'</div>':'<div class="state-panel"><h3>Тут поки тихо</h3><p>Знайди знайомих через пошук і надішли запит у друзі.</p></div>');
}
async function renderCommunities(){
  const {data:groups,error}=await supabase.from('communities').select('*').order('created_at',{ascending:false}).limit(60);if(error)throw error;
  $('#feed').innerHTML='<div class="section-toolbar"><h2>Спільноти</h2><button class="primary" id="newCommunity">＋ Створити</button></div>'+(groups?.length?'<div class="community-grid">'+groups.map(g=>'<article class="community-card"><div class="community-mark">в</div><h3>'+esc(g.name)+'</h3><p>'+esc(g.description||'Українська спільнота у ВАТРІ.')+'</p><button class="pill" data-join="'+g.id+'">Приєднатися</button></article>').join('')+'</div>':'<div class="state-panel"><h3>Створи першу спільноту</h3><p>Збирай людей навколо спільних інтересів.</p></div>');
  $('#newCommunity').onclick=createCommunity;
}
async function createCommunity(){
  const name=prompt('Назва спільноти');if(!name?.trim())return;const description=prompt('Короткий опис')||'';
  const {data,error}=await supabase.from('communities').insert({owner_id:state.user.id,name:name.trim(),description:description.trim()}).select().single();
  if(error){toast('Не вдалося створити спільноту.');return;}await supabase.from('community_members').insert({community_id:data.id,user_id:state.user.id,role:'owner',status:'accepted'});toast('Спільноту створено.');await renderCommunities();
}
async function renderMessages(){
  const {data:convs,error}=await supabase.from('conversations').select('*').or('user_one.eq.'+state.user.id+',user_two.eq.'+state.user.id).order('created_at',{ascending:false});if(error)throw error;
  const ids=[...new Set((convs||[]).map(c=>c.user_one===state.user.id?c.user_two:c.user_one))];const {data:people}=ids.length?await supabase.from('profiles').select('*').in('id',ids):{data:[]};const map=new Map((people||[]).map(p=>[p.id,p]));
  $('#feed').innerHTML='<div class="section-toolbar"><h2>Повідомлення</h2><button class="pill" id="newMessage">＋ Нова розмова</button></div>'+(convs?.length?convs.map(c=>{const id=c.user_one===state.user.id?c.user_two:c.user_one,p=map.get(id)||{};return '<button class="conversation-row" data-conversation="'+c.id+'" data-person="'+id+'">'+avatar(p)+'<span><b>'+esc(fullName(p))+'</b><small>Відкрити розмову</small></span><span>›</span></button>';}).join(''):'<div class="state-panel"><h3>Поки немає розмов</h3><p>Знайди людину через пошук, щоб почати спілкування.</p></div>');
  $('#newMessage').onclick=()=>{const who=prompt('Встав ID користувача, якому хочеш написати');if(who)openConversationWith(who.trim());};
}
async function openConversationWith(other){
  if(other===state.user.id)return;const [one,two]=[state.user.id,other].sort();let {data:c,error}=await supabase.from('conversations').select('*').eq('user_one',one).eq('user_two',two).maybeSingle();if(error){toast('Не вдалося знайти розмову.');return;}
  if(!c){const res=await supabase.from('conversations').insert({user_one:one,user_two:two}).select().single();c=res.data;error=res.error;}if(error||!c){toast('Не вдалося створити розмову.');return;}
  const {data:msgs}=await supabase.from('messages').select('*').eq('conversation_id',c.id).order('created_at');
  $('#feed').innerHTML='<div class="section-toolbar"><button class="pill" id="backMessages">← Назад</button><h2>Розмова</h2></div><div class="chat-history">'+(msgs||[]).map(m=>'<p class="'+(m.sender_id===state.user.id?'mine':'')+'">'+esc(m.content)+'<small>'+esc(dateLabel(m.created_at))+'</small></p>').join('')+'</div><form id="sendMessage" class="chat-send"><input name="message" maxlength="3000" placeholder="Напиши повідомлення…" required><button class="primary">Надіслати</button></form>';
  $('#backMessages').onclick=()=>setPage('messages');$('#sendMessage').onsubmit=async e=>{e.preventDefault();const content=new FormData(e.currentTarget).get('message').trim();if(!content)return;const {error}=await supabase.from('messages').insert({conversation_id:c.id,sender_id:state.user.id,content});if(error){toast('Не вдалося надіслати повідомлення.');return;}await openConversationWith(other);};
}
function renderSettings(){
  const p=state.profile||{};$('#feed').innerHTML='<section class="settings-panel"><h2>Налаштування профілю</h2><label>Ім’я<input id="settingFirst" value="'+esc(p.first_name||'')+'"></label><label>Прізвище<input id="settingLast" value="'+esc(p.last_name||'')+'"></label><label>Ім’я користувача<input id="settingUsername" value="'+esc(p.username||'')+'"></label><label>Про себе<textarea id="settingBio" rows="3">'+esc(p.bio||'')+'</textarea></label><label>Видимість профілю<select id="settingVisibility"><option value="public">Публічний</option><option value="friends">Друзі</option><option value="private">Приватний</option></select></label><button class="primary" id="saveSettings">Зберегти зміни</button><button class="pill" id="signOut">Вийти з акаунта</button></section>';
  $('#settingVisibility').value=p.profile_visibility||'public';
  $('#saveSettings').onclick=async()=>{const patch={first_name:$('#settingFirst').value.trim(),last_name:$('#settingLast').value.trim(),username:$('#settingUsername').value.trim().toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,30)||null,bio:$('#settingBio').value.trim(),profile_visibility:$('#settingVisibility').value,updated_at:new Date().toISOString()};const {error}=await supabase.from('profiles').update(patch).eq('id',state.user.id);if(error){toast(error.code==='23505'?'Це ім’я користувача вже зайняте.':'Не вдалося зберегти зміни.');return;}await refreshProfile();toast('Зміни збережено.');};
  $('#signOut').onclick=async()=>{await supabase.auth.signOut();location.href='auth.html';};
}
async function doSearch(term){
  if(!term){renderNotice('Введи ім’я, прізвище або текст допису в полі пошуку.');return;}
  const {data:people,error}=await supabase.from('profiles').select('*').or('first_name.ilike.%'+term+'%,last_name.ilike.%'+term+'%,username.ilike.%'+term+'%').eq('searchable',true).limit(20);if(error)throw error;
  const {data:posts}=await supabase.from('posts').select('*').ilike('content','%'+term+'%').order('created_at',{ascending:false}).limit(20);
  $('#feed').innerHTML='<h2 class="section-heading">Люди</h2><div class="people-grid">'+(people||[]).map(p=>'<article class="person-card">'+avatar(p)+'<b>'+esc(fullName(p))+'</b><button class="pill" data-open-profile="'+p.id+'">Переглянути</button>'+(p.id!==state.user.id?'<button class="pill" data-person="'+p.id+'">Додати в друзі</button>':'')+'</article>').join('')+'</div><h2 class="section-heading">Дописи</h2><div id="searchPosts"></div>';
  const host=$('#searchPosts');if(posts?.length){const ids=[...new Set(posts.map(p=>p.user_id))];const {data:authors}=await supabase.from('profiles').select('*').in('id',ids);const map=new Map((authors||[]).map(p=>[p.id,p]));await renderPosts(posts.map(p=>({...p,author:map.get(p.user_id)})),host);}else host.innerHTML='<p class="muted">Дописи не знайдені.</p>';
}
function showAuth(mode='login'){
  const d=$('#authDialog');if(!d)return;d.showModal?.();$('#authError').textContent='';$('#authTitle').textContent=mode==='register'?'Створи акаунт ВАТРИ':'З поверненням до ВАТРИ';$('#authEyebrow').textContent=mode==='register'?'ТВОЯ ІСТОРІЯ ПОЧИНАЄТЬСЯ ТУТ':'РАДІ БАЧИТИ ЗНОВУ';$('#nameField').hidden=mode!=='register';$('#birthdayField').hidden=mode!=='register';$('#confirmField').hidden=mode!=='register';$('#authSwitchText').textContent=mode==='register'?'Вже маєш акаунт?':'Ще немає акаунта?';$('#authSwitch').textContent=mode==='register'?'Увійти':'Зареєструватися';$('#authSubmit').textContent=mode==='register'?'Створити акаунт':'Увійти';
  $('#authSwitch').onclick=()=>showAuth(mode==='register'?'login');
  $('#authForm').onsubmit=async e=>{e.preventDefault();const email=$('#authEmail').value.trim().toLowerCase(),password=$('#authPassword').value;let res;
    if(mode==='register'){const parts=$('#authName').value.trim().split(/\s+/),first_name=parts.shift()||'',last_name=parts.join(' '),date_of_birth=$('#authBirthday').value;if(!first_name||!last_name||!date_of_birth){$('#authError').textContent='Вкажи ім’я, прізвище та дату народження.';return;}if(password.length<10||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)){$('#authError').textContent='Пароль: щонайменше 10 символів, велика й мала латинські літери та цифра.';return;}if(password!==$('#authConfirmPassword').value){$('#authError').textContent='Паролі не збігаються.';return;}res=await supabase.auth.signUp({email,password,options:{data:{first_name,last_name,date_of_birth}}});}
    else res=await supabase.auth.signInWithPassword({email,password});
    if(res.error){$('#authError').textContent=res.error.message.includes('already registered')?'Ця пошта вже зареєстрована.':res.error.message;return;}if(mode==='register'&&!res.data.session){$('#authError').textContent='Перевір пошту та підтверди реєстрацію, а потім увійди.';return;}d.close();await boot();
  };
}
async function handleClick(e){
  const b=e.target.closest('button');if(!b)return;if(b.dataset.page){setPage(b.dataset.page);return;}if(b.id==='authButton'){showAuth('login');return;}if(b.id==='authClose'){$('#authDialog').close();return;}
  if(b.dataset.like){const id=b.dataset.like,existing=await supabase.from('post_likes').select('id').eq('post_id',id).eq('user_id',state.user.id).maybeSingle();if(existing.data)await supabase.from('post_likes').delete().eq('id',existing.data.id);else{const {error}=await supabase.from('post_likes').insert({post_id:id,user_id:state.user.id});if(error){toast('Не вдалося поставити вподобання.');return;}}await renderPage();return;}
  if(b.dataset.save){const id=b.dataset.save,existing=await supabase.from('saved_posts').select('id').eq('post_id',id).eq('user_id',state.user.id).maybeSingle();if(existing.data)await supabase.from('saved_posts').delete().eq('id',existing.data.id);else{const {error}=await supabase.from('saved_posts').insert({post_id:id,user_id:state.user.id});if(error){toast('Не вдалося зберегти допис.');return;}}toast(existing.data?'Прибрано зі збереженого':'Допис збережено');await renderPage();return;}
  if(b.dataset.notification){const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',b.dataset.notification).eq('recipient_id',state.user.id);if(error)toast('Не вдалося оновити сповіщення.');else await renderNotifications();return;}
  if(b.dataset.reportPost){const reason=prompt('Причина скарги: спам, образи, мова ворожнечі, небезпечний контент або інше');if(!reason?.trim())return;const details=prompt('Додаткові деталі (необов’язково)')||'';const {error}=await supabase.from('content_reports').insert({reporter_id:state.user.id,target_type:'post',target_id:b.dataset.reportPost,reason:reason.trim().slice(0,100),details:details.trim().slice(0,500)});toast(error?'Не вдалося надіслати скаргу.':'Скаргу надіслано. Дякуємо.');return;}
  if(b.dataset.vote){const {error}=await supabase.from('poll_votes').insert({poll_id:b.dataset.poll,option_id:b.dataset.vote,user_id:state.user.id});if(error){toast(error.code==='23505'?'Ти вже проголосував у цьому опитуванні.':'Не вдалося зарахувати голос.');return;}toast('Голос зараховано.');await renderPage();return;}
  if(b.dataset.comment){const box=$('#comments-'+b.dataset.comment);box.hidden=!box.hidden;if(!box.hidden){const {data}=await supabase.from('post_comments').select('*').eq('post_id',b.dataset.comment).order('created_at');const ids=[...new Set((data||[]).map(x=>x.user_id))];const {data:people}=ids.length?await supabase.from('profiles').select('*').in('id',ids):{data:[]};const map=new Map((people||[]).map(p=>[p.id,p]));$('.comment-list',box).innerHTML=(data||[]).map(c=>'<p><b>'+esc(fullName(map.get(c.user_id)))+'</b> '+esc(c.content)+'</p>').join('');}return;}
  if(b.dataset.openProfile){await renderProfile(b.dataset.openProfile);return;}
  if(b.dataset.person){const {error}=await supabase.from('friendships').insert({requester_id:state.user.id,addressee_id:b.dataset.person,status:'pending'});toast(error?(error.code==='23505'?'Запит уже існує.':'Не вдалося надіслати запит.'):'Запит у друзі надіслано.');return;}
  if(b.dataset.accept){const {error}=await supabase.from('friendships').update({status:'accepted'}).eq('id',b.dataset.accept);if(error)toast('Не вдалося прийняти запит.');else await renderFriends();return;}
  if(b.dataset.join){const {error}=await supabase.from('community_members').insert({community_id:b.dataset.join,user_id:state.user.id,status:'accepted'});toast(error?(error.code==='23505'?'Ти вже у цій спільноті.':'Не вдалося приєднатися.'):'Ти приєднався до спільноти.');return;}
  if(b.dataset.conversation){await openConversationWith(b.dataset.person);return;}
  if(['create','prompt','postNow'].includes(b.id)){if(!state.user){showAuth();return;}$('#composer').showModal();return;}
  if(b.id==='photoBtn'){$('#modalPhoto').click();return;}if(b.id==='close')$('#composer').close();if(b.id==='editProfile')editProfile();if(b.id==='communityClose'||b.id==='communityCancel')$('#communityDialog').close();
}
document.addEventListener('click',e=>handleClick(e).catch(err=>{console.error(err);toast('Сталася помилка. Спробуй ще раз.');}));
$('#search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setPage('search');doSearch(e.target.value.trim()).catch(console.error);}});
$('#modalPhoto')?.addEventListener('change',e=>readMedia(e.target.files?.[0]));
function readMedia(file){if(!file)return;if(file.size>5*1024*1024){toast('Файл завеликий. Максимум 5 МБ.');return;}const reader=new FileReader();reader.onload=()=>{state.media={url:reader.result,type:file.type.startsWith('video/')?'video':'image'};$('#preview').innerHTML=state.media.type==='video'?'<video controls src="'+state.media.url+'"></video>':'<img src="'+state.media.url+'" alt="Попередній перегляд">';};reader.readAsDataURL(file);}
$('#togglePoll')?.addEventListener('click',()=>{const panel=$('#pollComposer');panel.hidden=!panel.hidden;$('#togglePoll').setAttribute('aria-expanded',String(!panel.hidden));});
$('#addPollOption')?.addEventListener('click',()=>{const fields=$('#pollOptionFields input');if(fields.length>=6){toast('Максимум 6 варіантів.');return;}const wrap=document.createElement('label');wrap.className='poll-option-field';wrap.innerHTML='<span>'+(fields.length+1)+'</span><input maxlength="80" placeholder="Варіант відповіді" aria-label="Варіант відповіді"><button type="button" data-remove-poll-option aria-label="Видалити варіант">×</button>';$('#pollOptionFields').append(wrap);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-remove-poll-option]');if(!b)return;const fields=$('#pollOptionFields .poll-option-field');if(fields.length<=2){toast('В опитуванні має залишитися щонайменше два варіанти.');return;}b.closest('.poll-option-field').remove();$('#pollOptionFields .poll-option-field').forEach((el,i)=>el.querySelector('span').textContent=String(i+1));});
$('#postForm')?.addEventListener('submit',async e=>{e.preventDefault();const content=$('#postText').value.trim();if(!content&&!state.media){toast('Додай текст або медіа до допису.');return;}const pollEnabled=$('#pollComposer')&&!$('#pollComposer').hidden;const options=pollEnabled?$('#pollOptionFields input').map(i=>i.value.trim()).filter(Boolean):[];if(pollEnabled&&options.length<2){toast('Для опитування потрібно щонайменше два варіанти.');return;}const {data:post,error}=await supabase.from('posts').insert({user_id:state.user.id,content,media_url:state.media?.url||null,media_type:state.media?.type||null,visibility:'public'}).select().single();if(error){toast('Не вдалося опублікувати. Перевір таблицю posts і RLS.');return;}if(pollEnabled){const {data:poll,error:pollError}=await supabase.from('post_polls').insert({post_id:post.id,question:content||'Опитування',created_by:state.user.id}).select().single();if(pollError){toast('Допис створено, але опитування не збереглося.');}else{const {error:optError}=await supabase.from('poll_options').insert(options.map((label,position)=>({poll_id:poll.id,label,position})));if(optError)toast('Допис створено, але варіанти опитування не збереглися.');}}$('#postText').value='';$('#preview').innerHTML='';state.media=null;$('#composer').close();toast('Допис опубліковано.');setPage('feed');});
document.addEventListener('submit',async e=>{const form=e.target.closest('[data-comment-form]');if(form){e.preventDefault();const postId=form.dataset.commentForm,content=new FormData(form).get('comment').trim();if(!content)return;const {error}=await supabase.from('post_comments').insert({post_id:postId,user_id:state.user.id,content});if(error){toast('Не вдалося додати коментар.');return;}form.reset();const box=$('#comments-'+postId);const {data}=await supabase.from('post_comments').select('*').eq('post_id',postId).order('created_at');$('.comment-list',box).innerHTML=(data||[]).map(c=>'<p>'+esc(c.content)+'</p>').join('');}});
async function boot(){const {data:{session}}=await supabase.auth.getSession();if(!session){$('#authButton').hidden=false;$('#authButton').textContent='Увійти';window.__vatraStarted=true;return;}state.user=session.user;$('#authButton').hidden=true;await refreshProfile();await renderPage();window.__vatraStarted=true;}
supabase.auth.onAuthStateChange((_event,session)=>{if(!session){state.user=null;state.profile=null;if($('#authButton'))$('#authButton').hidden=false;}else if(!state.user){state.user=session.user;setTimeout(()=>boot().catch(console.error),0);}});
boot().catch(err=>{console.error(err);const el=$('#startupError');if(el){el.hidden=false;$('#startupErrorText').textContent='Не вдалося підключитися до Supabase. Перевір supabase-client.js, таблиці та RLS-політики. '+(err.message||'');}});
