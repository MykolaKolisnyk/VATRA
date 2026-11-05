import {initializeApp,getDatabase} from '../backend/client.js?v=20261104-8';
const client=getDatabase(initializeApp()).client;
const cache=new Map();
let languageRevision=0;
const selectors='.post .post-text,.post .vatra-post-text,.comment .comment-copy > span,.vatra-my-video > p';
const texts={
 uk:{translate:'Перекласти',original:'Показати оригінал',working:'Перекладаємо…',title:'Переклад',error:'Переклад поки недоступний. Спробуйте пізніше.',rate:'Забагато перекладів. Спробуйте пізніше.',signin:'Увійдіть, щоб перекладати.',note:'Текст буде передано сервісу перекладу.'},
 en:{translate:'Translate',original:'Show original',working:'Translating…',title:'Translation',error:'Translation is not yet available. Try again later.',rate:'Translation limit reached. Try again later.',signin:'Sign in to translate.',note:'Text will be sent to the translation provider.'}
};
function language(){return window.vatraLanguage?.language||'uk';}
function labels(){return texts[language()]||texts.en;}
// Avoid showing Translate for text already written in the reader's interface language.
// Language hint wins; otherwise check reliable script/grammar markers rather than guessing blindly.
function vatraContentLanguage(node,value){
 const hint=(node.getAttribute('lang')||node.closest('[lang]:not(html):not(body)')?.getAttribute('lang')||'').trim().toLowerCase().split('-')[0];
 if(hint && hint!=='und' && ['uk','en','ru','pl','de','fr','es','it','pt'].includes(hint))return hint;
 const str=String(value||'').replace(/https?:\/\/\S+/g,'').trim();
 if(/[іїєґІЇЄҐ]/u.test(str))return 'uk';
 if(/[ыэъёЫЭЪЁ]/u.test(str))return 'ru';
 if(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/u.test(str))return 'pl';
 if(/[а-яА-Я]/u.test(str))return 'unknown-cyrillic';
 if(/[a-z]/i.test(str)){
  if(/\b(the|and|you|with|this|that|from|have|your|about|are|was|what|for|they|can|not)\b/i.test(str))return 'en';
  return 'unknown-latin';
 }
 return 'unknown';
}
function vatraSameLanguage(node,value){
 const detected=vatraContentLanguage(node,value),current=language();
 return detected===current || (current==='uk'&&detected==='unknown-cyrillic' &&
   /\b(це|та|що|для|про|від|або|також|ми|ви|вона|вони|його|мені|можна|тільки)\b/iu.test(value));
}
function annotate(node){
 if(node.dataset.vatraTranslateReady||!node.isConnected)return;
 const value=(node.textContent||'').trim();
 if(value.length<8||value.length>2500)return;
 node.dataset.vatraTranslateReady='1';
 const button=document.createElement('button');
 button.type='button';button.className='vatra-translate-button';button.textContent=labels().translate;
 button.title=labels().note;
 const output=document.createElement('div');output.className='vatra-translation-result';output.hidden=true;output.setAttribute('lang',language());
 const status=document.createElement('div');status.className='vatra-translation-error';status.hidden=true;status.setAttribute('role','status');
 node.insertAdjacentElement('afterend',status);
 node.insertAdjacentElement('afterend',output);
 node.insertAdjacentElement('afterend',button);
 let translated=false;
 const reset=()=>{translated=false;node.hidden=false;output.hidden=true;status.hidden=true;button.disabled=false;button.textContent=labels().translate;button.title=labels().note;};
 node.vatraResetTranslation=reset;
 const applyVisibility=()=>{
  const hidden=vatraSameLanguage(node,value);
  button.hidden=hidden;
  if(hidden)reset();
 };
 node.vatraUpdateTranslateVisibility=applyVisibility;
 applyVisibility();
 button.addEventListener('click',async()=>{
  if(vatraSameLanguage(node,value)){applyVisibility();return;}
  if(translated){translated=false;node.hidden=false;output.hidden=true;button.textContent=labels().translate;return;}
  status.hidden=true;
  const lang=language(),key=lang+'|'+value,revision=languageRevision;
  if(!cache.has(key)){
   button.disabled=true;button.textContent=labels().working;
   try{
    const {data,error}=await client.functions.invoke('vatra-translate',{body:{text:value.slice(0,2500),target:lang}});
    if(error||!data?.translation){
     let reason=data?.error;
     if(!reason&&error?.context?.json){try{reason=(await error.context.json())?.error;}catch{}}
     const copy=labels();throw new Error(reason==='RATE_LIMITED'?copy.rate:reason==='SIGN_IN_REQUIRED'?copy.signin:copy.error);
    }
    if(revision!==languageRevision)return;
    cache.set(key,data.translation);
   }catch(error){
    if(revision!==languageRevision)return;
    status.textContent=error?.message||labels().error;status.hidden=false;button.textContent=labels().translate;button.disabled=false;return;
   }
   button.disabled=false;
  }
  if(revision!==languageRevision)return;
  output.replaceChildren();
  const caption=document.createElement('small');caption.textContent=labels().title;
  const translatedText=document.createElement('p');translatedText.textContent=cache.get(key);
  output.append(caption,translatedText);
  output.setAttribute('lang',lang);output.hidden=false;node.hidden=true;
  translated=true;button.textContent=labels().original;
 });
}
let pending=false;
function scan(){document.querySelectorAll(selectors).forEach(annotate);}
new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;scan();});}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('vatra:languagechange',()=>{languageRevision++;cache.clear();document.querySelectorAll('[data-vatra-translate-ready]').forEach(node=>{node.vatraResetTranslation?.();node.vatraUpdateTranslateVisibility?.();});});
scan();
