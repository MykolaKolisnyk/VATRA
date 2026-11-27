(()=>{
 "use strict";
 if(window.VATRA_HOST_ALLOWED===false)return;
 const tr=(uk,en)=>{const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang;return locale==="uk"?uk:locale==="en"?en:window.VATRA_LANGUAGE?.translate?.(uk)||uk;};
 const select=selector=>document.querySelector(selector);


 window.VATRA_PROFILE_CONFIRM=({title,description,action,tone="danger"})=>{
  const dialog=select("#profile-confirm-dialog");
  const heading=select("#profile-confirm-heading");
  const detail=select("#profile-confirm-description");
  const accept=select("#profile-confirm-accept");
  const cancel=select("#profile-confirm-cancel");
  if(!dialog||!heading||!detail||!accept||!cancel||dialog.open)
   return Promise.resolve(false);
  heading.textContent=String(title||"");
  detail.textContent=String(description||"");
  accept.textContent=String(action||tr("Підтвердити","Confirm"));
  cancel.textContent=tr("Скасувати","Cancel");
  dialog.dataset.tone=tone==="primary"?"primary":"danger";
  return new Promise(resolve=>{
   const events=new AbortController();
   const finish=approved=>{
    events.abort();
    if(dialog.open)dialog.close();
    resolve(approved);
   };
   accept.addEventListener("click",()=>finish(true),{signal:events.signal});
   cancel.addEventListener("click",()=>finish(false),{signal:events.signal});
   dialog.addEventListener("close",()=>finish(false),{signal:events.signal});
   dialog.addEventListener("click",event=>{
    if(event.target===dialog)finish(false);
   },{signal:events.signal});
   dialog.showModal();
   cancel.focus({preventScroll:true});
  });
 };
 const profileFieldLimit=(key,kind)=>({short_bio:101,mobile_phone:32,additional_phone:32,website:250}[key]??(kind==="long"?500:120));
 const groups=[
  {id:"profile",label:["Профіль","Profile"],icon:"user-round",fields:[
   ["short_bio","Коротка інформація","Short bio","long"],
   ["relationship","Сімейний стан","Relationship status"],
   ["country","Країна проживання","Country of residence"],
   ["city","Населений пункт проживання","Place of residence"],
   ["hometown","Рідний населений пункт","Place of origin"],
   ["languages","Знання мов","Languages"],
   ["family","Родина","Family","long"]
  ]},
  {id:"contacts",label:["Контакти","Contacts"],icon:"at-sign",fields:[
   ["address","Адреса","Address"],
   ["mobile_phone","Мобільний телефон","Mobile phone"],
   ["additional_phone","Додатковий телефон","Additional phone"],
   ["website","Особистий сайт","Personal website"]
  ]},
  {id:"interests",label:["Захоплення","Interests"],icon:"heart",fields:[
   ["activities","Діяльність","Activities","long"],
   ["hobbies","Захоплення","Hobbies","long"],
   ["favorite_music","Улюблена музика","Favorite music","long"],
   ["favorite_movies","Улюблені фільми","Favorite movies","long"],
   ["favorite_tv","Улюблені телешоу","Favorite TV shows","long"],
   ["favorite_books","Улюблені книги","Favorite books","long"],
   ["favorite_games","Улюблені ігри","Favorite games","long"],
   ["favorite_quotes","Улюблені цитати","Favorite quotes","long"],
   ["about_me","Про себе","About me","long"]
  ]},
  {id:"education",label:["Освіта","Education"],icon:"graduation-cap",fields:[
   ["school","Школа або ліцей","School"],
   ["university","Університет","University"],
   ["education_extra","Додаткова освіта","Additional education","long"]
  ]},
  {id:"career",label:["Кар'єра","Career"],icon:"briefcase-business",fields:[
   ["workplace","Місце роботи","Workplace"],
   ["job_title","Посада","Job title"],
   ["career_extra","Досвід роботи","Career experience","long"]
  ]},
  {id:"military",label:["Військова служба","Military service"],icon:"shield",fields:[
   ["military_service","Інформація про службу","Service information","long"]
  ]},
  {id:"personal",label:["Життєва позиція","Life perspectives"],icon:"compass",fields:[
   ["political_views","Політичні погляди","Political views"],
   ["worldview","Світогляд","Worldview"],
   ["life_priorities","Головне в житті","Life priorities"],
   ["important_in_people","Головне в людях","Important qualities in people"],
   ["attitude_to_smoking","Ставлення до паління","Attitude to smoking"],
   ["attitude_to_alcohol","Ставлення до алкоголю","Attitude to alcohol"],
   ["inspiration","Надихають","Inspirations","long"]
  ]}
 ];
 const relationshipForms=[
  ["Неодружений","Незаміжня","Single","Без шлюбу"],
  ["Заручений","Заручена","Engaged","Заручини"],
  ["Одружений","Заміжня","Married","У шлюбі"],
  ["Закоханий","Закохана","In love","Кохання"],
  ["Розлучений","Розлучена","Divorced","Після розлучення"],
  ["Вдівець","Вдова","Widowed","Втрата партнера"]
 ];
 const relationshipNeutral=[["Зустрічаюся","In a relationship"],["У цивільному шлюбі","In a domestic partnership"],["Усе складно","It's complicated"],["В активному пошуку","Looking for a relationship"]];
 const relationshipChoices=gender=>{
  const forms=index=>{const [male,female,en]=relationshipForms[index];return gender==="male"?[[male,en]]:gender==="female"?[[female,en]]:[[male,en+" (male)"],[female,en+" (female)"]];};
  return [...forms(0),relationshipNeutral[0],...forms(1),...forms(2),relationshipNeutral[1],...forms(3),relationshipNeutral[2],relationshipNeutral[3],...forms(4),...forms(5)];
 };
 const relationshipValue=(value,gender)=>{
  const pair=relationshipForms.find(([male,female])=>value===male||value===female||value===male+" / "+female.toLowerCase());
  if(!pair)return value;
  return gender==="male"?pair[0]:gender==="female"?pair[1]:value.includes(" / ")?pair[3]:value;
 };
 const relationshipLabel=(value,gender)=>{
  const normalized=relationshipValue(value,gender);
  const match=relationshipChoices(gender).find(pair=>pair[0]===normalized);
  if(match)return tr(match[0],match[1]);
  const neutral=relationshipForms.find(pair=>pair[3]===normalized);
  return neutral?tr(neutral[3],neutral[2]):normalized;
 };
 const choices={

  political_views:[["Ліберальні","Liberal"],["Консервативні","Conservative"],["Соціал-демократичні","Social democratic"],["Соціалістичні","Socialist"],["Лібертаріанські","Libertarian"],["Центристські","Centrist"],["Національно-демократичні","National democratic"],["Помірковані","Moderate"],["Аполітичні","Apolitical"],["Інші","Other"]],
  worldview:[["Православ’я","Orthodox Christianity"],["Католицизм","Catholicism"],["Греко-католицизм","Greek Catholicism"],["Протестантизм","Protestantism"],["Іслам","Islam"],["Юдаїзм","Judaism"],["Буддизм","Buddhism"],["Індуїзм","Hinduism"],["Атеїзм","Atheism"],["Агностицизм","Agnosticism"],["Світський гуманізм","Secular humanism"],["Інший","Other"]],
  life_priorities:[["Родина та діти","Family and children"],["Здоров’я","Health"],["Кар’єра та фінанси","Career and finances"],["Саморозвиток","Personal development"],["Свобода та незалежність","Freedom and independence"],["Наука та знання","Science and knowledge"],["Творчість","Creativity"],["Дружба та стосунки","Friendship and relationships"],["Допомога людям","Helping others"],["Інше","Other"]],
  important_in_people:[["Доброта та чесність","Kindness and honesty"],["Розум та освіченість","Intelligence and education"],["Вірність та надійність","Loyalty and reliability"],["Сміливість та завзятість","Courage and determination"],["Гумор та життєлюбство","Humor and love of life"],["Повага та емпатія","Respect and empathy"],["Краса та здоров’я","Beauty and health"],["Інше","Other"]],
  attitude_to_smoking:[["Різко негативне","Strongly negative"],["Негативне","Negative"],["Компромісне","Compromising"],["Нейтральне","Neutral"],["Позитивне","Positive"]],
  attitude_to_alcohol:[["Різко негативне","Strongly negative"],["Негативне","Negative"],["Компромісне","Compromising"],["Нейтральне","Neutral"],["Позитивне","Positive"]]
 };
 const primaryLanguageNames={uk:"Українська",en:"English",pl:"Polski",de:"Deutsch",fr:"Français",it:"Italiano",es:"Español",pt:"Português",cs:"Čeština",sk:"Slovenčina",hu:"Magyar",ro:"Română",bg:"Български",ka:"ქართული",lt:"Lietuvių",lv:"Latviešu",et:"Eesti",nl:"Nederlands",sv:"Svenska",no:"Norsk",da:"Dansk",fi:"Suomi",el:"Ελληνικά",tr:"Türkçe",be:"Беларуская",ar:"العربية",he:"עברית",zh:"中文",ja:"日本語",ko:"한국어",hi:"हिन्दी"};
 const languageCodes="aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu".split(" ");
 const languageFallbackNames={"aa":"Afar","ab":"Abkhazian","ae":"Avestan","af":"Afrikaans","ak":"Akan","am":"Amharic","an":"Aragonese","ar":"Arabic","as":"Assamese","av":"Avaric","ay":"Aymara","az":"Azerbaijani","ba":"Bashkir","be":"Belarusian","bg":"Bulgarian","bh":"Bihari","bi":"Bislama","bm":"Bambara","bn":"Bengali","bo":"Tibetan","br":"Breton","bs":"Bosnian","ca":"Catalan","ce":"Chechen","ch":"Chamorro","co":"Corsican","cr":"Cree","cs":"Czech","cu":"Church Slavic","cv":"Chuvash","cy":"Welsh","da":"Danish","de":"German","dv":"Dhivehi","dz":"Dzongkha","ee":"Ewe","el":"Greek","en":"English","eo":"Esperanto","es":"Spanish","et":"Estonian","eu":"Basque","fa":"Persian","ff":"Fulah","fi":"Finnish","fj":"Fijian","fo":"Faroese","fr":"French","fy":"Western Frisian","ga":"Irish","gd":"Scottish Gaelic","gl":"Galician","gn":"Guarani","gu":"Gujarati","gv":"Manx","ha":"Hausa","he":"Hebrew","hi":"Hindi","ho":"Hiri Motu","hr":"Croatian","ht":"Haitian Creole","hu":"Hungarian","hy":"Armenian","hz":"Herero","ia":"Interlingua","id":"Indonesian","ie":"Interlingue","ig":"Igbo","ii":"Sichuan Yi","ik":"Inupiaq","io":"Ido","is":"Icelandic","it":"Italian","iu":"Inuktitut","ja":"Japanese","jv":"Javanese","ka":"Georgian","kg":"Kongo","ki":"Kikuyu","kj":"Kuanyama","kk":"Kazakh","kl":"Kalaallisut","km":"Khmer","kn":"Kannada","ko":"Korean","kr":"Kanuri","ks":"Kashmiri","ku":"Kurdish","kv":"Komi","kw":"Cornish","ky":"Kyrgyz","la":"Latin","lb":"Luxembourgish","lg":"Ganda","li":"Limburgish","ln":"Lingala","lo":"Lao","lt":"Lithuanian","lu":"Luba-Katanga","lv":"Latvian","mg":"Malagasy","mh":"Marshallese","mi":"Maori","mk":"Macedonian","ml":"Malayalam","mn":"Mongolian","mr":"Marathi","ms":"Malay","mt":"Maltese","my":"Burmese","na":"Nauru","nb":"Norwegian Bokmål","nd":"North Ndebele","ne":"Nepali","ng":"Ndonga","nl":"Dutch","nn":"Norwegian Nynorsk","no":"Norwegian","nr":"South Ndebele","nv":"Navajo","ny":"Nyanja","oc":"Occitan","oj":"Ojibwa","om":"Oromo","or":"Odia","os":"Ossetian","pa":"Punjabi","pi":"Pali","pl":"Polish","ps":"Pashto","pt":"Portuguese","qu":"Quechua","rm":"Romansh","rn":"Rundi","ro":"Romanian","rw":"Kinyarwanda","sa":"Sanskrit","sc":"Sardinian","sd":"Sindhi","se":"Northern Sami","sg":"Sango","si":"Sinhala","sk":"Slovak","sl":"Slovenian","sm":"Samoan","sn":"Shona","so":"Somali","sq":"Albanian","sr":"Serbian","ss":"Swati","st":"Southern Sotho","su":"Sundanese","sv":"Swedish","sw":"Swahili","ta":"Tamil","te":"Telugu","tg":"Tajik","th":"Thai","ti":"Tigrinya","tk":"Turkmen","tl":"Tagalog","tn":"Tswana","to":"Tongan","tr":"Turkish","ts":"Tsonga","tt":"Tatar","tw":"Twi","ty":"Tahitian","ug":"Uyghur","uk":"Ukrainian","ur":"Urdu","uz":"Uzbek","ve":"Venda","vi":"Vietnamese","vo":"Volapük","wa":"Walloon","wo":"Wolof","xh":"Xhosa","yi":"Yiddish","yo":"Yoruba","za":"Zhuang","zh":"Chinese","zu":"Zulu"};
 const standardLanguageNames=new Intl.DisplayNames(["en"],{type:"language"});
 const fullLanguageName=(names,code)=>{let value;try{value=names.of(code);}catch(_){}return value&&value.toLowerCase()!==code?value:languageFallbackNames[code]||"";};
 const languageValue=code=>primaryLanguageNames[code]||fullLanguageName(standardLanguageNames,code);
 const languages=[...new Set([...Object.values(primaryLanguageNames),...languageCodes.filter(code=>!Object.hasOwn(primaryLanguageNames,code)).map(languageValue).filter(Boolean).sort((a,b)=>a.localeCompare(b,"en"))])];
 const countryCities={"UA":["Київ","Харків","Одеса","Львів","Дніпро","Запоріжжя","Ужгород","Мукачево","Івано-Франківськ","Тернопіль","Чернівці","Луцьк","Рівне","Хмельницький","Вінниця","Житомир","Черкаси","Чернігів","Суми","Полтава","Кропивницький","Миколаїв","Херсон","Донецьк","Луганськ","Сімферополь","Севастополь","Кривий Ріг","Кременчук","Біла Церква","Кам’янець-Подільський","Берегове","Хуст","Тячів","Рахів","Великий Березний","Перечин","Середнє","Солотвино","Вилок","Буштино","Кольчино","Чинадійово","Воловець","Міжгір’я","Ясіня","Тересва","Королево","Дубове","Невицьке","Кам’яниця","Оноківці","Баранинці","Сторожниця","Минай","Сюрте","Розівка","Великі Лази","Лінці","Холмок","Довге","Косонь","Шаян","Пилипець","Синевир","Колочава","Верховина","Ворохта","Криворівня","Славсько","Східниця","Брюховичі","Рудне","Затока","Коблеве","Бородянка","Гостомель","Коцюбинське","Макарів","Калинівка","Петропавлівська Борщагівка","Софіївська Борщагівка","Чабани","Хотів","Глеваха","Козин","Велика Димерка","Диканька","Опішня","Решетилівка","Седнів","Любеч","Мала Данилівка","Пісочин","Солоницівка","Бабаї"],"GB":["London","Birmingham","Manchester","Liverpool","Leeds","Sheffield","Bristol","Newcastle upon Tyne","Nottingham","Leicester","Southampton","Portsmouth","Oxford","Cambridge","York","Brighton","Reading","Coventry","Glasgow","Edinburgh","Aberdeen","Dundee","Cardiff","Swansea","Belfast","Derry","Ambleside","Grasmere","Hawkshead","Bourton-on-the-Water","Bibury","Castle Combe","Lacock","Portree","Kyle of Lochalsh","Betws-y-Coed","Beddgelert","Bushmills","Hillsborough"],"PL":["Warszawa","Kraków","Łódź","Wrocław","Poznań","Gdańsk","Szczecin","Lublin","Bydgoszcz","Białystok","Katowice","Gdynia","Częstochowa","Radom","Rzeszów","Toruń","Kielce","Olsztyn","Gliwice","Opole","Zielona Góra","Przemyśl","Białowieża","Zawoja","Chochołów","Poronin","Kościelisko","Sromowce Niżne","Kluszkowce","Łącko","Krynica Morska","Mielno","Ustronie Morskie","Jastarnia"],"DE":["Berlin","Hamburg","München","Köln","Frankfurt am Main","Stuttgart","Düsseldorf","Leipzig","Dortmund","Essen","Bremen","Dresden","Hannover","Nürnberg","Duisburg","Bochum","Bonn","Münster","Karlsruhe","Mannheim","Freiburg im Breisgau","Aachen","Potsdam","Oberammergau","Schwangau","Ramsau bei Berchtesgaden","Garmisch-Partenkirchen","Hinterzarten","Triberg","Bacharach","Rüdesheim am Rhein","Worpswede","Ahrenshoop","Prerow","Sankt Peter-Ording"],"FR":["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux","Lille","Rennes","Reims","Toulon","Grenoble","Dijon","Angers","Le Havre","Clermont-Ferrand","Rouen","Tours","Avignon","Metz","Nancy","Gordes","Roussillon","Ménerbes","Lourmarin","Èze","Saint-Paul-de-Vence","Conques","Rocamadour","Saint-Cirq-Lapopie","Eguisheim","Riquewihr","Kaysersberg"],"IT":["Roma","Milano","Napoli","Torino","Palermo","Genova","Bologna","Firenze","Bari","Catania","Venezia","Verona","Messina","Padova","Trieste","Brescia","Parma","Modena","Perugia","Livorno","Cagliari","Salerno","Pisa","Alberobello","Locorotondo","Ostuni","Pienza","Montepulciano","San Gimignano","Vernazza","Manarola","Riomaggiore","Corniglia","Monterosso al Mare","Positano"],"BG":["София","Пловдив","Варна","Бургас","Русе","Стара Загора","Плевен","Сливен","Добрич","Шумен","Перник","Хасково","Ямбол","Пазарджик","Благоевград","Велико Търново","Враца","Габрово","Видин","Кърджали","Кюстендил","Смолян","Арбанаси","Широка лъка","Ковачевица","Лещен","Боженци","Жеравна","Копривщица","Рибарица","Чифлик","Орешак","Баня","Синеморец"],"GE":["თბილისი","ბათუმი","ქუთაისი","რუსთავი","გორი","ზუგდიდი","ფოთი","ხაშური","სამტრედია","სენაკი","ზესტაფონი","მარნეული","თელავი","ახალციხე","ქობულეთი","ოზურგეთი","ბორჯომი","მცხეთა","სტეფანწმინდა","გუდაური","ბაკურიანი","მესტია","უშგული","ომალო","შატილი","სიღნაღი","თიანეთი","აბასთუმანი","ბახმარო","ურეკი"]};
 const countryCodes=Object.keys(countryCities);
 const countryLabel=code=>{if(!countryCodes.includes(code))return "";try{return new Intl.DisplayNames([window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk"],{type:"region"}).of(code)||code;}catch(_){return code;}};
 const citiesForCountry=code=>countryCodes.includes(code)?countryCities[code]:[];

 const multiChoiceKeys=new Set(["life_priorities","important_in_people"]);
 const splitChoices=value=>[...new Set(String(value||"").split(/[,;\n]+/).map(part=>part.trim()).filter(Boolean))];
 const choiceLabel=(key,value)=>{
  const label=part=>{const match=choices[key]?.find(pair=>pair.includes(part));return match?tr(match[0],match[1]):part;};
  return multiChoiceKeys.has(key)?splitChoices(value).map(label).join(", "):label(value);
 };
 const audiences=[
  ["public","Для всіх","Everyone"],
  ["friends","Для друзів","Friends"],
  ["only_me","Лише для мене","Only me"]
 ];
 const addressParts=value=>{
  const text=String(value||"");
  const parts=text.split("\n");
  return parts.length===3?parts:[ "","",text ];
 };
 const addressText=value=>addressParts(value).filter(Boolean).join(", ");
 const settlementKinds=[
  ["city","м. ","Місто","City","Місто проживання","City of residence","Рідне місто","Hometown"],
  ["village","с. ","Село","Village","Село проживання","Village of residence","Рідне село","Home village"],
  ["town","селище ","Селище","Town","Селище проживання","Town of residence","Рідне селище","Home town"]
 ];
 const isSettlement=key=>key==="city"||key==="hometown";
 const settlementParts=value=>{
  const text=String(value||"");
  const kind=settlementKinds.find(item=>text.startsWith(item[1])&&text.slice(item[1].length).trim());
  return {type:kind?.[0]||"",name:kind?text.slice(kind[1].length):text};
 };
 const settlementValue=(type,name)=>{
  const prefix=settlementKinds.find(item=>item[0]===type)?.[1]||"";
  return name.trim()?prefix+name.trim():"";
 };
 const settlementLabel=(key,type)=>{
  const kind=settlementKinds.find(item=>item[0]===type);
  return kind?tr(...kind.slice(key==="city"?4:6,key==="city"?6:8)):
   key==="city"?tr("Населений пункт проживання","Place of residence"):tr("Рідний населений пункт","Place of origin");
 };
 const make=(tag,cls,content)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined)e.textContent=content;
  return e;
 };
 const lang=pair=>tr(pair[0],pair[1]);
 const opt=(value,label)=>{
  const element=document.createElement("option");element.value=value;element.textContent=label;
  return element;
 };
 const svg=(kind)=>{
  const paths={
   user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2",
   lock:"M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
   eye:"M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
   arrow:"M19 12H5m7 7-7-7 7-7",
   edit:"M14.5 5.5l4 4M3 21l5-1L20.5 7.5a2.83 2.83 0 0 0-4-4L4 16l-1 5Z",
   photo:"M4 5h16v14H4zM8.5 9a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM4 16l5-5 4 4 3-3 4 4",
   check:"M5 12l4 4L19 6",
   "user-round":"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2",
   "at-sign":"M16 8v5c0 2.3 4 2.2 4-2a8 8 0 1 0-3 6M16 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
   "map-pin":"M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
   heart:"M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.3a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6",
   globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-3 3-4.5 6.3-4.5 10S9 19 12 22M12 2c3 3 4.5 6.3 4.5 10S15 19 12 22",
   link:"M10.5 13.5l3-3M8.5 16.5H7a5 5 0 0 1 0-10h4M15.5 7.5H17a5 5 0 0 1 0 10h-4",
   "book-open":"M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14c3-2 6-2 9-1v14c-3-1-6-1-9 1M12 6v14",
   "graduation-cap":"m2 8 10-5 10 5-10 5L2 8Zm4 4v5c3 2.5 9 2.5 12 0v-5M22 8v7",
   "briefcase-business":"M4 7h16a2 2 0 0 1 2 2v10H2V9a2 2 0 0 1 2-2Zm4 0V4h8v3M2 13c6 4 14 4 20 0",
   users:"M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6",
   compass:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2.5 5.5L8 16l2.5-5.5L16 8Z",
   music:"M9 17V5l12-2v12M9 8l12-2M9 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
   phone:"M6 2h4l1 5-3 2a17 17 0 0 0 7 7l2-3 5 1v4a3 3 0 0 1-3 3C10 21 3 14 3 5a3 3 0 0 1 3-3",
   sparkles:"m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z",
   film:"M4 4h16v16H4zM8 4v16M16 4v16M4 9h4m8 0h4M4 15h4m8 0h4",
   "gamepad-2":"M8 8h8c3 0 5 2 6 7l-2 4c-1 2-3 2-5 0l-2-2h-2l-2 2c-2 2-4 2-5 0l-2-4c1-5 3-7 6-7Zm1 4v5m-2.5-2.5h5M17 13h.01M19 15h.01",
   "quote":"M4 6h6v6l-3 5H4l3-5H4V6Zm10 0h6v6l-3 5h-3l3-5h-3V6",
   "file-text":"M6 2h8l5 5v15H6zM14 2v5h5M9 12h7M9 16h7",
   x:"M6 6l12 12M18 6 6 18"
  };
  const ns="http://www.w3.org/2000/svg",element=document.createElementNS(ns,"svg");
  element.setAttribute("class","ui-vatra-profile-information-icon-"+kind);
  element.setAttribute("viewBox","0 0 24 24");
  element.setAttribute("width","18");element.setAttribute("height","18");
  element.setAttribute("fill","none");element.setAttribute("stroke","currentColor");
  element.setAttribute("stroke-width","1.8");element.setAttribute("stroke-linecap","round");
  element.setAttribute("stroke-linejoin","round");element.setAttribute("aria-hidden","true");
  const line=document.createElementNS(ns,"path");
  line.setAttribute("class","ui-vatra-profile-information-path-"+kind);
  line.setAttribute("d",paths[kind]||paths.user);element.append(line);return element;
 };
 let openEditor=()=>{};
 const canViewProfileField=(row,isMine,isFriend)=>isMine||row.visibility==="public"||(row.visibility==="friends"&&isFriend);
 const profileSummaryKeys=visible=>{
  const location=visible("city")?"city":visible("hometown")?"hometown":"country";
  return [location,"relationship","website"].filter(key=>visible(key));
 };
 function prepare({client,ownId,targetId,isMine}){


  const preferenceQuery=client.from("profile_preferences")
   .select("profile_visibility").eq("vatra_id",targetId).maybeSingle();
  const friendshipQuery=!isMine&&ownId?
   client.from("friendships")
    .select("id").or(
     "and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+"),"+
     "and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")"
    ).eq("status","accepted").limit(1):
   Promise.resolve({data:[],error:null});
  const ownerDetailsQuery=isMine?client.from("profile_details")
   .select("field_key,field_value,visibility").eq("vatra_id",targetId):Promise.resolve(null);
  return Promise.all([preferenceQuery,friendshipQuery,ownerDetailsQuery]);
 }
 async function init({client,ownId,targetId,isMine,gender=null,blockAccess=null,prepared=null}){
  const card=select("#profile-about-card");
  const paragraph=select("#profile-about-text");
  const emptyInfo=select("#profile-about-empty");
  const [preference,friendship,ownerDetails]=await (prepared||prepare({client,ownId,targetId,isMine}));

  const accountVisibility=preference.error?"friends":preference.data?.profile_visibility||"public";
  const isFriend=!friendship.error&&!!friendship.data?.length;
  const blocked=!isMine&&(blockAccess?.blockedByThem||blockAccess?.blockedByMe);
  const locked=!isMine&&(blocked||(accountVisibility==="friends"&&!isFriend));
  const result=locked?{data:[],error:null}:isMine?ownerDetails:await client.from("profile_details")
   .select("field_key,field_value,visibility").eq("vatra_id",targetId);
  const rows=result.error?[]:(result.data||[]).filter(row=>canViewProfileField(row,isMine,isFriend));
  const saved=new Map(rows.map(x=>[x.field_key,{
   value:String(x.field_value||""),visibility:x.visibility||"friends"
  }]));
  const draft=new Map([...saved.entries()].map(([key,value])=>[key,{...value}]));
  const profileGender=isMine?gender:null;
  const title=select("#profile-about-heading");
  if(title){
   title.textContent=tr("Про мене","About me");
   title.dataset.socialUk="Про мене";
   title.dataset.socialEn="About me";
  }
  const fieldsByKey=new Map(groups.flatMap(group=>group.fields).map(field=>[field[0],field]));
  const featured=["short_bio","country","city","hometown","relationship"];
  const sections=make("div","profile-information-groups ui-profile-information-groups-001");
  const more=make("button","vatra-profile-about-more-001",tr("Докладніше","More details"));
  more.type="button";more.id="profile-about-more";
  more.append(svg("arrow"));
  more.setAttribute("aria-haspopup","dialog");
  const modal=make("dialog","vatra-profile-details-dialog ui-vatra-profile-details-dialog-001");
  modal.id="vatra-profile-details-dialog";
  modal.setAttribute("aria-labelledby","vatra-profile-details-heading");
  const modalHeader=make("div","vatra-profile-details-header ui-vatra-profile-details-header-001");
  const modalTitles=make("div","ui-vatra-profile-details-titles-001");
  const modalTitle=make("h2","vatra-profile-details-title-001",tr("Докладна інформація","Detailed information"));
  modalTitle.id="vatra-profile-details-heading";
  modalTitles.append(modalTitle);
  const closeModal=make("button","vatra-profile-details-close-001");
  closeModal.append(svg("x"));
  closeModal.type="button";
  closeModal.setAttribute("aria-label",tr("Закрити докладну інформацію","Close detailed information"));
  modalHeader.append(modalTitles,closeModal);
  const modalContent=make("div","vatra-profile-details-content ui-vatra-profile-details-content-001");
  modal.append(modalHeader,modalContent);
  document.body.append(modal);
  closeModal.addEventListener("click",()=>modal.close());
  modal.addEventListener("click",event=>{
   if(event.target===modal)modal.close();
  });
  const visibleField=key=>String(saved.get(key)?.value||"").trim();
  const safeWebsite=value=>{
   try{
    const candidate=/^https?:\/\//i.test(value)?value:"https://"+value;
    const parsed=new URL(candidate);
    if(!["http:","https:"].includes(parsed.protocol)||!parsed.hostname.includes("."))return null;
    return parsed.href;
   }catch(_){return null;}
  };
  const itemFor=(key,detailed)=>{
   const field=fieldsByKey.get(key),data=saved.get(key);
   if(!field||!visibleField(key))return null;
   const item=make("div",detailed?
    "vatra-profile-details-row ui-profile-detail-row-"+key:
    "profile-information-item ui-profile-information-item-"+key);


   if(key==="short_bio"){
    return detailed?make("p","vatra-profile-detail-bio-001",data.value):null;
   }
   const label=make("span",detailed?
    "vatra-profile-detail-label-"+key:"vatra-profile-information-label-"+key,isSettlement(key)?settlementLabel(key,settlementParts(data.value).type):tr(field[1],field[2]));
   const content=make("span",detailed?
    "vatra-profile-detail-value-"+key:"vatra-profile-information-value-"+key);
   if(key==="website"){
    const href=safeWebsite(data.value.trim());
    if(href){
     const link=make("a",detailed?"vatra-profile-detail-website-001":"vatra-profile-about-website-001",data.value.trim());
     link.href=href;link.target="_blank";link.rel="noopener noreferrer nofollow";
     content.append(link);
    }else content.textContent=data.value;
   }else content.textContent=key==="address"?addressText(data.value):key==="country"?countryLabel(data.value):key==="relationship"?relationshipLabel(data.value,profileGender):isSettlement(key)?settlementParts(data.value).name:choiceLabel(key,data.value);
   if(!detailed&&key==="city"&&visibleField("country")){
    const country=countryLabel(visibleField("country"));if(country)content.append(document.createTextNode(", "+country));
   }
   item.append(label,content);
   return item;
  };
  const renderDetails=()=>{
   modalContent.replaceChildren();
   modalTitle.textContent=tr("Докладна інформація","Detailed information");
   closeModal.setAttribute("aria-label",tr("Закрити докладну інформацію","Close detailed information"));
   const detailGroups=[
    {id:"overview",label:["Основне","Overview"],keys:featured},
    ...groups.map(group=>({
     id:group.id,label:group.label,
     keys:group.fields.map(field=>field[0]).filter(key=>!featured.includes(key))
    }))
   ];
   let count=0;
   for(const group of detailGroups){
    const keys=group.keys.filter(key=>visibleField(key));
    if(!keys.length)continue;
    const section=make("section","vatra-profile-details-section ui-vatra-profile-details-section-"+group.id);
    const head=make("h3","vatra-profile-details-section-title-"+group.id,lang(group.label));
    const headingRow=make("div","vatra-profile-details-section-head ui-vatra-profile-details-section-head-"+group.id);
    headingRow.append(head);section.append(headingRow);
    for(const key of keys){section.append(itemFor(key,true));count++;}
    modalContent.append(section);
   }
   if(!count){
    const empty=make("div","vatra-profile-details-empty ui-vatra-profile-details-empty-001");
    empty.append(svg("user"),make("p","vatra-profile-details-empty-label-001",
     isMine?tr("Відомостей поки немає. Додайте те, чим бажаєте поділитися.",
      "No details yet. Add what you would like to share."):
      tr("Користувач ще не додав доступної вам інформації.",
       "This member has not shared any information with you.")));
    modalContent.append(empty);
   }
  };
  more.addEventListener("click",()=>{
   if(locked)return;
   renderDetails();modal.showModal();closeModal.focus({preventScroll:true});
  });
  const renderInfo=()=>{
   sections.replaceChildren();
   if(!card||!paragraph)return;
   card.classList.remove("is-empty");
   if(emptyInfo)emptyInfo.hidden=true;
   more.hidden=true;
   if(result.error){
    paragraph.hidden=false;
    paragraph.textContent=tr("Не вдалося завантажити інформацію.","Could not load profile information.");
    return;
   }
   if(locked){
    paragraph.hidden=false;
    paragraph.textContent=tr("Інформація доступна лише друзям.","Information is available to friends only.");
    return;
   }


   const bio=visibleField("short_bio"),bioLimit=profileFieldLimit("short_bio","long");
   paragraph.textContent=bio.length>bioLimit?bio.slice(0,bioLimit-1).replace(/[\uD800-\uDBFF]$/,"")+"…":bio;
   paragraph.hidden=!bio;

   const selected=profileSummaryKeys(visibleField);
   const locationKey=selected.find(key=>key==="city"||key==="hometown");
   for(const key of selected)sections.append(itemFor(key,false));
   const noDetails=!bio&&!selected.length;
   card.classList.toggle("is-empty",noDetails);
   if(emptyInfo)emptyInfo.hidden=!noDetails;
   const additional=[...fieldsByKey.keys()].filter(key=>
    key!=="short_bio"&&visibleField(key)&&!selected.includes(key)&&!(key==="country"&&locationKey==="city"));
   const hasLongPreview=selected.some(key=>visibleField(key).length>32);
   more.hidden=!additional.length&&!hasLongPreview;
  };
  if(card){card.append(sections,more);renderInfo();}
  if(locked){
   if(!blocked)select(".social-profile-tabs")?.setAttribute("hidden","");
   select(".profile-panels")?.setAttribute("hidden","");
   if(blocked)document.body.dataset.memberBlocked="true";
   select("#profile-status")?.setAttribute("hidden","");
   const status=select("#profile-status-text");if(status)status.textContent="";
   const notice=make("section","profile-locked-notice ui-profile-locked-notice-001");
   notice.setAttribute("role","status");
   if(blocked)notice.dataset.lockReason="block";
   notice.append(svg("lock"));
   const copy=make("div","ui-profile-locked-notice-content-001");
   copy.append(make("h2","vatra-profile-locked-heading-001",
    blockAccess?.blockedByMe?
     tr("Ви заблокували цього користувача","You blocked this member"):
    blockAccess?.blockedByThem?
     tr("Доступ до сторінки обмежено","Access to this profile is restricted"):
     tr("Ця сторінка закрита","This profile is private")));
   if(!blockAccess?.blockedByMe)copy.append(make("p","vatra-profile-locked-description-001",
    blockAccess?.blockedByThem?
     tr("Користувач обмежив вам доступ до своєї сторінки.",
      "This member has restricted your access to their profile."):
     tr("Публікації, фотографії та інформацію бачать лише друзі користувача.",
      "Only this member's friends can see posts, photos and personal information.")));
   notice.append(copy);
   if(blockAccess?.blockedByMe){
    const unblock=make("button","vatra-profile-unblock-direct-001",tr("Розблокувати","Unblock"));
    unblock.id="profile-unblock-direct";unblock.type="button";notice.append(unblock);
   }
   select("#profile-last-seen")?.setAttribute("hidden","");
   select(".profile-hero")?.insertAdjacentElement("afterend",notice);
  }
  if(!isMine)return {locked};
  const main=select("#feed-main");
  if(!main)return {locked:false};
  const hero=select(".profile-hero"),panels=select(".profile-panels");
  const workspace=make("section","profile-edit-workspace ui-profile-edit-workspace-001");
  workspace.id="profile-edit-workspace";workspace.hidden=true;
  const back=make("button","vatra-profile-editor-back-001");
  back.type="button";back.append(svg("arrow"));back.setAttribute("aria-label",tr("Мій профіль","My profile"));
  const layout=make("div","profile-editor-layout ui-profile-editor-layout-001");
  const primary=make("section","profile-editor-main ui-profile-editor-main-001");
  const form=make("form","profile-editor-form ui-profile-editor-form-001");
  form.id="profile-editor-form";
  const titleRow=make("div","profile-editor-section-head ui-profile-editor-section-head-001");
  const groupTitleWrap=make("div","ui-profile-editor-section-title-wrap-001");
  const groupTitle=make("h2","vatra-profile-editor-section-title-001");
  groupTitleWrap.append(back,groupTitle);
  titleRow.append(groupTitleWrap);
  const summary=make("p","vatra-profile-editor-section-description-001");
  const separator=make("div","profile-editor-label-row ui-profile-editor-label-row-001");
  separator.append(
   make("span","vatra-profile-editor-label-row-title-001",tr("Ваші відомості","Your details")),
   make("span","vatra-profile-editor-label-row-caption-001",tr("Кожне поле має свою аудиторію","Every field has its own audience")));
  const fields=make("div","profile-editor-fields ui-profile-editor-fields-001");
  const saveRow=make("div","profile-editor-footer ui-profile-editor-footer-001");
  const save=make("button","vatra-profile-editor-save-001",tr("Зберегти зміни","Save changes"));
  save.type="submit";saveRow.append(save);
  form.append(titleRow,summary,separator,fields,saveRow);primary.append(form);
  const sidebar=make("nav","profile-editor-sidebar ui-profile-editor-sidebar-001");
  sidebar.setAttribute("aria-label",tr("Розділи редагування","Edit sections"));
  const navHeading=make("div","ui-profile-editor-nav-heading-001");
  navHeading.append(
   make("span","vatra-profile-editor-nav-eyebrow-001",tr("РОЗДІЛИ","SECTIONS")),
   make("strong","vatra-profile-editor-nav-title-001",tr("Особисті дані","Personal details")),
   make("span","vatra-profile-editor-nav-subtitle-001",tr("7 розділів · усе під контролем","7 sections · in your control")));
  sidebar.append(navHeading);
  const menu=make("div","ui-profile-editor-nav-menu-001");
  const navButtons=new Map();
  for(const [index,group] of groups.entries()){
   const btn=make("button","profile-editor-nav-link vatra-profile-editor-nav-"+group.id);
   btn.type="button";btn.dataset.group=group.id;
   const navIcon=make("span","ui-vatra-profile-editor-nav-symbol-"+group.id);
   navIcon.append(svg(group.icon));
   btn.append(navIcon,
    make("span","vatra-profile-editor-nav-index-"+group.id,String(index+1).padStart(2,"0")),
    make("span","vatra-profile-editor-nav-label-"+group.id,lang(group.label)));
   const marker=make("span","vatra-profile-editor-nav-dot-"+group.id);
   marker.setAttribute("aria-hidden","true");btn.append(marker);
   btn.addEventListener("click",()=>switchGroup(group.id));
   navButtons.set(group.id,btn);menu.append(btn);
  }
  const navFoot=make("div","ui-profile-editor-nav-footer-001");
  navFoot.append(svg("lock"),make("span","vatra-profile-editor-nav-footer-label-001",
   tr("Видимість ваших даних налаштовується окремо.",
    "Each piece of information has its own visibility.")));
  sidebar.append(menu,navFoot);layout.append(primary,sidebar);
  workspace.append(layout);main.append(workspace);
  let selected="profile";
  const normalizedField=item=>({value:String(item?.value||"").trim(),visibility:item?.visibility||"friends"});
  const changedField=(next,previous)=>{
   const a=normalizedField(next),b=normalizedField(previous);
   return a.value!==b.value||Boolean(a.value&&a.visibility!==b.visibility);
  };
  const hasChanges=()=>groups.some(group=>group.fields.some(([key])=>changedField(draft.get(key),saved.get(key))));
  const close=async()=>{
   closeEditorMenu();
   if(save.disabled)return;
   if(hasChanges()&&!await window.VATRA_PROFILE_CONFIRM({
    title:tr("Вийти без збереження?","Leave without saving?"),
    description:tr("Незбережені зміни у вашому профілі буде втрачено.",
     "Your unsaved profile changes will be lost."),
    action:tr("Вийти","Leave")
   }))return;
   draft.clear();
   for(const [key,value] of saved)draft.set(key,{...value});
   window.VATRA_PROFILE_MEDIA_MENU?.close();workspace.hidden=true;hero.hidden=false;panels.hidden=false;
   scrollTo({top:0,behavior:"instant"});
  };
  back.addEventListener("click",close);
  const note=msg=>{if(msg)window.VATRA_TOAST?.error(msg);};
  const recordDialog=make("dialog","vatra-profile-editor-record-dialog ui-profile-editor-record-dialog-001");
  recordDialog.setAttribute("aria-labelledby","profile-editor-record-title");
  const recordForm=make("form","ui-profile-editor-record-form-001");
  const recordHead=make("header","ui-profile-editor-record-head-001");
  const recordTitle=make("h2","vatra-profile-editor-record-title-001");
  recordTitle.id="profile-editor-record-title";
  const recordClose=make("button","vatra-profile-editor-record-close-001");recordClose.type="button";recordClose.append(svg("x"));recordClose.setAttribute("aria-label",tr("Закрити","Close"));
  recordHead.append(recordTitle,recordClose);
  const recordFields=make("div","profile-editor-fields ui-profile-editor-record-fields-001");
  const recordFoot=make("footer","ui-profile-editor-record-footer-001");
  const recordCancel=make("button","vatra-profile-editor-record-cancel-001",tr("Скасувати","Cancel"));recordCancel.type="button";
  const recordSave=make("button","vatra-profile-editor-record-save-001",tr("Зберегти","Save"));recordSave.type="submit";
  recordFoot.append(recordCancel,recordSave);recordForm.append(recordHead,recordFields,recordFoot);recordDialog.append(recordForm);document.body.append(recordDialog);
  let recordSnapshot=null;
  const cancelRecord=()=>{
   closeEditorMenu();
   if(recordSnapshot)for(const [key,value] of recordSnapshot){if(value)draft.set(key,value);else draft.delete(key);}
   recordSnapshot=null;if(recordDialog.open)recordDialog.close();
  };
  recordClose.addEventListener("click",cancelRecord);recordCancel.addEventListener("click",cancelRecord);
  recordDialog.addEventListener("cancel",event=>{event.preventDefault();cancelRecord();});
  recordDialog.addEventListener("click",event=>{if(event.target===recordDialog)cancelRecord();});
  recordDialog.addEventListener("close",()=>{if(recordSnapshot)cancelRecord();});
  recordForm.addEventListener("submit",event=>{
   event.preventDefault();closeEditorMenu();recordSnapshot=null;recordDialog.close();showGroup(selected);form.requestSubmit(save);
  });
  let editorMenu=null,editorMenuSerial=0;
  const menuArrow=()=>{
   const ns="http://www.w3.org/2000/svg",icon=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
   icon.setAttribute("class","ui-profile-editor-dropdown-arrow-001");icon.setAttribute("viewBox","0 0 20 20");icon.setAttribute("aria-hidden","true");
   path.setAttribute("class","ui-profile-editor-dropdown-arrow-path-001");path.setAttribute("d","m5.5 8 4.5 4.5L14.5 8");path.setAttribute("fill","none");path.setAttribute("stroke","currentColor");path.setAttribute("stroke-width","1.7");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");icon.append(path);return icon;
  };
  const closeEditorMenu=()=>{
   const state=editorMenu;if(!state)return;
   editorMenu=null;
   state.anchor.setAttribute("aria-expanded","false");
   state.anchor.removeAttribute("aria-activedescendant");state.anchor.removeAttribute("aria-controls");
   state.wrapper.classList.remove("is-open");
   if(typeof state.panel.hidePopover==="function")try{state.panel.hidePopover();}catch(_){}
   state.panel.remove();
  };
  const editorViewport=anchor=>{
   const v=window.visualViewport,left=v?.offsetLeft||0,top=v?.offsetTop||0,width=v?.width||window.innerWidth,height=v?.height||window.innerHeight;
   const header=anchor.closest("dialog[open]")?top:Math.max(top,document.querySelector(".feed-header")?.getBoundingClientRect().bottom||0);
   return {left,top:header,width,bottom:top+height};
  };
  const revealEditorAnchor=(anchor,wrapper)=>{
   const rect=wrapper.getBoundingClientRect(),view=editorViewport(anchor);
   if(rect.top<view.top+8||rect.bottom>view.bottom-8)wrapper.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
  };
  const positionEditorMenu=()=>{
   const state=editorMenu;if(!state)return;
   if(!state.anchor.isConnected||!state.anchor.getClientRects().length){closeEditorMenu();return;}
   const rect=state.wrapper.getBoundingClientRect(),{left,top,width,bottom}=editorViewport(state.anchor);
   if(rect.bottom<=top||rect.top>=bottom){closeEditorMenu();return;}
   const compact=state.wrapper.dataset.variant==="compact";
   const w=Math.min(Math.max(rect.width,compact?220:0),width-16);
   const x=Math.max(left+8,Math.min(compact?rect.right-w:rect.left,left+width-w-8));
   const down=bottom-rect.bottom-9,up=rect.top-top-9;

   state.panel.style.width=Math.round(w)+"px";
   const desired=Math.min(300,state.panel.scrollHeight+2);
   const above=down<Math.min(desired,160)&&up>down;
   const space=Math.max(0,above?up:down);
   if(space<45){closeEditorMenu();return;}
   state.panel.style.maxHeight=Math.floor(Math.min(300,space))+"px";state.panel.style.left=Math.round(x)+"px";
   state.panel.style.top=Math.round(above?rect.top-state.panel.offsetHeight-6:rect.bottom+6)+"px";
  };
  const markEditorOption=(state,index,scroll=false)=>{
   if(index<0||index>=state.buttons.length||state.items[index].disabled)return;
   state.index=index;
   state.buttons.forEach((button,i)=>button.classList.toggle("is-highlighted",i===state.index));
   const button=state.buttons[state.index];
   state.anchor.setAttribute("aria-activedescendant",button.id);
   if(scroll){

    const bounds=state.panel.getBoundingClientRect(),option=button.getBoundingClientRect();
    if(option.top<bounds.top)state.panel.scrollTop+=option.top-bounds.top;
    else if(option.bottom>bounds.bottom)state.panel.scrollTop+=option.bottom-bounds.bottom;
   }
  };
  const chooseEditorOption=(state,index)=>{
   if(editorMenu!==state)return;
   const item=state.items[index];if(!item||item.disabled)return;
   closeEditorMenu();state.choose(item.value);
  };
  const openEditorMenu=(anchor,wrapper,items,choose,selectedValue,keyboard=false)=>{
   closeEditorMenu();
   revealEditorAnchor(anchor,wrapper);
   const panel=make("div","ui-profile-editor-dropdown-panel-001");
   panel.id="vatra-editor-options-"+(++editorMenuSerial);panel.setAttribute("role","listbox");
   panel.setAttribute("aria-label",anchor.getAttribute("aria-label")||tr("Варіанти","Options"));
   const state={anchor,wrapper,items,choose,panel,selectedValue,buttons:[],index:-1,search:"",searchTime:0};
   editorMenu=state;anchor.setAttribute("aria-expanded","true");anchor.setAttribute("aria-controls",panel.id);wrapper.classList.add("is-open");
   items.forEach((item,index)=>{
    const button=make("button","vatra-profile-editor-dropdown-option-001");
    button.id=panel.id+"-"+index;button.type="button";button.tabIndex=-1;button.setAttribute("role","option");
    const selected=item.value===selectedValue;button.setAttribute("aria-selected",String(selected));button.classList.toggle("is-selected",selected);
    if(item.icon){const symbol=svg(item.icon);symbol.classList.add("ui-profile-editor-option-symbol-001");button.append(symbol);}
    button.append(make("span","vatra-profile-editor-dropdown-option-label-001",item.text));
    if(selected){const check=svg("check");check.classList.add("ui-profile-editor-option-check-001");button.append(check);}
    button.disabled=Boolean(item.disabled);
    button.addEventListener("pointerdown",event=>event.preventDefault());
    button.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse"&&!button.disabled)markEditorOption(state,index);});
    button.addEventListener("click",()=>chooseEditorOption(state,index));
    panel.append(button);state.buttons.push(button);
   });
   if(!items.length)panel.append(make("p","vatra-profile-editor-dropdown-empty-001",tr("Немає збігів. Можна ввести власне значення.","No matches. You can enter your own value.")));
   const host=anchor.closest("dialog[open]")||document.body;
   host.append(panel);
   if(typeof panel.showPopover==="function"){
    panel.setAttribute("popover","manual");
    try{panel.showPopover();}catch(_){panel.removeAttribute("popover");}
   }
   positionEditorMenu();
   if(editorMenu===state&&keyboard&&items.length){
    const index=items.findIndex(item=>!item.disabled&&item.value===selectedValue);
    markEditorOption(state,index<0?items.findIndex(item=>!item.disabled):index,true);
   }
   return state;
  };
  const dropdownKeys=(anchor,open,event,editable=false)=>{
   const current=editorMenu?.anchor===anchor?editorMenu:null;
   if(event.key==="Tab"){if(current)closeEditorMenu();return;}
   if(event.key==="Escape"&&current){event.preventDefault();event.stopPropagation();closeEditorMenu();return;}
   if(event.key==="ArrowDown"||event.key==="ArrowUp"){
    event.preventDefault();
    const step=event.key==="ArrowUp"?-1:1;
    if(!current){
     const state=open(true);
     if(editorMenu===state&&step===-1&&state.index<0){
      const enabled=state.items.map((item,i)=>item.disabled?-1:i).filter(i=>i>=0);
      markEditorOption(state,enabled[enabled.length-1]??-1,true);
     }
    }else{
     const enabled=current.items.map((item,i)=>item.disabled?-1:i).filter(i=>i>=0);
     const index=enabled.indexOf(current.index);
     if(enabled.length)markEditorOption(current,enabled[index<0?(step===1?0:enabled.length-1):Math.max(0,Math.min(enabled.length-1,index+step))],true);
    }
    return;
   }
   if(current&&(event.key==="Home"||event.key==="End")&&!editable){
    event.preventDefault();const enabled=current.items.map((item,i)=>item.disabled?-1:i).filter(i=>i>=0);
    markEditorOption(current,enabled[event.key==="Home"?0:enabled.length-1]??-1,true);return;
   }
   if(event.key==="Enter"||(!editable&&event.key===" ")){
    if(current){
     event.preventDefault();
     let index=current.index;
     if(index<0&&!editable){
      index=current.items.findIndex(item=>!item.disabled&&item.value===current.selectedValue);
      if(index<0)index=current.items.findIndex(item=>!item.disabled);
     }
     if(index>=0)chooseEditorOption(current,index);else closeEditorMenu();
     return;
    }
    if(!editable){event.preventDefault();open(true);return;}
   }
   if(!editable&&event.key.length===1&&event.key!==" "&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
    event.preventDefault();const state=current||open(false);
    if(editorMenu!==state)return;
    const now=Date.now();state.search=(now-state.searchTime>700?"":state.search)+event.key.toLocaleLowerCase();state.searchTime=now;
    const index=state.items.findIndex(item=>!item.disabled&&item.text.toLocaleLowerCase().startsWith(state.search));
    if(index>=0)markEditorOption(state,index,true);
   }
  };
  const audienceIcon=value=>value==="public"?"globe":value==="only_me"?"lock":"users";
  const enhanceEditorSelect=(native,variant="normal")=>{
   const id=native.id,wrapper=make("div","vatra-editor-select ui-profile-editor-select-"+id);
   wrapper.dataset.variant=variant;
   const button=make("button","vatra-profile-editor-select-trigger-001");button.type="button";button.id=id;
   button.setAttribute("role","combobox");button.setAttribute("aria-haspopup","listbox");button.setAttribute("aria-expanded","false");
   button.setAttribute("aria-label",native.getAttribute("aria-label")||tr("Обрати значення","Choose a value"));
   const caption=make("span","vatra-profile-editor-select-value-001");
   const iconWrap=make("span","ui-profile-editor-select-symbol-001");
   if(variant==="compact")button.append(iconWrap);
   else button.append(caption,menuArrow());
   native.id=id+"-native";native.hidden=true;native.tabIndex=-1;native.setAttribute("aria-hidden","true");
   native.before(wrapper);wrapper.append(native,button);
   const sync=()=>{
    const option=native.options[native.selectedIndex];
    caption.textContent=option?.textContent||tr("Не вибрано","Not selected");
    button.classList.toggle("is-placeholder",!native.value);
    button.disabled=native.disabled;
    if(variant==="compact"){
     iconWrap.replaceChildren(svg(audienceIcon(native.value)));
     const label=(native.getAttribute("aria-label")||tr("Видимість","Visibility"))+": "+caption.textContent;
     button.setAttribute("aria-label",label);button.title=label;
    }
   };
   const open=keyboard=>{
    const items=Array.from(native.options).map(option=>({value:option.value,text:option.textContent,disabled:option.disabled,icon:null}));
    return openEditorMenu(button,wrapper,items,value=>{native.value=value;native.dispatchEvent(new Event("change",{bubbles:true}));sync();},native.value,keyboard);
   };
   native.addEventListener("change",sync);sync();
   button.addEventListener("click",()=>{if(editorMenu?.anchor===button)closeEditorMenu();else open(false);});
   button.addEventListener("keydown",event=>dropdownKeys(button,open,event));
   button.addEventListener("blur",event=>{if(editorMenu?.anchor===button&&!editorMenu.panel.contains(event.relatedTarget))closeEditorMenu();});
   return {sync,focus:()=>button.focus()};
  };
  const enhanceCityInput=input=>{
   const wrapper=make("div","vatra-editor-city ui-profile-editor-city-"+input.id);
   const arrow=make("button","vatra-profile-editor-city-toggle-001");arrow.type="button";arrow.tabIndex=-1;
   arrow.setAttribute("aria-label",tr("Список населених пунктів","Settlement suggestions"));arrow.append(menuArrow());
   input.before(wrapper);wrapper.append(input,arrow);
   input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");input.setAttribute("aria-expanded","false");input.setAttribute("aria-haspopup","listbox");
   if(!input.hasAttribute("aria-label"))input.setAttribute("aria-label",tr("Населений пункт проживання","Place of residence"));
   const open=(keyboard=false,all=false)=>{
    const query=all?"":input.value.trim().toLocaleLowerCase();
    const items=citiesForCountry(draft.get("country")?.value).filter(city=>!query||city.toLocaleLowerCase().includes(query)).sort((a,b)=>a.localeCompare(b,window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk")).map(city=>({value:city,text:city}));
    return openEditorMenu(input,wrapper,items,value=>{input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));closeEditorMenu();},input.value,keyboard);
   };
   input.addEventListener("input",()=>open(false));
   input.addEventListener("click",()=>{if(editorMenu?.anchor!==input)open(false,true);});
   input.addEventListener("keydown",event=>dropdownKeys(input,keyboard=>open(keyboard),event,true));
   input.addEventListener("blur",event=>{if(editorMenu?.anchor===input&&!wrapper.contains(event.relatedTarget)&&!editorMenu.panel.contains(event.relatedTarget))closeEditorMenu();});
   arrow.addEventListener("pointerdown",event=>event.preventDefault());
   arrow.addEventListener("click",()=>{input.focus({preventScroll:true});if(editorMenu?.anchor===input)closeEditorMenu();else open(false,true);});
  };
  document.addEventListener("pointerdown",event=>{
   if(editorMenu&&!editorMenu.wrapper.contains(event.target)&&!editorMenu.panel.contains(event.target))closeEditorMenu();
  },true);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&editorMenu){event.preventDefault();event.stopPropagation();closeEditorMenu();}},true);
  window.addEventListener("scroll",event=>{if(editorMenu&&(!(event.target instanceof Node)||!editorMenu.panel.contains(event.target)))positionEditorMenu();},{capture:true,passive:true});
  window.addEventListener("resize",positionEditorMenu,{passive:true});
  window.visualViewport?.addEventListener("resize",positionEditorMenu,{passive:true});
  window.visualViewport?.addEventListener("scroll",positionEditorMenu,{passive:true});
  const buildField=([key,uk,en,kind],destination)=>{
   const row=make("div","profile-editor-field ui-profile-editor-field-"+key);
   row.dataset.long=kind==="long"?"true":"false";
   const lab=make("label","vatra-profile-editor-label-"+key,tr(uk,en));
   const current=draft.get(key)||{value:"",visibility:key==="address"?"only_me":"friends"};
   const selectBox=make("select","ui-profile-editor-visibility-"+key);
   selectBox.id="profile-editor-visibility-"+key;
   selectBox.setAttribute("aria-label",tr("Видимість поля: ","Visibility of field: ")+tr(uk,en));
   for(const [value,labelUa,labelEn] of audiences)selectBox.append(opt(value,tr(labelUa,labelEn)));
   selectBox.value=current.visibility;
   if(!selectBox.value)selectBox.value="friends";
   const control=make("div","ui-profile-editor-field-control-"+key);
   const inputId="profile-editor-"+key;
   let readValue,fieldCounter,settlementType;
   if(key==="address"){
    let value=current.value;
    const trigger=make("button","vatra-profile-editor-address-open-001");trigger.id=inputId;trigger.type="button";trigger.setAttribute("aria-haspopup","dialog");trigger.setAttribute("aria-label",tr("Вказати адресу","Set address"));
    const refresh=()=>{trigger.replaceChildren(make("span","vatra-profile-editor-address-value-001",addressText(value)||tr("Вказати адресу","Set address")),svg("edit"));trigger.classList.toggle("is-empty",!value);};
    readValue=()=>value;refresh();control.append(trigger);
    trigger.addEventListener("click",()=>{
     closeEditorMenu();
     const d=make("dialog","vatra-profile-editor-record-dialog ui-profile-editor-address-dialog-001");
     d.id="profile-editor-address-dialog";d.setAttribute("aria-labelledby","profile-editor-address-title");
     const form=make("form","ui-profile-editor-record-form-001"),head=make("header","ui-profile-editor-record-head-001"),title=make("h2","vatra-profile-editor-record-title-001",tr("Додавання місця","Add a place"));title.id="profile-editor-address-title";
     const closeButton=make("button","vatra-profile-editor-record-close-001");closeButton.type="button";closeButton.setAttribute("aria-label",tr("Закрити","Close"));closeButton.append(svg("x"));head.append(title,closeButton);
     const body=make("div","profile-editor-fields ui-profile-editor-record-fields-001"),foot=make("footer","ui-profile-editor-record-footer-001");
     const [existingCity,existingStreet,existingName]=addressParts(value);
     const addField=(key,uk,en,initial)=>{
      const row=make("div","profile-editor-field ui-profile-editor-address-row-"+key),group=make("div","ui-profile-editor-field-label-group-001"),label=make("label","vatra-profile-editor-label-place-"+key,tr(uk,en));
      const input=make("input","ui-profile-editor-input-place-"+key);input.id="profile-editor-place-"+key;input.type="text";input.maxLength=250;input.autocomplete="off";input.value=initial;label.htmlFor=input.id;group.append(label);row.append(group,input);body.append(row);return input;
     };
     const city=addField("city","Населений пункт","City, town or village",existingCity||settlementParts(draft.get("city")?.value).name||"");
     const street=addField("street","Вулиця","Street",existingStreet),name=addField("name","Назва","Name",existingName);
     city.placeholder=tr("Знайти або ввести населений пункт","Find or enter a settlement");enhanceCityInput(city);
     street.placeholder=tr("Введіть назву вулиці","Enter street name");name.placeholder=tr("Наприклад, Дім","For example, Home");
     body.append(make("p","vatra-profile-editor-address-help-001",tr("Адресу побачать лише користувачі, яким ви надали доступ.","Only the audience you select can see your address.")));
     const cancel=make("button","vatra-profile-editor-record-cancel-001",tr("Скасувати","Cancel"));cancel.type="button";
     const commit=make("button","vatra-profile-editor-record-save-001",tr("Зберегти","Save"));commit.type="submit";
     const finish=()=>{closeEditorMenu();if(d.open)d.close();d.remove();trigger.focus({preventScroll:true});};
     closeButton.addEventListener("click",finish);cancel.addEventListener("click",finish);d.addEventListener("cancel",event=>{event.preventDefault();finish();});d.addEventListener("click",event=>{if(event.target===d)finish();});
     if(value){const remove=make("button","vatra-profile-editor-address-remove-001",tr("Видалити","Delete"));remove.type="button";remove.addEventListener("click",()=>{value="";refresh();update();finish();});foot.append(remove);}
     form.addEventListener("submit",event=>{event.preventDefault();const parts=[city.value,street.value,name.value].map(v=>v.trim());if(!parts[0]||(!parts[1]&&!parts[2])){(parts[0]?street:city).setCustomValidity(tr("Заповніть поле","Fill in this field"));(parts[0]?street:city).reportValidity();return;}value=parts.join("\n");refresh();update();finish();});
     for(const input of [city,street,name])input.addEventListener("input",()=>{city.setCustomValidity("");street.setCustomValidity("");});
     foot.append(cancel,commit);form.append(head,body,foot);d.append(form);document.body.append(d);d.showModal();city.focus();
    });
   }else if(multiChoiceKeys.has(key)){
    const selected=new Set(splitChoices(current.value).map(value=>choices[key].find(pair=>pair.includes(value))?.[0]||value));
    const list=make("div","ui-profile-editor-multi-choice-001");list.id=inputId;list.setAttribute("role","group");list.setAttribute("aria-label",tr(uk,en));
    lab.id=inputId+"-label";list.setAttribute("aria-labelledby",lab.id);
    const options=[...choices[key],...[...selected].filter(value=>!choices[key].some(pair=>pair[0]===value)).map(value=>[value,value])];
    readValue=()=>[...selected].join(", ");
    for(const [index,pair] of options.entries()){
     const option=make("label","vatra-profile-editor-multi-option-001");
     const check=make("input","ui-profile-editor-multi-check-001");check.type="checkbox";check.id=inputId+"-"+index;check.value=pair[0];check.checked=selected.has(pair[0]);
     option.append(check,make("span","vatra-profile-editor-multi-label-001",lang(pair)));
     check.addEventListener("change",()=>{
      if(check.checked)selected.add(pair[0]);else selected.delete(pair[0]);
      if(readValue().length>1000){selected.delete(pair[0]);check.checked=false;}
      update();
     });list.append(option);
    }
    control.append(list);
   }else if(key==="languages"){
    const selectedLanguages=[...new Set(current.value.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).map(value=>languageCodes.includes(value.toLowerCase())?languageValue(value.toLowerCase())||value:value))];
    const wrap=make("div","ui-profile-editor-language-box-001"),chips=make("div","ui-profile-editor-language-chips-001");
    const picker=make("select","ui-profile-editor-input-languages");picker.id=inputId+"-native";picker.hidden=true;picker.tabIndex=-1;picker.setAttribute("aria-hidden","true");
    const search=make("input","ui-profile-editor-input-language-search");search.type="search";search.id=inputId;search.autocomplete="off";search.maxLength=80;
    search.placeholder=tr("Знайти мову","Find a language");search.setAttribute("aria-label",tr(uk,en));search.setAttribute("role","combobox");search.setAttribute("aria-expanded","false");search.setAttribute("aria-autocomplete","list");search.setAttribute("aria-haspopup","listbox");
    const searchBox=make("div","vatra-editor-city ui-profile-editor-language-search-001");
    const arrow=make("button","vatra-profile-editor-language-toggle-001");arrow.type="button";arrow.tabIndex=-1;arrow.append(menuArrow());arrow.setAttribute("aria-label",tr("Список мов","Language list"));searchBox.append(search,arrow);
    const normalize=value=>value.normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase();
    const locale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
    const localizedNames=new Intl.DisplayNames([locale],{type:"language"});
    const aliases=new Map(languageCodes.map(code=>[languageValue(code),[fullLanguageName(localizedNames,code),fullLanguageName(standardLanguageNames,code),code]]));
    const popular=["Українська","English","Polski","Deutsch","Français","Italiano","Български","ქართული"];
    const collator=new Intl.Collator(locale,{sensitivity:"base"});
    const sorted=[...popular,...languages.filter(value=>!popular.includes(value)).sort((a,b)=>collator.compare(aliases.get(a)?.[0]||a,aliases.get(b)?.[0]||b))];
    const render=()=>{
     chips.replaceChildren();picker.replaceChildren(opt("",tr("Додати мову","Add a language")));
     for(const value of selectedLanguages){
      const chip=make("button","vatra-profile-editor-language-chip-001");chip.type="button";
      chip.append(make("span","vatra-profile-editor-language-chip-label-001",value),svg("x"));
      chip.setAttribute("aria-label",tr("Видалити мову: ","Remove language: ")+value);
      chip.addEventListener("click",()=>{selectedLanguages.splice(selectedLanguages.indexOf(value),1);render();update();search.focus();});
      chips.append(chip);
     }
     chips.hidden=!selectedLanguages.length;
     for(const value of sorted)if(!selectedLanguages.includes(value))picker.append(opt(value,value));
    };
    readValue=()=>selectedLanguages.join(", ");
    const update=()=>draft.set(key,{value:readValue(),visibility:selectBox.value});
    const open=(keyboard=false)=>{
     const q=normalize(search.value.trim());
     const available=sorted.filter(value=>!selectedLanguages.includes(value)&&(!q||[value,...(aliases.get(value)||[])].some(name=>normalize(name).includes(q))));
     const items=available.map(value=>{const local=aliases.get(value)?.[0];return {value,text:local&&normalize(local)!==normalize(value)?local+" · "+value:value};});
     const state=openEditorMenu(search,searchBox,items,value=>{
      if(readValue().length+value.length+2<=1000){selectedLanguages.push(value);search.value="";render();update();}
      search.focus({preventScroll:true});
     },"",keyboard);
     if(!items.length&&editorMenu===state)state.panel.firstElementChild.textContent=tr("Мову не знайдено","No matching language");
     return state;
    };
    search.addEventListener("input",()=>open());
    search.addEventListener("click",()=>{if(editorMenu?.anchor!==search)open();});
    search.addEventListener("keydown",event=>dropdownKeys(search,open,event,true));
    search.addEventListener("blur",event=>{if(editorMenu?.anchor===search&&!searchBox.contains(event.relatedTarget)&&!editorMenu.panel.contains(event.relatedTarget))closeEditorMenu();});
    arrow.addEventListener("pointerdown",event=>event.preventDefault());
    arrow.addEventListener("click",()=>{search.focus({preventScroll:true});if(editorMenu?.anchor===search)closeEditorMenu();else open();});
    render();wrap.append(chips,picker,searchBox);control.append(wrap);
   }else{
    const menu=key==="country"?countryCodes.map(code=>[code,countryLabel(code)]):key==="relationship"?relationshipChoices(profileGender):choices[key];
    const selectedValue=key==="relationship"?relationshipValue(current.value,profileGender):current.value;
    const input=make(menu?"select":kind==="long"?"textarea":"input","ui-profile-editor-input-"+key);
    input.id=inputId;input.setAttribute("aria-label",tr(uk,en));
    if(menu){
     input.append(opt("",tr("Не вибрано","Not selected")));
     for(const pair of menu)input.append(opt(pair[0],key==="country"?pair[1]:lang(pair)));
     if(key!=="country"&&selectedValue&&!menu.some(pair=>pair[0]===selectedValue))input.append(opt(selectedValue,key==="relationship"?relationshipLabel(selectedValue,profileGender):choiceLabel(key,selectedValue)));
    }else{
     if(kind==="long")input.rows=3;
     else input.type=["mobile_phone","additional_phone"].includes(key)?"tel":"text";
     input.maxLength=profileFieldLimit(key,kind);input.spellcheck=kind==="long";
     input.placeholder=key==="short_bio"?tr("Розкажіть про себе","Tell us about yourself"):tr("Не вказано","Not specified");
     if(isSettlement(key)){
      input.autocomplete="off";input.placeholder=tr("Знайти або ввести населений пункт","Find or enter a settlement");
     }
    }
    input.value=key==="country"&&!countryCodes.includes(selectedValue)?"":selectedValue;readValue=()=>input.value;
    if(isSettlement(key)){
     const initial=settlementParts(current.value);
     input.value=initial.name;
     settlementType=make("select","ui-profile-editor-settlement-type-001");
     settlementType.id=inputId+"-type";settlementType.setAttribute("aria-label",tr("Тип населеного пункту","Settlement type")+": "+tr(uk,en));
     settlementType.append(opt("",tr("Не вибрано","Not selected")));
     for(const [type,prefix,ua,eng] of settlementKinds)settlementType.append(opt(type,tr(ua,eng)));
     settlementType.value=initial.type;
     readValue=()=>settlementValue(settlementType.value,input.value);
     const refreshLabel=()=>{
      const title=settlementLabel(key,settlementType.value);
      lab.textContent=title;input.setAttribute("aria-label",title);
      selectBox.setAttribute("aria-label",tr("Видимість поля: ","Visibility of field: ")+title);
      input.maxLength=profileFieldLimit(key,kind)-(settlementKinds.find(item=>item[0]===settlementType.value)?.[1].length||0);
     };
     refreshLabel();
     settlementType.addEventListener("change",()=>{refreshLabel();selectBox.dispatchEvent(new Event("change"));});
    }
    if(key==="short_bio"){
      fieldCounter=make("span","vatra-profile-status-counter-001");fieldCounter.id="profile-short-bio-counter";
      input.setAttribute("aria-describedby",fieldCounter.id);
      const refreshCount=()=>{fieldCounter.textContent=input.value.length+" / "+input.maxLength;};
      input.addEventListener("input",refreshCount);refreshCount();
     }
     control.append(input);input.addEventListener(menu?"change":"input",()=>update());
    if(menu)enhanceEditorSelect(input);else if(key==="city")enhanceCityInput(input);
   }
   lab.htmlFor=multiChoiceKeys.has(key)?inputId+"-0":inputId;const labelGroup=make("div","ui-profile-editor-field-label-group-001");labelGroup.append(lab);if(settlementType){labelGroup.append(settlementType);enhanceEditorSelect(settlementType);}if(fieldCounter)labelGroup.append(fieldCounter);control.append(selectBox);row.append(labelGroup,control);destination.append(row);
   function update(){draft.set(key,{value:readValue(),visibility:selectBox.value});}
   selectBox.addEventListener("change",update);enhanceEditorSelect(selectBox,"compact");
  };
  const showGroup=id=>{
   const group=groups.find(x=>x.id===id);
   if(!group)return;
   closeEditorMenu();window.VATRA_PROFILE_MEDIA_MENU?.close();selected=id;
   groupTitle.textContent=lang(group.label);
   summary.textContent=id==="profile"?
    tr("Основне про вас","About you"):
    tr("Для кожного поля доступні три рівні приватності.",
     "Each field supports three visibility levels.");
   for(const [name,btn] of navButtons){
    const active=name===id;
    btn.classList.toggle("is-active",active);btn.setAttribute("aria-current",active?"page":"false");
   }
   fields.replaceChildren();
   if(id==="profile"){
    const identity=make("section","ui-profile-editor-identity-001");
    const coverPreview=make("div","ui-profile-editor-cover-preview-001");
    const avatarPreview=make("span","ui-profile-editor-avatar-preview-001");
    const coverButton=make("button","vatra-profile-editor-cover-change-001");coverButton.type="button";coverButton.append(svg("edit"),make("span","vatra-profile-editor-cover-label-001",tr("Редагувати обкладинку","Edit cover")));
    const avatarButton=make("button","vatra-profile-editor-avatar-change-001");avatarButton.type="button";avatarButton.append(svg("photo"));avatarButton.setAttribute("aria-label",tr("Дії з фото профілю","Profile photo actions"));
    for(const button of [coverButton,avatarButton]){button.setAttribute("aria-haspopup","menu");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","profile-owner-media-menu");}
    const menu=(kind,button,keyboard=false,surface=button)=>window.VATRA_PROFILE_MEDIA_MENU?.open(kind,button,keyboard,surface);
    const bindMenu=(surface,button,kind)=>{
     surface.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse")menu(kind,button,false,surface);});
     surface.addEventListener("pointerleave",event=>window.VATRA_PROFILE_MEDIA_MENU?.leave(event));
     button.addEventListener("click",event=>menu(kind,button,event.detail===0,surface));
     button.addEventListener("keydown",event=>{if(event.key==="ArrowDown"){event.preventDefault();menu(kind,button,true,surface);}});
    };
    const updatePreview=()=>{
     const profileCover=select("#profile-cover-image"),profileAvatar=select("#profile-avatar");
     coverPreview.style.backgroundImage=profileCover?.style.backgroundImage||"";
     const image=select("#profile-cover-photo");
     if(image?.getAttribute("src")&&!image.hidden)coverPreview.style.backgroundImage="url("+JSON.stringify(image.src)+")";
     avatarPreview.style.backgroundImage=profileAvatar?.style.backgroundImage||"";
     if(profileAvatar?.classList.contains("has-photo"))avatarPreview.classList.add("has-photo");else avatarPreview.classList.remove("has-photo");
    };
    updatePreview();
    const observe=new MutationObserver(updatePreview);
    for(const target of [select("#profile-cover-image"),select("#profile-cover-photo"),select("#profile-avatar")])if(target)observe.observe(target,{attributes:true,attributeFilter:["style","class","src","hidden"]});
    const sectionObserver=new MutationObserver(()=>{if(!identity.isConnected){observe.disconnect();sectionObserver.disconnect();}});
    sectionObserver.observe(fields,{childList:true});
    bindMenu(coverButton,coverButton,"cover");bindMenu(avatarPreview,avatarButton,"avatar");
    avatarPreview.append(avatarButton);coverPreview.append(coverButton);
    const identityInfo=make("div","ui-profile-editor-identity-info-001");
    const nameLine=make("div","ui-profile-editor-identity-name-row-001");
    nameLine.append(make("strong","vatra-profile-editor-identity-name-001",select("#profile-heading")?.querySelector(".vatra-verified-name-text")?.textContent||select("#profile-heading")?.textContent.trim()||"VATRA"));
    const idLink=make("a","vatra-profile-editor-id-link-001",tr("Змінити ім’я у VATRA ID","Edit name in VATRA ID"));idLink.href=new URL("vatra-id#personal",location.href).href;
    nameLine.append(idLink);identityInfo.append(nameLine);
    identityInfo.prepend(avatarPreview);identity.append(coverPreview,identityInfo);fields.append(identity);

   }
   if(["education","career","military"].includes(id)){
    const info=make("div","ui-profile-editor-records-001");
    const values=group.fields.filter(field=>String(draft.get(field[0])?.value||"").trim());
    if(values.length){
     for(const field of values){
      const row=make("div","ui-profile-editor-record-summary-"+field[0]);
      row.append(make("span","vatra-profile-editor-record-label-"+field[0],tr(field[1],field[2])),make("span","vatra-profile-editor-record-value-"+field[0],draft.get(field[0]).value));
      info.append(row);
     }
    }else info.append(make("p","vatra-profile-editor-record-empty-001",tr("Інформацію ще не додано.","No information added yet.")));
    const edit=make("button","vatra-profile-editor-record-open-001",values.length?tr("Редагувати","Edit"):tr("Додати","Add"));edit.type="button";
    edit.addEventListener("click",()=>{
     recordTitle.textContent=values.length?tr("Редагувати інформацію","Edit details"):tr("Додати інформацію","Add details");
     recordFields.replaceChildren();
     recordSnapshot=new Map(group.fields.map(field=>[field[0],draft.has(field[0])?{...draft.get(field[0])}:null]));
     for(const field of group.fields)buildField(field,recordFields);
     recordDialog.showModal();
    });
    info.append(edit);fields.append(info);
   }else for(const field of group.fields)buildField(field,fields);

  };

  const switchGroup=id=>{
   if(id!==selected){showGroup(id);workspace.scrollIntoView({block:"start",behavior:"instant"});}
  };
  form.addEventListener("submit",async event=>{
   event.preventDefault();closeEditorMenu();if(save.disabled)return;
   for(const [key,uk,en,kind] of groups.flatMap(group=>group.fields)){
    if(key==="address"||key==="country"||key==="relationship"||key==="languages"||choices[key]||multiChoiceKeys.has(key))continue;
    const value=normalizedField(draft.get(key)).value,previous=normalizedField(saved.get(key)).value,limit=profileFieldLimit(key,kind);
    if(value!==previous&&value.length>limit){note(tr(uk,en)+": "+value.length+" / "+limit);return;}
   }
   save.disabled=true;

   const records=groups.flatMap(group=>group.fields).map(field=>{
    const key=field[0],item=draft.get(key)||{value:"",visibility:"friends"};
    return {vatra_id:ownId,field_key:key,field_value:item.value.trim(),
     visibility:item.visibility,updated_at:new Date().toISOString()};
   }).filter(record=>{
    return changedField({value:record.field_value,visibility:record.visibility},saved.get(record.field_key));
   });
   try{
    const additions=records.filter(x=>x.field_value);
    const deletions=records.filter(x=>!x.field_value).map(x=>x.field_key);
    if(additions.length){
     const result=await client.from("profile_details")
      .upsert(additions,{onConflict:"vatra_id,field_key"}).select("field_key");
     if(result.error||result.data?.length!==additions.length)
      throw result.error||new Error("Profile fields not saved");
    }
    if(deletions.length){
     const result=await client.from("profile_details")
      .delete().eq("vatra_id",ownId).in("field_key",deletions);
     if(result.error)throw result.error;
    }
    for(const record of records){
     if(record.field_value)saved.set(record.field_key,{
      value:record.field_value,visibility:record.visibility});
     else saved.delete(record.field_key);
     draft.set(record.field_key,{
      value:record.field_value,visibility:record.visibility});
    }

    renderInfo();
    window.VATRA_TOAST?.success(tr("Зміни збережено.","Changes saved."));
   }catch(_){
    note(tr("Не вдалося зберегти всі зміни. Повторіть спробу.",
     "Could not save all changes. Please retry."));
   }finally{save.disabled=false;}
  });
  openEditor=()=>{
   hero.hidden=true;panels.hidden=true;
   workspace.hidden=false;showGroup("profile");
   scrollTo({top:0,behavior:"instant"});
   back.focus({preventScroll:true});
  };
  showGroup("profile");
  return {locked:false};
 }
 window.VATRA_PROFILE_DETAILS={prepare,init,open:()=>openEditor()};
})();



(()=>{
"use strict";
if(window.VATRA_HOST_ALLOWED===false)return;
const PROJECT_URL="https://cxrcycxrlkufozomsxcs.supabase.co";
const PUBLIC_KEY="sb_publishable_oKypZDxi8PP1oxSylfh5wQ_H6HxeM-i";
const q=selector=>document.querySelector(selector);
const activeLocale=window.VATRA_LANGUAGE?.locale||document.documentElement.lang||"uk";
const english=activeLocale==="en";
const dateLocales={uk:"uk-UA",en:"en-US",pl:"pl-PL",de:"de-DE",fr:"fr-FR",it:"it-IT",ka:"ka-GE",bg:"bg-BG"};
const locale=dateLocales[activeLocale]||"uk-UA";
const t=(uk,en)=>{
 if(activeLocale==="uk")return uk;
 const translated=window.VATRA_LANGUAGE?.translate?.(uk);
 return typeof translated==="string"&&translated!==uk?translated:(english?en:uk);
};
const home=new URL("../../",document.currentScript.src).href;
const validId=id=>typeof id==="string"&&/^[1-9][0-9]{0,18}$/.test(id);
const memberUrl=id=>home+"id"+encodeURIComponent(id);
const localizeSocial=()=>{
 for(const element of document.querySelectorAll("[data-social-uk]"))
  element.textContent=t(element.dataset.socialUk,element.dataset.socialEn);
 const brand=document.querySelector(".feed-header-brand");
 if(brand)brand.setAttribute("aria-label",t("VATRA — Стрічка","VATRA — Feed"));
 for(const control of document.querySelectorAll(".social-profile-tabs button:disabled"))
  control.title=t("У розробці","Coming soon");
 for(const input of document.querySelectorAll("[data-shell-placeholder-uk]")){
    input.placeholder=t(input.dataset.shellPlaceholderUk,input.dataset.shellPlaceholderEn);
   }
   for(const control of document.querySelectorAll("[data-shell-aria-uk]")){
    const title=t(control.dataset.shellAriaUk,control.dataset.shellAriaEn);
    control.setAttribute("aria-label",title);
    if(control.classList.contains("profile-safety-action"))control.title=title;
    else control.removeAttribute("title");
   }
   for(const pair of [
    [".ui-shell-header-notifications-001","Сповіщення — незабаром","Notifications — coming soon"],
    [".ui-shell-header-music-001","Музика — незабаром","Music — coming soon"]]){
    const control=document.querySelector(pair[0]);
    if(control){
     const title=t(pair[1],pair[2]);
     control.setAttribute("aria-label",title);
     control.removeAttribute("title");
    }
   }
   for(const link of document.querySelectorAll(".social-top-link")){
  const label=link.querySelector("[data-social-uk]");
  if(label){
   link.setAttribute("aria-label",label.textContent);
   link.removeAttribute("title");
  }
 }
};
const node=(tag,cls,value)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(value!==undefined)element.textContent=value;
 return element;
};
const dateText=value=>{
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return "";
 return window.VATRA_PRESENCE?.relative?.(date,english)||
  new Intl.DateTimeFormat(locale,{day:"numeric",month:"short",year:"numeric"}).format(date);
};
const setMenuLink=id=>{
 if(!validId(id))return;
 for(const link of document.querySelectorAll('a[href="profile"],a[href$="/profile"]')){
  link.href=memberUrl(id);
 }
};
const finish=()=>{
 q("#profile-app").hidden=false;
 q("#profile-loading").hidden=true;
 document.body.dataset.authReady="true";
 document.body.dataset.feedReady="true";
  document.body.classList.remove("vatra-shell-pending");
};
const gateError=message=>{
 const loader=q("#profile-loading");
 if(!loader)return;
 loader.hidden=false;
 loader.dataset.loadingError="true";
 loader.setAttribute("role","alert");
 const label=loader.querySelector(".vatra-auth-loading-caption");
 if(label)label.textContent=message;
 if(loader.querySelector(".vatra-auth-loading-retry"))return;
 const retry=node("button","vatra-auth-loading-retry vatra-profile-retry-001",t("Повторити","Retry"));
 retry.type="button";
 retry.addEventListener("click",()=>location.reload());
 loader.querySelector(".vatra-auth-loading-content")?.append(retry);
};
function missingProfile(state="not-found"){

 const titles={
  "not-found":t("Користувача не знайдено","User not found"),
  deleted:t("Акаунт видалено","Account deleted"),
  blocked:t("Акаунт заблоковано","Account blocked")
 };
 const title=titles[state]||titles["not-found"];

 document.body.dataset.vatraProfileUnavailable=state;
 const name=q("#profile-heading");
 if(name){name.removeAttribute("data-i18n");name.textContent=title;}
 const portrait=q("#profile-avatar"),wrap=q("#profile-avatar-wrap");
 const cover=q("#profile-cover-image"),systemCover=q("#profile-cover-system");
 const coverPhoto=q("#profile-cover-photo"),coverView=q("#profile-cover-view");
 if(cover)cover.classList.remove("has-photo");
 if(systemCover){

  systemCover.dataset.vatraCoverState=state;
  systemCover.hidden=false;
 }
 if(coverPhoto){coverPhoto.hidden=true;coverPhoto.removeAttribute("src");}
 if(coverView)coverView.hidden=true;
 window.VATRA_AVATAR?.fallback(portrait,state);
 if(wrap){
  wrap.dataset.vatraSystemAvatar="true";
  wrap.dataset.vatraRingKind=state;
 }
 const button=q("#profile-avatar-trigger");
 if(button){button.disabled=true;button.setAttribute("aria-label",title);}

 q("#profile-status")?.remove();
 q("#profile-last-seen")?.remove();

 q(".profile-actions")?.remove();
 q("#profile-edit-open")?.remove();
 q(".ui-profile-tab-row-001")?.remove();
 q(".profile-panels")?.remove();
 finish();
}
let profilePostsRequest=0;
async function loadPosts(client,targetId,ownId,userId,append=false,focusPost=null){
 const list=q("#profile-posts"),empty=q("#profile-posts-empty"),more=q("#profile-posts-more");
 if(!list||(append&&list.dataset.loading==="true"))return;
 const ticket=++profilePostsRequest;
 const offset=append?Number(list.dataset.offset||0):0;
 const year=Number(q("#profile-post-filter-year")?.value||0);
 const month=Number(q("#profile-post-filter-month")?.value||0);
 const scope=String(targetId)+"|"+year+"|"+month;
 const oldCards=!append&&list.dataset.profileScope===scope?
  new Map([...list.querySelectorAll(".feed-post-card[data-post-id]")]
   .map(card=>[card.dataset.postId,card])):new Map();
 list.dataset.loading="true";list.setAttribute("aria-busy","true");
 if(!append){

  if(!list.querySelector(".feed-post-card")){
   empty.hidden=true;
   if(!list.querySelector(".feed-post-placeholder"))for(let i=0;i<2;i++){
    const card=node("div","feed-post-placeholder ui-profile-post-placeholder-00"+(i+1));card.setAttribute("aria-hidden","true");card.append(node("span","feed-post-placeholder-head ui-profile-post-placeholder-head-00"+(i+1)),node("span","feed-post-placeholder-line ui-profile-post-placeholder-line-00"+(i+1)));list.append(card);
   }
  }
  if(more)more.hidden=true;
 }
 if(more)more.disabled=true;
 try{
  let query=client.from("feed_posts")
   .select("id,author_vatra_id,body,created_at,visibility,media_kind,media_path,media_items,poll,shared_post_kind,shared_post_id,pinned_at,comments_enabled")
   .eq("author_vatra_id",targetId).eq("is_clip",false);
  if(typeof query.is==="function")query=query.is("archived_at",null);


  if(focusPost)query=query.eq("id",focusPost);
  else if(year>=2026&&year<=9999){
   const start=new Date(year,month?month-1:0,1);
   const end=month?new Date(year,month,1):new Date(year+1,0,1);
   query=query.gte("created_at",start.toISOString())
    .lt("created_at",end.toISOString());
  }
  const {data,error}=await query.order("pinned_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false})
   .order("id",{ascending:false}).range(offset,offset+11);
  if(ticket!==profilePostsRequest)return;
  if(error)throw error;
  const rows=data||[];
  const engagement=window.VATRA_POST_INTERACTIONS?.prefetchEngagement(
   client,rows.map(post=>({...post,kind:"person"})))||Promise.resolve(new Map());
  if(ticket!==profilePostsRequest)return;
  const batch=document.createDocumentFragment();
  for(const post of rows){
   const fingerprint=JSON.stringify([post.id,post.body,post.visibility,post.media_kind,
    post.media_path,post.media_items,post.pinned_at,post.comments_enabled]);
   const cached=oldCards.get(String(post.id));
   if(cached?._vatraPostFingerprint===fingerprint){batch.append(cached);continue;}
   const article=node("article","feed-post-card ui-profile-post-card-001");
   article._vatraPostFingerprint=fingerprint;
   article.dataset.postId=post.id;
   const header=node("div","feed-post-header ui-profile-post-header-001");
   const identity=node("div","feed-post-author ui-profile-post-author-001");
   const name=node("a","feed-post-name vatra-profile-post-name-001 feed-post-profile-link",
    q("#profile-heading").textContent);
   name.href=memberUrl(targetId);
   void window.VATRA_VERIFIED?.attach(client,name,post.author_vatra_id);
   const stamp=node("time","feed-post-date vatra-profile-post-date-001",dateText(post.created_at));
   stamp.dateTime=post.created_at;
   const meta=node("div","feed-post-meta-row ui-profile-post-meta-row-001");
   meta.append(stamp);window.VATRA_POST_INTERACTIONS?.appendAudience(meta,post.visibility,false);
   identity.append(name,meta);
   const avatar=node("a","feed-avatar feed-post-avatar vatra-profile-post-avatar-001 feed-post-profile-avatar",
    q("#profile-avatar").textContent||"V");
   avatar.href=memberUrl(targetId);
   avatar.setAttribute("aria-label",t("Переглянути профіль","View profile"));
   const profileAvatar=q("#profile-avatar");
   if(profileAvatar.classList.contains("has-photo")){
    avatar.style.backgroundImage=profileAvatar.style.backgroundImage;
    avatar.classList.add("has-photo");avatar.textContent="";
   }
   header.append(avatar,identity);
   if(String(ownId)===String(targetId)){
    window.VATRA_POST_INTERACTIONS?.addOwnerMenu(header,{
     source:"profile",client,post:{...post,kind:"person"},ownId,onChange:()=>void loadPosts(client,targetId,ownId,userId),
     onArchive:async()=>{
      const {data,error}=await client.from("feed_posts")
       .update({archived_at:new Date().toISOString(),pinned_at:null})
       .eq("id",post.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
      if(error||!data)return;
      void loadPosts(client,targetId,ownId,userId);
     },
     onDelete:async()=>{
      if(!await window.VATRA_PROFILE_CONFIRM({
       title:t("Видалити публікацію?","Delete this post?"),
       description:t("Публікацію можна відновити, доки ви не залишили сторінку.","You can restore the post until you leave this page."),
       action:t("Видалити","Delete")
      }))return;
      const commit=async()=>{
       const {data,error}=await client.from("feed_posts").delete().eq("id",post.id)
        .eq("author_vatra_id",ownId).select("id");
       if(error||!data?.length)throw Error("Post not deleted");
       if(post.media_path)void window.VATRA_POST_MEDIA?.remove(client,post);
       if(post.media_items?.length)void window.VATRA_POST_MEDIA?.removeGallery(client,post.media_items);
       try{await loadPosts(client,targetId,ownId,userId);}catch(_){}
       window.dispatchEvent(new Event("vatra:profile-media-changed"));
      };
      window.VATRA_POST_INTERACTIONS?.deferPostDelete(article,commit,()=>window.VATRA_TOAST?.show?.(t("Не вдалося видалити.","Could not delete post."),"error"),ownId);
     }
    });
   }
   article.append(header);
   if(post.pinned_at)article.append(node("div","vatra-profile-post-pinned-001",t("Закріплена публікація","Pinned post")));
   if(post.body){
    const body=node("p","feed-post-body vatra-profile-post-body-001",post.body);
    window.VATRA_POST_MEDIA?.linkifyHashtags(body);
    article.append(body);
    window.VATRA_POST_MEDIA?.collapsibleBody(body);
   }
   if(post.media_items?.length||(post.media_kind&&post.media_path))void window.VATRA_POST_MEDIA?.mount(client,post,article);
   if(post.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,post,article);
   window.VATRA_POST_INTERACTIONS?.mount(client,{...post,kind:"person"},article,{
    ownId,userId,engagementPromise:engagement,
    onShared:()=>{if(String(ownId)===String(targetId))
     void loadPosts(client,targetId,ownId,userId);}
   });
   window.VATRA_POST_INTERACTIONS?.paintPendingPostDelete(article);
   batch.append(article);
  }
  if(append)list.append(batch);else list.replaceChildren(batch);
  if(focusPost){
   const back=node("button","vatra-profile-all-posts-001",t("До всіх публікацій","All posts"));back.type="button";
   back.addEventListener("click",()=>{const url=new URL(location.href);url.searchParams.delete("post");url.searchParams.delete("comment");history.replaceState(history.state,"",url.href);void loadPosts(client,targetId,ownId,userId);});
   list.prepend(back);
   requestAnimationFrame(()=>list.querySelector(".feed-post-card")?.scrollIntoView({block:"start",behavior:"auto"}));
  }
  list.dataset.profileScope=scope;
  list.dataset.offset=String(offset+rows.length);
  empty.hidden=list.querySelector(".feed-post-card")!==null;
  if(!empty.hidden)empty.textContent=year?
   t("За вибраний період публікацій немає.","No posts in the selected period."):
   t("Публікацій поки немає.","No posts yet.");
  if(more){
   more.hidden=!!focusPost||rows.length<12;
   if(!more.dataset.bound){
    more.dataset.bound="true";
    more.addEventListener("click",()=>void loadPosts(client,targetId,ownId,userId,true));
   }
   if(!more.dataset.autoPageBound&&typeof IntersectionObserver==="function"){
    more.dataset.autoPageBound="true";
    const postPager=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting)&&!more.hidden&&!more.disabled&&
      list.dataset.loading!=="true"&&document.visibilityState!=="hidden"){
      void loadPosts(client,targetId,ownId,userId,true);
     }
    },{rootMargin:"0px 0px 240px 0px"});
    postPager.observe(more);
   }
  }
 }catch(_){
  if(ticket!==profilePostsRequest)return;

  empty.textContent=t("Не вдалося завантажити публікації. Спробуйте оновити сторінку.",
   "Could not load posts. Try refreshing this page.");
  empty.hidden=!!list.querySelector(".feed-post-card");
 }finally{
  if(ticket===profilePostsRequest){
   list.dataset.loading="false";list.setAttribute("aria-busy","false");
   if(more)more.disabled=false;
  }
 }
}
function setupProfilePostFilters(client,targetId,ownId,userId){
 const wrap=q(".profile-post-filter-wrap"),toggle=q("#profile-post-filter-button");
 const panel=q("#profile-post-filter-panel"),year=q("#profile-post-filter-year");
 const month=q("#profile-post-filter-month"),reset=q("#profile-post-filter-reset");
 const status=q("#profile-post-filter-status");
 if(!wrap||!toggle||!panel||!year||!month||!reset||!status)return;
 const option=(value,label)=>{
  const item=document.createElement("option");
  item.value=String(value);item.textContent=label;return item;
 };
 year.replaceChildren(option("",t("Усі роки","All years")));
 const current=new Date().getFullYear();
 for(let value=Math.max(2026,current);value>=2026;value--)
  year.append(option(value,String(value)));
 month.replaceChildren(option("",t("Усі місяці","All months")));
 for(let index=0;index<12;index++){
  const label=new Intl.DateTimeFormat(locale,{month:"long"}).format(new Date(2026,index,1));
  month.append(option(index+1,label.charAt(0).toLocaleUpperCase(locale)+label.slice(1)));
 }
 month.disabled=true;
 const close=()=>{
  panel.hidden=true;toggle.setAttribute("aria-expanded","false");
 };
 const refresh=()=>{
  if(!year.value){month.value="";month.disabled=true;}
  else month.disabled=false;
  const active=!!year.value;
  toggle.dataset.active=String(active);
  status.hidden=!active;
  if(active){
   const selected=month.value?
    new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"})
     .format(new Date(Number(year.value),Number(month.value)-1,1)):
    year.value;
   status.textContent=t("Публікації за ","Posts for ")+selected;
  }else status.textContent="";
  void loadPosts(client,targetId,ownId,userId);
 };
 toggle.addEventListener("click",()=>{
  panel.hidden=!panel.hidden;
  toggle.setAttribute("aria-expanded",String(!panel.hidden));
 });
 year.addEventListener("change",refresh);
 month.addEventListener("change",refresh);
 reset.addEventListener("click",()=>{
  year.value="";month.value="";refresh();close();
 });
 document.addEventListener("click",event=>{
  if(!panel.hidden&&!wrap.contains(event.target))close();
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!panel.hidden){close();toggle.focus();}
 });
}
function setupProfileExtraSections(client,ownId,targetId,userId,isMine){
 const savedTab=q("#profile-tab-saved"),archiveWrap=q("#profile-archive-wrap"),
  toggle=q("#profile-archive-toggle"),menu=q("#profile-archive-menu");
 savedTab.hidden=!isMine;archiveWrap.hidden=!isMine;
 const empty=(selector,content)=>{const element=q(selector);element.textContent=content;element.hidden=false;};
 const makeRow=(list,heading,description)=>{
  const article=node("article","profile-extra-row ui-profile-extra-row-001");
  article.append(node("strong","vatra-profile-extra-title-001",heading),
   node("p","vatra-profile-extra-copy-001",description));
  list.append(article);return article;
 };
 const displaySavedMedia=(article,item)=>{
  if(!item?.media_items?.length&&(!item?.media_path||!["image","video"].includes(item.media_kind)))return;

  void window.VATRA_POST_MEDIA?.mount(client,item,article);
 };
 const displayShared=(article,item)=>{
  if(item?.shared_post_id)void window.VATRA_POST_INTERACTIONS?.renderSharedPreview(client,item,article);
 };
 const namedAuthors=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.author_vatra_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await (window.VATRA_PUBLIC_NAMES?.get(client,ids)||
   client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids));
  return new Map(!error?(data||[]).map(x=>[String(x.vatra_id),String(x.display_name||"").trim()]):[]);
 };
 const namedCommunities=async rows=>{
  const ids=[...new Set(rows.map(p=>String(p.club_id)).filter(validId))];
  if(!ids.length)return new Map();
  const {data,error}=await client.from("communities").select("club_id,name").in("club_id",ids);
  return new Map(!error?(data||[]).map(x=>[String(x.club_id),String(x.name||"").trim()]):[]);
 };
 const saved=async()=>{
  if(!isMine)return;
  const list=q("#profile-saved-list"),note=q("#profile-saved-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("post_saves")
    .select("post_id,post_kind,saved_at").eq("owner_vatra_id",ownId)
    .order("saved_at",{ascending:false}).limit(30);
   if(error)throw error;
   const rows=data||[];
   const persons=rows.filter(row=>row.post_kind==="person").map(row=>row.post_id);
   const groups=rows.filter(row=>row.post_kind==="group").map(row=>row.post_id);
   const fetched=await Promise.all([
    persons.length?client.from("feed_posts").select("id,body,author_vatra_id,media_kind,media_path,media_items,is_clip,shared_post_kind,shared_post_id,created_at").in("id",persons):Promise.resolve({data:[]}),
    groups.length?client.from("community_posts").select("id,body,author_vatra_id,club_id,media_kind,media_path,media_items,created_at").in("id",groups):Promise.resolve({data:[]})
   ]);
   const map=new Map(fetched.flatMap((x,i)=>(x.data||[]).map(p=>[(i?"group":"person")+":"+p.id,p])));
   const all=[...map.values()];
   const [people,communities]=await Promise.all([namedAuthors(all),namedCommunities(all.filter(x=>x.club_id))]);
   for(const save of rows){
    const post=map.get(save.post_kind+":"+save.post_id);if(!post)continue;
    const author=people.get(String(post.author_vatra_id))||t("Користувач VATRA","VATRA user");
    const community=save.post_kind==="group"?communities.get(String(post.club_id)):null;
    const heading=community?community+" · "+author:author;
    const article=makeRow(list,heading,post.body||t("Медіапублікація","Media post"));
    if(people.has(String(post.author_vatra_id)))void window.VATRA_VERIFIED?.attach(client,article.querySelector(".vatra-profile-extra-title-001"),post.author_vatra_id);
    displaySavedMedia(article,post);
    displayShared(article,post);
    const groupSaved=save.post_kind==="group"&&validId(post.club_id);
    const a=node("a","vatra-profile-saved-link-001",groupSaved?
     t("Відкрити спільноту","Open community"):t("Відкрити допис","Open post"));
    a.href=groupSaved?new URL("club"+post.club_id,home).href:
     new URL("feed?post="+encodeURIComponent(post.id),home).href;
    const remove=node("button","vatra-profile-saved-remove-001",t("Прибрати зі збереженого","Remove from saved"));
    remove.type="button";
    remove.addEventListener("click",async()=>{
     remove.disabled=true;
     const result=await client.from("post_saves").delete().eq("owner_vatra_id",ownId)
      .eq("post_kind",save.post_kind).eq("post_id",save.post_id);
     if(result.error){remove.disabled=false;return;}
     article.remove();
     if(!list.children.length)empty("#profile-saved-empty",t("Поки нічого не збережено.","Nothing saved yet."));
    });
    article.append(a,remove);
   }
   if(!list.children.length)empty("#profile-saved-empty",t("Поки нічого не збережено.","Nothing saved yet."));
  }catch(_){empty("#profile-saved-empty",t("Не вдалося завантажити збережене.","Could not load saved items."));}
 };
 const stories=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-stories-list"),note=q("#profile-archive-stories-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("stories").select("id,body,theme,created_at,expires_at,media_kind,media_path")
    .eq("author_vatra_id",ownId).lte("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(50);
   if(error)throw error;
   for(const item of data||[]){
    const article=makeRow(list,dateText(item.created_at),item.body||
     (item.media_kind==="video"?t("Відеоісторія","Video story"):
      item.media_kind==="image"?t("Фотоісторія","Photo story"):
       t("Історія","Story")));
    const view=node("button","vatra-profile-archived-story-open-001",
     t("Переглянути історію","View story"));
    view.type="button";
    view.addEventListener("click",()=>{
     const dialog=q("#profile-story-viewer");
     const text=q("#profile-story-viewer-text");
     q("#profile-story-viewer-heading").textContent=dateText(item.created_at);
     q("#profile-story-viewer-delete").hidden=true;
     text.textContent=item.body||"";text.hidden=!item.body;
     dialog.dataset.theme=String(item.theme||0);
     dialog.showModal();

     void window.VATRA_POST_MEDIA?.renderStory(client,
      {...item,author_vatra_id:ownId},q("#profile-story-viewer-media"),false,true);
    });
    article.append(view);
   }
   if(!list.children.length)empty("#profile-archive-stories-empty",t("Історій в архіві ще немає.","No archived stories yet."));
  }catch(_){empty("#profile-archive-stories-empty",t("Не вдалося завантажити архів історій.","Could not load story archive."));}
 };
 const archivedPosts=async()=>{
  if(!isMine)return;
  const list=q("#profile-archive-posts-list"),note=q("#profile-archive-posts-empty");
  list.replaceChildren();note.hidden=true;
  try{
   const {data,error}=await client.from("feed_posts")
    .select("id,author_vatra_id,body,media_kind,media_path,media_items,shared_post_kind,shared_post_id,created_at,archived_at")
    .eq("author_vatra_id",ownId).not("archived_at","is",null)
    .order("archived_at",{ascending:false}).limit(40);
   if(error)throw error;
   const people=await namedAuthors(data||[]);
   for(const item of data||[]){
    const article=makeRow(list,people.get(String(item.author_vatra_id))||t("Моя публікація","My post"),
     item.body||t("Медіапублікація","Media post"));
    const stamp=node("time","vatra-profile-extra-stamp-001",dateText(item.created_at));
    stamp.dateTime=item.created_at;article.append(stamp);
    displaySavedMedia(article,item);
    displayShared(article,item);
    const restore=node("button","vatra-profile-restore-post-001",t("Повернути в публікації","Restore post"));
    restore.type="button";
    restore.addEventListener("click",async()=>{
     restore.disabled=true;
     const {data:updated,error:err}=await client.from("feed_posts").update({archived_at:null})
      .eq("id",item.id).eq("author_vatra_id",ownId).select("id").maybeSingle();
     if(err||!updated){restore.disabled=false;return;}
     article.remove();
     if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
    });
    const permanent=node("button","vatra-profile-permanent-delete-001",t("Видалити назавжди","Delete permanently"));
    permanent.type="button";permanent.addEventListener("click",async()=>{
     if(!await window.VATRA_PROFILE_CONFIRM({
      title:t("Видалити назавжди?","Delete permanently?"),
      description:t("Цю публікацію буде остаточно видалено з архіву.",
       "This post will be permanently deleted from your archive."),
      action:t("Видалити","Delete")
     }))return;
     permanent.disabled=true;
     const {data:deleted,error:err}=await client.from("feed_posts").delete()
      .eq("id",item.id).eq("author_vatra_id",ownId).select("id");
     if(err||!deleted?.length){permanent.disabled=false;return;}
     if(item.media_path)void window.VATRA_POST_MEDIA?.remove(client,item);
     article.remove();
     if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
    });
    article.append(restore,permanent);
   }
   if(!list.children.length)empty("#profile-archive-posts-empty",t("В архіві немає публікацій.","No archived posts."));
  }catch(_){empty("#profile-archive-posts-empty",t("Не вдалося завантажити архів.","Could not load archive."));}
 };
 const dispatch=name=>{
  toggle?.classList.toggle("social-profile-tab-active",["archive-stories","archive-posts","archive-photos"].includes(name));
  if(name==="saved")void saved();
  if(name==="archive-stories")void stories();
  if(name==="archive-posts")void archivedPosts();
 };
 window.VATRA_PROFILE_EXTRA_TAB=dispatch;
 if(!isMine)return;

 document.body.append(menu);
 const close=()=>{menu.hidden=true;toggle.setAttribute("aria-expanded","false");};
 const position=()=>{
  if(menu.hidden)return;
  const anchor=toggle.getBoundingClientRect();
  const width=menu.getBoundingClientRect().width||175;
  menu.style.left=Math.round(Math.max(10,Math.min(anchor.left,innerWidth-width-10)))+"px";
  menu.style.top=Math.round(Math.min(anchor.bottom+6,innerHeight-menu.offsetHeight-10))+"px";
 };
 toggle.addEventListener("click",()=>{
  menu.hidden=!menu.hidden;toggle.setAttribute("aria-expanded",String(!menu.hidden));
  if(!menu.hidden)position();
 });
 for(const button of menu.querySelectorAll("[data-profile-archive]")){
  button.addEventListener("click",()=>{
   window.VATRA_PROFILE_CHOOSE_TAB?.(button.dataset.profileArchive);
   close();
  });
 }
 document.addEventListener("pointerdown",event=>{if(!archiveWrap.contains(event.target)&&!menu.contains(event.target))close();});
 window.addEventListener("resize",position,{passive:true});
 window.addEventListener("scroll",close,{passive:true});
 menu.addEventListener("keydown",event=>{if(event.key==="Escape"){close();toggle.focus();}});

}
function setupLazyProfileGallery(client,targetId,ownId,userId){
 const tabs=["#profile-tab-photos","#profile-tab-videos","#profile-tab-clips"]
  .map(q).filter(Boolean);
 if(!tabs.length)return;
 let pending=null,ready=false;
 function activate(){
  if(ready||pending)return;
  const selected=tabs.find(tab=>tab.getAttribute("aria-selected")==="true");
  if(!selected)return;
  selected.setAttribute("aria-busy","true");
  pending=window.VATRA_FEATURES.load("profile-gallery").then(gallery=>{
   gallery.mount({client,targetId,ownId,userId,q,node,t,home});
   ready=true;
  }).catch(()=>{
   (window.VATRA_TOAST?.show||((message)=>(window.VATRA_PENDING_TOASTS??=[]).push([message,"error"])))
    (t("Не вдалося завантажити медіагалерею.","Could not load the media gallery."));
  }).finally(()=>{
   pending=null;
   for(const tab of tabs)tab.removeAttribute("aria-busy");
  });
 }
 for(const tab of tabs){
  tab.addEventListener("click",activate);
  new MutationObserver(activate).observe(tab,{attributes:true,attributeFilter:["aria-selected"]});
 }
 activate();
}
function bindProfileStoryComposer(client,ownId){
 const trigger=q("#profile-add-story");
 if(!trigger)return;
 let pending=false;
 async function firstClick(){
  if(pending)return;
  pending=true;trigger.disabled=true;trigger.setAttribute("aria-busy","true");
  try{
   const editor=await window.VATRA_FEATURES.load("story");
   editor.mount({dialog:q("#profile-story-compose-dialog"),trigger,client,id:ownId,
    prefix:"profile-story-compose",onPublished:()=>location.reload()});
   trigger.removeEventListener("click",firstClick);
   trigger.disabled=false;trigger.click();
  }catch(_){
   (window.VATRA_TOAST?.show||((message)=>(window.VATRA_PENDING_TOASTS??=[]).push([message,"error"])))
    (t("Не вдалося відкрити редактор історій.","Could not open story editor."));
  }finally{pending=false;trigger.disabled=false;trigger.removeAttribute("aria-busy");}
 }
 trigger.addEventListener("click",firstClick);
}
function setupLazyProfileAlbums(client,ownId,targetId,userId,isMine){
 const tab=q("#profile-tab-photos"),section=q("#profile-photos-section"),archiveSection=q("#profile-archive-photos-section");
 if(!tab||!section||!archiveSection)return;
 let pending=null;
 function activate(){
  if(section.dataset.vatraAlbumsReady==="true"||pending)return;
  pending=window.VATRA_FEATURES.load("albums").then(albums=>
   albums.mount({client,targetId,ownId,isMine,userId})
  ).catch(()=>{
   (window.VATRA_TOAST?.show||((message)=>(window.VATRA_PENDING_TOASTS??=[]).push([message,"error"])))
    (t("Не вдалося завантажити фотографії.","Could not load photographs."));
  }).finally(()=>{pending=null;tab.removeAttribute("aria-busy");});
  tab.setAttribute("aria-busy","true");
 }
 function onSelection(){
  if(tab.getAttribute("aria-selected")==="true"||(isMine&&!archiveSection.hidden))activate();
 }
 tab.addEventListener("click",onSelection);
 new MutationObserver(onSelection).observe(tab,{attributes:true,attributeFilter:["aria-selected"]});
 if(isMine)new MutationObserver(onSelection).observe(archiveSection,{attributes:true,attributeFilter:["hidden"]});
 const album=new URLSearchParams(location.search).get("album");
 if(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(album||"")))activate();
 else onSelection();
}
function bindPostComposer(client,user,ownId){
 const trigger=q("#profile-write-post");
 const dialog=q("#profile-compose-dialog");
 const form=q("#profile-compose-form");
 const input=q("#profile-compose-text");
 const submit=q("#profile-compose-submit");
 const cancel=q("#profile-compose-cancel");
 const counter=q("#profile-compose-counter");
 const visibility=q("#profile-compose-visibility");
 const status=q("#profile-compose-status");
 if(!trigger||!dialog||!form||!input||!submit||!validId(ownId))return;
 let publishing=false,picker=null,composerUI=null,composerLoading=null;
 const update=()=>{
  const length=input.value.length;
  counter.textContent=length+" / 20000";counter.hidden=length<18000;
  submit.disabled=publishing||(!input.value.trim()&&!picker?.getFiles()?.length&&!composerUI?.getPoll?.())||length>20000||!!composerUI?.hasInvalidPoll?.()||!!composerUI?.hasInvalidSchedule?.();
 };
 const clearStatus=()=>{status.textContent="";status.hidden=true;};
 picker=window.VATRA_POST_MEDIA?.bindGalleryPicker({
  input:"#profile-compose-media",choose:"#profile-compose-media-choose",
  clear:"#profile-compose-media-remove",preview:"#profile-compose-media-preview",
  onError:text=>{status.textContent=text;status.hidden=!text;},
  onChange:()=>{update();composerUI?.sync();}
 });
 const openComposer=async()=>{
  if(dialog.open)return true;
  if(!composerLoading){
   composerLoading=window.VATRA_FEATURES.load("composer").then(module=>{
    composerUI=module.bind({prefix:"profile",ownerId:ownId,client,
     getFile:()=>picker?.getFiles()?.length>0});
   }).catch(error=>{composerLoading=null;throw error;});
  }
  trigger.disabled=true;trigger.setAttribute("aria-busy","true");
  try{
   await composerLoading;
   clearStatus();dialog.showModal();update();composerUI?.open();
   return true;
  }catch(_){
   status.textContent=t("Не вдалося відкрити редактор публікацій.","Could not open post editor.");
   status.hidden=false;
   (window.VATRA_TOAST?.show||((message)=>(window.VATRA_PENDING_TOASTS??=[]).push([message,"error"])))(status.textContent);
   return false;
  }finally{trigger.disabled=false;trigger.removeAttribute("aria-busy");}
 };
 trigger.addEventListener("click",()=>void openComposer());
 cancel.addEventListener("click",()=>{if(!publishing)dialog.close();});
 dialog.addEventListener("cancel",event=>{if(publishing)event.preventDefault();});
 dialog.addEventListener("close",()=>{clearStatus();trigger.focus({preventScroll:true});});
 input.addEventListener("input",update);
 input.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!submit.disabled){
   event.preventDefault();
   form.requestSubmit();
  }
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(publishing)return;
  const body=input.value.trim(),files=picker?.getFiles()||[];
  const poll=composerUI?.getPoll?.()||null;
  const publishAt=composerUI?.getScheduledAt?.()||null;
  if((!body&&!files.length&&!poll)||body.length>20000||
   composerUI?.hasInvalidPoll?.()||composerUI?.hasInvalidSchedule?.()){
   status.textContent=t("Перевірте текст, опитування та дату публікації.",
    "Check the text, poll and scheduled date.");
   status.hidden=false;return;
  }
  publishing=true;
  update();
  clearStatus();
  let uploaded=null,postSaved=false;
  try{
   if(files.length)uploaded=await window.VATRA_POST_MEDIA.uploadGallery(client,ownId,files);
   const payload={
    author_id:user.id,author_vatra_id:ownId,body,
    visibility:["public","friends","only_me"].includes(visibility?.value)?visibility.value:"public",
    media_items:uploaded||[],poll
   };
   if(publishAt)payload.publish_at=publishAt;
   const {error}=await client.from(publishAt?"scheduled_feed_posts":"feed_posts").insert(payload);
   if(error)throw error;
   postSaved=true;
   input.value="";picker?.reset();composerUI?.reset();
   dialog.close();
   if(!publishAt){
    try{await loadPosts(client,ownId,ownId,user.id);}
    catch(_){window.VATRA_TOAST?.show?.(t("Публікацію додано.","Post published."),"success");}
    window.dispatchEvent(new Event("vatra:profile-media-changed"));
   }else{
    (window.VATRA_TOAST?.show||((message)=>(window.VATRA_PENDING_TOASTS??=[]).push([message,"success"])))(
     t("Публікацію заплановано. Вона з’явиться автоматично у вибраний час.",
      "Post scheduled. It will publish automatically at the selected time."),"success");
   }
  }catch(error){
   if(uploaded&&!postSaved)try{await window.VATRA_POST_MEDIA.removeGallery(client,uploaded);}catch(_){}
   if(postSaved){window.VATRA_TOAST?.show?.(t("Публікацію додано.","Post published."),"success");}
   else{
    status.textContent=error?.message||t("Не вдалося опублікувати допис. Повторіть спробу.",
     "Could not publish the post. Please try again.");
    status.hidden=false;
   }
  }finally{publishing=false;update();}
 });
 update();
}



async function setupProfileSocialCards(client,ownId,targetId,isMine){
 const friendsPreview=q("#profile-friends-preview-list");
 const friendsAll=q("#profile-friends-list");
 const giftsPreview=q("#profile-gifts-preview-list");
 const giftsAll=q("#profile-gifts-list");
 const communityList=q("#profile-communities-list");
 if(!friendsPreview||!giftsPreview)return;
 const previewEmpty=(selector,message)=>{
  const el=q(selector);if(el){el.textContent=message;el.hidden=false;}
 };
 const allFriendsButton=q("#profile-friends-all"),findFriendsButton=q("#profile-friends-find");
 const toggleFriendActions=hasFriends=>{
  if(allFriendsButton)allFriendsButton.hidden=isMine&&!hasFriends;
  if(findFriendsButton)findFriendsButton.hidden=!isMine||!!hasFriends;
 };
 toggleFriendActions(true);
 findFriendsButton?.addEventListener("click",()=>{
  const search=q("#feed-search-input");
  if(search){
   search.focus({preventScroll:true});
   search.scrollIntoView({block:"nearest",behavior:"smooth"});
  }else location.assign(new URL("feed",home).href);
 });
 const firstName=value=>String(value||"").trim().split(/\s+/)[0]||t("Учасник","Member");
 const giftInfo=code=>window.VATRA_GIFTS_CATALOG?.byCode(code)||null;
 const loading=(el,layout,count)=>{
  if(!el)return;const skeleton=node("div","vatra-section-skeleton-001 ui-vatra-profile-social-skeleton-001");skeleton.dataset.layout=layout;skeleton.setAttribute("aria-hidden","true");
  for(let i=0;i<count;i++){const item=node("span","vatra-section-skeleton-item-001");item.append(node("span","vatra-skeleton-block vatra-section-skeleton-visual-001"));if(layout!=="tiles")item.append(node("span","vatra-skeleton-block vatra-section-skeleton-line-001"));skeleton.append(item);}el.replaceChildren(skeleton);
 };
 loading(friendsPreview,"friends",4);
 loading(giftsPreview,"tiles",3);
 let cachedFriends=[],cachedGifts=[],communitiesLoaded=false;
 let allFriendsPending=null,allGiftsPending=null;
 function personCard(member,compact){
  const id=String(member.id);
  const link=node("a",compact?"profile-friend-tile vatra-profile-friend-tile-"+id:
   "profile-friend-full vatra-profile-friend-full-"+id);
  link.href=memberUrl(id);link.setAttribute("aria-label",member.name);
  const photo=node("span","profile-friend-portrait vatra-profile-friend-portrait-"+id);
  photo.setAttribute("aria-hidden","true");
  window.VATRA_AVATAR?.fallback(photo,member.state||"default");
  if(member.avatar&&!member.state){
   window.VATRA_AVATAR?.clearFallback(photo);
   photo.style.backgroundImage="url("+JSON.stringify(member.avatar)+")";
   photo.classList.add("has-photo");
  }
  const label=node("span","vatra-profile-friend-name-"+id,compact?firstName(member.name):member.name);
  if(!member.state)void window.VATRA_VERIFIED?.attach(client,label,id);
  link.append(photo,label);return link;
 }
 async function resolveFriendships(friendships){
  const ids=[...new Set(friendships.map(f=>String(f.requester_id)===String(targetId)?
   String(f.recipient_id):String(f.requester_id)).filter(validId))];



  const batches=[];
  for(let i=0;i<ids.length;i+=100)batches.push(ids.slice(i,i+100));
  const [names,photos,statesResult]=await Promise.all([
   Promise.allSettled(batches.map(batch=>window.VATRA_PUBLIC_NAMES?.get(client,batch)||
    client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",batch))),
   Promise.allSettled(batches.map(batch=>window.VATRA_AVATAR?.paths?.(client,batch)||
    client.from("profile_media").select("vatra_id,avatar_path").in("vatra_id",batch))),
   Promise.allSettled(batches.map(batch=>window.VATRA_AVATAR?.states?.(client,batch)||
    Promise.resolve(new Map())))
  ]);
  const friendStates=new Map(),namesMap=new Map(),mediaMap=new Map();
  for(const result of statesResult)if(result.status==="fulfilled")
   for(const [id,state] of result.value||[])friendStates.set(String(id),state);
  for(const result of names)if(result.status==="fulfilled"&&!result.value.error)
   for(const item of result.value.data||[])
    namesMap.set(String(item.vatra_id),String(item.display_name||"").trim());
  for(const result of photos)if(result.status==="fulfilled"&&!result.value.error)
   for(const item of result.value.data||[])
    mediaMap.set(String(item.vatra_id),String(item.avatar_path||""));
  return ids.map(id=>{
   const state=friendStates.get(id)||null,path=mediaMap.get(id);
   let avatar=null;
   if(!state&&path&&path.startsWith(id+"/avatar/")){
    const {data}=client.storage.from("avatars").getPublicUrl(path);
    avatar=data?.publicUrl||null;
   }
   const name=state==="deleted"?t("Акаунт видалено","Account deleted"):
    state==="blocked"?t("Акаунт заблоковано","Account blocked"):
    namesMap.get(id)||t("Користувач VATRA","VATRA user");
   return {id,name,avatar,state};
  });
 }
 const showFriends=async()=>{
  loading(friendsAll,"rows",4);
  try{
   if(!allFriendsPending){
    allFriendsPending=(async()=>{
     const {data,error}=await client.from("friendships")
      .select("requester_id,recipient_id,created_at")
      .eq("status","accepted")
      .or("requester_id.eq."+targetId+",recipient_id.eq."+targetId)
      .order("created_at",{ascending:false}).limit(300);
     if(error)throw error;
     return resolveFriendships(data||[]);
    })().catch(error=>{allFriendsPending=null;throw error;});
   }
   const members=await allFriendsPending;
   friendsAll.replaceChildren();
   if(members.length){
    for(const friend of members)friendsAll.append(personCard(friend,false));
    q("#profile-friends-empty").hidden=true;
   }else previewEmpty("#profile-friends-empty",t("Друзів поки немає.","No friends yet."));
  }catch(_){
   friendsAll.replaceChildren();
   previewEmpty("#profile-friends-empty",t("Друзі тимчасово недоступні.","Friends temporarily unavailable."));
  }
 };
 window.VATRA_PROFILE_SHOW_FRIENDS=showFriends;
 const showGifts=async()=>{
  loading(giftsAll,"tiles",6);
  try{
   if(!allGiftsPending){
    allGiftsPending=(async()=>{
     const {data,error}=await client.from("profile_gifts")
      .select("id,gift_code,created_at").eq("recipient_vatra_id",targetId)
      .order("created_at",{ascending:false}).limit(100);
     if(error)throw error;
     return (data||[]).filter(x=>giftInfo(x.gift_code));
    })().catch(error=>{allGiftsPending=null;throw error;});
   }
   const gifts=await allGiftsPending;
   giftsAll.replaceChildren();
   if(gifts.length){
    for(const gift of gifts)giftsAll.append(giftCard(gift,false));
    q("#profile-gifts-empty").hidden=true;
   }else previewEmpty("#profile-gifts-empty",t("Подарунків поки немає.","No gifts yet."));
  }catch(_){
   giftsAll.replaceChildren();
   previewEmpty("#profile-gifts-empty",t("Подарунки тимчасово недоступні.","Gifts temporarily unavailable."));
  }
 };
 window.VATRA_PROFILE_SHOW_GIFTS=showGifts;
 q("#profile-gifts-dialog-close").addEventListener("click",()=>q("#profile-gifts-dialog").close());
 function giftCard(gift,compact){
  const item=node("button",compact?"profile-gift-tile ui-profile-gift-preview-item-001":
   "profile-gift-full ui-profile-gift-full-item-001");
  const info=giftInfo(gift.gift_code);
  item.type="button";
  item.setAttribute("aria-label",t("Переглянути подарунок: ","View gift: ")+t(info.uk,info.en));
  item.addEventListener("click",async()=>{
    try{
     const viewer=await window.VATRA_FEATURES.load("gift");
     viewer.open(info.code);
    }catch(_){window.VATRA_TOAST?.error(t("Не вдалося відкрити подарунок.","Could not open the gift."));}
   });
  const art=node("span","profile-gift-art ui-profile-gift-art-001");
  art.setAttribute("aria-hidden","true");
  art.style.backgroundImage="url("+JSON.stringify(window.VATRA_GIFTS_CATALOG.fileUrl(info))+")";
  art.addEventListener("dragstart",event=>event.preventDefault());
  art.addEventListener("contextmenu",event=>event.preventDefault());
  const title=node("strong","vatra-profile-gift-name-001",t(info.uk,info.en));
  const sub=node("small","vatra-profile-gift-caption-001",info.exclusive?t(info.eventUk,info.eventEn):t("За приєднання до VATRA","For joining VATRA"));
  item.append(art);if(!compact)item.append(title,sub);return item;
 }
 q("#profile-friends-all")?.addEventListener("click",()=>{
  location.assign(new URL("friends"+(isMine?"":"?member="+targetId),home).href);
 });
 let giftDialogEpoch=0;
 q("#profile-gifts-dialog").addEventListener("close",()=>{giftDialogEpoch++;});
 q("#profile-gifts-all")?.addEventListener("click",()=>{
  const dialog=q("#profile-gifts-dialog"),list=q("#profile-gifts-dialog-list"),more=q("#profile-gifts-dialog-more");
  if(dialog.open)return;const epoch=++giftDialogEpoch;dialog.showModal();let offset=0,busy=false,done=false;
  list.replaceChildren();more.hidden=true;
  async function load(){
   if(busy||done||!dialog.open)return;busy=true;more.disabled=true;
   try{
    const result=await client.from("profile_gifts").select("id,gift_code,created_at",{count:"exact"}).eq("recipient_vatra_id",targetId).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+29);
    if(result.error)throw result.error;if(!dialog.open||epoch!==giftDialogEpoch)return;
    const rows=result.data||[];offset+=rows.length;done=rows.length<30||(Number.isFinite(result.count)&&offset>=result.count);
    q("#profile-gifts-dialog-count").textContent=Number.isFinite(result.count)?String(result.count):"";
    for(const gift of rows){const info=giftInfo(gift.gift_code);if(!info)continue;const row=node("article","ui-profile-gift-dialog-row-001"),date=node("time","vatra-profile-gift-dialog-date-001",dateText(gift.created_at));date.dateTime=gift.created_at;row.append(date,giftCard(gift,false));list.append(row);}
    if(!list.children.length&&done)list.append(node("p","vatra-profile-gift-dialog-empty-001",t("Подарунків поки немає.","No gifts yet.")));
    more.hidden=done;
   }catch(_){if(epoch===giftDialogEpoch&&dialog.open){list.append(node("p","vatra-profile-gift-dialog-empty-001",t("Не вдалося завантажити подарунки.","Could not load gifts.")));more.hidden=false;}}finally{busy=false;if(epoch===giftDialogEpoch)more.disabled=false;}
  }
  more.onclick=()=>void load();void load();
 });
 window.VATRA_PROFILE_SHOW_COMMUNITIES=async()=>{
  if(communitiesLoaded)return;
  communitiesLoaded=true;
  communityList.replaceChildren();
  try{
   const {data:follows,error}=await client.from("community_follows")
    .select("club_id,created_at").eq("member_vatra_id",targetId)
    .order("created_at",{ascending:false}).limit(150);
   if(error)throw error;
   const ids=[...new Set((follows||[]).map(x=>String(x.club_id)).filter(validId))];
   if(ids.length){
    const {data:groups,error:groupError}=await client.from("communities")
     .select("club_id,name,description").in("club_id",ids);
    if(groupError)throw groupError;
    const indexed=new Map((groups||[]).map(x=>[String(x.club_id),x]));
    for(const id of ids){
     const info=indexed.get(id);if(!info)continue;
     const a=node("a","profile-community-link vatra-profile-community-link-"+id);
     a.href=new URL("club"+id,home).href;
     a.append(node("span","profile-community-symbol vatra-profile-community-symbol-"+id,"V"),
      node("span","vatra-profile-community-name-"+id,String(info.name||"").trim()||t("Спільнота","Community")));
     communityList.append(a);
    }
   }
   if(!communityList.children.length)previewEmpty("#profile-communities-empty",t("Підписок поки немає.","No community subscriptions yet."));
  }catch(_){
   communitiesLoaded=false;
   previewEmpty("#profile-communities-empty",t("Не вдалося завантажити спільноти.","Could not load communities."));
  }
 };
 const previewFriends=(async()=>{
  try{
   const result=await client.from("friendships").select("requester_id,recipient_id,created_at").eq("status","accepted").or("requester_id.eq."+targetId+",recipient_id.eq."+targetId).order("created_at",{ascending:false}).limit(4);
   if(result.error)throw result.error;cachedFriends=await resolveFriendships(result.data||[]);
   friendsPreview.replaceChildren();for(const friend of cachedFriends.slice(0,4))friendsPreview.append(personCard(friend,true));toggleFriendActions(cachedFriends.length>0);
   if(!cachedFriends.length)previewEmpty("#profile-friends-preview-empty",t("Друзів поки немає.","No friends yet."));
  }catch(_){friendsPreview.replaceChildren();toggleFriendActions(false);previewEmpty("#profile-friends-preview-empty",t("Друзі тимчасово недоступні.","Friends are temporarily unavailable."));}
 })();
 const previewGifts=(async()=>{
  try{
   const result=await client.from("profile_gifts").select("id,gift_code,created_at").eq("recipient_vatra_id",targetId).order("created_at",{ascending:false}).limit(3);
   if(result.error)throw result.error;cachedGifts=(result.data||[]).filter(x=>giftInfo(x.gift_code));giftsPreview.replaceChildren();
   for(const gift of cachedGifts.slice(0,3))giftsPreview.append(giftCard(gift,true));
   if(!cachedGifts.length)previewEmpty("#profile-gifts-preview-empty",t("Подарунків поки немає.","No gifts yet."));
  }catch(_){giftsPreview.replaceChildren();previewEmpty("#profile-gifts-preview-empty",t("Не вдалося завантажити подарунки.","Could not load gifts."));}
 })();
 await Promise.allSettled([previewFriends,previewGifts]);
}


function setupProfileBlocks(client,ownId,targetId,isMine,blockAccess){
 const button=q("#profile-block-toggle"),moreMenu=q("#profile-more-menu"),direct=q("#profile-unblock-direct");
 if(!button||isMine||!validId(ownId)||!validId(targetId))return;
 if(moreMenu)moreMenu.hidden=false;
 const rawFirst=String(q("#profile-heading")?.textContent||"").trim().split(/\s+/)[0].slice(0,60);
 const accusative=name=>/[аА]$/.test(name)?name.slice(0,-1)+(name.endsWith("А")?"У":"у"):
  /[яЯ]$/.test(name)?name.slice(0,-1)+(name.endsWith("Я")?"Ю":"ю"):name;
 const firstName=rawFirst&&!/^[\d·]+$/.test(rawFirst)?accusative(rawFirst):"";
 button.hidden=false;
 let blocked=!!blockAccess?.blockedByMe,busy=false;
 const paint=()=>{
  const label=blocked?
   (firstName?t("Розблокувати ","Unblock ")+firstName:t("Розблокувати користувача","Unblock member")):
   (firstName?t("Заблокувати ","Block ")+firstName:t("Заблокувати користувача","Block member"));
  const actionLabel=q("#profile-block-action-label");
  if(actionLabel)actionLabel.textContent=label;
  button.dataset.blocked=String(blocked);
  const mark=button.querySelector(".ui-profile-block-member-ban-stroke-001");
  if(mark)mark.setAttribute("d",blocked?"m14.5 16.9 1.8 1.8 3.6-3.6":"m13.9 13.5 6.6 6.6");
  button.setAttribute("aria-label",label);
  button.title=label;
 };
 paint();
 direct?.addEventListener("click",()=>button.click());
 button.addEventListener("click",async()=>{
  if(busy)return;
  if(moreMenu)moreMenu.open=false;
  busy=true;
  const approved=await window.VATRA_PROFILE_CONFIRM(blocked?{
   title:t("Розблокувати користувача?","Unblock this member?"),
   description:t("Блокування з вашого боку буде знято.","Your block on this member will be removed."),
   action:t("Розблокувати","Unblock"),tone:"primary"
  }:{
   title:t("Заблокувати користувача?","Block this member?"),
   description:t("Він бачитиме лише вашу обкладинку, аватар та ім’я. Публікації, історії, інформація профілю й особисті повідомлення будуть недоступні.",
    "They will see only your cover, avatar and name. Posts, stories, profile details and direct messages will be unavailable."),
   action:t("Заблокувати","Block"),tone:"danger"
  });
  if(!approved){busy=false;return;}
  button.disabled=true;if(direct){direct.disabled=true;direct.setAttribute("aria-busy","true");}
  const status=q("#profile-action-status");
  try{
   const operation=blocked?
    client.from("member_blocks").delete()
     .eq("blocker_vatra_id",ownId).eq("blocked_vatra_id",targetId)
     .select("blocked_vatra_id").maybeSingle():
    client.from("member_blocks").insert({
     blocker_vatra_id:Number(ownId),blocked_vatra_id:Number(targetId)
    });
   const {data,error}=await operation;

   if(error||(blocked&&String(data?.blocked_vatra_id)!==String(targetId)))
    throw error||Error("Member was not unblocked");
   location.reload();
  }catch(_){
   if(status){
    status.textContent=t("Не вдалося змінити блокування. Спробуйте ще раз.",
     "Could not update blocking. Please retry.");
    status.hidden=false;
   }
  }finally{busy=false;button.disabled=false;if(direct){direct.disabled=false;direct.removeAttribute("aria-busy");}}
 });
}


function setupProfileReports(client,ownId,targetId,isMine,locked){
 if(isMine)return;
 const more=q("#profile-more-menu");
 if(more){
  more.addEventListener("click",event=>{
   if(event.target.closest("#profile-report-open"))more.open=false;
  });
  document.addEventListener("click",event=>{
   if(more.open&&!more.contains(event.target))more.open=false;
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&more.open){more.open=false;event.preventDefault();}
  });
 }
 const dialog=q("#profile-report-dialog"),open=q("#profile-report-open");
 const back=q("#profile-report-back"),close=q("#profile-report-close");
 const content=q("#profile-report-content"),error=q("#profile-report-error");
 const footer=q("#profile-report-footer"),submit=q("#profile-report-submit");
 if(!dialog||!open)return;
 let step="kind",kind="profile",category="",reason="",sending=false,photoPath=null;
 const base=[
  ["underage","Проблема стосується людини, молодшої за 18 років","A person under 18 is involved"],
  ["harassment","Цькування, переслідування чи жорстоке поводження","Bullying or harassment"],
  ["self_harm","Самогубство чи самоушкодження","Suicide or self-harm"],
  ["hateful","Жорстокий, ненависницький або тривожний контент","Violent, hateful or disturbing content"],
  ["regulated","Продаж або просування товарів з обмеженим доступом","Restricted goods"],
  ["adult","Контент для дорослих","Adult content"],
  ["fraud","Шахрайство або неправдива інформація","Fraud or false information"],
  ["fake","Фальшивий профіль","Fake profile"],
  ["intellectual_property","Інтелектуальна власність","Intellectual property"],
  ["other","Інше","Something else"]
 ];
 const specific={
  underage:[
   ["Погроза поширити мої оголені зображення","Threat to share my intimate images"],
   ["Схоже на сексуальну експлуатацію","Possible sexual exploitation"],
   ["Поширення оголених зображень іншої людини","Sharing someone's intimate images"],
   ["Цькування чи переслідування","Bullying or harassment"],
   ["Фізичне насильство","Physical violence"]],
  harassment:[["Цькування чи переслідування","Bullying or stalking"],["Погрози","Threats"],["Образи або приниження","Abuse or humiliation"]],
  fake:[["Видає себе за мене","Impersonates me"],["Видає себе за іншу людину","Impersonates someone else"],["Підроблена особа або організація","Fake identity or organization"]],
  fraud:[["Шахрайська схема","Scam"],["Оманлива інформація","Misleading information"],["Підозріле посилання","Suspicious link"]]
 };
 const option=(label,action)=>{
  const button=node("button","profile-report-option ui-profile-report-option-001");
  button.type="button";
  button.append(node("span","vatra-profile-report-option-label-001",label),
   node("span","vatra-profile-report-option-arrow-001","›"));
  button.addEventListener("click",action);content.append(button);
 };
 const paragraph=(value,cl="vatra-profile-report-copy-001")=>content.append(node("p",cl,value));
 const heading=value=>content.append(node("h3","vatra-profile-report-prompt-001",value));
 const message=value=>{error.textContent=value;error.hidden=!value;};
 const render=()=>{
  content.replaceChildren();message("");
  back.hidden=step==="kind"||step==="success";
  footer.hidden=step!=="review";
  if(step==="kind"){
   heading(t("На що ви хочете поскаржитися?","What would you like to report?"));
   paragraph(t("Якщо є безпосередня небезпека, зверніться по екстрену допомогу.","If someone is in immediate danger, contact emergency services."));
   option(t("Певна інформація про цей профіль","Something about this profile"),()=>{kind="profile";step="category";render();});
   option(t("Конкретний допис","A specific post"),()=>{kind="post";step="category";render();});
  }else if(step==="category"){
   if(kind==="photo"){
    heading(t("Чому ви скаржитеся на цю фотографію?","Why are you reporting this photo?"));
    for(const [uk,en] of [
     ["Спам","Spam"],["Образи або цькування","Harassment or bullying"],
     ["Насильство чи жорстокість","Violence or gore"],
     ["Відверте зображення","Nudity or sexual content"],
     ["Порушення авторських прав","Copyright infringement"],
     ["Шахрайство чи обман","Scam or fraud"],["Інша причина","Another reason"]
    ])option(t(uk,en),()=>{category="specific_photo";reason=t(uk,en);step="review";render();});
   }else{
    heading(t("Чому ви скаржитеся на цей профіль?","Why are you reporting this profile?"));
    for(const [code,uk,en] of base)option(t(uk,en),()=>{category=kind==="post"?"specific_post":code;reason=t(uk,en);step="reason";render();});
   }
  }else if(step==="reason"){
   heading(t("Який із варіантів найліпше описує проблему?","Which option best describes the issue?"));
   const choices=specific[category]||[
    ["Порушення правил спільноти VATRA","Violates VATRA community rules"],
    ["Небезпечний або неприйнятний контент","Unsafe or inappropriate content"],
    ["Інша проблема","Another problem"]
   ];
   for(const [uk,en] of choices)option(t(uk,en),()=>{reason=t(uk,en);step="review";render();});
  }else if(step==="review"){
   heading(t("Ви збираєтеся надіслати скаргу","You're about to submit a report"));
   paragraph(t("Скарга надходить на перевірку. Надсилання не означає автоматичного видалення контенту.","Your report is reviewed. Submitting does not automatically remove content."));
   const group=node("div","profile-report-review ui-profile-report-review-001");
   const chosen=base.find(x=>x[0]===category);
   group.append(node("small","vatra-profile-report-category-label-001",t("Причина скарги","Report category")),
    node("strong","vatra-profile-report-category-value-001",
     category==="specific_photo"?t("Фотографія профілю","Profile photo"):
     category==="specific_post"?t("Конкретний допис","Specific post"):chosen?t(chosen[1],chosen[2]):reason));
   if(kind==="photo"&&photoPath){
    const preview=node("img","ui-profile-report-photo-preview-001");
    preview.alt=t("Фото, на яке надсилається скарга","Photo being reported");
    preview.src=client.storage.from("avatars").getPublicUrl(photoPath).data?.publicUrl||"";
    group.append(preview);
   }
   group.append(node("small","vatra-profile-report-reason-label-001",t("Уточнення","Details")),
    node("strong","vatra-profile-report-reason-value-001",reason));
   content.append(group);
   const label=node("label","vatra-profile-report-details-label-001",t("Додаткова інформація (необов’язково)","Additional details (optional)"));
   label.setAttribute("for","profile-report-details");
   const input=node("textarea","ui-profile-report-details-001");
   input.id="profile-report-details";input.maxLength=1500;input.rows=4;
   input.placeholder=t("Опишіть, що сталося…","Describe what happened…");
   input.value=dialog.dataset.reportDraft||"";
   input.addEventListener("input",()=>{dialog.dataset.reportDraft=input.value;});
   content.append(label,input);
  }else if(step==="success"){
   heading(t("Дякуємо за скаргу","Thank you for your report"));
   paragraph(t("Скаргу надіслано для перевірки. Дякуємо, що допомагаєте підтримувати безпеку VATRA.","Your report was submitted for review. Thank you for helping keep VATRA safe."));
   const done=node("button","vatra-profile-report-done-001",t("Готово","Done"));
   done.type="button";done.addEventListener("click",()=>dialog.close());content.append(done);
  }
 };
 const launch=(selectedPhoto=null)=>{
  const photo=typeof selectedPhoto==="string"&&
   new RegExp("^"+String(targetId)+"/avatar/[A-Za-z0-9_-]+\\.(?:jpe?g|png|webp)$","i").test(selectedPhoto)?
    selectedPhoto:null;
  photoPath=photo;step=photo?"category":"kind";kind=photo?"photo":"profile";
  category="";reason="";sending=false;dialog.dataset.reportDraft="";
  render();dialog.showModal();close.focus({preventScroll:true});
 };
 open.addEventListener("click",()=>launch());
 window.VATRA_REPORT_PROFILE_PHOTO=path=>{if(!locked)launch(path);};

 close.addEventListener("click",()=>dialog.close());
 back.addEventListener("click",()=>{
  if(kind==="photo"){
   if(step==="category"){dialog.close();return;}
   step="category";
  }else step=step==="review"?"reason":step==="reason"?"category":"kind";
  render();
 });
 submit.addEventListener("click",async()=>{
  if(sending||step!=="review")return;
  sending=true;submit.disabled=true;message("");
  try{
   const {error:insertError}=await client.from("profile_reports").insert({
    target_vatra_id:Number(targetId),category,reason,
    details:String(dialog.dataset.reportDraft||"").trim().slice(0,1500),
    ...(kind==="photo"?{photo_path:photoPath}:{})
   });
   if(insertError){
    if(insertError.code==="23505"){message(t("Ви вже надсилали таку скаргу.","You've already sent this report."));return;}
    throw insertError;
   }
   step="success";render();
  }catch(_){message(t("Не вдалося надіслати скаргу. Спробуйте ще раз.","Could not submit the report. Please retry."));}
  finally{sending=false;submit.disabled=false;}
 });
 dialog.addEventListener("close",()=>{dialog.dataset.reportDraft="";photoPath=null;message("");});
}

function setupProfileInteractions(client,ownId,targetId,isMine){
 const friendButton=q("#profile-friend-button");
 const actionStatus=q("#profile-action-status");
 const friends=q("#profile-friends-list"),friendsEmpty=q("#profile-friends-empty");
 const show=(el,txt)=>{el.textContent=txt;el.hidden=!txt;};
 const makePerson=(id,description)=>{
  const row=node("div","profile-person ui-profile-person-"+id);
  const avatar=node("span","profile-person-avatar vatra-profile-person-avatar-"+id,"V");
  avatar.setAttribute("aria-hidden","true");
  const info=node("div","profile-person-details ui-profile-person-details-"+id);
  const link=node("a","vatra-profile-person-link-"+id,"VATRA ID "+id);
  link.href=memberUrl(id);
  info.append(link,node("small","vatra-profile-person-description-"+id,description));
  row.append(avatar,info);
  return row;
 };
 let loadFriends=async()=>{};
 const tabs=[...document.querySelectorAll("[data-profile-tab]")];
 function choose(name){
  if(!isMine&&["saved","archive-stories","archive-posts","archive-photos"].includes(name))return;

  for(const tab of tabs){
   const active=tab.dataset.profileTab===name;
   tab.classList.toggle("social-profile-tab-active",active);
   tab.setAttribute("aria-selected",String(active));
   tab.tabIndex=active?0:-1;
  }
  for(const panel of document.querySelectorAll("[data-profile-panel]")){
   panel.hidden=panel.dataset.profilePanel!==name;
  }
  if(name==="friends"&&window.VATRA_PROFILE_SHOW_FRIENDS)void window.VATRA_PROFILE_SHOW_FRIENDS();
  else if(name==="friends")void loadFriends();
  if(name==="gifts")void window.VATRA_PROFILE_SHOW_GIFTS?.();
  if(name==="communities")void window.VATRA_PROFILE_SHOW_COMMUNITIES?.();

  window.VATRA_PROFILE_EXTRA_TAB?.(name);
 }
 window.VATRA_PROFILE_CHOOSE_TAB=choose;
 for(const tab of tabs){
  tab.addEventListener("click",()=>choose(tab.dataset.profileTab));
  tab.addEventListener("keydown",e=>{
   if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
   const visible=tabs.filter(x=>!x.hidden);
   const next=visible[(visible.indexOf(tab)+(e.key==="ArrowRight"?1:-1)+visible.length)%visible.length];
   e.preventDefault();next.focus();choose(next.dataset.profileTab);
  });
 }

 if(!validId(ownId))return;

 if(!isMine){
  const friendAction=q("#profile-friend-action"),friendMenu=q("#profile-friend-menu");
  const friendMenuAction=q("#profile-friend-menu-action"),friendMenuLabel=q("#profile-friend-menu-label");
  friendAction.hidden=false;friendButton.hidden=false;
  const moreMenu=q("#profile-more-menu"),morePanel=q("#profile-more-panel");
  const messenger=q("#profile-messenger"),gift=q("#profile-gift"),hideNews=q("#profile-hide-news"),postNotice=q("#profile-post-notice"),storyNotice=q("#profile-story-notice"),removeFriend=q("#profile-remove-friend");
  const unavailable=t("Функція в розробці","Coming soon");
  for(const item of [messenger,gift])if(item){item.title=unavailable;item.addEventListener("click",()=>{if(moreMenu)moreMenu.open=false;window.VATRA_TOAST?.show?.(unavailable,"info");});}
  const first=String(q("#profile-heading")?.textContent||"").trim().split(/\s+/u)[0].slice(0,60);
  const settings=[
   [hideNews,"hide_posts",()=>t("Приховати новини від ","Hide news from ")+first,()=>t("Показувати новини від ","Show news from ")+first],
   [postNotice,"notify_posts",()=>t("Сповіщати про публікації","Notify about posts"),()=>t("Не сповіщати про публікації","Stop post notifications")],
   [storyNotice,"notify_stories",()=>t("Сповіщати про історії","Notify about stories"),()=>t("Не сповіщати про історії","Stop story notifications")]
  ];
  let preferenceRow=null,preferencesBusy=false,preferencesAvailable=false;
  const sameViewer=()=>String(window.VATRA_AUTH_MEMBER_ID||ownId)===String(ownId);
  const paintPreferences=()=>{
   for(const [item,field,off,on] of settings){
    const enabled=preferenceRow?.[field]===true;
    item.querySelector("span").textContent=enabled?on():off();
    item.setAttribute("aria-pressed",String(enabled));
    item.disabled=preferencesBusy;
    item.title=preferencesAvailable?"":unavailable;
   }
  };
  const loadPreferences=async()=>{
   if(preferencesBusy||!sameViewer())return;
   preferencesBusy=true;paintPreferences();
   try{
    const result=await client.from("member_content_preferences").select("hide_posts,notify_posts,notify_stories")
     .eq("viewer_vatra_id",ownId).eq("author_vatra_id",targetId).maybeSingle();
    if(result.error||!sameViewer())return;
    preferenceRow=result.data;preferencesAvailable=true;
   }catch(_){}finally{preferencesBusy=false;paintPreferences();}
  };
  paintPreferences();
  moreMenu?.addEventListener("toggle",()=>{if(moreMenu.open)void loadPreferences();});
  for(const [item,field] of settings)item.addEventListener("click",async()=>{
   if(preferencesBusy||!sameViewer())return;
   if(!preferencesAvailable){window.VATRA_TOAST?.show?.(unavailable,"info");return;}
   const next=preferenceRow?.[field]!==true;
   preferencesBusy=true;paintPreferences();
   const update=()=>client.from("member_content_preferences").update({[field]:next})
    .eq("viewer_vatra_id",ownId).eq("author_vatra_id",targetId)
    .select("hide_posts,notify_posts,notify_stories").maybeSingle();
   try{
    let result=preferenceRow?await update():await client.from("member_content_preferences")
     .insert({viewer_vatra_id:ownId,author_vatra_id:targetId,[field]:next})
     .select("hide_posts,notify_posts,notify_stories").maybeSingle();
    if(result.error?.code==="23505"&&sameViewer())result=await update();
    if(result.error||result.data?.[field]!==next||!sameViewer())throw Error("Preference not saved");
    preferenceRow=result.data;
    window.VATRA_TOAST?.show?.(t("Налаштування збережено","Preference saved"),"success");
   }catch(_){window.VATRA_TOAST?.show?.(t("Не вдалося зберегти налаштування","Could not save preference"),"info");}
   finally{preferencesBusy=false;paintPreferences();}
  });
  if(morePanel&&removeFriend)removeFriend.addEventListener("click",()=>{if(moreMenu)moreMenu.open=false;void changeFriendship();});
  let relation=null,busy=false,friendMenuCloseTimer=null,friendMenuKeyboard=false;
  const friendMenuObserver=new MutationObserver(()=>{if(!friendMenu.hidden&&(!friendButton.isConnected||!friendButton.getClientRects().length||friendButton.disabled))friendMenuOpen(false);});
  const friendPopover=typeof friendMenu.showPopover==="function"&&typeof friendMenu.hidePopover==="function";
  if(friendPopover)friendMenu.setAttribute("popover","manual");
  const positionFriendMenu=()=>{
   if(friendMenu.hidden)return;
   if(!friendButton.isConnected||!friendButton.getClientRects().length||friendButton.disabled){friendMenuOpen(false);return;}
   if(!friendPopover)return;
   const anchor=friendButton.getBoundingClientRect(),viewport=window.visualViewport;
   const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,right=left+(viewport?.width||innerWidth),bottom=top+(viewport?.height||innerHeight);
   const headerBottom=Math.max(top,q(".feed-header")?.getBoundingClientRect().bottom||0);
   if(anchor.bottom<=headerBottom||anchor.top>=bottom){friendMenuOpen(false);return;}
   const width=friendMenu.offsetWidth,height=friendMenu.offsetHeight;
   const x=Math.max(left+8,Math.min(anchor.left,right-width-8));
   const preferred=anchor.bottom+5,above=anchor.top-height-5;
   const y=preferred+height<=bottom-8?preferred:above>=headerBottom+8?above:Math.max(headerBottom+8,Math.min(preferred,bottom-height-8));
   friendMenu.style.setProperty("--friend-menu-left",Math.round(x)+"px");
   friendMenu.style.setProperty("--friend-menu-top",Math.round(y)+"px");
  };
  const friendMenuOpen=state=>{
   clearTimeout(friendMenuCloseTimer);
   friendMenuCloseTimer=null;
   const available=["outgoing","friends"].includes(friendButton.dataset.friendState);
   if(state&&available&&!friendAction.hidden&&friendButton.getClientRects().length&&!friendButton.disabled){
    friendMenu.hidden=false;
    if(friendPopover&&!friendMenu.matches(":popover-open"))friendMenu.showPopover();
    positionFriendMenu();
    if(!friendMenu.hidden){for(let node=friendButton;node;node=node.parentElement)friendMenuObserver.observe(node,{attributes:true,attributeFilter:["hidden","class","style","disabled","open"]});}
   }else{
    friendMenuObserver.disconnect();
    if(friendPopover&&friendMenu.matches(":popover-open"))friendMenu.hidePopover();
    friendMenu.hidden=true;
   }
   friendButton.setAttribute("aria-expanded",String(!friendMenu.hidden));
  };
  window.addEventListener("scroll",positionFriendMenu,{passive:true});
  window.addEventListener("resize",positionFriendMenu,{passive:true});
  window.visualViewport?.addEventListener("resize",positionFriendMenu,{passive:true});
  window.visualViewport?.addEventListener("scroll",positionFriendMenu,{passive:true});
  const scheduleFriendMenuClose=()=>{
   clearTimeout(friendMenuCloseTimer);
   friendMenuCloseTimer=setTimeout(()=>{
    if(!friendAction.matches(":hover")&&!friendMenu.matches(":hover")&&!(friendMenuKeyboard&&friendMenu.contains(document.activeElement)))friendMenuOpen(false);
   },340);
  };
  friendButton.setAttribute("aria-haspopup","menu");
  friendButton.setAttribute("aria-controls","profile-friend-menu");
  friendAction.addEventListener("mouseenter",()=>{friendMenuKeyboard=false;friendMenuOpen(true);});
  friendAction.addEventListener("pointerdown",()=>{friendMenuKeyboard=false;});
  friendAction.addEventListener("keydown",()=>{friendMenuKeyboard=true;});
  window.addEventListener("pagehide",()=>friendMenuOpen(false));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)friendMenuOpen(false);});
  friendAction.addEventListener("mouseleave",scheduleFriendMenuClose);
  friendMenu.addEventListener("mouseenter",()=>friendMenuOpen(true));
  friendMenu.addEventListener("mouseleave",scheduleFriendMenuClose);
  friendButton.addEventListener("keydown",event=>{if(event.key==="ArrowDown"&&friendButton.dataset.friendState==="outgoing"){event.preventDefault();friendMenuOpen(true);if(!friendMenu.hidden)friendMenuAction.focus();}});
  friendAction.addEventListener("focusout",event=>{
   if(!friendAction.contains(event.relatedTarget))scheduleFriendMenuClose();
  });
  document.addEventListener("click",event=>{
   if(!friendAction.contains(event.target))friendMenuOpen(false);
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&!friendMenu.hidden){friendMenuOpen(false);friendButton.focus();}
  });
  const pair="and(requester_id.eq."+ownId+",recipient_id.eq."+targetId+
   "),and(requester_id.eq."+targetId+",recipient_id.eq."+ownId+")";
  const refreshFriend=async()=>{
   const {data,error}=await client.from("friendships")
    .select("id,requester_id,recipient_id,status").or(pair).maybeSingle();
   if(error)throw error;
   relation=data;
   const outgoing=String(relation?.requester_id)===String(ownId);
   friendButton.dataset.friendState=relation?.status==="accepted"?"friends":
    relation?.status==="pending"?(outgoing?"outgoing":"incoming"):"none";
   const state=friendButton.dataset.friendState;
   const accepted=state==="friends";
   friendAction.hidden=accepted;messenger.hidden=false;gift.hidden=!accepted;hideNews.hidden=!accepted;removeFriend.hidden=!accepted;postNotice.hidden=false;storyNotice.hidden=false;
   messenger.classList.toggle("is-friend",accepted);
   messenger.querySelector("span").hidden=!accepted;
   q("#profile-friend-label").textContent=state==="friends"?t("У друзях","Friends"):
    state==="outgoing"?t("Заявку надіслано","Request sent"):
    state==="incoming"?t("Прийняти заявку","Accept request"):t("Долучити до друзів","Add friend");
   friendMenuLabel.textContent=state==="friends"?t("Видалити з друзів","Remove friend"):
    t("Скасувати заявку","Cancel request");
   friendButton.setAttribute("aria-label",q("#profile-friend-label").textContent);
   friendButton.dataset.friendBusy="false";friendButton.disabled=false;
   friendMenuOpen(false);
  };
  friendButton.disabled=true;
  q("#profile-friend-label").textContent=t("Долучити до друзів","Add friend");
  void refreshFriend().catch(()=>show(actionStatus,t("Статус дружби недоступний.","Friendship status unavailable.")));
  const changeFriendship=async()=>{
    if(busy)return;
    friendMenuOpen(false);

   busy=true;friendButton.disabled=true;show(actionStatus,"");
   try{
    const result=!relation?
     await client.from("friendships").insert({requester_id:ownId,recipient_id:targetId})
      .select("id").maybeSingle():
     relation.status==="pending"&&String(relation.recipient_id)===String(ownId)?
      await client.from("friendships").update({status:"accepted"}).eq("id",relation.id)
       .eq("recipient_id",ownId).eq("status","pending").select("id").maybeSingle():
      await client.from("friendships").delete().eq("id",relation.id)
       .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
       .select("id").maybeSingle();

    if(result.error||!result.data?.id||
     (relation&&String(result.data.id)!==String(relation.id)))
     throw result.error||Error("Friendship was not changed");
    try{
     await refreshFriend();
     show(actionStatus,t("Статус дружби оновлено.","Friendship updated."));
    }catch(_){
     show(actionStatus,t("Дію виконано, але статус не оновився. Оновіть сторінку.",
      "Action completed, but status could not refresh. Reload the page."));
    }
   }catch(_){show(actionStatus,t("Не вдалося виконати дію.","Could not complete the action."));}
   finally{busy=false;friendButton.disabled=false;}
  };
  friendButton.addEventListener("click",()=>{
   if(["outgoing","friends"].includes(friendButton.dataset.friendState)){
    friendMenuOpen(friendMenu.hidden);return;
   }
   void changeFriendship();
  });
  friendMenuAction.addEventListener("click",()=>void changeFriendship());
 }
 loadFriends=async()=>{
  friends.replaceChildren();friendsEmpty.hidden=true;
  if(!isMine){
   location.assign(new URL("friends?member="+targetId,home).href);
   return;
  }
  try{
   const {data,error}=await client.from("friendships")
    .select("id,requester_id,recipient_id,status,created_at")
    .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
    .order("created_at",{ascending:false}).limit(100);
   if(error)throw error;
   for(const item of data||[]){
    const incoming=String(item.recipient_id)===String(ownId);
    const other=String(incoming?item.requester_id:item.recipient_id);
    const status=item.status==="accepted"?t("У друзях","Friends"):
     incoming?t("Вхідна заявка","Incoming request"):t("Вихідна заявка","Outgoing request");
    const row=makePerson(other,status);
    const action=node("button","profile-person-action vatra-profile-friend-action-"+other,
     item.status==="pending"&&incoming?t("Прийняти","Accept"):
     item.status==="accepted"?t("Видалити","Remove"):t("Скасувати","Cancel"));
    action.type="button";
    action.addEventListener("click",async()=>{
     action.disabled=true;
     try{
      const accepting=item.status==="pending"&&incoming;
      const {data:changed,error:changeError}=await (accepting?
       client.from("friendships").update({status:"accepted"}).eq("id",item.id)
        .eq("recipient_id",ownId).eq("status","pending").select("id").maybeSingle():
       client.from("friendships").delete().eq("id",item.id)
        .or("requester_id.eq."+ownId+",recipient_id.eq."+ownId)
        .select("id").maybeSingle());
      if(changeError||String(changed?.id)!==String(item.id))
       throw changeError||Error("Friendship was not changed");

      try{await loadFriends();}
      catch(_){show(friendsEmpty,t("Дію виконано, але список не оновився. Оновіть сторінку.",
       "Action completed, but the list did not refresh. Reload the page."));}
     }catch(_){action.disabled=false;show(friendsEmpty,t("Не вдалося оновити друзів.","Could not update friends."));}
    });
    row.append(action);friends.append(row);
   }
   if(!data?.length)show(friendsEmpty,t("Друзів і заявок поки немає.","No friends or requests yet."));
  }catch(_){show(friendsEmpty,t("Не вдалося завантажити друзів.","Could not load friends."));}
 };
}


const PROFILE_STATUS_LIMIT=50;
 function setupProfileEdit(client,targetId,isMine,initialStatus,signupGender){
 const displayed=q("#profile-status"),statusText=q("#profile-status-text");
 let saved=String(initialStatus||"");
 const render=()=>{
  statusText.textContent=saved?(saved.length>PROFILE_STATUS_LIMIT?saved.slice(0,PROFILE_STATUS_LIMIT-1).replace(/[\uD800-\uDBFF]$/,"")+"…":saved):(isMine?t("Додайте статус","Add a status"):"");
  displayed.hidden=!saved&&!isMine;
  displayed.disabled=!isMine;
  displayed.classList.toggle("is-editable",isMine);
  if(isMine)displayed.setAttribute("aria-label",t("Змінити статус","Edit status"));
 };
 render();
 if(!isMine)return;
 const dialog=q("#profile-status-dialog"),input=q("#profile-status-input"),
  count=q("#profile-status-counter"),save=q("#profile-status-save"),note=q("#profile-status-error");
 input.placeholder=t("Напишіть статус","Write a status");
 input.maxLength=PROFILE_STATUS_LIMIT;
  const counter=()=>{count.textContent=input.value.length+" / "+PROFILE_STATUS_LIMIT;};
 const openStatus=()=>{input.value=saved;counter();note.hidden=true;dialog.showModal();input.focus();};
 displayed.addEventListener("click",openStatus);
 input.addEventListener("input",counter);
 q("#profile-status-cancel").addEventListener("click",()=>dialog.close());
 q("#profile-status-form").addEventListener("submit",async event=>{
  event.preventDefault();if(save.disabled)return;
  const next=input.value.trim();
  if(next.length>PROFILE_STATUS_LIMIT){note.textContent=t("Статус надто довгий.","Status is too long.");note.hidden=false;return;}
  save.disabled=true;note.hidden=true;
  try{
   const {data,error}=await client.from("public_profiles")
    .update({status_text:next||null}).eq("vatra_id",targetId).select("status_text").maybeSingle();
   if(error||!data)throw error||new Error("Not persisted");
   saved=String(data.status_text||"");render();dialog.close();
  }catch(_){note.textContent=t("Статус не збережено. Спробуйте ще раз.","Could not save status. Retry.");note.hidden=false;}
  finally{save.disabled=false;}
 });
 const edit=q("#profile-edit-open");
 edit.hidden=false;
 edit.addEventListener("click",()=>window.VATRA_PROFILE_DETAILS?.open());
}
function setupProfilePresence(client,targetId,ownId,signupGender){
 const caption=q("#profile-last-seen");
 if(!caption||!window.VATRA_PRESENCE)return;
 if(String(targetId)===String(ownId)){
  caption.textContent=t("У мережі","Online");
  window.VATRA_PRESENCE.appendDevice(caption,window.VATRA_PRESENCE.deviceType(),english);
  caption.hidden=false;caption.dataset.online="true";caption.removeAttribute("title");
  return;
 }
 const refresh=async()=>{
  try{

   const record=await window.VATRA_PRESENCE.load(client,targetId);
   const state=window.VATRA_PRESENCE.format(record,english);
   caption.textContent=state.online?t("У мережі","Online"):state.text||t("Статус мережі невідомий","Online status unavailable");
   if(state.date)window.VATRA_PRESENCE.appendDevice(caption,record?.device_type,english);
   caption.hidden=false;caption.dataset.online=String(state.online);
   caption.removeAttribute("title");
  }catch(_){caption.textContent=t("Статус мережі невідомий","Online status unavailable");caption.dataset.online="false";caption.removeAttribute("title");}
 };
 void refresh();

 const timer=setInterval(()=>{if(!document.hidden)void refresh();},30000);
 const onVisible=()=>{if(!document.hidden)void refresh();};document.addEventListener("visibilitychange",onVisible);
 window.addEventListener("pagehide",()=>{clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);},{once:true});
}


function createAvatarGalleryLoader(read,now=Date.now){
 let cached=null,pending=null,epoch=0;
 const invalidate=()=>{epoch++;cached=null;pending=null;};
 const get=(fresh=false)=>{
  if(!fresh&&cached&&now()<cached.expires)return Promise.resolve([...cached.paths]);
  if(!fresh&&pending)return pending.then(paths=>[...paths]);
  if(fresh)invalidate();
  const version=epoch;
  let request;
  request=Promise.resolve().then(read).then(paths=>{
   if(epoch!==version)throw Error("Avatar gallery changed");
   cached={paths:[...paths],expires:now()+15000};
   return paths;
  }).finally(()=>{if(pending===request)pending=null;});
  pending=request;
  return request.then(paths=>[...paths]);
 };
 return {get,invalidate};
}
async function setupProfileMedia(client,ownId,targetId,isMine,userId,ownerEmail,locked=false,preloadedMedia=null){
 const cover=q("#profile-cover-image"),coverPhoto=q("#profile-cover-photo"),systemCover=q("#profile-cover-system"),avatar=q("#profile-avatar");
 const fileAvatar=q("#profile-avatar-file"),fileCover=q("#profile-cover-file");
 const avatarWrap=q("#profile-avatar-wrap"),avatarTrigger=q("#profile-avatar-trigger");
 const avatarMenu=q("#profile-avatar-menu"),storyButton=q("#profile-avatar-story");
 const deleteStoryButton=q("#profile-avatar-story-delete"),coverView=q("#profile-cover-view");
 const canEdit=isMine&&!locked&&validId(ownId),plus=q("#profile-avatar-plus"),coverChange=q("#profile-cover-change"),changePhoto=q("#profile-avatar-change"),removePhoto=q("#profile-avatar-remove"),addStory=q("#profile-add-story");
 avatarWrap.classList.toggle("is-owner-avatar",canEdit);plus.hidden=!canEdit;coverChange.hidden=!canEdit;
 const mediaDialog=q("#profile-media-viewer"),mediaImage=q("#profile-media-viewer-image");
 const mediaHeading=q("#profile-media-viewer-heading"),storyDialog=q("#profile-story-viewer");
 const storyHeading=q("#profile-story-viewer-heading"),storyBody=q("#profile-story-viewer-text");
 const storyMedia=q("#profile-story-viewer-media"),storyViewerDelete=q("#profile-story-viewer-delete");
 const bucketFor=kind=>kind==="avatar"?"avatars":"covers";
 let saved=null,activeStory=null;
 const photoURLs={avatar:null,cover:null};
 const visitorStory=q("#profile-visitor-story");
 const prevPhoto=q("#profile-avatar-prev"),nextPhoto=q("#profile-avatar-next"),galleryToolbar=q("#profile-avatar-gallery-toolbar"),galleryCount=q("#profile-avatar-gallery-count"),galleryDelete=q("#profile-avatar-gallery-delete");
 let gallery=[],galleryIndex=0,galleryEpoch=0,menuTimer=null,pendingAvatarUndo=null,avatarDeleteInProgress=false,uploading=false;
 const deletedNotice=q("#profile-photo-deleted-notice");
 const deletedMessage=q("#profile-photo-deleted-message");
 const restoreAvatarButton=q("#profile-photo-restore");
 const discardAvatarUndo=()=>{
  const backup=pendingAvatarUndo;if(!backup)return;
  pendingAvatarUndo=null;
  if(backup.previewUrl)URL.revokeObjectURL(backup.previewUrl);

  void client.from("avatar_photo_tags").delete().eq("owner_vatra_id",ownId)
   .eq("avatar_path",backup.path).then(()=>{}).catch(()=>{});
 };
 const hideAvatarUndo=()=>{
  deletedNotice.hidden=true;mediaDialog.classList.remove("is-photo-deleted");
 };
 const galleryDates=new Map();
 const photoContent=q("#profile-photo-content"),photoCanvas=q("#profile-photo-canvas");
 const photoFooter=q("#profile-photo-footer"),footerShare=q("#profile-photo-footer-share");
 const footerMore=q("#profile-photo-footer-more");
 const footerReport=q("#profile-photo-report");
 const footerMenu=q("#profile-photo-footer-menu"),originalLink=q("#profile-photo-original");
 const setCurrent=q("#profile-photo-set-current"),tagMarkers=q("#profile-photo-tag-markers");
 const tagPicker=q("#profile-photo-tag-picker"),tagSearch=q("#profile-photo-tag-search");
 const tagResults=q("#profile-photo-tag-results"),tagCancel=q("#profile-photo-tag-cancel"),tagStatus=q("#profile-photo-tag-status");
 let tagMode=false,tagPosition=null,tagEpoch=0,searchEpoch=0,searchTimer=null;
 const reportTag=message=>{tagStatus.textContent=message||"";tagStatus.hidden=!message;};
 const closeMore=()=>{footerMenu.classList.remove("is-open");footerMore.setAttribute("aria-expanded","false");};
 const closeTagPicker=()=>{tagPicker.hidden=true;tagPosition=null;tagSearch.value="";tagResults.replaceChildren();searchEpoch++;};
 const resetTagMode=()=>{tagMode=false;photoCanvas.classList.remove("is-tagging");closeTagPicker();};
 const fitPhoto=()=>{
  if(!mediaImage.complete||!mediaImage.naturalWidth||!mediaImage.naturalHeight)return;
  const style=getComputedStyle(photoContent);
  const roomW=photoContent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const roomH=photoContent.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  if(roomW<=0||roomH<=0)return;
  const avatarPhoto=["avatar","avatar-history"].includes(mediaDialog.dataset.kind);


  const scale=Math.min(roomW/mediaImage.naturalWidth,roomH/mediaImage.naturalHeight);
  photoCanvas.style.width=Math.max(1,Math.floor(mediaImage.naturalWidth*scale))+"px";
  photoCanvas.style.height=Math.max(1,Math.floor(mediaImage.naturalHeight*scale))+"px";
 };
 mediaImage.addEventListener("load",fitPhoto);
 const photoResizeObserver=typeof ResizeObserver==="function"?new ResizeObserver(fitPhoto):null;
 photoResizeObserver?.observe(photoContent);
 window.addEventListener("resize",fitPhoto,{passive:true});
 footerMore.addEventListener("click",()=>{const open=!footerMenu.classList.contains("is-open");closeMore();footerMenu.classList.toggle("is-open",open);footerMore.setAttribute("aria-expanded",String(open));});
 mediaDialog.addEventListener("click",event=>{if(!event.target.closest?.(".ui-profile-photo-more-wrap-001"))closeMore();});
 footerShare.addEventListener("click",()=>{closeMore();q("#profile-photo-share").click();});
 originalLink.addEventListener("click",closeMore);
 footerReport.addEventListener("click",()=>{
  closeMore();
  if(isMine||locked||!mediaDialog.open)return;
  const selected=gallery[galleryIndex];
  if(selected)window.VATRA_REPORT_PROFILE_PHOTO?.(selected);
 });
 document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeMore();closeTagPicker();}});

 window.VATRA_AVATAR?.fallback(avatar,"default");
 avatarWrap.dataset.vatraSystemAvatar="true";
 avatarWrap.dataset.vatraRingKind="default";
 const canViewPhoto=!locked;
 window.VATRA_CAN_VIEW_PROFILE_AVATAR=canViewPhoto;
 const status=(text,error=false)=>{
  if(!text)return;
  const kind=error?"error":"success";
  if(window.VATRA_TOAST?.show)window.VATRA_TOAST.show(text,kind);
  else (window.VATRA_PENDING_TOASTS??=[]).push([text,kind]);
 };
 const getPublicPath=(path,kind)=>{
  if(typeof path!=="string"||!path.startsWith(targetId+"/"))return null;
  try{
   const result=client.storage.from(bucketFor(kind)).getPublicUrl(path);
   const url=result?.data?.publicUrl;
   if(!url)return null;
   const parsed=new URL(url);
   if(parsed.protocol!=="https:"||parsed.hostname!=="cxrcycxrlkufozomsxcs.supabase.co")return null;
   return url;
  }catch(_){return null;}
 };
 const setImage=(el,url)=>{
  window.VATRA_AVATAR?.clearFallback(el);
  el.style.backgroundImage="url("+JSON.stringify(url)+")";
  el.classList.add("has-photo");
 };
 const resetImage=el=>{
  el.classList.remove("has-photo");el.style.removeProperty("background-image");
 };
 const validPhoto=url=>new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(true);
  image.onerror=()=>resolve(false);
  image.src=url;
 });
 const viewportMenu=typeof avatarMenu.showPopover==="function"&&typeof avatarMenu.hidePopover==="function";
 if(viewportMenu){avatarMenu.setAttribute("popover","manual");avatarMenu.classList.add("is-viewport-menu");}
 const closeAvatarMenu=()=>{clearTimeout(menuTimer);avatarWrap.classList.remove("is-menu-open");if(viewportMenu&&avatarMenu.matches(":popover-open"))avatarMenu.hidePopover();avatarTrigger.setAttribute("aria-expanded","false");plus.setAttribute("aria-expanded","false");};
 const positionAvatarMenu=()=>{
  if(avatarMenu.hidden)return;
  const anchor=(canEdit?plus:avatarTrigger).getBoundingClientRect(),wrap=avatarWrap.getBoundingClientRect();
  const viewport=window.visualViewport,left=viewport?.offsetLeft||0,viewportTop=viewport?.offsetTop||0,right=left+(viewport?.width||innerWidth),bottom=viewportTop+(viewport?.height||innerHeight);
  const top=Math.max(viewportTop,document.querySelector(".feed-header")?.getBoundingClientRect().bottom||0);
  if(anchor.bottom<=top||anchor.top>=bottom){closeAvatarMenu();return false;}
  const w=avatarMenu.offsetWidth,h=Math.max(avatarMenu.scrollHeight+2,avatarMenu.offsetHeight),gap=7,padding=10;
  const above=anchor.top-top-padding,below=bottom-anchor.bottom-padding;
  const upwards=below<h+gap&&above>below;
  const room=Math.max(44,(upwards?above:below)-gap);
  avatarMenu.style.setProperty("--avatar-menu-max-height",Math.floor(room)+"px");
  const height=Math.min(h,room);
  const x=Math.max(left+padding,Math.min(wrap.left,right-padding-w));
  const y=Math.max(top+padding,Math.min(upwards?anchor.top-gap-height:anchor.bottom+gap,bottom-padding-height));
  avatarMenu.style.setProperty("--avatar-menu-left",Math.round(viewportMenu?x:x-wrap.left)+"px");
  avatarMenu.style.setProperty("--avatar-menu-top",Math.round(viewportMenu?y:y-wrap.top)+"px");
  return true;
 };
 const showAvatarMenu=()=>{clearTimeout(menuTimer);if(avatarMenu.hidden)return;if(viewportMenu&&!avatarMenu.matches(":popover-open"))avatarMenu.showPopover();if(positionAvatarMenu()===false)return;avatarWrap.classList.add("is-menu-open");plus.setAttribute("aria-expanded","true");if(!canEdit)avatarTrigger.setAttribute("aria-expanded","true");};
 const repositionAvatarMenu=()=>{if(avatarWrap.classList.contains("is-menu-open"))positionAvatarMenu();};
 window.addEventListener("resize",repositionAvatarMenu,{passive:true});window.addEventListener("scroll",repositionAvatarMenu,{passive:true});window.visualViewport?.addEventListener("resize",repositionAvatarMenu,{passive:true});
 const scheduleMenuClose=()=>{clearTimeout(menuTimer);menuTimer=setTimeout(()=>{if(!avatarMenu.contains(document.activeElement))closeAvatarMenu();},160);};
 const syncAvatarMenu=()=>{
  const hasPhoto=!!photoURLs.avatar,hasStory=!!activeStory;
  avatarWrap.classList.toggle("has-active-story",hasStory);
  avatarMenu.hidden=!canViewPhoto||!canEdit;if(avatarMenu.hidden)closeAvatarMenu();
  visitorStory.hidden=!canViewPhoto||canEdit||!hasStory||!hasPhoto;
  storyButton.hidden=!canViewPhoto||!hasStory;
  deleteStoryButton.hidden=!hasStory||!isMine||!activeStory?.id;
  addStory.hidden=!canEdit;changePhoto.hidden=!canEdit;removePhoto.hidden=!canEdit||!hasPhoto;
  const changeLabel=changePhoto.querySelector("span");changeLabel.textContent=hasPhoto?t("Змінити фото","Change photo"):t("Завантажити фото","Upload photo");
  avatarTrigger.disabled=!canViewPhoto||(!hasPhoto&&!hasStory&&!canEdit);
  avatarTrigger.setAttribute("aria-haspopup",hasPhoto||hasStory?"dialog":"menu");
  avatarTrigger.setAttribute("aria-label",hasPhoto?t("Відкрити фото профілю","Open profile photo"):hasStory?t("Переглянути історію","View story"):t("Дії з фото профілю","Profile photo actions"));
  if(!canEdit&&!hasPhoto&&!hasStory)closeAvatarMenu();
 };

 const interaction=q("#profile-avatar-engagement"),likesButton=q("#profile-photo-like");
 const likesCount=q("#profile-photo-like-count"),commentList=q("#profile-photo-comments");
 const commentForm=q("#profile-photo-comment-form"),commentInput=q("#profile-photo-comment-text");
 const commentSend=q("#profile-photo-comment-send"),commentStatus=q("#profile-photo-status");
 const shareButton=q("#profile-photo-share");
 const photoCommentSentinel=q("#profile-photo-comments-sentinel"),photoCommentSort="newest";
 let likeBusy=false,commentBusy=false,activityTicket=0,photoCommentOffset=0,photoCommentLoading=false,photoCommentHasMore=false;
 let lastAvatarCommentKey="";
 const photoPath=()=>["avatar","avatar-history"].includes(mediaDialog.dataset.kind)?gallery[galleryIndex]||null:null;
 const tagFailure=(error,fallback,retry)=>{
  if(!window.VATRA_SERVICE_NOTICE?.report(error,{retry}))reportTag(fallback);
 };
 const loadTags=async()=>{
  const selected=photoPath(),ticket=++tagEpoch;
  tagMarkers.replaceChildren();
  if(!selected)return;
  const {data,error}=await client.from("avatar_photo_tags")
   .select("id,tagged_vatra_id,x_pct,y_pct").eq("owner_vatra_id",targetId)
   .eq("avatar_path",selected).order("created_at",{ascending:true});
  if(ticket!==tagEpoch||selected!==photoPath())return;
  if(error){tagFailure(error,t("Не вдалося завантажити позначки.","Could not load tags."),loadTags);return;}
  if(!data?.length)return;
  const ids=[...new Set(data.map(item=>item.tagged_vatra_id))];
  const result=await client.from("public_profiles").select("vatra_id,display_name").in("vatra_id",ids);
  if(ticket!==tagEpoch||selected!==photoPath())return;
  const names=new Map((result.data||[]).map(item=>[String(item.vatra_id),item.display_name]));
  for(const tag of data){
   const id=String(tag.tagged_vatra_id),label=names.get(id)||"VATRA ID "+id;
   const wrapper=document.createElement("div");wrapper.className="ui-profile-photo-tag-group-001";
   wrapper.style.left=Number(tag.x_pct)+"%";wrapper.style.top=Number(tag.y_pct)+"%";
   const anchor=document.createElement("a");anchor.className="vatra-profile-photo-tag-marker-001";
   anchor.href=memberUrl(id);anchor.setAttribute("aria-label",t("Перейти до профілю: ","View profile: ")+label);
   anchor.textContent="•";
   const tooltip=document.createElement("span");tooltip.className="vatra-profile-photo-tag-name-001";tooltip.textContent=label;
   anchor.append(tooltip);wrapper.append(anchor);
   if(canEdit||id===String(ownId)){
    const remove=document.createElement("button");remove.className="vatra-profile-photo-tag-remove-001";
    remove.type="button";remove.textContent="×";
    remove.setAttribute("aria-label",t("Прибрати позначку: ","Remove tag: ")+label);
    remove.addEventListener("click",async()=>{
     remove.disabled=true;
     const {error:deleteError}=await client.from("avatar_photo_tags").delete().eq("id",tag.id);
     if(deleteError){remove.disabled=false;tagFailure(deleteError,t("Не вдалося прибрати позначку.","Could not remove tag."),loadTags);}
     else void loadTags();
    });
    wrapper.append(remove);
   }
   tagMarkers.append(wrapper);
  }
 };
 let searchTimerId=0;
 const searchPeople=async()=>{
  const term=tagSearch.value.trim().replace(/[%_\\]/g,"").slice(0,50),ticket=++searchEpoch;
  tagResults.replaceChildren();
  if(term.length<2){
   const hint=document.createElement("p");hint.className="vatra-profile-photo-tag-message-001";
   hint.textContent=t("Введіть щонайменше 2 символи.","Enter at least 2 characters.");
   tagResults.append(hint);return;
  }
  const {data,error}=await client.from("public_profiles").select("vatra_id,display_name")
   .ilike("display_name","%"+term+"%").limit(8);
  if(ticket!==searchEpoch||tagPicker.hidden)return;
  if(error){tagFailure(error,t("Пошук недоступний.","Search unavailable."),searchPeople);return;}
  if(!data?.length){
   const hint=document.createElement("p");hint.className="vatra-profile-photo-tag-message-001";
   hint.textContent=t("Нікого не знайдено.","No members found.");tagResults.append(hint);return;
  }
  for(const member of data){
   const button=document.createElement("button");button.type="button";
   button.className="vatra-profile-photo-tag-result-001";button.setAttribute("role","option");
   button.textContent=String(member.display_name||"VATRA")+" · VATRA ID "+member.vatra_id;
   button.addEventListener("click",async()=>{
    const selected=photoPath(),point=tagPosition;
    if(!selected||!point||!canEdit)return;
    button.disabled=true;
    const {error:insertError}=await client.from("avatar_photo_tags").insert({
     owner_vatra_id:Number(targetId),avatar_path:selected,tagged_vatra_id:Number(member.vatra_id),
     x_pct:point.x,y_pct:point.y,created_by:userId
    });
    if(insertError){button.disabled=false;tagFailure(insertError,t("Не вдалося позначити людину або вона вже позначена.","Could not tag this member or they are already tagged."),loadTags);return;}
    closeTagPicker();resetTagMode();reportTag("");void loadTags();
   });
   tagResults.append(button);
  }
 };
 photoCanvas.addEventListener("click",event=>{
  if(!canEdit||!tagMode||event.target!==mediaImage||!photoPath())return;
  const rect=mediaImage.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  tagPosition={x:Math.max(0,Math.min(100,Math.round((event.clientX-rect.left)/rect.width*10000)/100)),
   y:Math.max(0,Math.min(100,Math.round((event.clientY-rect.top)/rect.height*10000)/100))};
  tagPicker.hidden=false;tagSearch.value="";tagResults.replaceChildren();
  reportTag("");tagSearch.focus();void searchPeople();
 });
 tagSearch.addEventListener("input",()=>{
  clearTimeout(searchTimerId);searchTimerId=setTimeout(searchPeople,240);
 });
 tagCancel.addEventListener("click",closeTagPicker);
 setCurrent.addEventListener("click",async()=>{
  if(!canEdit||!photoPath()||photoPath()===saved?.avatar_path)return;
  const path=photoPath();closeMore();setCurrent.disabled=true;
  const result=await client.from("profile_media")
   .update({avatar_path:path,updated_at:new Date().toISOString()})
   .eq("vatra_id",ownId).select("avatar_path").maybeSingle();
  setCurrent.disabled=false;
  if(result.error||result.data?.avatar_path!==path){
   tagFailure(result.error||{status:500},t("Не вдалося змінити фото профілю.","Could not update profile photo."),()=>setCurrent.click());
   return;
  }
  saved={...saved,avatar_path:path};
  window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
  window.VATRA_AVATAR?.fromPath?.(client,ownerEmail,ownId,path);
  await display(saved);renderGalleryPhoto();
  status(t("Фотографію профілю оновлено.","Profile photo updated."));
 });

 const feedback=(value,bad=false)=>{
  commentStatus.hidden=!value;commentStatus.textContent=value;commentStatus.dataset.kind=bad?"error":"ok";
 };
 photoCommentSentinel.hidden=true;

 const avatarCommentPages=new Map(),AVATAR_COMMENT_TTL=12_000,AVATAR_COMMENT_MAX=12;
 client.auth?.onAuthStateChange?.(event=>{
  if(event!=="INITIAL_SESSION"&&event!=="TOKEN_REFRESHED")avatarCommentPages.clear();
 });
 const avatarCommentPage=async(path,sort,offset)=>{
  const key=JSON.stringify([path,sort,offset]),entry=avatarCommentPages.get(key);
  if(entry?.pending)return entry.pending;
  if(entry&&entry.expires>Date.now()){
   avatarCommentPages.delete(key);avatarCommentPages.set(key,entry);
   return entry.rows.map(row=>({...row}));
  }
  avatarCommentPages.delete(key);
  const pending=(async()=>{
   const {data,error}=await client.rpc("vatra_avatar_comment_page",{
    p_owner:Number(targetId),p_avatar_path:path,p_sort:sort,
    p_offset:offset,p_limit:12
   });
   if(error)throw error;
   return Array.isArray(data)?data:[];
  })();
  avatarCommentPages.set(key,{pending,expires:0});
  while(avatarCommentPages.size>AVATAR_COMMENT_MAX)
   avatarCommentPages.delete(avatarCommentPages.keys().next().value);
  try{
   const rows=await pending;
   if(avatarCommentPages.get(key)?.pending===pending)
    avatarCommentPages.set(key,{rows:rows.map(row=>({...row})),expires:Date.now()+AVATAR_COMMENT_TTL});
   return rows.map(row=>({...row}));
  }catch(error){
   if(avatarCommentPages.get(key)?.pending===pending)avatarCommentPages.delete(key);
   throw error;
  }
 };
 const linkedPhotoSearch=new URLSearchParams(location.search);
 const linkedAvatarComment=linkedPhotoSearch.get("photo")==="avatar"?
  linkedPhotoSearch.get("comment"):null;
 const linkedAvatarImage=linkedPhotoSearch.get("image");
 let linkedAvatarFocused=false;
 async function focusLinkedAvatarComment(path,ticket){
  const id=linkedAvatarComment;
  if(linkedAvatarFocused||!id||!/^[a-f0-9-]{36}$/i.test(id)||
   (linkedAvatarImage&&!path.endsWith("/"+linkedAvatarImage)))return;
  try{
   let selected=[...commentList.querySelectorAll("[data-comment-id]")]
    .find(item=>item.dataset.commentId===id);
   if(!selected){
    const {data,error}=await client.from("avatar_comments")
     .select("id,owner_vatra_id,author_vatra_id,author_id,avatar_path,body,moderation_status,created_at")
     .eq("id",id).eq("owner_vatra_id",targetId).eq("avatar_path",path)
     .maybeSingle();
    if(error||!data||ticket!==activityTicket||path!==photoPath())return;
    const {names,images}=await window.VATRA_POST_INTERACTIONS?.authorMap(client,[data])
     ||{names:new Map(),images:new Map()};
    const reaction=await client.from("avatar_comment_likes").select("comment_id")
     .eq("comment_id",id).eq("liker_id",userId).maybeSingle();
    const feature=await window.VATRA_FEATURES.load("avatar-comment-row");
    if(ticket!==activityTicket||path!==photoPath()||!mediaDialog.open)return;
    selected=feature.create({...data,likes:0},{client,ownId,userId,locale,names,images,
     ownCommentLikes:new Set(reaction.data?[id]:[]),node,t,memberUrl,dateText,feedback,
     clearCommentCache:()=>avatarCommentPages.clear(),
     onDelete:()=>{photoCommentOffset=Math.max(0,photoCommentOffset-1);}});
    commentList.querySelector(".ui-profile-photo-empty-state-001")?.remove();
    commentList.classList.remove("is-empty");
    commentList.prepend(selected);
   }
   if(ticket!==activityTicket||path!==photoPath()||!selected)return;
   linkedAvatarFocused=true;
   selected.id="vatra-avatar-comment-"+id;
   selected.classList.add("is-linked-comment");
   selected.setAttribute("tabindex","-1");
   requestAnimationFrame(()=>{
    if(!selected.isConnected||!mediaDialog.open)return;
    selected.scrollIntoView({block:"center",behavior:"auto"});
    selected.focus({preventScroll:true});
   });
  }catch(_){}
 }
 async function reloadPhotoActivity(append=false,refreshLikes=true,keepVisible=false){
  const path=photoPath();
  if(!path||(append&&(photoCommentLoading||!photoCommentHasMore||!mediaDialog.open)))return;
  photoCommentLoading=true;
  const ticket=++activityTicket;
  const key=path+"|"+photoCommentSort;
  const reuse=keepVisible&&lastAvatarCommentKey===key;
  const existing=!append&&reuse?
   new Map([...commentList.children].filter(el=>el.dataset?.commentId)
    .map(el=>[el.dataset.commentId,el])):new Map();
  if(!append){
   photoCommentOffset=0;
   if(!reuse){commentList.replaceChildren();commentList.classList.remove("is-empty");}
   photoCommentHasMore=false;photoCommentSentinel.hidden=true;
  }
  commentList.setAttribute("aria-busy","true");photoCommentSentinel.hidden=true;
  if(!append&&!reuse){feedback("");const skeleton=node("div","vatra-section-skeleton-001 ui-vatra-avatar-comments-skeleton-001");skeleton.dataset.layout="rows";skeleton.setAttribute("aria-hidden","true");for(let i=0;i<3;i++){const row=node("span","vatra-section-skeleton-item-001");row.append(node("span","vatra-skeleton-block vatra-section-skeleton-visual-001"),node("span","vatra-skeleton-block vatra-section-skeleton-line-001"));skeleton.append(row);}commentList.append(skeleton);}
  try{
   const commentsPromise=avatarCommentPage(path,photoCommentSort,photoCommentOffset);
   const likesPromise=refreshLikes?Promise.all([
    client.from("avatar_likes").select("liker_id",{count:"exact",head:true})
     .eq("owner_vatra_id",targetId).eq("avatar_path",path),
    client.from("avatar_likes").select("liker_id")
     .eq("owner_vatra_id",targetId).eq("avatar_path",path).eq("liker_id",userId).limit(1)
   ]):Promise.resolve(null);
   const [rows,likeResults]=await Promise.all([commentsPromise,likesPromise]);
   if(ticket!==activityTicket||path!==photoPath())return;
   if(likeResults){
    if(likeResults[0].error||likeResults[1].error)throw likeResults[0].error||likeResults[1].error;
    const liked=!!likeResults[1].data?.length;
    likesCount.textContent=String(likeResults[0].count||0);
    likesButton.setAttribute("aria-pressed",String(liked));
    likesButton.classList.toggle("is-liked",liked);
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   const {names,images}=await window.VATRA_POST_INTERACTIONS?.authorMap(client,rows)
    ||{names:new Map(),images:new Map()};
   const ids=rows.map(x=>x.id);
   let ownCommentLikes=new Set();
   if(ids.length){
    const reaction=await client.from("avatar_comment_likes").select("comment_id")
     .in("comment_id",ids).eq("liker_id",userId);
    if(!reaction.error)ownCommentLikes=new Set((reaction.data||[]).map(x=>x.comment_id));
   }
   if(ticket!==activityTicket||path!==photoPath())return;
   commentList.classList.toggle("is-empty",!append&&!rows.length);
   if(!append&&!rows.length){
    if(reuse)commentList.replaceChildren();
    const placeholder=node("div","ui-profile-photo-empty-state-001 vatra-media-empty-unified-001"),symbol=document.createElementNS("http://www.w3.org/2000/svg","svg"),p=document.createElementNS("http://www.w3.org/2000/svg","path");
    symbol.setAttribute("class","ui-profile-photo-empty-icon-001 vatra-media-empty-icon-unified-001");symbol.setAttribute("viewBox","0 0 48 48");symbol.setAttribute("fill","none");symbol.setAttribute("stroke","currentColor");symbol.setAttribute("stroke-width","2.6");symbol.setAttribute("stroke-linecap","round");symbol.setAttribute("stroke-linejoin","round");symbol.setAttribute("aria-hidden","true");p.setAttribute("d","M16 7h22a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5h-4v8l-10-8h-8a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5ZM6 15a5 5 0 0 0-4 5v14a5 5 0 0 0 5 5h5v5l6-5");symbol.append(p);
    placeholder.append(symbol,node("p","vatra-profile-photo-no-comments-001",t("Коментарів поки немає. Будьте першими!","No comments yet. Be the first!")));commentList.append(placeholder);
   }
   const commentRowModule=rows.length?await window.VATRA_FEATURES.load("avatar-comment-row"):null;
   if(ticket!==activityTicket||path!==photoPath())return;
   const fresh=[];
   for(const item of rows){
    const old=existing.get(String(item.id));
    if(old){fresh.push(old);continue;}
    const card=commentRowModule.create(item,{client,ownId,userId,locale,names,images,
     ownCommentLikes,node,t,memberUrl,dateText,feedback,
     clearCommentCache:()=>avatarCommentPages.clear(),
     onDelete:()=>{photoCommentOffset=Math.max(0,photoCommentOffset-1);}});
    fresh.push(card);
   }
   if(!append&&reuse&&rows.length){
    const received=new Set(rows.map(item=>String(item.id)));
    const older=[...existing].filter(([id])=>!received.has(id)).map(([,node])=>node);

    commentList.replaceChildren(...fresh,...older);
   }else if(fresh.length){
    if(append){
     const present=new Set([...commentList.querySelectorAll("[data-comment-id]")]
      .map(el=>el.dataset.commentId));
     commentList.append(...fresh.filter(el=>!present.has(el.dataset.commentId)));
    }else commentList.append(...fresh);
   }
   lastAvatarCommentKey=key;
   photoCommentOffset+=rows.length;
   if(!append)await focusLinkedAvatarComment(path,ticket);
   
   photoCommentHasMore=rows.length===12;
   photoCommentSentinel.hidden=!photoCommentHasMore;feedback("");
  }catch(_){
   if(ticket===activityTicket)feedback(t("Коментарі поки недоступні.","Comments are temporarily unavailable."),true);
  }finally{
   if(ticket===activityTicket){commentList.querySelector(".ui-vatra-avatar-comments-skeleton-001")?.remove();commentList.setAttribute("aria-busy","false");photoCommentLoading=false;}
  }
 }
 
 if(typeof IntersectionObserver==="function"){
  const photoCommentObserver=new IntersectionObserver(records=>{
   if(records.some(record=>record.isIntersecting)&&photoCommentHasMore&&
      !photoCommentLoading&&mediaDialog.open)
    void reloadPhotoActivity(true,false);
  },{rootMargin:"280px 0px"});
  photoCommentObserver.observe(photoCommentSentinel);
 }else{
  const loadOnScroll=()=>{
   if(photoCommentHasMore&&!photoCommentLoading&&mediaDialog.open&&
      photoCommentSentinel.getBoundingClientRect().top<innerHeight+320)
    void reloadPhotoActivity(true,false);
  };
  mediaDialog.addEventListener("scroll",loadOnScroll,{passive:true});
  commentList.addEventListener("scroll",loadOnScroll,{passive:true});
 }
 likesButton.addEventListener("click",async()=>{
  const path=photoPath();if(likeBusy||!path||!validId(ownId))return;
  likeBusy=true;likesButton.disabled=true;feedback("");
  try{
   const query=likesButton.getAttribute("aria-pressed")==="true"?
    client.from("avatar_likes").delete().eq("avatar_path",path).eq("liker_id",userId):
    client.from("avatar_likes").insert({owner_vatra_id:targetId,avatar_path:path,liker_id:userId});
   const {error}=await query;if(error)throw error;
   if(path===photoPath()&&mediaDialog.open){
   const liked=likesButton.getAttribute("aria-pressed")!=="true";
   likesButton.setAttribute("aria-pressed",String(liked));
   likesButton.classList.toggle("is-liked",liked);
   likesCount.textContent=String(Math.max(0,(Number(likesCount.textContent)||0)+(liked?1:-1)));
  }
  }catch(_){if(path===photoPath()&&mediaDialog.open)feedback(t("Не вдалося змінити вподобання.","Could not update like."),true);}
  finally{likeBusy=false;likesButton.disabled=false;}
 });
 commentForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const path=photoPath(),body=commentInput.value.trim();
  if(commentBusy||!path||!body||body.length>2000||!validId(ownId))return;
  commentBusy=true;commentSend.disabled=true;feedback("");
  try{
   const {error}=await client.from("avatar_comments").insert({
    owner_vatra_id:targetId,avatar_path:path,author_id:userId,author_vatra_id:ownId,body
   });
   if(error)throw error;
   avatarCommentPages.clear();
   if(path===photoPath()&&mediaDialog.open){
    resetPhotoComposer();

    void reloadPhotoActivity(false,false,true);
   }
  }catch(_){if(path===photoPath()&&mediaDialog.open)feedback(t("Не вдалося додати коментар.","Could not add comment."),true);}
  finally{commentBusy=false;commentSend.disabled=!commentInput.value.trim();}
 });
 shareButton.addEventListener("click",async()=>{
  const link=new URL("id"+targetId,home);link.searchParams.set("photo","avatar");const path=photoPath();if(path)link.searchParams.set("image",path.split("/").pop());
  try{
   if(navigator.share)await navigator.share({url:link.href});
   else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(link.href);
    feedback(t("Посилання скопійовано.","Link copied."));
   }else feedback(link.href);
  }catch(error){if(error?.name!=="AbortError")feedback(t("Не вдалося поділитися.","Could not share."),true);}
 });
 q("#profile-photo-like-label").textContent=t("Подобається","Like");
 q("#profile-photo-share-label").textContent=t("Поділитися","Share");
 q("#profile-photo-comment-text").placeholder=t("Коментувати…","Comment…");
 q("#profile-photo-comment-send").setAttribute("aria-label",t("Надіслати","Send"));
 q(".vatra-profile-photo-comment-label-001").textContent=t("Ваш коментар","Your comment");
 const composerAvatar=q("#profile-photo-composer-avatar"),emojiToggle=q("#profile-photo-emoji-toggle"),emojiPanel=q("#profile-photo-emoji-panel"),cancelComment=q("#profile-photo-comment-cancel");
 const setEmojiOpen=open=>{emojiPanel.hidden=!open;emojiToggle.setAttribute("aria-expanded",String(open));};
 const resetPhotoComposer=()=>{commentForm.classList.remove("is-expanded");commentInput.value="";setEmojiOpen(false);commentSend.disabled=true;};
 const syncComposerAvatar=()=>{const headAvatar=q("#feed-header-avatar");if(headAvatar){composerAvatar.style.backgroundImage=headAvatar.style.backgroundImage;composerAvatar.classList.toggle("has-photo",!!headAvatar.style.backgroundImage);}};
 const expandComposer=()=>{commentForm.classList.add("is-expanded");syncComposerAvatar();};
 commentInput.addEventListener("focus",expandComposer);commentInput.addEventListener("input",()=>{commentSend.disabled=commentBusy||!commentInput.value.trim();});
 cancelComment.addEventListener("click",()=>{resetPhotoComposer();cancelComment.blur();});
 emojiToggle.addEventListener("click",()=>{expandComposer();setEmojiOpen(emojiPanel.hidden);});
 for(const emoji of ["😀","😂","😍","🥰","❤️","👍","🔥","👏","😊","😢","😮","🤔","🎉","🙌","💙","💛","✨","🙏","😎","🤝","😅","😁","🫶","💯"]){const b=node("button","vatra-profile-photo-emoji-001",emoji);b.type="button";b.addEventListener("click",()=>{const start=commentInput.selectionStart??commentInput.value.length,end=commentInput.selectionEnd??start;if(commentInput.value.length-(end-start)+emoji.length>2000)return;commentInput.setRangeText(emoji,start,end,"end");commentInput.focus();commentInput.dispatchEvent(new Event("input"));setEmojiOpen(false);});emojiPanel.append(b);}
 mediaDialog.addEventListener("click",e=>{if(!emojiPanel.hidden&&!emojiPanel.contains(e.target)&&!emojiToggle.contains(e.target))setEmojiOpen(false);});
 mediaDialog.addEventListener("close",resetPhotoComposer);
 const readAvatarGallery=async()=>{
  const current=saved?.avatar_path,folder=targetId+"/avatar",bucket=client.storage.from("avatars"),files=[];
  if(typeof bucket.list!=="function")return current?[current]:[];
  for(let offset=0;offset<2000;offset+=100){
   const {data,error}=await bucket.list(folder,{limit:100,offset,sortBy:{column:"created_at",order:"desc"}});
   if(error)throw error;if(!Array.isArray(data))break;
   for(const item of data)if(/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(item.name||"")&&!/-original\.(?:jpe?g|png|webp)$/i.test(item.name||"")){const path=folder+"/"+item.name;files.push(path);if(Number.isFinite(Date.parse(item.created_at)))galleryDates.set(path,item.created_at);}
   if(data.length<100)break;
  }
  return [...new Set([...(current?[current]:[]),...files])].filter(path=>getPublicPath(path,"avatar"));
 };
 const avatarGalleryLoader=createAvatarGalleryLoader(readAvatarGallery);
 const listAvatarGallery=avatarGalleryLoader.get;
 window.addEventListener("vatra:profile-media-changed",avatarGalleryLoader.invalidate);
 client.auth?.onAuthStateChange?.((event,session)=>{
  if(event==="SIGNED_OUT"||(session?.user?.id&&session.user.id!==userId))avatarGalleryLoader.invalidate();
 });
 const renderGalleryPhoto=(direction=0)=>{
  const finishSlide=window.VATRA_POST_MEDIA?.beginPhotoSlide(photoContent,mediaImage,direction);
  const path=gallery[galleryIndex],url=getPublicPath(path,"avatar");if(!url)return;
  const current=path===saved?.avatar_path;
  mediaDialog.dataset.kind=current?"avatar":"avatar-history";
  interaction.hidden=false;activityTicket++;
  const displayName=String(q("#profile-heading").textContent||"").trim();
  const photoTitle=isMine?t("Фото профілю","Profile photo"):
   t("Фото профілю ","Profile photo of ")+displayName.split(/\s+/)[0];
  mediaHeading.textContent=photoTitle;mediaHeading.hidden=true;
  mediaDialog.setAttribute("aria-label",photoTitle);
  photoCanvas.style.removeProperty("width");photoCanvas.style.removeProperty("height");


  const sourcePath=path.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
  const sourceUrl=getPublicPath(sourcePath,"avatar");
  mediaImage.onerror=()=>{
   if(mediaImage.src!==sourceUrl||gallery[galleryIndex]!==path)return;
   mediaImage.onerror=null;mediaImage.src=url;originalLink.href=url;
  };
  mediaImage.alt=photoTitle;mediaImage.src=sourceUrl||url;
  window.VATRA_POST_MEDIA?.watchPhotoViewer(mediaDialog,photoContent,mediaImage,finishSlide);
  if(mediaImage.complete)queueMicrotask(fitPhoto);
  originalLink.href=sourceUrl||url;photoFooter.hidden=false;
  resetTagMode();closeMore();reportTag("");tagMarkers.replaceChildren();tagEpoch++;
  likesCount.textContent="0";likesButton.setAttribute("aria-pressed","false");likesButton.classList.remove("is-liked");
  commentInput.value="";
  prevPhoto.hidden=nextPhoto.hidden=gallery.length<2;
  prevPhoto.disabled=galleryIndex===0;nextPhoto.disabled=galleryIndex>=gallery.length-1;
  galleryToolbar.hidden=false;
  galleryCount.textContent=gallery.length===1?photoTitle:
   photoTitle+" "+(galleryIndex+1)+t(" із "," of ")+gallery.length;
  galleryDelete.hidden=!canEdit;
  footerReport.hidden=isMine||locked;
  setCurrent.hidden=!canEdit||current||!mediaDialog.dataset.fromPhotos;
  footerShare.hidden=isMine;q("#profile-photo-share").hidden=isMine;
  footerShare.textContent=t("Поділитися","Share");
  footerReport.textContent=t("Поскаржитися на фото","Report photo");
  galleryDelete.textContent=t("Видалити","Delete");
  footerMore.firstChild.textContent=t("Більше ","More ");
  setCurrent.textContent=t("Зробити фотографією профілю","Make profile photo");
  originalLink.textContent=t("Відкрити оригінал","Open original");
  const owner=q("#profile-photo-owner"),ownerPhoto=q("#profile-photo-owner-avatar"),date=q("#profile-photo-kind");
  owner.textContent=q("#profile-heading").textContent;owner.href=memberUrl(targetId);
  void window.VATRA_VERIFIED?.attach(client,owner,targetId);
  ownerPhoto.href=owner.href;ownerPhoto.setAttribute("aria-label",owner.textContent);
  ownerPhoto.style.backgroundImage=photoURLs.avatar?"url("+JSON.stringify(photoURLs.avatar)+")":"";
  ownerPhoto.classList.toggle("has-photo",!!photoURLs.avatar);
  const uploaded=galleryDates.get(path);
  date.textContent=uploaded?(window.VATRA_PRESENCE?.relative?.(uploaded,english)||dateText(uploaded)):"";date.hidden=!uploaded;if(uploaded)date.dateTime=uploaded;else date.removeAttribute("datetime");
  resetPhotoComposer();syncComposerAvatar();
  interaction.scrollTop=0;
  void reloadPhotoActivity(false,true,lastAvatarCommentKey===path+"|"+photoCommentSort);
  void loadTags();
 };
 const stepPhoto=delta=>{if(pendingAvatarUndo)return;const index=galleryIndex+delta;if(index<0||index>=gallery.length)return;galleryIndex=index;renderGalleryPhoto(delta);};
 prevPhoto.addEventListener("click",()=>stepPhoto(-1));nextPhoto.addEventListener("click",()=>stepPhoto(1));
 document.addEventListener("keydown",event=>{if(!mediaDialog.open||!["avatar","avatar-history"].includes(mediaDialog.dataset.kind)||event.target.matches?.("input,textarea,select,[contenteditable]")||document.querySelector("dialog[open]:not(#profile-media-viewer)"))return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();stepPhoto(event.key==="ArrowLeft"?-1:1);}});
 let swipeStart=null;mediaImage.addEventListener("touchstart",event=>{swipeStart=event.touches[0]?.clientX??null;},{passive:true});
 mediaImage.addEventListener("touchend",event=>{if(swipeStart===null)return;const dx=(event.changedTouches[0]?.clientX??swipeStart)-swipeStart;swipeStart=null;if(Math.abs(dx)>55&&["avatar","avatar-history"].includes(mediaDialog.dataset.kind))stepPhoto(dx<0?1:-1);},{passive:true});


 let coverViewer=null,coverViewerPending=false;
 const openCover=async()=>{
  if(coverViewerPending||!canViewPhoto||!photoURLs.cover||
   !coverPhoto.complete||!coverPhoto.naturalWidth)return;
  const current=coverPhoto.currentSrc||photoURLs.cover;
  coverViewerPending=true;
  try{
   if(!coverViewer){
    const feature=await window.VATRA_FEATURES.load("cover-viewer");
    coverViewer=feature.mount({q,t,coverPhoto,getCoverUrl:()=>photoURLs.cover,
     allowed:()=>canViewPhoto,closeAvatarMenu});
   }
   if(!canViewPhoto||(coverPhoto.currentSrc||photoURLs.cover)!==current)return;
   coverViewer.open();
  }catch(_){
   status(t("Не вдалося відкрити обкладинку. Спробуйте ще раз.",
    "Could not open cover photo. Please try again."),true);
  }finally{coverViewerPending=false;}
 };
 const openMedia=(kind,preferredPath=null)=>{
  if(kind!=="avatar"||!canViewPhoto)return;
  const url=photoURLs.avatar;if(!url)return;
  closeAvatarMenu();const ticket=++galleryEpoch;
  mediaDialog.dataset.fromPhotos=preferredPath?"true":"";

  gallery=saved?.avatar_path?[saved.avatar_path]:[];galleryIndex=0;
  if(!gallery.length)return;
  renderGalleryPhoto();mediaDialog.showModal();
  void listAvatarGallery().then(paths=>{
   if(ticket!==galleryEpoch||!mediaDialog.open)return;
   const selected=gallery[galleryIndex];gallery=paths;
   const requested=new URLSearchParams(location.search).get("image");
   const shared=requested&&/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(requested)?
    gallery.findIndex(p=>p.endsWith("/"+requested)):-1;
   const wanted=preferredPath&&typeof preferredPath==="string"&&
    preferredPath.startsWith(targetId+"/avatar/")?gallery.indexOf(preferredPath):-1;
   galleryIndex=wanted>=0?wanted:shared>=0?shared:Math.max(0,gallery.indexOf(selected));
   renderGalleryPhoto();
  }).catch(()=>{});
 };
 coverView.addEventListener("click",()=>void openCover());
 mediaDialog.addEventListener("close",()=>{
  window.VATRA_POST_MEDIA?.clearPhotoSlide(photoContent);delete mediaDialog.dataset.photoSized;
  galleryEpoch++;activityTicket++;tagEpoch++;resetTagMode();closeMore();
  hideAvatarUndo();discardAvatarUndo();
 });
 window.VATRA_OPEN_PROFILE_AVATAR=path=>{if(canViewPhoto)openMedia("avatar",path);};
 window.VATRA_SET_HISTORY_AVATAR=async path=>{if(!canEdit||uploading||avatarFeaturePending||avatarEditor?.busy()||pendingAvatarUndo||!path?.startsWith(ownId+"/avatar/"))return false;
  uploading=true;
  try{await updateCurrentAvatar(path);window.VATRA_AVATAR?.invalidatePath?.(client,ownId);await display(saved);window.dispatchEvent(new Event("vatra:profile-media-changed"));return true;}
  catch(_){status(t("Не вдалося змінити фото профілю.","Could not update profile photo."),true);return false;}
  finally{uploading=false;}
 };
 const openStory=()=>{
  if(!canViewPhoto||!activeStory)return;
  if(Date.parse(activeStory.expires_at)<=Date.now()){
   activeStory=null;syncAvatarMenu();return;
  }
  storyHeading.textContent=q("#profile-heading").textContent;
  storyBody.textContent=activeStory.body||"";
  storyBody.hidden=!String(activeStory.body||"").trim();
  storyDialog.dataset.theme=String(activeStory.theme||0);
  storyViewerDelete.hidden=!canEdit||!activeStory.id;
  closeAvatarMenu();
  storyDialog.showModal();
  void window.VATRA_POST_MEDIA?.renderStory(client,
   {...activeStory,author_vatra_id:targetId},storyMedia);
 };
 storyButton.addEventListener("click",openStory);
 visitorStory.addEventListener("click",openStory);
 const deleteActiveStory=async()=>{
  if(!canEdit||!activeStory?.id||deleteStoryButton.disabled)return;
  const removingId=activeStory.id,removingStory={...activeStory};
  deleteStoryButton.disabled=storyViewerDelete.disabled=true;
  try{
   if(!await window.VATRA_PROFILE_CONFIRM({
   title:t("Видалити історію?","Delete this story?"),
   description:t("Історію буде видалено для всіх без можливості відновлення.",
    "This story will be removed for everyone and cannot be restored."),
   action:t("Видалити","Delete")
   }))return;
   const result=await client.from("stories").delete()
    .eq("id",removingId).eq("author_vatra_id",ownId).select("id");
   if(result.error||!result.data?.some(row=>row.id===removingId))
    throw result.error||new Error("Story not deleted");

   if(removingStory.media_path)try{
    await window.VATRA_POST_MEDIA?.remove(client,removingStory);
   }catch(_){}
   activeStory=null;
   const next=await client.from("stories").select("id,body,theme,expires_at,media_kind,media_path")
    .eq("author_vatra_id",ownId).gt("expires_at",new Date().toISOString())
    .order("created_at",{ascending:false}).limit(1);
   if(!next.error&&next.data?.[0])activeStory=next.data[0];
   if(storyDialog.open)storyDialog.close();
   closeAvatarMenu();syncAvatarMenu();
   status(t("Історію видалено.","Story deleted."));
  }catch(_){
   status(t("Не вдалося видалити історію. Спробуйте ще раз.",
    "Could not delete the story. Please retry."),true);
  }finally{deleteStoryButton.disabled=storyViewerDelete.disabled=false;}
 };
 deleteStoryButton.addEventListener("click",deleteActiveStory);
 storyViewerDelete.addEventListener("click",deleteActiveStory);
 q("#profile-media-viewer-close").addEventListener("click",()=>{
  if(!avatarDeleteInProgress&&!uploading)mediaDialog.close();
 });
 mediaDialog.addEventListener("cancel",event=>{
  if(avatarDeleteInProgress||(pendingAvatarUndo&&uploading))event.preventDefault();
 });
 q("#profile-story-viewer-close").addEventListener("click",()=>storyDialog.close());
 storyDialog.addEventListener("close",()=>{
  if(!storyDialog.open)window.VATRA_POST_MEDIA?.clearStory(storyMedia);
 });
 mediaDialog.addEventListener("click",event=>{
  if(event.target===mediaDialog&&!avatarDeleteInProgress&&!uploading)mediaDialog.close();
 });
 storyDialog.addEventListener("click",event=>{if(event.target===storyDialog)storyDialog.close();});
 let openedByHover=false;
 avatarTrigger.addEventListener("click",()=>{if(!canViewPhoto)return;if(photoURLs.avatar)openMedia("avatar");else if(activeStory)openStory();else if(canEdit)showAvatarMenu();});
 plus.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse"){openedByHover=true;showAvatarMenu();}});
 plus.addEventListener("pointerleave",scheduleMenuClose);
 plus.addEventListener("click",()=>{if(openedByHover){openedByHover=false;showAvatarMenu();}else if(avatarWrap.classList.contains("is-menu-open"))closeAvatarMenu();else showAvatarMenu();});
 avatarMenu.addEventListener("pointerenter",()=>clearTimeout(menuTimer));avatarMenu.addEventListener("pointerleave",scheduleMenuClose);
 avatarWrap.addEventListener("pointerleave",()=>{openedByHover=false;scheduleMenuClose();});
 addStory.addEventListener("click",closeAvatarMenu);
 avatarWrap.addEventListener("focusout",event=>{if(!avatarWrap.contains(event.relatedTarget))closeAvatarMenu();});
 avatarWrap.addEventListener("keydown",event=>{
  if(event.key==="Escape"){event.preventDefault();closeAvatarMenu();(canEdit?plus:avatarTrigger).focus();}
  else if(event.key==="ArrowDown"&&!avatarMenu.hidden){showAvatarMenu();const item=[...avatarMenu.querySelectorAll("button")].find(button=>!button.hidden);if(item){event.preventDefault();item.focus();}}
 });
 document.addEventListener("pointerdown",event=>{
  if(!avatarWrap.contains(event.target))closeAvatarMenu();
 });

 coverPhoto.addEventListener("load",()=>{
  if(!photoURLs.cover||coverPhoto.src!==photoURLs.cover)return;
  coverPhoto.hidden=false;
  if(systemCover)systemCover.hidden=true;
  cover.classList.add("has-photo");
  coverView.hidden=!canViewPhoto;
 });
 coverPhoto.addEventListener("error",()=>{
  coverPhoto.hidden=true;coverView.hidden=true;
  if(systemCover)systemCover.hidden=false;
  cover.classList.remove("has-photo");
 });
 const display=record=>{
  if(systemCover){

   systemCover.dataset.vatraCoverState="default";
   systemCover.hidden=false;
  }
  photoURLs.cover=record?.cover_path?getPublicPath(record.cover_path,"cover"):null;
  photoURLs.avatar=record?.avatar_path?getPublicPath(record.avatar_path,"avatar"):null;
  if(isMine)window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,record?.avatar_path||null);
  cover.style.removeProperty("background-image");
  cover.style.removeProperty("--vatra-cover-image");
  cover.classList.remove("has-photo");
  coverView.hidden=true;
  coverPhoto.hidden=true;
  if(photoURLs.cover)coverPhoto.src=photoURLs.cover;
  else coverPhoto.removeAttribute("src");
  const coverReady=photoURLs.cover&&typeof coverPhoto.decode==="function"?
   coverPhoto.decode().then(()=>{
    if(!photoURLs.cover)return;
    coverPhoto.hidden=false;if(systemCover)systemCover.hidden=true;
    cover.classList.add("has-photo");coverView.hidden=!canViewPhoto;
   }).catch(()=>{}):Promise.resolve();
  resetImage(avatar);
  window.VATRA_AVATAR?.fallback(avatar,"default");
  avatarWrap.dataset.vatraSystemAvatar="true";
  avatarWrap.dataset.vatraRingKind="default";
  const fallback=(q("#profile-heading")?.textContent||"V").trim().split(/\s+/)
   .map(word=>Array.from(word)[0]||"").slice(0,2).join("").toLocaleUpperCase()||"V";
  avatar.textContent=fallback;
  for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
   resetImage(postAvatar);postAvatar.textContent=fallback;
  }
  const candidate=photoURLs.avatar;
  let avatarReady=Promise.resolve();
  if(candidate)avatarReady=validPhoto(candidate).then(valid=>{
   if(photoURLs.avatar!==candidate)return;
   if(!valid){photoURLs.avatar=null;syncAvatarMenu();return;}
   setImage(avatar,candidate);avatar.textContent="";
   avatarWrap.dataset.vatraSystemAvatar="false";
   avatarWrap.removeAttribute("data-vatra-ring-kind");
   for(const postAvatar of document.querySelectorAll("#profile-posts .feed-post-avatar")){
    setImage(postAvatar,candidate);postAvatar.textContent="";
   }
   if(isMine){
    const menuAvatar=q("#feed-header-avatar");
    if(menuAvatar){setImage(menuAvatar,candidate);menuAvatar.textContent="";}
   }
  });
  syncAvatarMenu();
  return Promise.allSettled([avatarReady,coverReady]);
 };
 try{

  const request=()=>client.from("profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle();
  let response=await (preloadedMedia||request());
  if(response?.error)response=await request();



  if(!response?.error&&response?.data){saved=response.data;await display(response.data);}
 }catch(_){}
 finally{
  cover.classList.remove("is-loading-media");
  avatarWrap.classList.remove("is-loading-media");
 }

 if(!locked)try{
  const requestedStory=new URLSearchParams(location.search).get("story");
  const exact=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestedStory||"");
  let query=client.from("stories").select("id,body,theme,expires_at,media_kind,media_path")
   .eq("author_vatra_id",targetId).gt("expires_at",new Date().toISOString());
  if(exact)query=query.eq("id",requestedStory);
  const {data,error}=await query.order("created_at",{ascending:false}).limit(1);
  if(!error&&Array.isArray(data)&&typeof data[0]?.body==="string"){
   activeStory=data[0];
   if(exact&&String(activeStory.id)===requestedStory)openStory();
  }else if(exact)window.VATRA_TOAST?.show?.(t("Історія більше недоступна","Story is no longer available"),"info");
 }catch(_){}
 syncAvatarMenu();
 if(!canEdit)return;
 try{
  const raw=sessionStorage.getItem("vatra-profile-photo-toast");
  if(raw){const savedToast=JSON.parse(raw);if(savedToast.account===ownId){sessionStorage.removeItem("vatra-profile-photo-toast");status(savedToast.text);}}
 }catch(_){}
 const fileTypes={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 async function uploadImage(file,kind,originalFile=null){
  if(uploading)return false;
  const ext=fileTypes[file?.type];
  if(!ext||!file?.size||file.size>31457280){
   status(t("Оберіть JPEG, PNG або WebP до 30 МБ.","Choose a JPEG, PNG or WebP under 30 MB."),true);return false;
  }
  uploading=true;if(kind==="avatar")avatarGalleryLoader.invalidate();
  coverChange.disabled=true;changePhoto.disabled=true;removePhoto.disabled=true;
  status(t("Завантажуємо зображення…","Uploading image…"));
  const filename=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?
   crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),
    value=>value.toString(16).padStart(2,"0")).join("");
  const path=ownId+"/"+kind+"/"+filename+"."+ext;
  const originalExt=fileTypes[originalFile?.type];
  const originalPath=originalExt?ownId+"/"+kind+"/"+filename+"-original."+originalExt:null;
  const uploadedPaths=[];let committed=false;
  try{
   if(originalFile&&!originalPath)throw Error("Unsupported source format");
   if(originalPath){
    const {error:originalError}=await client.storage.from(bucketFor(kind)).upload(originalPath,originalFile,{
     contentType:originalFile.type,cacheControl:"3600",upsert:false
    });
    if(originalError)throw originalError;
    uploadedPaths.push(originalPath);
   }
   const {error:uploadError}=await client.storage.from(bucketFor(kind)).upload(path,file,{
    contentType:file.type,cacheControl:"3600",upsert:false
   });
   if(uploadError)throw uploadError;
   uploadedPaths.push(path);
   const column=kind==="avatar"?"avatar_path":"cover_path";
   const values={[column]:path,updated_at:new Date().toISOString()};
   const operation=saved?
    client.from("profile_media").update(values).eq("vatra_id",ownId)
     .select("vatra_id,"+column).maybeSingle():
    client.from("profile_media").insert({vatra_id:ownId,...values})
     .select("vatra_id,"+column).maybeSingle();
   const {data:stored,error:dbError}=await operation;
   if(dbError||String(stored?.[column]||"")!==path){



    throw dbError||new Error("Profile media update did not persist");
   }


   committed=true;
   saved={...saved,...values};
   await display(saved);
   if(kind==="avatar"){
    window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
    window.VATRA_AVATAR?.fromPath(client,ownerEmail,ownId,path);
   }
   return true;
  }catch(_){
   if(!committed&&uploadedPaths.length)try{await client.storage.from(bucketFor(kind)).remove(uploadedPaths);}catch(_){}
   status(t("Не вдалося завантажити зображення. Спробуйте ще раз.",
    "Could not upload the image. Please retry."),true);return false;}
  finally{
   uploading=false;if(kind==="avatar")avatarGalleryLoader.invalidate();
   coverChange.disabled=false;changePhoto.disabled=false;removePhoto.disabled=false;
   fileAvatar.value="";fileCover.value="";
  }
 }
 const coverDialog=q("#profile-cover-edit-dialog");
 let coverEditor=null,coverFeaturePending=false;
 let avatarEditor=null,avatarFeaturePending=false;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const encodeProfileCrop=async(image,rect,width,height,name,mime="image/webp")=>{const out=document.createElement("canvas");out.width=width;out.height=height;const context=out.getContext("2d");if(!context)throw Error("Canvas unavailable");context.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,width,height);const blob=await new Promise(resolve=>out.toBlob(resolve,fileTypes[mime]?mime:"image/webp",.94));if(!blob||!fileTypes[blob.type])throw Error("Image encoding failed");return new File([blob],name+"."+fileTypes[blob.type],{type:blob.type});};
 const canvasPoint=(surface,e)=>{const r=surface.getBoundingClientRect();return{x:(e.clientX-r.left)*surface.width/r.width,y:(e.clientY-r.top)*surface.height/r.height};};
 const updateCurrentAvatar=async next=>{
  const r=await client.from("profile_media")
   .update({avatar_path:next,updated_at:new Date().toISOString()})
   .eq("vatra_id",ownId).select("vatra_id,avatar_path").maybeSingle();
  if(r.error||!r.data||r.data.avatar_path!==next)throw Error("Avatar change not saved");
  saved={...saved,avatar_path:next};avatarGalleryLoader.invalidate();
 };
 window.VATRA_DELETE_AVATAR_BATCH=async paths=>{
  if(!canEdit||uploading||avatarFeaturePending||avatarEditor?.busy()||pendingAvatarUndo)return false;
  const selected=[...new Set(paths)].filter(path=>typeof path==="string"&&path.startsWith(ownId+"/avatar/")&&!/-original\./.test(path));
  if(!selected.length||selected.length!==new Set(paths).size)return false;
  uploading=true;avatarGalleryLoader.invalidate();const previous=saved?.avatar_path;let changed=false;
  try{
   const available=await listAvatarGallery(true);if(selected.some(path=>!available.includes(path)))return false;
   if(selected.includes(previous)){await updateCurrentAvatar(available.find(path=>!selected.includes(path))||null);changed=true;}
   const files=selected.flatMap(path=>[path,path.replace(/\.(jpe?g|png|webp)$/i,"-original.$1")]);
   const {error}=await client.storage.from("avatars").remove(files);if(error)throw error;
   const metadata=await Promise.all([client.from("avatar_photo_tags").delete().eq("owner_vatra_id",ownId).in("avatar_path",selected),client.from("avatar_photo_descriptions").delete().eq("owner_vatra_id",ownId).in("avatar_path",selected)]);
   window.VATRA_AVATAR?.invalidatePath?.(client,ownId);if(changed)await display(saved);return metadata.every(result=>!result.error);
  }catch(_){
   if(changed)try{const available=await listAvatarGallery(true);if(available.includes(previous)){await updateCurrentAvatar(previous);window.VATRA_AVATAR?.invalidatePath?.(client,ownId);}await display(saved);}catch(_){}
   return false;
  }finally{uploading=false;avatarGalleryLoader.invalidate();}
 };
 const avatarType=path=>/\.png$/i.test(path)?"image/png":/\.webp$/i.test(path)?"image/webp":"image/jpeg";
 async function removeAvatarPath(path){
  if(uploading||avatarFeaturePending||avatarEditor?.busy()||pendingAvatarUndo||!canEdit||
   !path||!path.startsWith(ownId+"/avatar/"))return;
  closeAvatarMenu();
  if(!await window.VATRA_PROFILE_CONFIRM({
   title:t("Видалити фото?","Delete photo?"),
   description:t("Після видалення ви зможете відновити фото в переглядачі, поки не закриєте його.",
    "You can restore the deleted photo in this viewer until you close it."),
   action:t("Видалити","Delete")
  }))return;
  uploading=true;avatarDeleteInProgress=true;galleryEpoch++;avatarGalleryLoader.invalidate();removePhoto.disabled=galleryDelete.disabled=true;
  const previous=saved?.avatar_path||null;
  let changed=false,previewUrl=null;
  try{
   const storage=client.storage.from("avatars");

   const originalPath=path.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
   const [thumb,full]=await Promise.all([storage.download(path),storage.download(originalPath)]);
   if(thumb.error||!(thumb.data instanceof Blob))throw Error("Could not back up avatar");
   const missingOriginal=full.error&&(
    String(full.error.status||full.error.statusCode||"")==="404"||
    /not found|does not exist|No such file/i.test(String(full.error.message||"")));
   if(full.error&&!missingOriginal)throw full.error;
   const fullBlob=full.error?null:full.data;
   if(fullBlob&&!(fullBlob instanceof Blob))throw Error("Invalid avatar original backup");
   previewUrl=URL.createObjectURL(fullBlob||thumb.data);
   const paths=(!mediaDialog.open||path===previous)?await listAvatarGallery(true):null;
   if(!mediaDialog.open){
    gallery=[...new Set([path,...paths])];
    galleryIndex=gallery.indexOf(path);
    renderGalleryPhoto();mediaDialog.showModal();
   }
   const galleryBefore=[...gallery],indexBefore=galleryIndex;
   if(path===previous){
    const next=paths.find(p=>p!==path)||null;
    await updateCurrentAvatar(next);changed=true;
   }
   const removed=await storage.remove([path,...(fullBlob?[originalPath]:[])]);
   if(removed.error)throw removed.error;
   avatarGalleryLoader.invalidate();
   gallery=gallery.filter(p=>p!==path);
   galleryIndex=Math.max(0,Math.min(galleryIndex,gallery.length-1));
   pendingAvatarUndo={path,previous,galleryBefore,indexBefore,originalPath,
    thumbnail:thumb.data,original:fullBlob,previewUrl,thumbnailRestored:false,originalRestored:!fullBlob};
   previewUrl=null;
   if(changed){
    window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
    try{await display(saved);}catch(_){ }
   }
   deletedMessage.textContent=t("Фотографію видалено.","Photo deleted.");
   restoreAvatarButton.textContent=t("Відновити","Restore");
   restoreAvatarButton.disabled=false;
   mediaDialog.classList.add("is-photo-deleted");deletedNotice.hidden=false;
   closeMore();tagMarkers.replaceChildren();tagEpoch++;activityTicket++;
   mediaImage.onerror=null;mediaImage.src=pendingAvatarUndo.previewUrl;
   prevPhoto.disabled=nextPhoto.disabled=true;
   fitPhoto();
   status(t("Фото видалено. Його можна відновити до закриття переглядача.",
    "Photo deleted. You can restore it before closing the viewer."));
  }catch(error){
   if(changed)try{
    await updateCurrentAvatar(previous);window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
    await display(saved);
   }catch(_){}
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   status(t("Не вдалося безпечно видалити фото. Спробуйте ще раз.",
    "Could not safely delete the photo. Please try again."),true);
  }finally{uploading=false;avatarGalleryLoader.invalidate();avatarDeleteInProgress=false;removePhoto.disabled=galleryDelete.disabled=false;}
 }
 restoreAvatarButton.addEventListener("click",async()=>{
  const undo=pendingAvatarUndo;
  if(!undo||!canEdit||uploading)return;
  uploading=true;avatarGalleryLoader.invalidate();restoreAvatarButton.disabled=true;
  try{
   const storage=client.storage.from("avatars");
   if(!undo.thumbnailRestored){
    const r=await storage.upload(undo.path,undo.thumbnail,
     {contentType:avatarType(undo.path),upsert:false});
    if(r.error)throw r.error;
    undo.thumbnailRestored=true;
   }
   if(undo.original&&!undo.originalRestored){
    const r=await storage.upload(undo.originalPath,undo.original,
     {contentType:avatarType(undo.originalPath),upsert:false});
    if(r.error)throw r.error;
    undo.originalRestored=true;
   }
   if(undo.path===undo.previous)await updateCurrentAvatar(undo.path);
   gallery=undo.galleryBefore;
   galleryIndex=undo.indexBefore;
   pendingAvatarUndo=null;hideAvatarUndo();
   if(undo.previewUrl)URL.revokeObjectURL(undo.previewUrl);
   window.VATRA_AVATAR?.invalidatePath?.(client,ownId);
   try{await display(saved);}catch(_){}
   renderGalleryPhoto();
   status(t("Фотографію відновлено.","Photo restored."));
  }catch(_){
   status(t("Не вдалося відновити фото. Повторіть спробу, не закриваючи переглядач.",
    "Could not restore the photo. Retry without closing this viewer."),true);
  }finally{uploading=false;avatarGalleryLoader.invalidate();restoreAvatarButton.disabled=false;}
 });
 removePhoto.addEventListener("click",()=>void removeAvatarPath(saved?.avatar_path));
 galleryDelete.addEventListener("click",()=>void removeAvatarPath(gallery[galleryIndex]));
 changePhoto.addEventListener("click",()=>{closeAvatarMenu();fileAvatar.click();});
 coverChange.setAttribute("aria-haspopup","menu");coverChange.setAttribute("aria-controls","profile-owner-media-menu");coverChange.setAttribute("aria-expanded","false");
 const ownerMenu=document.createElement("div");ownerMenu.id="profile-owner-media-menu";ownerMenu.className="ui-profile-owner-media-menu-001";ownerMenu.setAttribute("role","menu");ownerMenu.hidden=true;document.body.append(ownerMenu);
 const ownerPopover=typeof ownerMenu.showPopover==="function";if(ownerPopover)ownerMenu.setAttribute("popover","manual");
 let ownerAnchor=null,ownerSurface=null,ownerKind=null,ownerTimer=null,coverSourceLoading=false,ownerKeyboard=false,ownerPointerInside=false;
 const clearOwnerTimer=()=>{clearTimeout(ownerTimer);ownerTimer=null;};
 const closeOwnerMenu=(focus=false)=>{
  clearOwnerTimer();const anchor=ownerAnchor;ownerAnchor=null;ownerSurface=null;ownerKind=null;ownerKeyboard=false;ownerPointerInside=false;
  if(ownerPopover&&ownerMenu.matches(":popover-open"))ownerMenu.hidePopover();
  ownerMenu.hidden=true;ownerMenu.replaceChildren();anchor?.setAttribute("aria-expanded","false");
  if(focus&&anchor?.isConnected)anchor.focus({preventScroll:true});
 };
 const isOwnerTarget=target=>target instanceof Node&&(ownerSurface?.contains(target)||ownerAnchor?.contains(target)||ownerMenu.contains(target));
 const enterOwnerMenu=()=>{ownerPointerInside=true;clearOwnerTimer();};
 const leaveOwnerMenu=event=>{
  if(!ownerAnchor||event?.pointerType&&event.pointerType!=="mouse")return;
  if(isOwnerTarget(event?.relatedTarget)){enterOwnerMenu();return;}
  ownerPointerInside=false;
  if(ownerKeyboard)return;
  if(ownerTimer===null)ownerTimer=setTimeout(()=>{ownerTimer=null;if(ownerAnchor&&!ownerPointerInside&&!ownerKeyboard)closeOwnerMenu();},180);
 };
 const positionOwnerMenu=()=>{
  if(!ownerAnchor?.isConnected||!ownerAnchor.getClientRects().length){closeOwnerMenu();return false;}
  const a=ownerAnchor.getBoundingClientRect(),v=window.visualViewport,left=v?.offsetLeft||0,top=Math.max(v?.offsetTop||0,q(".feed-header")?.getBoundingClientRect().bottom||0),right=left+(v?.width||innerWidth),bottom=(v?.offsetTop||0)+(v?.height||innerHeight);
  if(a.bottom<=top||a.top>=bottom){closeOwnerMenu();return false;}
  ownerMenu.style.width=ownerKind==="cover"?Math.min(Math.max(a.width,210),right-left-16)+"px":"";
   const w=ownerMenu.offsetWidth,h=ownerMenu.scrollHeight+2,below=bottom-a.bottom-8,above=a.top-top-8,up=below<h&&above>below,room=Math.max(44,up?above:below);
  ownerMenu.style.maxHeight=Math.floor(room)+"px";
  ownerMenu.style.left=Math.round(Math.max(left+8,Math.min(ownerKind==="cover"?a.right-w:a.left,right-w-8)))+"px";
  ownerMenu.style.top=Math.round(Math.max(top+4,up?a.top-5-Math.min(h,room):a.bottom+5))+"px";return true;
 };
 const mediaBusy=()=>uploading||coverSourceLoading||coverFeaturePending||avatarFeaturePending||coverEditor?.busy()||avatarEditor?.busy();
 const iconPaths={upload:"M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4",crop:"M6 3v13a2 2 0 0 0 2 2h13M3 6h13a2 2 0 0 1 2 2v13",trash:"M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"};
 const ownerItem=(key,label,run,source=null)=>{
  const item=document.createElement("button");item.type="button";item.className="vatra-profile-owner-media-action-001 vatra-profile-owner-media-action-"+key+"-001";item.dataset.action=key;item.setAttribute("role","menuitem");
  if(key==="trash"||source?.classList.contains("profile-avatar-menu-delete"))item.classList.add("is-danger");
  let symbol=source?.querySelector("svg")?.cloneNode(true);
  if(!symbol){const ns="http://www.w3.org/2000/svg";symbol=document.createElementNS(ns,"svg");for(const [name,value] of Object.entries({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"1.8","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"}))symbol.setAttribute(name,value);const path=document.createElementNS(ns,"path");path.setAttribute("d",iconPaths[key]);symbol.append(path);}
  symbol.removeAttribute("id");symbol.setAttribute("class","ui-profile-owner-media-icon-001 ui-profile-owner-media-icon-"+key+"-001");
  for(const [index,node] of [...symbol.querySelectorAll("*")].entries()){node.removeAttribute("id");node.setAttribute("class","ui-profile-owner-media-vector-"+key+"-"+String(index+1).padStart(3,"0"));}
  const text=document.createElement("span");text.className="vatra-profile-owner-media-label-001 vatra-profile-owner-media-label-"+key+"-001";text.textContent=label;item.append(symbol,text);item.disabled=!!source?.disabled;
  item.addEventListener("click",()=>{closeOwnerMenu(true);if(!mediaBusy())run();});ownerMenu.append(item);
 };
 const openOwnerMenu=(kind,anchor,keyboard=false,surface=anchor)=>{
  if(!canEdit||mediaBusy()||!anchor?.isConnected||!anchor.getClientRects().length)return;
  clearOwnerTimer();if(ownerAnchor===anchor&&!ownerMenu.hidden){if(keyboard){ownerKeyboard=true;ownerMenu.querySelector("button:not(:disabled)")?.focus();}else{ownerKeyboard=false;enterOwnerMenu();}return;}
  closeOwnerMenu();closeAvatarMenu();ownerAnchor=anchor;ownerSurface=surface;ownerKind=kind;ownerKeyboard=keyboard;ownerPointerInside=!keyboard;
  if(kind==="cover"){
   const hasCover=!!saved?.cover_path;
   ownerItem("upload",hasCover?t("Змінити зображення","Change image"):t("Завантажити зображення","Upload image"),()=>fileCover.click());
   if(hasCover){ownerItem("crop",t("Область відображення","Display area"),()=>void reopenCoverEditor());ownerItem("trash",t("Видалити","Delete"),()=>void removeCover());}
  }else{
   for(const source of avatarMenu.querySelectorAll("button:not([hidden])")){
     if(anchor.classList.contains("vatra-profile-editor-avatar-change-001")&&!["profile-avatar-change","profile-avatar-remove"].includes(source.id))continue;
    const label=source.querySelector("span")?.textContent||source.getAttribute("aria-label")||source.textContent;
    ownerItem(source.id,label,()=>source.click(),source);
   }
  }
  if(!ownerMenu.childElementCount){closeOwnerMenu();return;}
  ownerMenu.classList.toggle("is-compact",anchor!==coverChange);
  ownerMenu.hidden=false;if(ownerPopover)ownerMenu.showPopover();
  if(!positionOwnerMenu())return;anchor.setAttribute("aria-expanded","true");
  if(keyboard)ownerMenu.querySelector("button:not(:disabled)")?.focus();
 };
 window.VATRA_PROFILE_MEDIA_MENU=Object.freeze({open:openOwnerMenu,leave:leaveOwnerMenu,close:closeOwnerMenu});
 coverChange.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse")openOwnerMenu("cover",coverChange);});
 coverChange.addEventListener("pointerleave",leaveOwnerMenu);
 coverChange.addEventListener("click",event=>openOwnerMenu("cover",coverChange,event.detail===0));
 coverChange.addEventListener("keydown",event=>{if(event.key==="ArrowDown"){event.preventDefault();openOwnerMenu("cover",coverChange,true);}});
 ownerMenu.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse")enterOwnerMenu();});ownerMenu.addEventListener("pointerleave",leaveOwnerMenu);
 document.addEventListener("pointermove",event=>{if(!ownerAnchor||event.pointerType!=="mouse")return;ownerKeyboard=false;if(isOwnerTarget(event.target))enterOwnerMenu();else leaveOwnerMenu(event);},{passive:true,capture:true});
 document.addEventListener("pointerout",event=>{if(ownerAnchor&&event.pointerType==="mouse"&&!event.relatedTarget){ownerKeyboard=false;closeOwnerMenu();}},{passive:true,capture:true});
 window.addEventListener("blur",()=>{if(ownerAnchor)closeOwnerMenu();});
 ownerMenu.addEventListener("keydown",event=>{
  const buttons=[...ownerMenu.querySelectorAll("button:not(:disabled)")],index=buttons.indexOf(document.activeElement);
  if(event.key==="Escape"){event.preventDefault();closeOwnerMenu(true);}
  else if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)&&buttons.length){event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:(index+(event.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length;buttons[next].focus();}
 });
 document.addEventListener("pointerdown",event=>{if(ownerAnchor&&!isOwnerTarget(event.target))closeOwnerMenu();});
 document.addEventListener("focusin",event=>{if(ownerAnchor&&!ownerMenu.contains(event.target)&&event.target!==ownerAnchor)closeOwnerMenu();});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&ownerAnchor)closeOwnerMenu(true);});
 window.addEventListener("scroll",()=>{if(ownerAnchor)positionOwnerMenu();},{passive:true});
 window.addEventListener("resize",()=>{if(ownerAnchor)positionOwnerMenu();},{passive:true});
 const coverOwned=path=>typeof path==="string"&&path.startsWith(ownId+"/cover/")&&!/-original\./.test(path)&&/\.(jpe?g|png|webp)$/i.test(path);
 const coverOriginal=path=>path.replace(/\.(jpe?g|png|webp)$/i,"-original.$1");
 const reopenCoverEditor=async()=>{
  const path=saved?.cover_path;if(!canEdit||mediaBusy()||!coverOwned(path))return;
  coverSourceLoading=true;let file=null;
  try{
   const storage=client.storage.from("covers");let result=await storage.download(coverOriginal(path));
   if(result.error){
    if(!["404","400"].includes(String(result.error.status||result.error.statusCode||""))&&!/not found|does not exist|no such file/i.test(String(result.error.message||"")))throw result.error;
    result=await storage.download(path);
   }
   if(result.error||!(result.data instanceof Blob))throw Error("Cover unavailable");
   if(saved?.cover_path!==path)return;
   const mime=fileTypes[result.data.type]?result.data.type:avatarType(path);
   file=new File([result.data],"cover-source."+fileTypes[mime],{type:mime});
  }catch(_){status(t("Не вдалося завантажити обкладинку для редагування.","Could not load the cover for editing."),true);}
  finally{coverSourceLoading=false;}
  if(file)await startCoverEditor(file);
 };
 const removeCover=async()=>{
  const path=saved?.cover_path;if(!canEdit||mediaBusy()||!coverOwned(path))return;
  if(!await window.VATRA_PROFILE_CONFIRM({title:t("Видалити обкладинку?","Delete cover?"),description:t("Поточне зображення обкладинки буде видалено.","The current cover image will be deleted."),action:t("Видалити","Delete")}))return;
  if(mediaBusy()||saved?.cover_path!==path)return;
  uploading=true;coverChange.disabled=true;let cleared=false;
  try{
   const result=await client.from("profile_media").update({cover_path:null,updated_at:new Date().toISOString()}).eq("vatra_id",ownId).eq("cover_path",path).select("vatra_id,cover_path").maybeSingle();
   if(result.error||!result.data||result.data.cover_path!==null)throw Error("Cover removal not saved");
   saved={...saved,cover_path:null};cleared=true;await display(saved);
   const removed=await client.storage.from("covers").remove([path,coverOriginal(path)]);if(removed.error)throw removed.error;
   status(t("Обкладинку видалено.","Cover deleted."));
  }catch(_){status(cleared?t("Обкладинку прибрано з профілю, але не вдалося очистити файли.","Cover removed from the profile, but file cleanup failed."):t("Не вдалося видалити обкладинку.","Could not delete the cover."),true);}
  finally{uploading=false;coverChange.disabled=false;}
 };
 const startAvatarEditor=async file=>{
  if(!file||avatarFeaturePending||uploading||coverSourceLoading||coverFeaturePending||coverEditor?.busy()||coverDialog.open)return;
  avatarFeaturePending=true;
  try{
   if(!avatarEditor){
    const feature=await window.VATRA_FEATURES.load("avatar-editor");
    avatarEditor=feature.mount({client,ownId,userId,q,t,status,fileAvatar,fileTypes,uploadImage,
     encodeProfileCrop,clamp,canvasPoint,
     parentBusy:()=>uploading||coverFeaturePending||coverEditor?.busy()||coverDialog.open});
   }
   await avatarEditor.start(file);
  }catch(_){
   status(t("Не вдалося відкрити редактор аватара.","Could not open avatar editor."),true);
   fileAvatar.value="";
  }finally{avatarFeaturePending=false;}
 };
 fileAvatar.addEventListener("change",()=>{if(fileAvatar.files?.[0])void startAvatarEditor(fileAvatar.files[0]);});
 window.VATRA_USE_PHOTO_AS_AVATAR=async(blob)=>{
  if(!canEdit||!blob||!fileTypes[blob.type])return false;
  await startAvatarEditor(new File([blob],"profile-photo."+fileTypes[blob.type],{type:blob.type}));
  return !!avatarEditor?.busy();
 };


 const startCoverEditor=async file=>{
  if(!file||uploading||coverSourceLoading||coverFeaturePending||avatarFeaturePending||avatarEditor?.busy())return;
  coverFeaturePending=true;
  try{
   if(!coverEditor){
    const feature=await window.VATRA_FEATURES.load("cover-editor");
    coverEditor=feature.mount({q,t,status,fileCover,photoURLs,fileTypes,uploadImage,
     encodeProfileCrop,clamp,canvasPoint,
     isAvatarBusy:()=>uploading||avatarFeaturePending||avatarEditor?.busy()});
   }
   await coverEditor.start(file);
  }catch(_){
   status(t("Не вдалося відкрити редактор обкладинки.","Could not open the cover editor."),true);
   fileCover.value="";
  }finally{coverFeaturePending=false;}
 };
 fileCover.addEventListener("change",()=>{if(fileCover.files?.[0])void startCoverEditor(fileCover.files[0]);});

}
async function loadOwnHeaderAvatar(client,ownId,email){
 if(!validId(ownId))return {data:null,error:Error("Invalid member ID")};
 try{

  const response=await client.from("profile_media")
   .select("avatar_path,cover_path").eq("vatra_id",ownId).maybeSingle();
  if(response.error)return response;



  window.VATRA_AVATAR?.fromPath(client,email,ownId,response.data?.avatar_path||null);
  return response;
 }catch(error){

  return {data:null,error};
 }
}
function profileDeadline(task,ms=15000){
 let timer;
 return Promise.race([Promise.resolve(task),new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Error("Profile request timed out")),ms);
 })]).finally(()=>clearTimeout(timer));
}
async function start(){
 try{
  const languageReady=profileDeadline(window.VATRA_LANGUAGE?.ready,5000);
  if(!window.supabase?.createClient){
   await languageReady;
   localizeSocial();
   gateError(t("Не вдалося відкрити VATRA","Could not open VATRA"));return;
  }
  const client=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}
  });
  const [{data,error}]=await Promise.all([profileDeadline(client.auth.getUser()),languageReady]);
  localizeSocial();
  if(error&&![401,403].includes(Number(error.status))&&error.name!=="AuthSessionMissingError"&&!["session_expired","session_not_found","refresh_token_not_found","refresh_token_already_used","bad_jwt"].includes(error.code))throw error;
  if(error||!data?.user?.id||!data.user.email_confirmed_at){
   const id=location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1];
   if(!data?.user?.id&&id&&await window.VATRA_GUEST?.profile(client,id))return;
   location.replace(home);return;
  }
  const user=data.user,metadata=user.user_metadata||{};
  const ownName=[metadata.first_name,metadata.last_name]
   .filter(value=>typeof value==="string"&&value.trim())
   .map(value=>value.trim()).join(" ")
   ||String(metadata.full_name||"").trim()||t("Користувач VATRA","VATRA user");
  const cleanOwnName=Array.from(ownName).slice(0,100).join("");
  const nameParts=cleanOwnName.split(/\s+/).filter(Boolean);
  const first=Array.from(nameParts[0]||"V")[0]||"V";
  const last=nameParts.length>1?(Array.from(nameParts[nameParts.length-1])[0]||""):"";
  const ownAvatar=(first+last).toLocaleUpperCase(locale);
  const {data:account,error:accountError}=await profileDeadline(client.from("accounts")
   .select("vatra_id").eq("user_id",user.id).maybeSingle());
  const ownId=String(account?.vatra_id??"");
  if(accountError||!validId(ownId))throw accountError||Error("Account unavailable");
  const pendingDeleteFlush=Promise.resolve().then(()=>window.VATRA_POST_INTERACTIONS?.flushPendingPostDeletes(client,ownId));
  void pendingDeleteFlush.catch(()=>{});
  window.VATRA_PUBLIC_NAMES?.bindViewer?.(client,user.id);
  if(ownId){
   try{void Promise.resolve(window.VATRA_PRESENCE?.start(client,ownId,metadata.gender)).catch(()=>{});}catch(_){}
   try{window.VATRA_NOTIFICATIONS?.start(client,ownId);}catch(_){}
  }
  const headerName=Array.from((typeof metadata.first_name==="string"&&metadata.first_name.trim()?metadata.first_name.trim():cleanOwnName.trim().split(/\s+/)[0])||"VATRA").slice(0,28).join("");
  window.VATRA_AVATAR?.setHeader({client,email:user.email,name:headerName,initials:ownAvatar,id:ownId});
  setMenuLink(ownId);

  window.VATRA_AVATAR?.applyRemembered(q("#feed-header-avatar"),user.email);
  const ownHeaderMedia=loadOwnHeaderAvatar(client,ownId,user.email);
  const form=q("#feed-search-form");
  form?.addEventListener("submit",event=>{
   event.preventDefault();
   const search=q("#feed-search-input").value.trim().slice(0,120);
   location.href=new URL("feed"+(search?"?q="+encodeURIComponent(search):""),home).href;
  });
  const menu=q(".feed-account-menu");
  document.addEventListener("click",event=>{
   if(menu?.open&&!menu.contains(event.target))menu.open=false;
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&menu?.open)menu.open=false;
  });
  q("#feed-logout").addEventListener("click",async()=>{
   const button=q("#feed-logout");button.disabled=true;
   const {error:signOutError}=await client.auth.signOut({scope:"local"});
   if(signOutError){button.disabled=false;return;}
   try{sessionStorage.setItem("vatra-just-signed-out","1");}catch(_){}
   window.VATRA_AVATAR?.clearHeader();
   location.replace(home);
  });

  const requested=location.pathname.match(/\/id([1-9][0-9]{0,18})$/)?.[1]||null;
  const targetId=requested||ownId;
  if(!validId(targetId)){missingProfile();return;}




  const isMine=targetId===ownId;
  const prepared=profileDeadline(window.VATRA_PROFILE_DETAILS.prepare({client,ownId,targetId,isMine}));
  void prepared.catch(()=>{});
  const blockQuery=!isMine&&validId(ownId)?
   Promise.resolve().then(()=>client.from("member_blocks")
    .select("blocker_vatra_id,blocked_vatra_id")
    .or("and(blocker_vatra_id.eq."+ownId+",blocked_vatra_id.eq."+targetId+"),"+
        "and(blocker_vatra_id.eq."+targetId+",blocked_vatra_id.eq."+ownId+")")
    .limit(2)):Promise.resolve({data:[],error:null});
  const [directoryOutcome,publicOutcome,stateOutcome,blockOutcome]=await profileDeadline(Promise.allSettled([
   client.from("member_directory")
    .select("vatra_id").eq("vatra_id",targetId).maybeSingle(),
   Promise.resolve().then(()=>client.from("public_profiles")
    .select("display_name,status_text").eq("vatra_id",targetId).maybeSingle()),
   window.VATRA_AVATAR?.states(client,[targetId])||Promise.resolve(new Map()),
   blockQuery
  ]));
  const publicState=stateOutcome.status==="fulfilled"?stateOutcome.value.get(targetId):null;
  if(publicState==="deleted"||publicState==="blocked"){missingProfile(publicState);return;}
  if(directoryOutcome.status==="rejected")throw directoryOutcome.reason;
  const {data:member,error:directoryError}=directoryOutcome.value;
  if(directoryError)throw directoryError;
  if(!member){missingProfile("not-found");return;}
  if(!isMine&&(blockOutcome.status!=="fulfilled"||blockOutcome.value.error))throw Error("Profile block check unavailable");
  const blockAccess={blockedByMe:false,blockedByThem:false};
  if(blockOutcome.status==="fulfilled"&&!blockOutcome.value.error){
   for(const item of blockOutcome.value.data||[]){
    if(String(item.blocker_vatra_id)===ownId)blockAccess.blockedByMe=true;
    if(String(item.blocker_vatra_id)===targetId)blockAccess.blockedByThem=true;
   }
  }
  const createLink=q("#profile-write-post");
  if(createLink)createLink.hidden=!isMine;
  const storyAction=q("#profile-add-story");
  if(storyAction)storyAction.hidden=!isMine;
  const quickComposer=q("#profile-quick-compose");
  if(quickComposer)quickComposer.hidden=!isMine;
  q("#profile-tab-friends").hidden=true;
  q("#profile-report-open").hidden=isMine;
  if(isMine){
   bindPostComposer(client,user,ownId);
   bindProfileStoryComposer(client,ownId);
  }


  let publicName="",publicStatus="";
  const {data:publicProfile,error:publicError}=publicOutcome.status==="fulfilled"?
   publicOutcome.value:{data:null,error:true};
  if(!publicError&&typeof publicProfile?.display_name==="string"){
   publicName=publicProfile.display_name.trim();
   publicStatus=String(publicProfile.status_text||"");
  }
  const fallback=t("Користувач VATRA","VATRA user")+" · ID "+targetId;
  const name=publicName||(isMine?cleanOwnName:fallback);
  q("#profile-heading").textContent=name;
  q("#profile-avatar").textContent=isMine?ownAvatar:(publicName?(
    publicName.trim().split(/\s+/).filter(Boolean).map(x=>Array.from(x)[0]).slice(0,2).join("").toLocaleUpperCase(locale)
   ):"V");
  setupProfileEdit(client,targetId,isMine,publicStatus,metadata.gender);

  if(isMine){
   q("#profile-about-text").textContent=t(
    "Інформацію про себе поки не додано.",
    "You have not added profile details yet.");
  }
  if(!isMine){
   q("#profile-about-heading").textContent=t("Про мене","About me");
   q("#profile-about-text").textContent=t(
    "Користувач ще не додав інформацію про себе.",
    "This member has not added profile details yet.");
  }



  const preloadedMedia=isMine?ownHeaderMedia:
   Promise.resolve().then(()=>client.from("profile_media")
    .select("avatar_path,cover_path").eq("vatra_id",targetId).maybeSingle())
    .catch(()=>({data:null,error:true}));
  const access=await profileDeadline(window.VATRA_PROFILE_DETAILS.init({client,ownId,targetId,isMine,gender:isMine?metadata.gender:null,blockAccess,prepared}));
  const locked=access?.locked===true;
  const memberBlocked=blockAccess.blockedByMe||blockAccess.blockedByThem;
  if(!memberBlocked&&(publicName||isMine))void window.VATRA_VERIFIED?.attach(client,q("#profile-heading"),targetId);

  document.body.dataset.profileLocked=String(locked);
  if(memberBlocked){
   const nav=q(".social-profile-tabs");
   if(nav)nav.hidden=false;
   for(const tab of nav?.querySelectorAll("[data-profile-tab],#profile-archive-wrap")||[])
    tab.hidden=true;
  }
  if(!memberBlocked)setupProfileInteractions(client,ownId,targetId,isMine);
  setupProfileReports(client,ownId,targetId,isMine,locked);
  setupProfileBlocks(client,ownId,targetId,isMine,blockAccess);
  if(!locked)void setupProfileSocialCards(client,ownId,targetId,isMine).catch(()=>{
   const f=q("#profile-friends-preview-empty"),g=q("#profile-gifts-preview-empty");
   if(f){f.textContent=t("Не вдалося завантажити друзів.","Could not load friends.");f.hidden=false;}
   if(g){g.textContent=t("Не вдалося завантажити подарунки.","Could not load gifts.");g.hidden=false;}
  });
  if(!locked){
   setupProfileExtraSections(client,ownId,targetId,user.id,isMine);
   setupLazyProfileGallery(client,targetId,ownId,user.id);
   setupLazyProfileAlbums(client,ownId,targetId,user.id,isMine);
   setupProfilePostFilters(client,targetId,ownId,user.id);
  }


  const mediaPromise=setupProfileMedia(client,ownId,targetId,isMine,user.id,user.email,locked,preloadedMedia);
  const requestedAction=new URLSearchParams(location.search);
  const sharedPhoto=requestedAction.get("photo")==="avatar";



  const canonical=new URL(memberUrl(targetId));
  const remaining=new URLSearchParams(location.search);
  remaining.delete("vatra_id");
  remaining.delete("message");remaining.delete("item");
  const tail=remaining.toString();
  canonical.search=tail?"?"+tail:"";
  canonical.hash=location.hash;
  if(location.href!==canonical.href)
   history.replaceState(history.state,"",canonical.href);
  const list=q("#profile-posts");
  if(list){
   for(let i=0;i<2;i++){
    const card=node("div","feed-post-placeholder ui-profile-post-placeholder-00"+(i+1));
    card.setAttribute("aria-hidden","true");
    card.append(node("span","feed-post-placeholder-head ui-profile-post-placeholder-head-00"+(i+1)),
     node("span","feed-post-placeholder-line ui-profile-post-placeholder-line-00"+(i+1)));
    list.append(card);
   }
  }
  if(!locked)setupProfilePresence(client,targetId,ownId,metadata.gender);
  const postParam=requestedAction.get("post"),focusPost=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(postParam||"")?postParam:null;
  if(focusPost&&!locked)window.VATRA_PROFILE_CHOOSE_TAB?.("posts");
  const postsPromise=locked?Promise.resolve():pendingDeleteFlush.then(()=>loadPosts(client,targetId,ownId,user.id,false,focusPost)).catch(()=>{const list=q("#profile-posts");list?.querySelectorAll(".feed-post-placeholder").forEach(el=>el.remove());const note=q("#profile-posts-empty");if(note){note.textContent=t("Не вдалося завантажити публікації. Оновіть сторінку.","Could not load posts. Refresh the page.");note.hidden=false;}});


  finish();
  void mediaPromise.catch(()=>{
   q("#profile-cover-image")?.classList.remove("is-loading-media");
   q("#profile-avatar-wrap")?.classList.remove("is-loading-media");
  });
  if(sharedPhoto&&!locked)void mediaPromise.then(()=>window.VATRA_OPEN_PROFILE_AVATAR?.());
  void postsPromise;
 }catch(error){
  console.error("[VATRA] Profile initialization failed:",error);
  gateError(t("Не вдалося завантажити профіль. Оновіть сторінку.",
   "Could not load this profile. Please refresh."));
 }
}
void start();
})();
