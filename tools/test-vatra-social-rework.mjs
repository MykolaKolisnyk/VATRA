import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read=p=>readFileSync(p,'utf8');
const js=read('assets/scripts/app/main.js'),html=read('index.html'),css=read('assets/styles/sources/foundation/shared-tokens.css');
const auth=read('assets/scripts/auth/auth.js'),studio=read('assets/scripts/media/photo-studio.js');
const sidebar=html.match(/<aside class="sidebar"><nav[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
const sidebarOrder=['profile','friends','feed','messages','groups','photos','myVideos','gifts','saved','settings'];
assert.ok(sidebar.length>0,'Missing navigation');
const indices=sidebarOrder.map(page=>sidebar.indexOf('data-page="'+page+'"'));
assert.ok(indices.every((p,i)=>p>=0&&(!i||p>indices[i-1])),'Sidebar order does not match user request');
const dividerPos=sidebar.indexOf('class="vatra-sidebar-divider"'),giftsPos=sidebar.indexOf('data-page="gifts"'),savedPos=sidebar.indexOf('data-page="saved"');
assert.ok(giftsPos>=0&&giftsPos<dividerPos&&dividerPos<savedPos,'Dedicated divider must be between Gifts and Saved');assert.ok(!sidebar.includes('data-page="videos"'),'Clips must be removed');
assert.ok(!sidebar.includes('vatra-nav-section-start'),'Gifts must not use a border pretending to be a divider');
assert.ok(css.includes('.layout>.sidebar nav>.vatra-sidebar-divider'),'Dedicated divider needs layout styles');
for(const hint of ['Переглянути людей із міста','які працюють у','які навчалися у','рідне місто']){
 assert.ok(js.includes(hint),'Contextual search hint missing: '+hint);
}
assert.ok(css.includes('text-decoration:underline solid 1px'),'Profile links must not use dotted underlines');
const languageJs=read('assets/scripts/i18n/language.js'),languageCss=read('assets/styles/sources/foundation/dialogs-and-controls.css');
assert.ok(languageJs.includes('class="vatra-language-dialog-header"'),'Language header must use compact layout');
assert.ok(languageJs.includes('src="favicon.svg?v=20261105-original-v1" class="vatra-language-dialog-logo"')&&!languageJs.includes('vatra-flame.svg'),'Language header must use actual VATRA V brand mark, never flame');
assert.ok(languageCss.includes('width:min(800px')&&languageCss.includes('vatra-language-dialog-header'),'Language dialog layout must fit desktop and mobile');
assert.ok(html.includes('href="#vatra-i-news"'),'News icon must not be a house');
assert.ok(!html.includes('Свої серед своїх'),'No exclusive positioning in the sidebar');
assert.ok(js.includes('vatra-birthday-visit')&&js.includes('vatra-birthday-name'),'Birthday names and avatars should navigate to pages');
assert.ok(js.includes('vatraBirthdayComposeMessage(uid)'),'Birthday greeting must be reviewed before sending');
assert.ok(js.includes('Math.floor(Math.random()*VATRA_BIRTHDAY_MESSAGES.length)'),'Birthday greetings must rotate');
assert.ok(css.includes('.vatra-birthday-compose'),'Birthday editor needs visual styles');
const i=js.indexOf('const VATRA_BIRTHDAY_MESSAGES=');
const j=js.indexOf('function vatraBirthdayComposeMessage(',i);
assert.ok(i>=0&&j>i);
const greetingCode=js.slice(i,j);
const count=(greetingCode.match(/'🎉|🎂|✨|🥳|💛|🎈|🌟|🎊|🌷|🎁|💫|🍰|☀️|💐|🥂|🫶|🌼/g)||[]).length;
assert.ok(count>=20,'Expected at least 20 birthday greeting variants');
const greeting=runInNewContext(greetingCode+'\nvatraBirthdayGreetText;', {Math});
assert.match(greeting('Олена Гончаренко'),/Олена/);
assert.ok(!greeting('Олена').includes('{name}'));
assert.ok(js.includes("p.kind==='story'"),'Stories need a distinct post type');
assert.ok(js.includes('createPost(entry,{kind:\'story\''),'Stories must be persisted with ownership checks');
assert.ok(js.includes('VATRA_STORY_LIFETIME_MS=24*60*60*1000'),'24-hour story lifetime expected');
assert.ok(js.includes("Object.entries(posts||{}).filter(([,p])=>p?.kind!=='story')"),'Stories cannot leak into regular posts');
assert.ok(js.includes('data-create-story')&&js.includes('data-open-story')&&js.includes('data-story-delete'));
assert.ok(js.includes("uploadStoryMedia(file,entry.key)"),'Stories must use a private media bucket');
assert.ok(js.includes("getStoryMediaUrl(story)"),'Viewer must request a short-lived private media URL');
assert.ok(js.includes("removeStoryMedia(story)"),'Story deletion must handle private uploads');
assert.ok(!js.includes("getImageEditor(file,'story')"),'Stories must not invoke the generic profile photo editor');
assert.ok(js.includes('vatra-story-preview-stage')&&js.includes('captionPosition:position,overlayTheme:theme'),'Stories must provide a dedicated live preview with styling');
assert.ok(studio.includes("isStory=mode==='story'")&&studio.includes('isStory?1600:900'),'Stories must export 9:16 images');
assert.ok(studio.includes("['brush','pencil','Пензель']")&&studio.includes("['stickers','smile','Стікери']")&&studio.includes("['filters','sliders-horizontal','Фільтри']"),'Story editor must include brush, stickers and filters');
assert.ok(js.includes("await vatraRemoveOwnStoryMedia(story);await remove(ref(db,'posts/'+story.id))"),'Deleting a story must also clean its owned media');
assert.ok(js.includes("void vatraCleanupExpiredOwnStories()"),'Expired stories must be cleaned up on visits');
assert.ok(js.includes("parts[0]!==currentUser.uid")&&js.includes("url.origin!==origin"),'Storage deletion must be ownership- and origin-restricted');
assert.ok(js.includes("vatraStoryVisibility")&&js.includes('value="public"')&&js.includes('value="friends"')&&js.includes('value="private"'),'Stories need explicit all/friends/only-me audience choices');
assert.ok(js.includes("function vatraStoryVisibleToViewer(")&&js.includes("if(story.visibility==='private')return false"),'Viewer audience must be checked for every story');
assert.ok(js.includes("vatra-profile-story-link")&&js.includes("vatra-avatar-has-story"),'Profiles must show active stories on avatars and under photos');
assert.ok(js.includes("p.authorUid===uid&&p.kind!=='story'"),'Stories cannot appear in regular profile posts');
assert.ok(css.includes('.vatra-profile-story-link')&&css.includes('.vatra-story-visibility-field'),'Story visibility controls need finished styles');
assert.ok(css.includes('.vatra-stories-rail')&&css.includes('.vatra-story-dialog'));
const normStart=js.indexOf('function vatraNormalizeSettingsPhone(');
const normEnd=js.indexOf('\nfunction renderSettings(){',normStart);
assert.ok(normStart>=0&&normEnd>normStart);
const normalize=runInNewContext(js.slice(normStart,normEnd)+'\nvatraNormalizeSettingsPhone;', {});
assert.equal(normalize('0931234567','+380'),'+380931234567');
assert.equal(normalize('0612345678','+33'),'+33612345678');
assert.equal(normalize('+4915112345678','+380'),'+4915112345678');
assert.ok(js.includes('if(changedHandle&&(!f.vatraValidateHandle||!await f.vatraValidateHandle()))'),'Unchanged handle must not block name or gender edits');
for(const code of ['+380','+48','+49','+33','+34','+351','+39','+44','+1'])assert.ok(js.includes('value="'+code+'"'),'Phone country missing '+code);
assert.ok(auth.includes('const verifiedUser=verifiedData?.user')&&auth.includes('verifiedUser.email_confirmed_at'),'New pages must require server-confirmed OTP');
assert.ok(!js.includes('createUserWithEmailAndPassword('),'Legacy site registration bypass must not remain');
assert.ok(js.includes("if(authMode==='register'){location.assign('auth.html?mode=register');return;}"),'Legacy modal registration must redirect to OTP page');

for(const file of ['index.html','auth.html','register.html']){
 assert.ok(!read(file).includes('для своїх'),file+': exclusive slogan still present');
}
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces mismatch');
console.log('VATRA: birthday greetings, profile links, stories, phone countries, verified signup and sidebar verified.');

assert.ok(js.includes("const keepChatAtEnd=!restore&&(!el.querySelector('[data-chat-message-id]')"),'Reading old chat messages must not force a jump to bottom');
assert.ok(js.includes('el.scrollTop=restore?Math.max(0,el.scrollHeight-restore.height+restore.top):keepChatAtEnd?el.scrollHeight:previousChatScroll'),'Near-bottom chat auto-scroll and older-history anchoring must be conditional');
assert.ok(js.includes('vatraChatVisibleCount+=VATRA_CHAT_BATCH_SIZE'),'Chat history must expand in bounded batches');
assert.ok(js.includes('textarea[name="comment"]'),'Comment reply focus must target the text box');
assert.ok(js.includes("String(other.handle||'')"),'Chat search must match profile handles');
console.log('VATRA chat reading position, comment reply focus and contact @handle search verified.');


const sortStart=js.indexOf('function vatraSortCommentsForPost(');
const sortEnd=js.indexOf('\nfunction renderComments(',sortStart);
assert.ok(sortStart>=0&&sortEnd>sortStart,'Comments must use an actual sort implementation');
const sortSandbox={vatraCommentsOrder:Object.create(null)};
const sortComments=runInNewContext(js.slice(sortStart,sortEnd)+'\nvatraSortCommentsForPost;',sortSandbox);
const originals=[{id:'b',createdAt:200},{id:'a',createdAt:100},{id:'c',createdAt:300}];
assert.deepEqual(Array.from(sortComments('post1',originals),c=>c.id),['c','b','a']);
sortSandbox.vatraCommentsOrder.post1='old';
assert.deepEqual(Array.from(sortComments('post1',originals),c=>c.id),['a','b','c']);
assert.equal(originals[0].id,'b','Comment sorting must preserve cached order');
assert.ok(js.includes('class="vatra-comments-sort" data-sort-comments='),'Sort button must be rendered');
const commentsCSS=read('assets/styles/sources/social/communities.css');
const replyCSS=read('assets/styles/sources/social/chat-replies.css');
assert.ok(commentsCSS.includes('data-vatra-theme-effective="dark"] .vatra-comments-heading>.vatra-comments-sort'));
assert.ok(replyCSS.includes('data-vatra-theme-effective="dark"][data-page="messages"] .vatra-chat-reply-preview button'));
console.log('VATRA: comment sorting in both directions; dark chat reply controls verified.');


// Keep read receipts tied to messages actually visible at the newest edge.
const receiptStart=js.indexOf('function vatraChatIsAtLatest(');
const receiptEnd=js.indexOf("document.addEventListener('visibilitychange'",receiptStart);
assert.ok(receiptStart>=0&&receiptEnd>receiptStart,'Visibility-aware chat read helper not found');
const receiptViewport={scrollHeight:1200,clientHeight:500,scrollTop:50};
const receiptDocument={visibilityState:'visible'};
const sentReceipts=[];
const receiptState={
 currentUser:{uid:'u1'},activeChat:'u2',page:'messages',document:receiptDocument,
 $:()=>receiptViewport,chatKey:()=> 'u1_u2',chatIndex:{u1_u2:{lastMessage:{createdAt:100}}},
 chatReads:{},db:{},ref:(_db,path)=>path,set:(path,time)=>{sentReceipts.push({path,time});return Promise.resolve()},
 updateNotificationBadges:()=>{},console
};
const receiptHelpers=runInNewContext(js.slice(receiptStart,receiptEnd)+'\n({vatraChatIsAtLatest,markChatRead})',receiptState);
receiptHelpers.markChatRead('u1_u2');
assert.equal(sentReceipts.length,0,'Reading older chat history must not mark new messages as seen');
receiptViewport.scrollTop=700;
receiptDocument.visibilityState='hidden';
receiptHelpers.markChatRead('u1_u2');
assert.equal(sentReceipts.length,0,'A background tab must not mark messages as read');
receiptDocument.visibilityState='visible';
receiptHelpers.markChatRead('u1_u2');
assert.equal(sentReceipts.length,1,'Returning to the latest visible chat should mark it as read');
assert.ok(js.includes("$('#chatMessages')?.addEventListener('scroll',()=>markChatRead(key),{passive:true})"),
 'Scrolling to newer messages must refresh read receipts');
console.log('VATRA: unread chat status respects scroll position and tab visibility.');

const groupChatJs=read('assets/scripts/social/group-chats.js');
const groupChatCss=read('assets/styles/sources/layout/interaction-states.css');
assert.ok(groupChatJs.includes('win.dataset.vatraGroupId=activeGroupId'),'Group drafts must not leak between conversations');
assert.ok(groupChatJs.includes("const draft=sameGroup?(previousInput?.value||''):''"),'New group draft should be empty');
assert.ok(groupChatJs.includes('container.scrollTop=keepGroupAtEnd?container.scrollHeight:previousGroupScroll'),'Group history scroll must be preserved');
assert.ok(groupChatJs.includes('if(restoreFocus&&field)'),'Group composer must retain focus after metadata refresh');
assert.ok(groupChatCss.includes('body[data-vatra-theme-effective="dark"] .vatra-group-bubble.mine'),'Dark group bubbles must be legible');
console.log('VATRA group chat focused composing, separate drafts, scrolling and themes verified.');


/* Photos and videos: the selected tab must control the photo viewer collection. */
const photoHelperStart=js.indexOf('function vatraPhotoGridMarkup(');
const photoHelperEnd=js.indexOf('function renderPhotos(){',photoHelperStart);
assert.ok(photoHelperStart>0&&photoHelperEnd>photoHelperStart,'Photo gallery helper missing');
const vatraPhotoGridBuilder=runInNewContext(js.slice(photoHelperStart,photoHelperEnd)+'\nvatraPhotoGridMarkup;',{
 esc:value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
});
const photoMarkup=vatraPhotoGridBuilder(['https://cdn.example/a.jpg','https://cdn.example/b.jpg'],'user-1');
assert.equal((photoMarkup.match(/class="vatra-photo-tile"/g)||[]).length,2,'Photo tiles must match the selected tab');
assert.ok(photoMarkup.includes('data-photo-index="1"'),'Photo tab must use its own zero-based index');
const photoCollections=[...photoMarkup.matchAll(/data-photo-urls="([^"]+)"/g)].map(match=>JSON.parse(match[1].replace(/&quot;/g,'"')));
assert.equal(photoCollections.length,2);
assert.equal(JSON.stringify(photoCollections[0]),JSON.stringify(['https://cdn.example/a.jpg','https://cdn.example/b.jpg']),'Viewer must not mix other photo tabs');
assert.ok(js.includes('grid.innerHTML=vatraPhotoGridMarkup(urls,uid)'),'Photo tabs must pass their own images');
assert.ok(js.includes("photoTabs[next].focus();photoTabs[next].click()"),'Photo tabs must support keyboard navigation');
assert.ok(js.includes("event.target?.closest?.('input,textarea,select,[contenteditable],[role=\"textbox\"]')"),'Photo viewer arrow keys must not interrupt comment typing');
assert.ok(js.includes('preload="none" loading="lazy"')&&js.includes('aria-label="Відеозапис із допису"'),'My videos must defer downloading until playback');
console.log('VATRA photos/video: scoped photo tabs, keyboard shortcuts and lazy video loading verified.');

/* First-run experience must reuse working sections and never reveal hidden users. */
assert.ok(js.includes("action:'communities',cta:'Відкрити спільноти'"),'Welcome path to communities missing');
assert.ok(js.includes("action:'create',cta:'Створити допис'"),'Welcome path to publishing missing');
assert.ok(js.includes("Date.now()-created>21*86400000"),'Onboarding must expire for returning users');
assert.ok(js.includes("localStorage.getItem('vatra-guide-hidden-v1-'+uid)"),'Dismissed onboarding must stay dismissed');
assert.ok(!js.includes("if(currentUser?.uid===user.uid)openVatraGuide()"),'Registration must not auto-launch a modal tour');
assert.ok(js.includes("u.profileVisibility!=='private'&&!blockedUsers[uid]"),'Friend recommendations cannot reveal private accounts');
assert.ok(js.includes("u?.profileVisibility==='private')return false"),'Discovery must exclude closed accounts');
for(const action of ['data-vatra-empty-photo','data-vatra-browse-communities','data-vatra-find-people','data-onboard="communities"']){
 assert.ok(js.includes(action),'Missing empty-state or welcome action: '+action);
}
const startupBegin=js.indexOf('function renderGettingStarted(){');
const startupEnd=js.indexOf('function openVatraGuide(){',startupBegin);
assert.ok(startupBegin>0&&startupEnd>startupBegin,'Welcome renderer missing');
const welcomeContainer={hidden:true,innerHTML:'',classList:{add(){} }};
const sideContainer={hidden:false,innerHTML:'existing'};
const createWelcome=runInNewContext(js.slice(startupBegin,startupEnd)+'\nrenderGettingStarted;',{
 $:selector=>selector==='#gettingStartedMobile'?welcomeContainer:selector==='#gettingStarted'?sideContainer:null,
 currentUser:{uid:'test-user'},page:'feed',currentProfile:{createdAt:Date.now()},Date,
 localStorage:{getItem:()=>null},posts:{},friends:{},groups:{},groupMembers:{}
});
createWelcome();
assert.equal(welcomeContainer.hidden,false,'New account must see unobtrusive welcome suggestions');
assert.equal((welcomeContainer.innerHTML.match(/class="vatra-welcome-action"/g)||[]).length,5,'Welcome must expose five existing actions');
assert.ok(welcomeContainer.innerHTML.includes('data-onboard-dismiss'),'Welcome must be dismissible');
console.log('VATRA social circle onboarding, privacy filters and useful empty actions verified.');

/* Share the existing registration page; no invitation database or private data. */
assert.ok(js.includes("new URL('register.html',location.href).href"),'Invitation must use the real registration page');
assert.ok(js.includes("navigator.share({title:'ВАТРА'"),'Invitation should use native share when supported');
assert.ok(js.includes("navigator.clipboard?.writeText"),'Desktop invitation copy fallback missing');
assert.ok(js.includes('data-vatra-invite-friends'),'No visible invitation action');

/* First-message regression: never write plaintext through a side route. */
const firstStart=js.indexOf('async function startChatWith(uid){');
const firstEnd=js.indexOf("$('#communityClose').onclick",firstStart);
assert.ok(firstStart>0&&firstEnd>firstStart,'First-message handler not found');
const firstCode=js.slice(firstStart,firstEnd);
assert.ok(firstCode.includes('await prepareSession(currentUser.uid,uid,key,readE2EEKey,publishE2EEKey)'),'First message must prepare an authenticated encrypted session');
assert.ok(firstCode.includes('await encryptMessage(secure,message,currentUser.uid,at)'),'First message must encrypt before writing');
assert.ok(firstCode.includes('{senderUid:currentUser.uid,encrypted,createdAt:at}'),'First message must store ciphertext only');
assert.ok(!firstCode.includes('text:message'),'First message must not persist readable content in messages or previews');
assert.ok(firstCode.indexOf('await encryptMessage(')<firstCode.indexOf("await set(push("),'Encryption must succeed before a database write');
assert.ok(js.includes('void activateSecureChat(key,activeChat);'),'Chat composer must wait for verified device keys');
assert.ok(js.includes('id="chatSecurityStatus"')&&js.includes('id="chatSecurityRefresh"'),'Chat must show session readiness and retry');
assert.ok(js.includes('data-vatra-message-find-friends>Знайти друзів</button>'),'Empty messenger needs a discoverable action');
assert.ok(js.includes("$('#feed [data-vatra-message-find-friends]')?.addEventListener('click',()=>goPage('friends'))"),'Empty messenger button must actually open friends');
console.log('VATRA messenger: initial messages use ciphertext, composer waits for verified session, retry and discovery available.');

/* Executable first-message regression: success and unavailable-peer-key paths. */
async function exerciseFirstMessage({peerReady}){
 const writes=[],updates=[],calls=[],sender='11111111-1111-4111-8111-111111111111',recipient='22222222-2222-4222-8222-222222222222';
 const message={value:'',focus(){calls.push('focus')}},submit={disabled:false},notice={hidden:true,textContent:''};
 const recipientLabel={textContent:''};
 const form={elements:{message},reset(){message.value='';},querySelector:selector=>selector==='[type=submit]'?submit:null};
 const dialog={
  querySelector:selector=>selector==='form'?form:selector==='.vatra-compose-error'?notice:selector==='#vatraFirstMessageRecipient'?recipientLabel:null,
  showModal(){calls.push('open')},close(){calls.push('close')}
 };
 const session={chatId:'session-1',uid:sender,peerUid:recipient};
 const ctx={
  currentUser:{uid:sender},blockedUsers:{},users:{[recipient]:{name:'Тестова людина',allowMessages:true}},
  authRequired:()=>true,chatKey:()=>session.chatId,
  db:{},ref:(_,path)=>({path}),push:node=>({path:node.path+'/test-message'}),
  get:async()=>({val:()=>({}),exists:()=>false}),
  set:async(node,value)=>{writes.push({path:node.path,value})},
  update:async(node,value)=>{updates.push({path:node.path,value})},
  prepareSession:async(uid,peer,chatId)=>{
   assert.equal(uid,sender);assert.equal(peer,recipient);assert.equal(chatId,session.chatId);
   if(!peerReady)throw Object.assign(new Error('Ключ співрозмовника відсутній'),{code:'PEER_NOT_READY'});
   return session;
  },
  encryptMessage:async(s,plain,uid,at)=>{
   assert.equal(s,session);assert.equal(plain,'Перший приватний текст');assert.equal(uid,sender);
   assert.ok(Number.isFinite(at));return {v:1,ciphertext:'TEST_CIPHERTEXT'};
  },
  readE2EEKey:async()=>null,publishE2EEKey:async()=>{},
  SECURE_PREVIEW:'Повідомлення',
  vatraGetFirstMessageDialog:()=>dialog,
  goPage:()=>{},renderMessages:()=>{},niceError:e=>e.message,
  toastMsg:()=>{},console,Date
 };
 const handler=runInNewContext(firstCode+'\nstartChatWith;',ctx);
 await handler(recipient);
 assert.ok(calls.includes('open'),'First-message dialog must open after empty history');
 message.value='  Перший приватний текст  ';
 await form.onsubmit({preventDefault(){}});
 if(peerReady){
  assert.ok(calls.includes('close'),'Success must close the first-message dialog');
  const row=writes.find(row=>row.path.endsWith('/messages/test-message'));
  assert.ok(row,'First message must be written after successful encryption');
  assert.equal(row.value.text,undefined,'Plaintext must never be persisted');
  assert.equal(row.value.encrypted.ciphertext,'TEST_CIPHERTEXT','Ciphertext missing');
  const preview=updates.find(row=>row.path.startsWith('userChats/'))?.value?.lastMessage;
  assert.equal(preview?.text,'Повідомлення','Chat list must not expose message plaintext');
 }else{
  assert.equal(writes.length,0,'Unavailable peer keys must not write messages or empty chat roots');
  assert.equal(updates.length,0,'Unavailable peer keys must not write previews');
  assert.equal(message.value,'  Перший приватний текст  ','Failed delivery must preserve unsent draft');
  assert.equal(notice.hidden,false,'User must see an actionable error');
  assert.ok(notice.textContent.includes('Співрозмовнику потрібно відкрити'),'Missing guidance when recipient key is unavailable');
 }
}
await exerciseFirstMessage({peerReady:true});
await exerciseFirstMessage({peerReady:false});
console.log('VATRA messenger executable first-message success/failure checks passed.');

/* Message drafts must survive view re-renders, but never cross accounts or leak to a server. */
assert.ok(js.includes("const vatraMessageDrafts=new Map()"),'Messenger drafts need session-memory storage');
assert.ok(js.includes("messageInput.value=vatraMessageDrafts.get(key)||''"),'Switching chats must restore the correct draft');
assert.ok(js.includes("messageInput.addEventListener('input'"),'Typing must update the in-memory draft');
assert.ok(js.includes("if(vatraMessageDraftOwner!==user.uid){vatraMessageDrafts.clear();vatraMessageDraftOwner=user.uid;}"),'Switching accounts must clear private drafts');
assert.ok(js.includes("if(input.value.trim()===text){input.value='';vatraMessageDrafts.delete(key);}"),'Successful delivery must remove the sent draft');
assert.ok(!js.includes("localStorage.setItem('vatra-message-draft"),'Never persist private message drafts to localStorage');
console.log('VATRA messenger: in-memory drafts survive navigation and clear after delivery / account switch.');


/* Composer must not unlock after a rejected send or a lost/changed encrypted session. */
const chatSendStart=js.indexOf("$('#sendMessageForm').onsubmit=async e=>{");
const chatSendEnd=js.indexOf("const VATRA_CHAT_BATCH_SIZE=60",chatSendStart);
assert.ok(chatSendStart>=0&&chatSendEnd>chatSendStart,'Secure chat form is missing');
const chatSendCode=js.slice(chatSendStart,chatSendEnd);
assert.ok(chatSendCode.includes('const canSend=!!activeSecureSession&&activeSecureSession.chatId===key'),
 'Async chat send must validate current E2EE session before reenabling composer');
assert.ok(chatSendCode.includes("activeChat===recipient&&!activeChatBlocked&&!blockedUsers[recipient]"),
 'Chat send must stay locked after navigation or blocking');
assert.ok(chatSendCode.includes('submit.disabled=!canSend;'),
 'Send button must reflect current security readiness');
assert.ok(!chatSendCode.includes('finally{submit.disabled=false;}'),
 'A failed encrypted session may never unlock the send action');
console.log('VATRA messenger: send button remains locked when session, recipient or block status changes.');


// Real feed redesign must preserve original composer, posts, filtering and media actions.
const feedMarkup=read('index.html');
assert.ok(feedMarkup.includes('id="vatraNewsHero"')&&feedMarkup.includes('id="vatraNewsHeroTitle"'),
 'News must have its own recognizable editorial heading, not the hidden generic page title');
assert.ok(feedMarkup.includes('id="vatraNewsNewPost"')&&js.includes("$('#vatraNewsNewPost')?.addEventListener('click',openComposer)"),
 'Hero creation action must launch the existing real composer');
for(const action of ['photo','video','story']){
 assert.ok(feedMarkup.includes('data-vatra-feed-shortcut="'+action+'"'),action+' quick action is missing');
 assert.ok(feedMarkup.includes('data-vatra-create="'+action+'"'),action+' must preserve the original composer route');
}
assert.ok(js.includes("document.querySelector('#vatraCreateMenu [data-vatra-create=\"'+action+'\"]')?.click()")||
 js.includes("document.querySelector('#vatraCreateMenu [data-vatra-create=\"'+action+'\"]')?.click();"),
 'Feed shortcuts must dispatch to the existing real publishing handlers');
assert.ok(feedMarkup.includes('id="vatraFeedFilters"')&&feedMarkup.includes('id="feed"'),
 'Redesign may not disconnect filtering or post rendering');
