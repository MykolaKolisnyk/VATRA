(function(){
'use strict';
const translatedLanguages=new Set(['uk','en','pl','de','fr','es','pt','it']);
const languageCodes=["aa","ab","ae","af","ak","am","an","ar","as","av","ay","az","ba","be","bg","bh","bi","bm","bn","bo","br","bs","ca","ce","ch","co","cr","cs","cv","cy","da","de","dv","dz","ee","el","en","eo","es","et","eu","fa","ff","fi","fj","fo","fr","fy","ga","gd","gl","gn","gu","gv","ha","he","hi","ho","hr","ht","hu","hy","hz","ia","id","ie","ig","ii","ik","io","is","it","iu","ja","jv","ka","kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky","la","lb","lg","li","ln","lo","lt","lu","lv","mg","mh","mi","mk","ml","mn","mr","ms","mt","my","na","nb","nd","ne","ng","nl","nn","no","nr","nv","ny","oc","oj","om","or","os","pa","pi","pl","ps","pt","qu","rm","rn","ro","rw","sa","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur","uz","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zu"];
const ukNames=new Intl.DisplayNames(['uk'],{type:'language'});
const languages=languageCodes.map(code=>{
 let nativeName=code;
 try{nativeName=new Intl.DisplayNames([code],{type:'language'}).of(code)||code;}catch{}
 const ukrainian=ukNames.of(code)||code;
 return [code,nativeName===ukrainian?nativeName:nativeName+' — '+ukrainian];
}).sort((a,b)=>Number(translatedLanguages.has(b[0]))-Number(translatedLanguages.has(a[0]))||a[1].localeCompare(b[1],'uk'));
const base={
 'Мій профіль':'Profile','Друзі':'Friends','Новини':'News','Повідомлення':'Messages',
 'Спільноти':'Communities','Відео':'Videos','Збережене':'Saved','Налаштування':'Settings',
 'Сповіщення':'Notifications','Фото':'Photos','Фотографії':'Photos','Музика':'Music',
 'Пошук':'Search','Подарунки':'Gifts','Створити допис':'Create post',
 'Що нового у Вас?':'What is new?','Профіль':'Profile','Увійти':'Log in',
 'Створити акаунт':'Create account','Ім’я':'First name','Прізвище':'Last name',
 'Дата народження':'Date of birth','Стать':'Gender','Чоловік':'Male','Жінка':'Female',
 'Електронна пошта':'Email','Телефон':'Phone','Пароль':'Password','Продовжити':'Continue',
 'Зберегти налаштування':'Save settings','Збережено':'Saved','Показати більше':'Show more',
 'Згорнути':'Show less','Вигляд ВАТРИ':'Appearance','Мова інтерфейсу':'Interface language',
 'Тема оформлення':'Theme','Світла':'Light','Темна':'Dark','Як у системі':'System default',
 'Пошук людей і дописів':'Search people and posts','Пошук людей і дописів...':'Search people and posts...',
 'Налаштування профілю':'Profile settings','Акаунт і видалення':'Account & deletion',
 'Приватність':'Privacy','Контакти':'Contacts','Освіта':'Education',"Кар'єра":'Career',
 'Захоплення':'Interests','Військова служба':'Military service','Життєва позиція':'Life outlook',
 'Документи':'Documents','Основна інформація':'Basic information','Фотографії':'Photos',
 'Правила':'Rules','Умови користування':'Terms of service','Політика конфіденційності':'Privacy policy',
 'Номер телефону':'Phone number','Створити':'Create','Скасувати':'Cancel','Закрити':'Close',
 'Надіслати':'Send','Завантажити':'Upload','Видалити':'Delete','Редагувати':'Edit',
 'Місто / населений пункт':'City or town','Рідне місто':'Hometown',
 'Пошук людей і дописів':'Search people and posts'
};
const overrides={
 pl:{'Мій профіль':'Mój profil','Друзі':'Znajomi','Новини':'Aktualności','Повідомлення':'Wiadomości','Спільноти':'Społeczności','Відео':'Wideo','Збережене':'Zapisane','Налаштування':'Ustawienia','Сповіщення':'Powiadomienia','Музика':'Muzyka','Пошук':'Szukaj','Увійти':'Zaloguj się','Створити акаунт':'Utwórz konto','Ім’я':'Imię','Прізвище':'Nazwisko','Дата народження':'Data urodzenia','Стать':'Płeć','Чоловік':'Mężczyzna','Жінка':'Kobieta','Електронна пошта':'E-mail','Телефон':'Telefon','Пароль':'Hasło','Продовжити':'Kontynuuj','Зберегти налаштування':'Zapisz ustawienia','Мова інтерфейсу':'Język interfejsu','Створити допис':'Utwórz post','Фото':'Zdjęcie','Фотографії':'Zdjęcia','Згорнути':'Zwiń','Показати більше':'Pokaż więcej','Налаштування профілю':'Ustawienia profilu','Пошук людей і дописів':'Szukaj osób i postów'},
 de:{'Мій профіль':'Mein Profil','Друзі':'Freunde','Новини':'Neuigkeiten','Повідомлення':'Nachrichten','Спільноти':'Communities','Відео':'Videos','Збережене':'Gespeichert','Налаштування':'Einstellungen','Сповіщення':'Benachrichtigungen','Музика':'Musik','Пошук':'Suche','Увійти':'Anmelden','Створити акаунт':'Konto erstellen','Ім’я':'Vorname','Прізвище':'Nachname','Дата народження':'Geburtsdatum','Стать':'Geschlecht','Чоловік':'Mann','Жінка':'Frau','Електронна пошта':'E-Mail','Телефон':'Telefon','Пароль':'Passwort','Продовжити':'Weiter','Зберегти налаштування':'Einstellungen speichern','Мова інтерфейсу':'Sprache','Створити допис':'Beitrag erstellen','Фото':'Foto','Фотографії':'Fotos','Згорнути':'Weniger anzeigen','Показати більше':'Mehr anzeigen','Пошук людей і дописів':'Personen und Beiträge suchen'},
 fr:{'Мій профіль':'Mon profil','Друзі':'Amis','Новини':'Actualités','Повідомлення':'Messages','Спільноти':'Communautés','Відео':'Vidéos','Збережене':'Enregistré','Налаштування':'Paramètres','Сповіщення':'Notifications','Музика':'Musique','Пошук':'Recherche','Увійти':'Connexion','Створити акаунт':'Créer un compte','Ім’я':'Prénom','Прізвище':'Nom','Дата народження':'Date de naissance','Стать':'Genre','Чоловік':'Homme','Жінка':'Femme','Електронна пошта':'E-mail','Телефон':'Téléphone','Пароль':'Mot de passe','Продовжити':'Continuer','Зберегти налаштування':'Enregistrer','Мова інтерфейсу':'Langue','Створити допис':'Créer une publication','Фото':'Photo','Фотографії':'Photos','Згорнути':'Réduire','Показати більше':'Voir plus','Пошук людей і дописів':'Rechercher des personnes et des posts'},
 es:{'Мій профіль':'Mi perfil','Друзі':'Amigos','Новини':'Noticias','Повідомлення':'Mensajes','Спільноти':'Comunidades','Відео':'Vídeos','Збережене':'Guardados','Налаштування':'Configuración','Сповіщення':'Notificaciones','Музика':'Música','Пошук':'Buscar','Увійти':'Iniciar sesión','Створити акаунт':'Crear cuenta','Ім’я':'Nombre','Прізвище':'Apellido','Дата народження':'Fecha de nacimiento','Стать':'Género','Чоловік':'Hombre','Жінка':'Mujer','Електронна пошта':'Correo','Телефон':'Teléfono','Пароль':'Contraseña','Продовжити':'Continuar','Зберегти налаштування':'Guardar cambios','Мова інтерфейсу':'Idioma','Створити допис':'Crear publicación','Фото':'Foto','Фотографії':'Fotos','Згорнути':'Mostrar menos','Показати більше':'Mostrar más','Пошук людей і дописів':'Buscar personas y publicaciones'},
 pt:{'Мій профіль':'Meu perfil','Друзі':'Amigos','Новини':'Notícias','Повідомлення':'Mensagens','Спільноти':'Comunidades','Відео':'Vídeos','Збережене':'Salvos','Налаштування':'Configurações','Сповіщення':'Notificações','Музика':'Música','Пошук':'Buscar','Увійти':'Entrar','Створити акаунт':'Criar conta','Ім’я':'Nome','Прізвище':'Sobrenome','Дата народження':'Data de nascimento','Стать':'Gênero','Чоловік':'Homem','Жінка':'Mulher','Електронна пошта':'E-mail','Телефон':'Telefone','Пароль':'Senha','Продовжити':'Continuar','Зберегти налаштування':'Salvar configurações','Мова інтерфейсу':'Idioma','Створити допис':'Criar publicação','Фото':'Foto','Фотографії':'Fotos','Згорнути':'Mostrar menos','Показати більше':'Mostrar mais','Пошук людей і дописів':'Buscar pessoas e publicações'},
 it:{'Мій профіль':'Il mio profilo','Друзі':'Amici','Новини':'Notizie','Повідомлення':'Messaggi','Спільноти':'Comunità','Відео':'Video','Збережене':'Salvati','Налаштування':'Impostazioni','Сповіщення':'Notifiche','Музика':'Musica','Пошук':'Cerca','Увійти':'Accedi','Створити акаунт':'Crea account','Ім’я':'Nome','Прізвище':'Cognome','Дата народження':'Data di nascita','Стать':'Genere','Чоловік':'Uomo','Жінка':'Donna','Електронна пошта':'Email','Телефон':'Telefono','Пароль':'Password','Продовжити':'Continua','Зберегти налаштування':'Salva impostazioni','Мова інтерфейсу':'Lingua','Створити допис':'Crea post','Фото':'Foto','Фотографії':'Foto','Згорнути':'Mostra meno','Показати більше':'Mostra altro','Пошук людей і дописів':'Cerca persone e post'}
};
const footerLabels={
 en:{'Українська соціальна мережа':'Ukrainian social network','Конфіденційність':'Privacy','Розробник:':'Developer:','Реклама':'Advertisement','Місце для реклами':'Advertising space'},
 pl:{'Українська соціальна мережа':'Ukraińska sieć społecznościowa','Конфіденційність':'Prywatność','Розробник:':'Twórca:','Реклама':'Reklama','Місце для реклами':'Miejsce na reklamę'},
 de:{'Українська соціальна мережа':'Ukrainisches soziales Netzwerk','Конфіденційність':'Datenschutz','Розробник:':'Entwickler:','Реклама':'Werbung','Місце для реклами':'Werbefläche'},
 fr:{'Українська соціальна мережа':'Réseau social ukrainien','Конфіденційність':'Confidentialité','Розробник:':'Développeur :','Реклама':'Publicité','Місце для реклами':'Espace publicitaire'},
 es:{'Українська соціальна мережа':'Red social ucraniana','Конфіденційність':'Privacidad','Розробник:':'Desarrollador:','Реклама':'Publicidad','Місце для реклами':'Espacio publicitario'},
 pt:{'Українська соціальна мережа':'Rede social ucraniana','Конфіденційність':'Privacidade','Розробник:':'Desenvolvedor:','Реклама':'Publicidade','Місце для реклами':'Espaço publicitário'},
 it:{'Українська соціальна мережа':'Social network ucraino','Конфіденційність':'Privacy','Розробник:':'Sviluppatore:','Реклама':'Pubblicità','Місце для реклами':'Spazio pubblicitario'}
};
const footerLabelKeys=new Set(Object.keys(footerLabels.en));
function interfaceLabel(original){
 if(language==='uk')return original;
 return footerLabels[language]?.[original]||overrides[language]?.[original]||(language==='en'?base[original]:original);
}
const descriptions={
 uk:'ВАТРА — українська соціальна мережа. Друзі, спільноти, дописи, фото та повідомлення.',
 en:'VATRA is a Ukrainian social network for friends, communities, posts, photos and messages.',
 pl:'VATRA to ukraińska sieć społecznościowa: znajomi, społeczności, posty i wiadomości.',
 de:'VATRA ist ein ukrainisches soziales Netzwerk für Freunde, Communities und Nachrichten.',
 fr:'VATRA est un réseau social ukrainien pour les amis, communautés et messages.',
 es:'VATRA es una red social ucraniana para amigos, comunidades y mensajes.',
 pt:'VATRA é uma rede social ucraniana para amigos, comunidades e mensagens.',
 it:'VATRA è una rete sociale ucraina per amici, comunità e messaggi.'
};
let language='uk';
try{language=localStorage.getItem('vatra-language')||'uk';}catch{}
if(!languages.some(pair=>pair[0]===language))language='uk';
const saved=new WeakMap();
let running=false;
function translateText(node){
 const parent=node.parentElement;
 if(!parent||parent.closest('script,style,textarea,option,[contenteditable],.post,.comment,.message,.vatra-messenger-text,.vatra-notification-text,.vatra-feed-post'))return;
 const text=node.nodeValue;
 if(!text||!text.trim())return;
 let record=saved.get(node);
 if(!record||text!==record.last){
  record={original:text,last:text};
  saved.set(node,record);
 }
 const original=record.original.trim();
 if(!base[original]&&!footerLabelKeys.has(original))return;
 const value=interfaceLabel(original);
 const whitespaceLeft=record.original.match(/^\s*/)[0],whitespaceRight=record.original.match(/\s*$/)[0];
 const translated=whitespaceLeft+value+whitespaceRight;
 if(text!==translated){node.nodeValue=translated;record.last=translated;}
}
function translateRoot(root){
 if(root.nodeType===3){translateText(root);return;}
 if(root.nodeType!==1&&root.nodeType!==9)return;
 const allowed=root.matches?.('.auth-layout,.sidebar,.topbar,.mobile-nav,.mobile-menu,.settings-page,.quick-compose,.vatra-settings-nav,.vatra-settings-pane,.vatra-site-legal-head,.vatra-footer-legal');
 if(!allowed&&!root.closest?.('.auth-layout,.sidebar,.topbar,.mobile-nav,.mobile-menu,.settings-page,.quick-compose,.vatra-settings-nav,.vatra-settings-pane,.vatra-site-legal-head,.vatra-footer-legal')){
  root.querySelectorAll?.('.auth-layout,.sidebar,.topbar,.mobile-nav,.mobile-menu,.settings-page,.quick-compose,.vatra-settings-nav,.vatra-settings-pane,.vatra-site-legal-head,.vatra-footer-legal').forEach(translateRoot);
  return;
 }
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(walker.nextNode())translateText(walker.currentNode);
 root.querySelectorAll?.('input[placeholder]').forEach(el=>{
  const original=el.dataset.vatraOriginalPlaceholder||el.getAttribute('placeholder');
  if(!el.dataset.vatraOriginalPlaceholder)el.dataset.vatraOriginalPlaceholder=original;
  const text=interfaceLabel(original);
  if(el.placeholder!==text)el.placeholder=text;
 });
}
function updateMeta(){
 document.documentElement.lang=translatedLanguages.has(language)?language:'uk';
 const description=descriptions[language]||descriptions.uk;
 for(const sel of ['meta[name="description"]','meta[property="og:description"]']){
  let meta=document.head.querySelector(sel);
  if(!meta){meta=document.createElement('meta');if(sel.includes('property'))meta.setAttribute('property','og:description');else meta.name='description';document.head.append(meta);}
  meta.content=description;
 }
 let locale=document.head.querySelector('meta[property="og:locale"]');
 if(!locale){locale=document.createElement('meta');locale.setAttribute('property','og:locale');document.head.append(locale);}
 locale.content=translatedLanguages.has(language)?({uk:'uk_UA',en:'en_US',pl:'pl_PL',de:'de_DE',fr:'fr_FR',es:'es_ES',pt:'pt_PT',it:'it_IT'}[language]||'uk_UA'):'uk_UA';
 let languageMeta=document.head.querySelector('meta[name="content-language"]');if(!languageMeta){languageMeta=document.createElement('meta');languageMeta.name='content-language';document.head.append(languageMeta);}languageMeta.content=translatedLanguages.has(language)?language:'uk';
}
function selectMarkup(){
 const select=document.createElement('select');
 select.className='vatra-language-select';
 select.setAttribute('aria-label','Мова інтерфейсу');
 const ready=document.createElement('optgroup');ready.label='Основні мови інтерфейсу';
 const other=document.createElement('optgroup');other.label='Інші мови (переклад готується)';
 for(const [code,name] of languages){
  const option=document.createElement('option');option.value=code;option.textContent=name;
  (translatedLanguages.has(code)?ready:other).append(option);
 }
 select.append(ready,other);select.value=language;
 select.addEventListener('change',()=>setLanguage(select.value));
 return select;
}
function syncLanguageNotice(){
 const status=translatedLanguages.has(language)?'':'Повний переклад інтерфейсу цією мовою ще готується. Поки доступна українська версія.';
 document.querySelectorAll('.vatra-language-notice').forEach(el=>{if(el.textContent!==status)el.textContent=status;if(el.hidden===Boolean(status))el.hidden=!status;});
}
function install(){
 const auth=document.querySelector('.form-side .auth-card');
 if(auth&&!document.querySelector('.vatra-language-auth')){
  const wrap=document.createElement('div');wrap.className='vatra-language-auth';
  const label=document.createElement('label');label.textContent='Мова інтерфейсу';label.append(selectMarkup());wrap.append(label);
  const hint=document.createElement('small');hint.className='vatra-language-notice';hint.setAttribute('role','status');wrap.append(hint);
  auth.insertAdjacentElement('afterend',wrap);
 }
 const languageMount=document.querySelector('.vatra-language-settings-mount');
 if(languageMount&&!languageMount.querySelector('.vatra-language-select')){
  const row=document.createElement('label');row.className='vatra-language-pref vatra-language-dedicated';
  const heading=document.createElement('span');heading.textContent='Мова сайту';
  const selector=selectMarkup();selector.name='preferredLanguage';row.append(heading,selector);
  const hint=document.createElement('small');hint.className='vatra-language-notice';hint.setAttribute('role','status');row.append(hint);
  languageMount.append(row);
 }
 const appearance=document.querySelector('.interface-settings-card .settings-grid');
 if(appearance&&!appearance.querySelector('.vatra-language-pref')){
  const wrap=document.createElement('label');wrap.className='vatra-language-pref';
  wrap.append(document.createTextNode('Мова інтерфейсу'));
  const selector=selectMarkup();selector.name='preferredLanguage';wrap.append(selector);const hint=document.createElement('small');hint.className='vatra-language-notice';hint.setAttribute('role','status');wrap.append(hint);appearance.append(wrap);
 }
 document.querySelectorAll('.vatra-language-select').forEach(select=>{if(select.value!==language)select.value=language;});
 syncLanguageNotice();
}
function setLanguage(code){
 if(!languages.some(pair=>pair[0]===code))return;
 language=code;
 try{localStorage.setItem('vatra-language',code);}catch{}
 updateMeta();install();translateRoot(document);
 document.dispatchEvent(new CustomEvent('vatra:languagechange',{detail:{language:code}}));
}
let queued=false;
new MutationObserver(()=>{
 if(running||queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;running=true;try{install();translateRoot(document);}finally{running=false;}});
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
function start(){running=true;try{install();setLanguage(language);}finally{running=false;}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.vatraLanguage={get language(){return language;},get isFullyLocalized(){return translatedLanguages.has(language);},set:setLanguage,available:languages.map(([code])=>code)};
})();
