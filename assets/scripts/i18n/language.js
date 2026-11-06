(function(){
'use strict';
const translatedLanguages=new Set(['uk','en','pl','de','fr','es','pt','it']);
// One canonical priority for the full language dialog and auth shortcuts.
const vatraPrimaryLanguageOrder=['uk','en','pl','de','es','fr','it','pt'];
const languageCodes=["aa","ab","ae","af","ak","am","an","ar","as","av","ay","az","ba","be","bg","bh","bi","bm","bn","bo","br","bs","ca","ce","ch","co","cr","cs","cv","cy","da","de","dv","dz","ee","el","en","eo","es","et","eu","fa","ff","fi","fj","fo","fr","fy","ga","gd","gl","gn","gu","gv","ha","he","hi","ho","hr","ht","hu","hy","hz","ia","id","ie","ig","ii","ik","io","is","it","iu","ja","jv","ka","kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky","la","lb","lg","li","ln","lo","lt","lu","lv","mg","mh","mi","mk","ml","mn","mr","ms","mt","my","na","nb","nd","ne","ng","nl","nn","no","nr","nv","ny","oc","oj","om","or","os","pa","pi","pl","ps","pt","qu","rm","rn","ro","rw","sa","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur","uz","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zu"];
const ukNames=new Intl.DisplayNames(['uk'],{type:'language'});
const excludedLanguageCodes=new Set(['ru','be']);
const capitalizeLanguage=name=>name?name.slice(0,1).toLocaleUpperCase('uk')+name.slice(1):'';
const languages=languageCodes.filter(code=>!excludedLanguageCodes.has(code)).map(code=>{
 let nativeName=code;
 try{nativeName=new Intl.DisplayNames([code],{type:'language'}).of(code)||code;}catch{}
 const ukrainian=ukNames.of(code)||code;
 return [code,capitalizeLanguage(nativeName)===capitalizeLanguage(ukrainian)?capitalizeLanguage(nativeName):capitalizeLanguage(nativeName)+' — '+capitalizeLanguage(ukrainian)];
}).sort((a,b)=>{
 const ai=vatraPrimaryLanguageOrder.indexOf(a[0]),bi=vatraPrimaryLanguageOrder.indexOf(b[0]);
 if(ai!==-1||bi!==-1)return (ai===-1?Infinity:ai)-(bi===-1?Infinity:bi);
 return a[1].localeCompare(b[1],'uk');
});
const base={
 'Моя сторінка':'My page','Друзі':'Friends','Новини':'News','Повідомлення':'Messages',
 'Спільноти':'Communities','Відео':'Videos','Збережене':'Saved','Налаштування':'Settings',
 'Сповіщення':'Notifications','Фото':'Photos','Фотографії':'Photos','Музика':'Music',
 'Пошук':'Search','Подарунки':'Gifts','Створити допис':'Create post',
 'Мову не знайдено. Спробуйте інший запит.':'No languages found. Try another search.',
 'Що нового у Вас?':'What is new?','Сторінка':'Page','Увійти':'Log in',
 'Створити акаунт':'Create account','Ім’я':'First name','Прізвище':'Last name',
 'Дата народження':'Date of birth','Стать':'Gender','Чоловік':'Male','Жінка':'Female',
 'Електронна пошта':'Email','Телефон':'Phone','Пароль':'Password','Продовжити':'Continue',
 'Зберегти налаштування':'Save settings','Збережено':'Saved','Показати більше':'Show more',
 'Згорнути':'Show less','Вигляд ВАТРИ':'Appearance','Мова інтерфейсу':'Interface language',
 'Тема оформлення':'Theme','Світла':'Light','Темна':'Dark','Як у системі':'System default',
 'Пошук людей і дописів':'Search people and posts','Пошук людей і дописів...':'Search people and posts...',
 'Налаштування сторінки':'Page settings','Акаунт і видалення':'Account & deletion',
 'Приватність':'Privacy','Контакти':'Contacts','Освіта':'Education',"Кар'єра":'Career',
 'Захоплення':'Interests','Військова служба':'Military service','Життєва позиція':'Life outlook',
 'Документи':'Documents','Основна інформація':'Basic information',
 'Правила':'Rules','Умови користування':'Terms of service','Політика конфіденційності':'Privacy policy',
 'Номер телефону':'Phone number','Створити':'Create','Скасувати':'Cancel','Закрити':'Close',
 'Надіслати':'Send','Завантажити':'Upload','Видалити':'Delete','Редагувати':'Edit',
 'Місто / населений пункт':'City or town','Рідне місто':'Hometown'
};
const overrides={
 pl:{'Моя сторінка':'Moja strona','Друзі':'Znajomi','Новини':'Aktualności','Повідомлення':'Wiadomości','Спільноти':'Społeczności','Відео':'Wideo','Збережене':'Zapisane','Налаштування':'Ustawienia','Сповіщення':'Powiadomienia','Музика':'Muzyka','Пошук':'Szukaj','Увійти':'Zaloguj się','Створити акаунт':'Utwórz konto','Ім’я':'Imię','Прізвище':'Nazwisko','Дата народження':'Data urodzenia','Стать':'Płeć','Чоловік':'Mężczyzna','Жінка':'Kobieta','Електронна пошта':'E-mail','Телефон':'Telefon','Пароль':'Hasło','Продовжити':'Kontynuuj','Зберегти налаштування':'Zapisz ustawienia','Мова інтерфейсу':'Język interfejsu','Створити допис':'Utwórz post','Фото':'Zdjęcie','Фотографії':'Zdjęcia','Згорнути':'Zwiń','Показати більше':'Pokaż więcej','Налаштування сторінки':'Ustawienia strony','Пошук людей і дописів':'Szukaj osób i postów'},
 de:{'Моя сторінка':'Meine Seite','Друзі':'Freunde','Новини':'Neuigkeiten','Повідомлення':'Nachrichten','Спільноти':'Communities','Відео':'Videos','Збережене':'Gespeichert','Налаштування':'Einstellungen','Сповіщення':'Benachrichtigungen','Музика':'Musik','Пошук':'Suche','Увійти':'Anmelden','Створити акаунт':'Konto erstellen','Ім’я':'Vorname','Прізвище':'Nachname','Дата народження':'Geburtsdatum','Стать':'Geschlecht','Чоловік':'Mann','Жінка':'Frau','Електронна пошта':'E-Mail','Телефон':'Telefon','Пароль':'Passwort','Продовжити':'Weiter','Зберегти налаштування':'Einstellungen speichern','Мова інтерфейсу':'Sprache','Створити допис':'Beitrag erstellen','Фото':'Foto','Фотографії':'Fotos','Згорнути':'Weniger anzeigen','Показати більше':'Mehr anzeigen','Пошук людей і дописів':'Personen und Beiträge suchen'},
 fr:{'Моя сторінка':'Ma page','Друзі':'Amis','Новини':'Actualités','Повідомлення':'Messages','Спільноти':'Communautés','Відео':'Vidéos','Збережене':'Enregistré','Налаштування':'Paramètres','Сповіщення':'Notifications','Музика':'Musique','Пошук':'Recherche','Увійти':'Connexion','Створити акаунт':'Créer un compte','Ім’я':'Prénom','Прізвище':'Nom','Дата народження':'Date de naissance','Стать':'Genre','Чоловік':'Homme','Жінка':'Femme','Електронна пошта':'E-mail','Телефон':'Téléphone','Пароль':'Mot de passe','Продовжити':'Continuer','Зберегти налаштування':'Enregistrer','Мова інтерфейсу':'Langue','Створити допис':'Créer une publication','Фото':'Photo','Фотографії':'Photos','Згорнути':'Réduire','Показати більше':'Voir plus','Пошук людей і дописів':'Rechercher des personnes et des posts'},
 es:{'Моя сторінка':'Mi página','Друзі':'Amigos','Новини':'Noticias','Повідомлення':'Mensajes','Спільноти':'Comunidades','Відео':'Vídeos','Збережене':'Guardados','Налаштування':'Configuración','Сповіщення':'Notificaciones','Музика':'Música','Пошук':'Buscar','Увійти':'Iniciar sesión','Створити акаунт':'Crear cuenta','Ім’я':'Nombre','Прізвище':'Apellido','Дата народження':'Fecha de nacimiento','Стать':'Género','Чоловік':'Hombre','Жінка':'Mujer','Електронна пошта':'Correo','Телефон':'Teléfono','Пароль':'Contraseña','Продовжити':'Continuar','Зберегти налаштування':'Guardar cambios','Мова інтерфейсу':'Idioma','Створити допис':'Crear publicación','Фото':'Foto','Фотографії':'Fotos','Згорнути':'Mostrar menos','Показати більше':'Mostrar más','Пошук людей і дописів':'Buscar personas y publicaciones'},
 pt:{'Моя сторінка':'Minha página','Друзі':'Amigos','Новини':'Notícias','Повідомлення':'Mensagens','Спільноти':'Comunidades','Відео':'Vídeos','Збережене':'Salvos','Налаштування':'Configurações','Сповіщення':'Notificações','Музика':'Música','Пошук':'Buscar','Увійти':'Entrar','Створити акаунт':'Criar conta','Ім’я':'Nome','Прізвище':'Sobrenome','Дата народження':'Data de nascimento','Стать':'Gênero','Чоловік':'Homem','Жінка':'Mulher','Електронна пошта':'E-mail','Телефон':'Telefone','Пароль':'Senha','Продовжити':'Continuar','Зберегти налаштування':'Salvar configurações','Мова інтерфейсу':'Idioma','Створити допис':'Criar publicação','Фото':'Foto','Фотографії':'Fotos','Згорнути':'Mostrar menos','Показати більше':'Mostrar mais','Пошук людей і дописів':'Buscar pessoas e publicações'},
 it:{'Моя сторінка':'La mia pagina','Друзі':'Amici','Новини':'Notizie','Повідомлення':'Messaggi','Спільноти':'Comunità','Відео':'Video','Збережене':'Salvati','Налаштування':'Impostazioni','Сповіщення':'Notifiche','Музика':'Musica','Пошук':'Cerca','Увійти':'Accedi','Створити акаунт':'Crea account','Ім’я':'Nome','Прізвище':'Cognome','Дата народження':'Data di nascita','Стать':'Genere','Чоловік':'Uomo','Жінка':'Donna','Електронна пошта':'Email','Телефон':'Telefono','Пароль':'Password','Продовжити':'Continua','Зберегти налаштування':'Salva impostazioni','Мова інтерфейсу':'Lingua','Створити допис':'Crea post','Фото':'Foto','Фотографії':'Foto','Згорнути':'Mostra meno','Показати більше':'Mostra altro','Пошук людей і дописів':'Cerca persone e post'}
};
// Additional language foundations for navigation and account UI.
// Not marked as fully localized; untranslated strings remain in Ukrainian.
const partialLanguages=new Set(["cs","sk","ro","hu","nl","sv","da","fi","el","tr","ja","zh","ko","ar","hi","he","et","lt","lv","bg"]);
Object.assign(overrides,{
"cs":{"Моя сторінка":"Moje stránka","Друзі":"Přátelé","Новини":"Novinky","Повідомлення":"Zprávy","Спільноти":"Komunity","Відео":"Videa","Збережене":"Uložené","Налаштування":"Nastavení","Сповіщення":"Oznámení","Музика":"Hudba","Пошук":"Hledat","Увійти":"Přihlásit se","Створити акаунт":"Vytvořit účet","Продовжити":"Pokračovat","Скасувати":"Zrušit","Закрити":"Zavřít","Мова інтерфейсу":"Jazyk rozhraní"},
"sk":{"Моя сторінка":"Moja stránka","Друзі":"Priatelia","Новини":"Novinky","Повідомлення":"Správy","Спільноти":"Komunity","Відео":"Videá","Збережене":"Uložené","Налаштування":"Nastavenia","Сповіщення":"Upozornenia","Музика":"Hudba","Пошук":"Hľadať","Увійти":"Prihlásiť sa","Створити акаунт":"Vytvoriť účet","Продовжити":"Pokračovať","Скасувати":"Zrušiť","Закрити":"Zavrieť","Мова інтерфейсу":"Jazyk rozhrania"},
"ro":{"Моя сторінка":"Pagina mea","Друзі":"Prieteni","Новини":"Noutăți","Повідомлення":"Mesaje","Спільноти":"Comunități","Відео":"Videoclipuri","Збережене":"Salvate","Налаштування":"Setări","Сповіщення":"Notificări","Музика":"Muzică","Пошук":"Căutare","Увійти":"Conectare","Створити акаунт":"Creează cont","Продовжити":"Continuă","Скасувати":"Anulează","Закрити":"Închide","Мова інтерфейсу":"Limba interfeței"},
"hu":{"Моя сторінка":"Saját oldalam","Друзі":"Barátok","Новини":"Hírek","Повідомлення":"Üzenetek","Спільноти":"Közösségek","Відео":"Videók","Збережене":"Mentett","Налаштування":"Beállítások","Сповіщення":"Értesítések","Музика":"Zene","Пошук":"Keresés","Увійти":"Bejelentkezés","Створити акаунт":"Fiók létrehozása","Продовжити":"Folytatás","Скасувати":"Mégse","Закрити":"Bezárás","Мова інтерфейсу":"Felület nyelve"},
"nl":{"Моя сторінка":"Mijn pagina","Друзі":"Vrienden","Новини":"Nieuws","Повідомлення":"Berichten","Спільноти":"Gemeenschappen","Відео":"Video’s","Збережене":"Opgeslagen","Налаштування":"Instellingen","Сповіщення":"Meldingen","Музика":"Muziek","Пошук":"Zoeken","Увійти":"Inloggen","Створити акаунт":"Account maken","Продовжити":"Doorgaan","Скасувати":"Annuleren","Закрити":"Sluiten","Мова інтерфейсу":"Interfacetaal"},
"sv":{"Моя сторінка":"Min sida","Друзі":"Vänner","Новини":"Nyheter","Повідомлення":"Meddelanden","Спільноти":"Grupper","Відео":"Videor","Збережене":"Sparat","Налаштування":"Inställningar","Сповіщення":"Aviseringar","Музика":"Musik","Пошук":"Sök","Увійти":"Logga in","Створити акаунт":"Skapa konto","Продовжити":"Fortsätt","Скасувати":"Avbryt","Закрити":"Stäng","Мова інтерфейсу":"Gränssnittsspråk"},
"da":{"Моя сторінка":"Min side","Друзі":"Venner","Новини":"Nyheder","Повідомлення":"Beskeder","Спільноти":"Fællesskaber","Відео":"Videoer","Збережене":"Gemt","Налаштування":"Indstillinger","Сповіщення":"Notifikationer","Музика":"Musik","Пошук":"Søg","Увійти":"Log ind","Створити акаунт":"Opret konto","Продовжити":"Fortsæt","Скасувати":"Annuller","Закрити":"Luk","Мова інтерфейсу":"Grænsefladesprog"},
"fi":{"Моя сторінка":"Oma sivu","Друзі":"Ystävät","Новини":"Uutiset","Повідомлення":"Viestit","Спільноти":"Yhteisöt","Відео":"Videot","Збережене":"Tallennetut","Налаштування":"Asetukset","Сповіщення":"Ilmoitukset","Музика":"Musiikki","Пошук":"Haku","Увійти":"Kirjaudu sisään","Створити акаунт":"Luo tili","Продовжити":"Jatka","Скасувати":"Peruuta","Закрити":"Sulje","Мова інтерфейсу":"Käyttöliittymän kieli"},
"el":{"Моя сторінка":"Η σελίδα μου","Друзі":"Φίλοι","Новини":"Νέα","Повідомлення":"Μηνύματα","Спільноти":"Κοινότητες","Відео":"Βίντεο","Збережене":"Αποθηκευμένα","Налаштування":"Ρυθμίσεις","Сповіщення":"Ειδοποιήσεις","Музика":"Μουσική","Пошук":"Αναζήτηση","Увійти":"Σύνδεση","Створити акаунт":"Δημιουργία λογαριασμού","Продовжити":"Συνέχεια","Скасувати":"Ακύρωση","Закрити":"Κλείσιμο","Мова інтерфейсу":"Γλώσσα διεπαφής"},
"tr":{"Моя сторінка":"Sayfam","Друзі":"Arkadaşlar","Новини":"Haberler","Повідомлення":"Mesajlar","Спільноти":"Topluluklar","Відео":"Videolar","Збережене":"Kaydedilenler","Налаштування":"Ayarlar","Сповіщення":"Bildirimler","Музика":"Müzik","Пошук":"Ara","Увійти":"Giriş yap","Створити акаунт":"Hesap oluştur","Продовжити":"Devam et","Скасувати":"İptal","Закрити":"Kapat","Мова інтерфейсу":"Arayüz dili"},
"ja":{"Моя сторінка":"マイページ","Друзі":"友達","Новини":"ニュース","Повідомлення":"メッセージ","Спільноти":"コミュニティ","Відео":"動画","Збережене":"保存済み","Налаштування":"設定","Сповіщення":"通知","Музика":"音楽","Пошук":"検索","Увійти":"ログイン","Створити акаунт":"アカウント作成","Продовжити":"続ける","Скасувати":"キャンセル","Закрити":"閉じる","Мова інтерфейсу":"表示言語"},
"zh":{"Моя сторінка":"我的主页","Друзі":"好友","Новини":"动态","Повідомлення":"消息","Спільноти":"社群","Відео":"视频","Збережене":"已保存","Налаштування":"设置","Сповіщення":"通知","Музика":"音乐","Пошук":"搜索","Увійти":"登录","Створити акаунт":"创建账号","Продовжити":"继续","Скасувати":"取消","Закрити":"关闭","Мова інтерфейсу":"界面语言"},
"ko":{"Моя сторінка":"내 페이지","Друзі":"친구","Новини":"소식","Повідомлення":"메시지","Спільноти":"커뮤니티","Відео":"동영상","Збережене":"저장됨","Налаштування":"설정","Сповіщення":"알림","Музика":"음악","Пошук":"검색","Увійти":"로그인","Створити акаунт":"계정 만들기","Продовжити":"계속","Скасувати":"취소","Закрити":"닫기","Мова інтерфейсу":"인터페이스 언어"},
"ar":{"Моя сторінка":"صفحتي","Друзі":"الأصدقاء","Новини":"الأخبار","Повідомлення":"الرسائل","Спільноти":"المجتمعات","Відео":"الفيديوهات","Збережене":"المحفوظات","Налаштування":"الإعدادات","Сповіщення":"الإشعارات","Музика":"الموسيقى","Пошук":"بحث","Увійти":"تسجيل الدخول","Створити акаунт":"إنشاء حساب","Продовжити":"متابعة","Скасувати":"إلغاء","Закрити":"إغلاق","Мова інтерфейсу":"لغة الواجهة"},
"hi":{"Моя сторінка":"मेरा पेज","Друзі":"मित्र","Новини":"समाचार","Повідомлення":"संदेश","Спільноти":"समुदाय","Відео":"वीडियो","Збережене":"सहेजे गए","Налаштування":"सेटिंग्स","Сповіщення":"सूचनाएँ","Музика":"संगीत","Пошук":"खोजें","Увійти":"लॉग इन","Створити акаунт":"खाता बनाएँ","Продовжити":"जारी रखें","Скасувати":"रद्द करें","Закрити":"बंद करें","Мова інтерфейсу":"इंटरफ़ेस भाषा"},
"he":{"Моя сторінка":"העמוד שלי","Друзі":"חברים","Новини":"חדשות","Повідомлення":"הודעות","Спільноти":"קהילות","Відео":"סרטונים","Збережене":"שמורים","Налаштування":"הגדרות","Сповіщення":"התראות","Музика":"מוזיקה","Пошук":"חיפוש","Увійти":"התחברות","Створити акаунт":"יצירת חשבון","Продовжити":"המשך","Скасувати":"ביטול","Закрити":"סגירה","Мова інтерфейсу":"שפת ממשק"},
"et":{"Моя сторінка":"Minu leht","Друзі":"Sõbrad","Новини":"Uudised","Повідомлення":"Sõnumid","Спільноти":"Kogukonnad","Відео":"Videod","Збережене":"Salvestatud","Налаштування":"Seaded","Сповіщення":"Teavitused","Музика":"Muusika","Пошук":"Otsing","Увійти":"Logi sisse","Створити акаунт":"Loo konto","Продовжити":"Jätka","Скасувати":"Tühista","Закрити":"Sulge","Мова інтерфейсу":"Liidese keel"},
"lt":{"Моя сторінка":"Mano puslapis","Друзі":"Draugai","Новини":"Naujienos","Повідомлення":"Žinutės","Спільноти":"Bendruomenės","Відео":"Vaizdo įrašai","Збережене":"Išsaugota","Налаштування":"Nustatymai","Сповіщення":"Pranešimai","Музика":"Muzika","Пошук":"Paieška","Увійти":"Prisijungti","Створити акаунт":"Sukurti paskyrą","Продовжити":"Tęsti","Скасувати":"Atšaukti","Закрити":"Uždaryti","Мова інтерфейсу":"Sąsajos kalba"},
"lv":{"Моя сторінка":"Mana lapa","Друзі":"Draugi","Новини":"Jaunumi","Повідомлення":"Ziņojumi","Спільноти":"Kopienas","Відео":"Video","Збережене":"Saglabātie","Налаштування":"Iestatījumi","Сповіщення":"Paziņojumi","Музика":"Mūzika","Пошук":"Meklēt","Увійти":"Pieteikties","Створити акаунт":"Izveidot kontu","Продовжити":"Turpināt","Скасувати":"Atcelt","Закрити":"Aizvērt","Мова інтерфейсу":"Saskarnes valoda"},
"bg":{"Моя сторінка":"Моята страница","Друзі":"Приятели","Новини":"Новини","Повідомлення":"Съобщения","Спільноти":"Общности","Відео":"Видеа","Збережене":"Запазени","Налаштування":"Настройки","Сповіщення":"Известия","Музика":"Музика","Пошук":"Търсене","Увійти":"Вход","Створити акаунт":"Създай акаунт","Продовжити":"Продължи","Скасувати":"Отказ","Закрити":"Затвори","Мова інтерфейсу":"Език на интерфейса"}
});
Object.assign(base,{
 'Редагувати сторінку':'Edit page',
 'Редагування сторінки':'Edit page',
 'Розділи сторінки':'Page sections',
 'Зберегти зміни':'Save changes',
 'Налаштування ВАТРИ':'VATRA settings',
 'Пошук OpenStreetMap':'OpenStreetMap search',
 'Обробка:':'Processing:'
});
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
 return footerLabels[language]?.[original]||overrides[language]?.[original]||(language==='en'?base[original]:null)||original;
}
const additionalEnglish={
 'УКРАЇНСЬКА СОЦІАЛЬНА МЕРЕЖА':'UKRAINIAN SOCIAL NETWORK',
 'Твої люди.':'Your people.','Твої історії.':'Your stories.','Твоя ВАТРА.':'Your VATRA.',
 'Ваші люди.':'Your people.','Ваші історії.':'Your stories.','Ваша ВАТРА.':'Your VATRA.',
 'Українська соціальна мережа для спілкування та обміну моментами.':'A Ukrainian social network for meaningful conversations and sharing moments.',
 'РАДІ БАЧИТИ ЗНОВУ':'GOOD TO SEE YOU AGAIN','З поверненням до ВАТРИ':'Welcome back to VATRA',
 'Увійдіть, щоб побачити свою стрічку та друзів.':'Sign in to see your feed and friends.',
 'Спосіб входу або реєстрації':'Sign-in or registration method',
 'Вхід за паролем · без коду':'Password sign-in · no code',
 'Вхід за паролем · без SMS-коду':'Password sign-in · no SMS',
 'Номер телефону':'Phone number','Введіть пароль':'Enter your password',
 'Показати':'Show','Приховати':'Hide','Забули пароль?':'Forgot password?',
 'Зареєструватися':'Sign up','Ще немає акаунта?':'New to VATRA?',
 'Повторіть пароль':'Confirm password','Погоджуюся':'I agree',
 'Про розробника':'About the creator','Документи ВАТРИ':'VATRA documents',
 'Умови користування':'Terms of service','Правила спільноти':'Community rules',
 'Політика конфіденційності':'Privacy policy',
 'Правила спільноти ВАТРИ':'VATRA community rules',
 'Повага. Відкритість. Спільність.':'Respect. Openness. Community.',
 'З поверненням до ВАТРИ':'Welcome back to VATRA',
 'Мова сайту':'Site language','Мова інтерфейсу':'Interface language',
 'Вигляд ВАТРИ':'VATRA appearance','Є незбережені зміни.':'You have unsaved changes.',
 'Мої фотографії':'My photos',
 'Про себе':'About me','Додати в друзі':'Add friend','Написати':'Message',
 'У друзях':'Friends','Видалити з друзів':'Remove friend',
 'Поскаржитися':'Report','Заблокувати':'Block','Інші дії':'More actions',
 'Усі друзі':'All friends','Відповісти':'Reply','Коментарі':'Comments',
 'Учасники':'Members','Дописи':'Posts','Фотографії':'Photos',
 'Показати більше':'Show more','Згорнути':'Show less',
 'Інформація':'Information','Контакти':'Contacts','Навчання':'Education',
 'Керувати спільнотою':'Manage community','Основна інформація':'Basic information',
 'Контент і коментарі':'Content and comments','Керівники й учасники':'Team and members',
 'Заплановані дописи':'Scheduled posts','Зберегти зміни':'Save changes',
 'Мої':'Mine','Безкоштовні':'Free','Платні':'Premium',
 'Мої подарунки':'My gifts','Подарувати другу':'Send as gift',
 'Відкрити':'Open','Місце для реклами':'Advertising space'
};
Object.assign(base,additionalEnglish);

/* VATRA Circle: accurate first-impression copy in the eight supported full UI languages. */
const vatraCircleTranslations={
  "en": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "SOCIAL NETWORK · CREATED IN UKRAINE",
    "тут починається твоє коло": "your circle starts here",
    "ВАТРА — тут починається твоє коло": "VATRA — your circle starts here",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Find friends, share moments, listen to music and discover communities that share your interests. Everything for connecting in one place.",
    "Друзі й повідомлення": "Friends and messages",
    "Дописи, фото та відео": "Posts, photos and videos",
    "Музика й спільноти": "Music and communities",
    "Твої люди. Твої моменти. Твій простір.": "Your people. Your moments. Your space.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "Your people. Your moments. Your space. Friends, photos, music and communities — all in one place.",
    "Запросити друзів": "Invite friends"
  },
  "pl": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "SIEĆ SPOŁECZNOŚCIOWA · STWORZONA W UKRAINIE",
    "тут починається твоє коло": "tu zaczyna się Twoje grono",
    "ВАТРА — тут починається твоє коло": "VATRA — tu zaczyna się Twoje grono",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Znajduj znajomych, dziel się chwilami, słuchaj muzyki i odkrywaj społeczności swoich zainteresowań. Wszystko do kontaktu w jednym miejscu.",
    "Друзі й повідомлення": "Znajomi i wiadomości",
    "Дописи, фото та відео": "Posty, zdjęcia i filmy",
    "Музика й спільноти": "Muzyka i społeczności",
    "Твої люди. Твої моменти. Твій простір.": "Twoi ludzie. Twoje chwile. Twoja przestrzeń.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "Twoi ludzie. Twoje chwile. Twoja przestrzeń. Znajomi, zdjęcia, muzyka i społeczności — w jednym miejscu.",
    "Запросити друзів": "Zaproś znajomych"
  },
  "de": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "SOZIALES NETZWERK · IN DER UKRAINE ENTWICKELT",
    "тут починається твоє коло": "hier beginnt dein Kreis",
    "ВАТРА — тут починається твоє коло": "VATRA — hier beginnt dein Kreis",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Finde Freunde, teile Momente, höre Musik und entdecke Communities rund um deine Interessen. Alles für den Austausch an einem Ort.",
    "Друзі й повідомлення": "Freunde und Nachrichten",
    "Дописи, фото та відео": "Beiträge, Fotos und Videos",
    "Музика й спільноти": "Musik und Communities",
    "Твої люди. Твої моменти. Твій простір.": "Deine Menschen. Deine Momente. Dein Raum.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "Deine Menschen. Deine Momente. Dein Raum. Freunde, Fotos, Musik und Communities — an einem Ort.",
    "Запросити друзів": "Freunde einladen"
  },
  "fr": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "RÉSEAU SOCIAL · CRÉÉ EN UKRAINE",
    "тут починається твоє коло": "ton cercle commence ici",
    "ВАТРА — тут починається твоє коло": "VATRA — ton cercle commence ici",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Retrouve des amis, partage des moments, écoute de la musique et découvre des communautés qui te ressemblent. Tout pour échanger au même endroit.",
    "Друзі й повідомлення": "Amis et messages",
    "Дописи, фото та відео": "Publications, photos et vidéos",
    "Музика й спільноти": "Musique et communautés",
    "Твої люди. Твої моменти. Твій простір.": "Tes proches. Tes moments. Ton espace.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "Tes proches. Tes moments. Ton espace. Amis, photos, musique et communautés — au même endroit.",
    "Запросити друзів": "Inviter des amis"
  },
  "es": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "RED SOCIAL · CREADA EN UCRANIA",
    "тут починається твоє коло": "aquí comienza tu círculo",
    "ВАТРА — тут починається твоє коло": "VATRA — aquí comienza tu círculo",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Encuentra amigos, comparte momentos, escucha música y descubre comunidades que comparten tus intereses. Todo para conectar en un solo lugar.",
    "Друзі й повідомлення": "Amigos y mensajes",
    "Дописи, фото та відео": "Publicaciones, fotos y vídeos",
    "Музика й спільноти": "Música y comunidades",
    "Твої люди. Твої моменти. Твій простір.": "Tu gente. Tus momentos. Tu espacio.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "Tu gente. Tus momentos. Tu espacio. Amigos, fotos, música y comunidades — en un solo lugar.",
    "Запросити друзів": "Invitar a amigos"
  },
  "pt": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "REDE SOCIAL · CRIADA NA UCRÂNIA",
    "тут починається твоє коло": "aqui começa o teu círculo",
    "ВАТРА — тут починається твоє коло": "VATRA — aqui começa o teu círculo",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Encontra amigos, partilha momentos, ouve música e descobre comunidades dos teus interesses. Tudo para te ligares num só lugar.",
    "Друзі й повідомлення": "Amigos e mensagens",
    "Дописи, фото та відео": "Publicações, fotos e vídeos",
    "Музика й спільноти": "Música e comunidades",
    "Твої люди. Твої моменти. Твій простір.": "As tuas pessoas. Os teus momentos. O teu espaço.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "As tuas pessoas. Os teus momentos. O teu espaço. Amigos, fotos, música e comunidades — num só lugar.",
    "Запросити друзів": "Convidar amigos"
  },
  "it": {
    "СОЦІАЛЬНА МЕРЕЖА · СТВОРЕНА В УКРАЇНІ": "SOCIAL NETWORK · CREATO IN UCRAINA",
    "тут починається твоє коло": "qui inizia la tua cerchia",
    "ВАТРА — тут починається твоє коло": "VATRA — qui inizia la tua cerchia",
    "Знаходь друзів, ділись моментами, слухай музику та відкривай спільноти за інтересами. Усе для спілкування — в одному місці.": "Trova amici, condividi momenti, ascolta musica e scopri comunità legate ai tuoi interessi. Tutto per restare in contatto in un unico posto.",
    "Друзі й повідомлення": "Amici e messaggi",
    "Дописи, фото та відео": "Post, foto e video",
    "Музика й спільноти": "Musica e comunità",
    "Твої люди. Твої моменти. Твій простір.": "Le tue persone. I tuoi momenti. Il tuo spazio.",
    "Твої люди. Твої моменти. Твій простір. Друзі, фотографії, музика і спільноти — в одному місці.": "Le tue persone. I tuoi momenti. Il tuo spazio. Amici, foto, musica e comunità — tutto in un unico posto.",
    "Запросити друзів": "Invita amici"
  }
};
Object.assign(base,vatraCircleTranslations.en);

/* VATRA Circle: translate existing email/password form guidance alongside the hero. */
const vatraAuthFlowTranslations={
  "en": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Sign in with your email address or phone number and password.",
    "Вхід з паролем": "Password sign-in",
    "Вхід за номером і паролем": "Sign in with phone and password",
    "Введіть пароль": "Enter your password",
    "Запам’ятати мене": "Remember me",
    "Не виходити після закриття браузера": "Stay signed in after closing the browser",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Fill in your details and confirm your email with a VATRA code. Your page will then be created.",
    "SMS-реєстрація поки недоступна": "SMS registration is not yet available",
    "Код у SMS — скоро": "SMS code — coming soon",
    "Підтвердження email-кодом": "Confirmation by email code",
    "Створіть акаунт ВАТРИ": "Create your VATRA account",
    "ВАТРА — тут починається твоє коло": "VATRA — your circle starts here"
  },
  "pl": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Zaloguj się przez e-mail lub numer telefonu i hasło.",
    "Вхід з паролем": "Logowanie hasłem",
    "Вхід за номером і паролем": "Logowanie numerem telefonu i hasłem",
    "Введіть пароль": "Wpisz hasło",
    "Запам’ятати мене": "Zapamiętaj mnie",
    "Не виходити після закриття браузера": "Nie wylogowuj po zamknięciu przeglądarki",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Uzupełnij dane i potwierdź e-mail kodem VATRA. Po potwierdzeniu powstanie Twoja strona.",
    "SMS-реєстрація поки недоступна": "Rejestracja przez SMS jest jeszcze niedostępna",
    "Код у SMS — скоро": "Kod SMS — wkrótce",
    "Підтвердження email-кодом": "Potwierdzenie kodem e-mail",
    "Створіть акаунт ВАТРИ": "Utwórz konto VATRA",
    "ВАТРА — тут починається твоє коло": "VATRA — tu zaczyna się Twoje grono"
  },
  "de": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Melde dich mit E-Mail-Adresse oder Telefonnummer und Passwort an.",
    "Вхід з паролем": "Anmeldung mit Passwort",
    "Вхід за номером і паролем": "Mit Telefonnummer und Passwort anmelden",
    "Введіть пароль": "Passwort eingeben",
    "Запам’ятати мене": "Angemeldet bleiben",
    "Не виходити після закриття браузера": "Nach dem Schließen des Browsers angemeldet bleiben",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Gib deine Daten ein und bestätige deine E-Mail mit einem VATRA-Code. Danach wird deine Seite erstellt.",
    "SMS-реєстрація поки недоступна": "SMS-Registrierung ist noch nicht verfügbar",
    "Код у SMS — скоро": "SMS-Code — demnächst",
    "Підтвердження email-кодом": "Bestätigung per E-Mail-Code",
    "Створіть акаунт ВАТРИ": "VATRA-Konto erstellen",
    "ВАТРА — тут починається твоє коло": "VATRA — hier beginnt dein Kreis"
  },
  "fr": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Connecte-toi avec ton adresse e-mail ou ton numéro de téléphone et ton mot de passe.",
    "Вхід з паролем": "Connexion par mot de passe",
    "Вхід за номером і паролем": "Connexion par téléphone et mot de passe",
    "Введіть пароль": "Saisir le mot de passe",
    "Запам’ятати мене": "Se souvenir de moi",
    "Не виходити після закриття браузера": "Rester connecté après fermeture du navigateur",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Renseigne tes informations et confirme ton e-mail avec un code VATRA. Ta page sera ensuite créée.",
    "SMS-реєстрація поки недоступна": "L’inscription par SMS n’est pas encore disponible",
    "Код у SMS — скоро": "Code SMS — bientôt",
    "Підтвердження email-кодом": "Confirmation par code e-mail",
    "Створіть акаунт ВАТРИ": "Créer un compte VATRA",
    "ВАТРА — тут починається твоє коло": "VATRA — ton cercle commence ici"
  },
  "es": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Inicia sesión con tu correo electrónico o número de teléfono y contraseña.",
    "Вхід з паролем": "Inicio de sesión con contraseña",
    "Вхід за номером і паролем": "Entrar con teléfono y contraseña",
    "Введіть пароль": "Introduce tu contraseña",
    "Запам’ятати мене": "Recordarme",
    "Не виходити після закриття браузера": "Mantener la sesión al cerrar el navegador",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Rellena tus datos y confirma el correo con un código de VATRA. Tu página se creará después.",
    "SMS-реєстрація поки недоступна": "El registro por SMS aún no está disponible",
    "Код у SMS — скоро": "Código SMS — próximamente",
    "Підтвердження email-кодом": "Confirmación mediante código por correo",
    "Створіть акаунт ВАТРИ": "Crear una cuenta de VATRA",
    "ВАТРА — тут починається твоє коло": "VATRA — aquí comienza tu círculo"
  },
  "pt": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Inicia sessão com o teu e-mail ou número de telefone e palavra-passe.",
    "Вхід з паролем": "Iniciar sessão com palavra-passe",
    "Вхід за номером і паролем": "Entrar com telefone e palavra-passe",
    "Введіть пароль": "Introduz a palavra-passe",
    "Запам’ятати мене": "Manter sessão",
    "Не виходити після закриття браузера": "Manter sessão após fechar o navegador",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Preenche os teus dados e confirma o e-mail com um código VATRA. A tua página será criada em seguida.",
    "SMS-реєстрація поки недоступна": "O registo por SMS ainda não está disponível",
    "Код у SMS — скоро": "Código SMS — em breve",
    "Підтвердження email-кодом": "Confirmação com código por e-mail",
    "Створіть акаунт ВАТРИ": "Criar conta VATRA",
    "ВАТРА — тут починається твоє коло": "VATRA — aqui começa o teu círculo"
  },
  "it": {
    "Увійдіть до свого акаунта за допомогою email або номера телефону та пароля.": "Accedi con il tuo indirizzo e-mail o numero di telefono e la password.",
    "Вхід з паролем": "Accesso con password",
    "Вхід за номером і паролем": "Accedi con telefono e password",
    "Введіть пароль": "Inserisci la password",
    "Запам’ятати мене": "Ricordami",
    "Не виходити після закриття браузера": "Resta connesso dopo aver chiuso il browser",
    "Заповніть дані та підтвердьте електронну пошту кодом VATRA. Після підтвердження створиться Ваша сторінка.": "Inserisci i tuoi dati e conferma l'e-mail con un codice VATRA. La tua pagina verrà creata in seguito.",
    "SMS-реєстрація поки недоступна": "La registrazione via SMS non è ancora disponibile",
    "Код у SMS — скоро": "Codice SMS — prossimamente",
    "Підтвердження email-кодом": "Conferma tramite codice e-mail",
    "Створіть акаунт ВАТРИ": "Crea un account VATRA",
    "ВАТРА — тут починається твоє коло": "VATRA — qui inizia la tua cerchia"
  }
};
Object.assign(base,vatraAuthFlowTranslations.en);
// Country calling-code search labels for the eight available interface languages.
Object.assign(base,{'Пошук країни або коду':'Search country or calling code','Країн не знайдено':'No countries found'});
const vatraCountrySearchLabels={
 pl:{'Пошук країни або коду':'Szukaj kraju lub numeru kierunkowego','Країн не знайдено':'Nie znaleziono krajów'},
 de:{'Пошук країни або коду':'Land oder Vorwahl suchen','Країн не знайдено':'Keine Länder gefunden'},
 fr:{'Пошук країни або коду':'Rechercher un pays ou indicatif','Країн не знайдено':'Aucun pays trouvé'},
 es:{'Пошук країни або коду':'Buscar país o prefijo','Країн не знайдено':'No se encontraron países'},
 pt:{'Пошук країни або коду':'Pesquisar país ou indicativo','Країн не знайдено':'Nenhum país encontrado'},
 it:{'Пошук країни або коду':'Cerca paese o prefisso','Країн не знайдено':'Nessun paese trovato'}
};
for(const [locale,labels] of Object.entries(vatraCountrySearchLabels))Object.assign(overrides[locale]||(overrides[locale]={}),labels);
for(const [locale,labels] of Object.entries(vatraAuthFlowTranslations)){
 if(locale!=='en')Object.assign(overrides[locale]||(overrides[locale]={}),labels);
}

for(const [locale,labels] of Object.entries(vatraCircleTranslations)){
 if(locale==='en')continue;
 Object.assign(overrides[locale]||(overrides[locale]={}),labels);
}


Object.assign(base,{
 'Вхід до ВАТРИ':'Sign in to VATRA',
 'УКРАЇНСЬКА МЕРЕЖА':'UKRAINIAN NETWORK',
 'Готуємо Вашу ВАТРУ':'Preparing your VATRA',
 'Ще мить — і Ви у своєму просторі':'Your space is almost ready',
 'Завантаження сторінки…':'Loading page…',
 'Ваші люди':'Your people','Ваші історії':'Your stories','Ваша ВАТРА':'Your VATRA',
 'Про розробника ↗':'About the developer ↗','Про розробника ВАТРИ':'About the creator of VATRA',
 'Я самостійно розробляю ВАТРУ':'I am developing VATRA independently',
 'Детальніше ↗':'Learn more ↗',
 'Потрібна для налаштування вікових функцій. За замовчуванням дата буде приватною.':'Used for age-appropriate features. Your date of birth is private by default.',
 'Захист від ботів активується після налаштування CAPTCHA у параметрах авторизації та додавання публічного ключа сайту.':'Bot protection activates after CAPTCHA is configured.',
 'Я погоджуюся з':'I agree to',
 'та':'and','і підтверджую, що ознайомився(-лася) з':'and confirm that I have read',
 'ВАТРИ.':'of VATRA.',
 '© 2026 ВАТРА · Українська соціальна мережа':'© 2026 VATRA · Ukrainian social network',
 'ВІДНОВЛЕННЯ ДОСТУПУ':'ACCOUNT RECOVERY',
 'Повернення до ВАТРИ':'Return to VATRA',
 'Куди надіслати підтвердження?':'Where should we send confirmation?',
 'Посилання для створення нового пароля':'Password reset link',
 'Код у SMS':'Code by SMS','Захист ВАТРИ':'VATRA security',
 'Розв’яжіть короткий приклад, щоб продовжити.':'Solve a short exercise to continue.',
 'Ця перевірка допомагає захистити акаунти від автоматизованих запитів.':'This check helps protect accounts from automated requests.',
 'Код із SMS':'SMS code','Новий пароль':'New password',
 'Повторіть новий пароль':'Confirm new password','Надіслати інструкцію':'Send instructions',
 'Якщо акаунт існує, повідомлення надійде на вказаний контакт. Не передавайте код нікому.':'If the account exists, you will receive a message at that contact. Never share your code.',
 'Зрозуміло':'Got it','Мої скарги':'My reports','Адмінпанель ВАТРИ':'VATRA admin panel',
 'Верифікація акаунта':'Account verification','Зв’язатися з техпідтримкою':'Contact support',
 'Акаунт і видалення':'Account and deletion','Приватність сторінки':'Profile privacy',
 'Життєва позиція':'Life outlook','Кар’єра':'Career','Військова служба':'Military service',
 'Захоплення':'Interests','Освіта':'Education',
 'Зберегти налаштування':'Save settings','Тема оформлення':'Appearance theme',
 'Додаткова інформація сторінки':'More profile details',
 'Показати всі':'Show all','Усі учасники':'All members',
 'Слухати':'Listen','Користувач':'User','Користувач ВАТРИ':'VATRA user'
});

Object.assign(base,{
 'Загальні':'General','Сповіщення ВАТРИ':'VATRA notifications',
 'Налаштуйте, які події показувати у внутрішньому центрі сповіщень. Системні повідомлення про безпеку залишаються доступними.':'Choose which events appear in VATRA notifications. Security alerts remain available.',
 'Вподобання дописів':'Post likes','Вподобання фотографій':'Photo likes','Коментарі':'Comments',
 'Відповіді на коментарі':'Comment replies','Коментарі до фото':'Photo comments',
 'Вподобання коментарів':'Comment likes','Запити в друзі':'Friend requests',
 'Нові дописи спільнот':'New community posts','Звуки нових подій':'Notification sounds',
 'Сповіщення оновлено.':'Notification preferences updated.',
 'Сповіщення':'Notifications','Чорний список':'Blocked users','Акаунт і безпека':'Account and security',
 'Виберіть мову ВАТРИ. Зміни застосовуються одразу, без перезавантаження. Для мов із неповним перекладом інтерфейс тимчасово залишиться українською.':'Choose your VATRA language. Changes apply instantly. Untranslated sections may remain in Ukrainian.',
 'Виберіть мову інтерфейсу. Поточна мова позначена галочкою.':'Choose your interface language. The selected language is checked.',
 'Мова ВАТРИ':'VATRA language','Мова сайту':'Site language','Знайти мову…':'Find a language…',
 'Мови з перекладом':'Languages with translations','Частковий переклад інтерфейсу':'Partially translated',
 'Інші мови · переклад готується':'Other languages · translation in progress',
 'Обрати мову':'Choose language','Мова інтерфейсу':'Interface language',
 'Мої фотографії':'My photos','Мої друзі':'My friends','Мої відео':'My videos','Усі фото':'All photos',
 'Додати фото':'Add photo','Відкрити повний альбом':'Open full album',
 'Відкрити повний альбом (52)':'Open full album (52)',
 'Попередні':'Previous','Наступні':'Next','Попередні фотографії':'Previous photos','Наступні фотографії':'Next photos',
 'Оберіть фото сторінки':'Choose profile photo','Обрати фото сторінки':'Choose profile photo','Встановити фото':'Set profile photo',
 'Усі фото':'All photos','Історія':'History','Із дописів':'From posts','Альбоми':'Albums',
 'Збережених фотографій не знайдено. Завантажте нове фото.':'No saved photos found. Upload a new photo.',
 'Налаштування сторінки':'Page settings','Налаштування':'Settings','Загальні налаштування':'General settings',
 'Видалити акаунт':'Delete account','Усі учасники':'All members','Сімейний стан':'Relationship status','Знання мов':'Languages',
 'Про родину':'About family','Особисте':'Personal','Діяльність':'Activities','Улюблена музика':'Favorite music',
 'Улюблені фільми':'Favorite movies','Улюблені книги':'Favorite books','Улюблені телешоу':'Favorite TV shows',
 'Улюблені ігри':'Favorite games','Улюблені цитати':'Favorite quotes','Навчальні заклади':'Schools',
 'Місця роботи':'Workplaces','Про службу':'Service','Записи про службу':'Service history',
 'Погляди та переконання':'Beliefs and views','Політичні погляди':'Political views','Світогляд':'Worldview',
 'Головне в житті':'Life priorities','Головне в людях':'What I value in others',
 'Ставлення до куріння':'Smoking','Ставлення до алкоголю':'Alcohol','Надихають':'Inspiration',
 'День народження':'Birthday','Місце проживання':'Location','Рідне місто':'Hometown',
 'Місце роботи':'Workplace','Вебсайт':'Website','Відкрити сторінку':'Open profile','Додати друга':'Add friend',
 'Сторінку приховано':'Profile hidden','Поки немає дописів':'No posts yet',
 'Цей користувач ще нічого не опублікував.':'This user has not published anything yet.',
 'Лише для себе':'Only me','Для друзів':'Friends only','Для всіх':'Everyone',
 'Створити допис':'Create post','Опублікувати':'Publish','Редагувати допис':'Edit post','Видалити допис':'Delete post',
 'Показати повністю':'Show more','Згорнути':'Show less',
 'Перекласти':'Translate','Показати оригінал':'Show original',
 'Моя музика':'My music','Слухати':'Listen','Слухати добірку':'Play collection',
 'Знайти друзів':'Find friends','За запитом нікого не знайдено.':'No people found matching your search.',
 'Моя стрічка':'My feed','Увійдіть, щоб переглянути власні відео.':'Sign in to view your videos.',
 'Відеозаписів поки немає.':'No videos yet.','Короткі вертикальні відео від спільноти ВАТРИ.':'Short vertical videos shared by the VATRA community.',
 'Швидка перевірка':'Quick check','Скільки буде':'What is','Обчисліть суму та виберіть правильну відповідь.':'Calculate the sum and select the correct answer.',
 'Правила ВАТРИ':'VATRA rules','Правила спільноти ВАТРИ':'VATRA community rules',
 'Вступ':'Introduction','Про розробника':'About the developer',
 'Надіслати скаргу':'Submit a report','Зв’язатися з техпідтримкою':'Contact support',
 'Технічна підтримка':'Technical support','Нове звернення':'New request','Мої звернення':'My requests',
 'Завантажити аватар':'Upload avatar','Прибрати фото':'Remove photo','Фотографії':'Photos',
 'Скасувати':'Cancel','Зберегти':'Save','Закрити':'Close'
});
const flagRegions={uk:'UA',en:'GB',pl:'PL',de:'DE',fr:'FR',es:'ES',pt:'PT',it:'IT',zh:'CN',ja:'JP',ko:'KR',ar:'SA',hi:'IN',yi:'IL',eo:'EU'};
function languageFlag(code){
 let region=flagRegions[code]||'';
 if(!region)try{region=new Intl.Locale(code).maximize().region||'';}catch{}
 if(!/^[A-Z]{2}$/.test(region))return '🌐';
 return [...region].map(ch=>String.fromCodePoint(ch.charCodeAt(0)+127397)).join('');
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
try{language=new URL(location.href).searchParams.get('lang')||localStorage.getItem('vatra-language')||'uk';}catch{try{language=localStorage.getItem('vatra-language')||'uk';}catch{}}
if(!languages.some(pair=>pair[0]===language))language='uk';
const saved=new WeakMap();
let running=false;
function translateText(node){
 const parent=node.parentElement;
 if(!parent||parent.closest('script,style,textarea,option,[contenteditable],.post-text,.vatra-post-text,.comment-copy,.message-body,.vatra-messenger-text,.vatra-notification-text,.vatra-feed-post-text,.vatra-profile-bio,.profile-bio,.vatra-profile-status,.vatra-translation-result'))return;
 const text=node.nodeValue;
 if(!text||!text.trim())return;
 let record=saved.get(node);
 if(!record||text!==record.last){
  record={original:text,last:text};
  saved.set(node,record);
 }
 const original=record.original.trim();
 if(!base[original]&&!footerLabelKeys.has(original)&&!overrides[language]?.[original])return;
 const value=interfaceLabel(original);
 const whitespaceLeft=record.original.match(/^\s*/)[0],whitespaceRight=record.original.match(/\s*$/)[0];
 const translated=whitespaceLeft+value+whitespaceRight;
 if(text!==translated){node.nodeValue=translated;record.last=translated;}
}
function translateRoot(root){
 if(root.nodeType===3){translateText(root);return;}
 if(root.nodeType!==1&&root.nodeType!==9)return;
 const allowed=root.matches?.('.auth-layout,.layout,.topbar,.mobile-nav,.mobile-menu,.settings-page,.quick-compose,.vatra-settings-nav,.vatra-settings-pane,.vatra-site-legal-head,.vatra-footer-legal,.vatra-gifts-page,.vatra-group-view,.vatra-profile-layout,.vatra-avatar-pick-dialog,.vatra-language-dialog,.vatra-music-page,.vatra-suspended-own-screen,dialog[open]');
 if(!allowed&&!root.closest?.('.auth-layout,.layout,.topbar,.mobile-nav,.mobile-menu,.settings-page,.quick-compose,.vatra-settings-nav,.vatra-settings-pane,.vatra-site-legal-head,.vatra-footer-legal,.vatra-gifts-page,.vatra-group-view,.vatra-profile-layout,.vatra-avatar-pick-dialog,.vatra-language-dialog,.vatra-music-page,.vatra-suspended-own-screen,dialog[open]')){
  root.querySelectorAll?.('.auth-layout,.layout,.topbar,.mobile-nav,.mobile-menu,.settings-page,.quick-compose,.vatra-settings-nav,.vatra-settings-pane,.vatra-site-legal-head,.vatra-footer-legal,.vatra-gifts-page,.vatra-group-view,.vatra-profile-layout,.vatra-avatar-pick-dialog,.vatra-language-dialog,.vatra-music-page,.vatra-suspended-own-screen,dialog[open]').forEach(translateRoot);
  return;
 }
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(walker.nextNode())translateText(walker.currentNode);
 root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach(el=>{
   if(el.matches('input[type="tel"]'))return; // Keep the live country-specific phone example.
  const original=el.dataset.vatraOriginalPlaceholder||el.getAttribute('placeholder');
  if(!el.dataset.vatraOriginalPlaceholder)el.dataset.vatraOriginalPlaceholder=original;
  const text=interfaceLabel(original);
  if(el.placeholder!==text)el.placeholder=text;
 });
 root.querySelectorAll?.('[aria-label],[title]').forEach(el=>{
  for(const attribute of ['aria-label','title']){
   if(!el.hasAttribute(attribute))continue;
   const datasetKey=attribute==='title'?'vatraOriginalTitle':'vatraOriginalAriaLabel';
   const current=el.getAttribute(attribute);
   const original=el.dataset[datasetKey]||current;
   if(!el.dataset[datasetKey])el.dataset[datasetKey]=original;
   const translation=interfaceLabel(original);
   if(translation!==current)el.setAttribute(attribute,translation);
  }
 });
}
const seoTitles={
 uk:'ВАТРА — українська соціальна мережа',
 en:'VATRA — Ukrainian Social Network',
 pl:'VATRA — ukraińska sieć społecznościowa',
 de:'VATRA — Ukrainisches soziales Netzwerk',
 fr:'VATRA — Réseau social ukrainien',
 es:'VATRA — Red social ucraniana',
 pt:'VATRA — Rede social ucraniana',
 it:'VATRA — Social network ucraino'
};
const seoKeywords={
 uk:'ВАТРА, українська соціальна мережа, спільноти, друзі, дописи',
 en:'VATRA, Ukrainian social network, friends, communities, posts',
 pl:'VATRA, ukraińska sieć społecznościowa, znajomi, społeczności',
 de:'VATRA, ukrainisches soziales Netzwerk, Freunde, Community',
 fr:'VATRA, réseau social ukrainien, amis, communautés',
 es:'VATRA, red social ucraniana, amigos, comunidades',
 pt:'VATRA, rede social ucraniana, amigos, comunidades',
 it:'VATRA, social network ucraino, amici, comunità'
};
const seoLocales={uk:'uk_UA',en:'en_US',pl:'pl_PL',de:'de_DE',fr:'fr_FR',es:'es_ES',pt:'pt_PT',it:'it_IT'};
function ensureMeta(attribute,name,content){
 let el=document.head.querySelector('meta['+attribute+'="'+name+'"]');
 if(!el){el=document.createElement('meta');el.setAttribute(attribute,name);document.head.append(el);}
 el.content=content;
}
function updateMeta(){
 // Meta data must never claim that an untranslated language is rendered.
 const active=translatedLanguages.has(language)?language:'uk';
 const page=location.pathname.toLowerCase();
 const authPage=page.endsWith('/auth.html');
 const registerPage=page.endsWith('/register.html');
 const title=seoTitles[active]||seoTitles.uk;
 const description=descriptions[active]||descriptions.uk;
 const pagePrefix=authPage?({uk:'Вхід',en:'Sign in',pl:'Logowanie',de:'Anmelden',fr:'Connexion',es:'Iniciar sesión',pt:'Entrar',it:'Accedi'}[active]):
  registerPage?({uk:'Реєстрація',en:'Create account',pl:'Rejestracja',de:'Registrierung',fr:'Inscription',es:'Registro',pt:'Registo',it:'Registrazione'}[active]):'';
 document.documentElement.lang=active;
 document.title=pagePrefix?pagePrefix+' | '+title:title;
 ensureMeta('name','description',description);
 ensureMeta('name','keywords',seoKeywords[active]||seoKeywords.uk);
 ensureMeta('name','content-language',active);
 ensureMeta('property','og:title',document.title);
 ensureMeta('property','og:description',description);
 ensureMeta('property','og:locale',seoLocales[active]||'uk_UA');
 ensureMeta('name','twitter:card','summary');
 ensureMeta('name','twitter:title',document.title);
 ensureMeta('name','twitter:description',description);
 const canonical=location.origin+location.pathname;
 ensureMeta('property','og:url',canonical);
 let link=document.head.querySelector('link[rel="canonical"]');
 if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link);}
 link.href=canonical;
}
function selectMarkup(){
 const select=document.createElement('select');
 select.className='vatra-language-select';
 select.setAttribute('aria-label','Мова інтерфейсу');
 const ready=document.createElement('optgroup');ready.label='Основні мови інтерфейсу';
 const other=document.createElement('optgroup');other.label='Інші мови (переклад готується)';
 for(const [code,name] of languages){
  const option=document.createElement('option');option.value=code;option.textContent=languageFlag(code)+'  '+name;
  (translatedLanguages.has(code)?ready:other).append(option);
 }
 select.append(ready,other);select.value=language;
 select.addEventListener('change',()=>setLanguage(select.value));
 return select;
}
function vatraFlagSVG(code){
 const region=flagRegions[code]||(()=>{try{return new Intl.Locale(code).maximize().region||''}catch{return ''}})();
 const defs={
  UA:'<path fill="#2879c5" d="M0 0h28v10H0z"/><path fill="#ffd64d" d="M0 10h28v10H0z"/>',
  PL:'<path fill="#fff" d="M0 0h28v10H0z"/><path fill="#dc3c53" d="M0 10h28v10H0z"/>',
  DE:'<path fill="#222" d="M0 0h28v7H0z"/><path fill="#d64240" d="M0 7h28v7H0z"/><path fill="#ffca44" d="M0 14h28v6H0z"/>',
  FR:'<path fill="#2159ad" d="M0 0h9v20H0z"/><path fill="#fff" d="M9 0h10v20H9z"/><path fill="#d94a4a" d="M19 0h9v20h-9z"/>',
  GB:'<path fill="#244d9c" d="M0 0h28v20H0z"/><path stroke="#fff" stroke-width="5" d="m0 0 28 20M28 0 0 20"/><path stroke="#d94655" stroke-width="2" d="m0 0 28 20M28 0 0 20"/><path stroke="#fff" stroke-width="7" d="M14 0v20M0 10h28"/><path stroke="#dc3d52" stroke-width="3.5" d="M14 0v20M0 10h28"/>',
  ES:'<path fill="#c83a48" d="M0 0h28v5H0zM0 15h28v5H0z"/><path fill="#f8c84b" d="M0 5h28v10H0z"/>',
  PT:'<path fill="#218a69" d="M0 0h12v20H0z"/><path fill="#d54245" d="M12 0h16v20H12z"/><circle cx="12" cy="10" r="4" stroke="#f4cf65" fill="none" stroke-width="1.8"/>',
  IT:'<path fill="#26966e" d="M0 0h9v20H0z"/><path fill="#fff" d="M9 0h10v20H9z"/><path fill="#d64c50" d="M19 0h9v20h-9z"/>'
 };
 if(defs[region])return '<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true" class="vatra-language-flag" focusable="false" style="border:0;outline:0;box-shadow:none;stroke:none"><rect width="28" height="20" rx="2" fill="#fff"/>'+defs[region]+'</svg>';
 return '<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true" class="vatra-language-flag" focusable="false" style="border:0;outline:0;box-shadow:none;stroke:none"><rect x="1" y="1" width="26" height="18" rx="3" fill="#edf4fd" stroke="#cfdeef"/><circle cx="14" cy="10" r="6.5" fill="none" stroke="#5583b5" stroke-width="1.3"/><path d="M7.5 10h13M14 3.5c-5 4-5 9 0 13M14 3.5c5 4 5 9 0 13" fill="none" stroke="#5583b5" stroke-width="1.1"/></svg>';
}
let activeLanguageSelect=null;
function vatraLanguageDialog(){
 let dlg=document.getElementById('vatraLanguageDialog');
 if(dlg)return dlg;
 dlg=document.createElement('dialog');dlg.id='vatraLanguageDialog';dlg.className='vatra-language-dialog';
 dlg.setAttribute('aria-labelledby','vatraLanguageDialogTitle');
 const render=(code,name)=>'<button type="button" class="vatra-language-picker-option" data-vatra-language-code="'+code+'" aria-selected="'+String(code===language)+'">'+vatraFlagSVG(code)+'<span>'+name+'</span>'+
  (translatedLanguages.has(code)?'<small title="Перекладені основні елементи інтерфейсу">Доступна</small>'
   :partialLanguages.has(code)?'<small>Частково · у розробці</small>'
   :'<small>У розробці</small>')+'</button>';
 dlg.innerHTML='<header class="vatra-language-dialog-header"><div class="vatra-language-dialog-brand"><img src="favicon.svg?v=20261105-original-v1" class="vatra-language-dialog-logo" width="44" height="44" alt="" aria-hidden="true" decoding="async"><div><h2 id="vatraLanguageDialogTitle">Мова ВАТРИ</h2><p>Оберіть мову інтерфейсу. Активну позначено галочкою.</p></div></div><button type="button" class="vatra-language-close" data-vatra-language-close aria-label="Закрити вибір мови">×</button></header>'+
 '<input class="vatra-language-search" type="search" placeholder="Знайти мову…" aria-label="Пошук мови" autocomplete="off">'+
 '<div class="vatra-language-picker-list" role="group" aria-label="Вибір мови">'+
 '<div class="vatra-language-picker-category">Мови з перекладом</div>'+languages.filter(([code])=>translatedLanguages.has(code)).map(([code,name])=>render(code,name)).join('')+
 '<div class="vatra-language-picker-category">Частковий переклад інтерфейсу</div>'+languages.filter(([code])=>partialLanguages.has(code)).map(([code,name])=>render(code,name)).join('')+ '<div class="vatra-language-picker-category">Інші мови · переклад готується</div>'+languages.filter(([code])=>!translatedLanguages.has(code)&&!partialLanguages.has(code)).map(([code,name])=>render(code,name)).join('')+
 '<p class="vatra-language-empty" role="status" aria-live="polite" hidden>Мову не знайдено. Спробуйте інший запит.</p></div>';
 document.body.append(dlg);
 const search=dlg.querySelector('.vatra-language-search');
 search.addEventListener('input',()=>vatraFilterLanguageDialog(dlg));
 dlg.addEventListener('click',event=>{
  if(event.target===dlg||event.target.closest('[data-vatra-language-close]')){dlg.close();return;}
  const button=event.target.closest('[data-vatra-language-code]');
  if(!button)return;
  const chosen=button.dataset.vatraLanguageCode;
  if(activeLanguageSelect){
   activeLanguageSelect.value=chosen;
   activeLanguageSelect.dispatchEvent(new Event('change',{bubbles:true}));
  }else setLanguage(chosen);
  dlg.close();
 });
 return dlg;
}
// Keep grouped search useful when one or no languages match.
function vatraFilterLanguageDialog(dlg){
 const query=dlg.querySelector('.vatra-language-search').value.toLocaleLowerCase('uk-UA').trim();
 let visible=0;
 dlg.querySelectorAll('[data-vatra-language-code]').forEach(button=>{
  const match=!query||button.textContent.toLocaleLowerCase('uk-UA').includes(query)||button.dataset.vatraLanguageCode.includes(query);
  button.hidden=!match;
  if(match)visible++;
 });
 dlg.querySelectorAll('.vatra-language-picker-category').forEach(category=>{
  let item=category.nextElementSibling,hasMatches=false;
  while(item&&!item.classList.contains('vatra-language-picker-category')){
   if(item.matches('[data-vatra-language-code]')&&!item.hidden){hasMatches=true;break;}
   item=item.nextElementSibling;
  }
  category.hidden=!hasMatches;
 });
 dlg.querySelector('.vatra-language-empty').hidden=visible>0;
}
function vatraShowLanguageDialog(select=null){
 const dlg=vatraLanguageDialog();
 activeLanguageSelect=select;
 dlg.querySelectorAll('[data-vatra-language-code]').forEach(button=>
  button.setAttribute('aria-selected',String(button.dataset.vatraLanguageCode===language)));
 const search=dlg.querySelector('.vatra-language-search');search.value='';
 vatraFilterLanguageDialog(dlg);
 dlg.showModal();search.focus();
}
const VATRA_AUTH_RECENT_LANGUAGES='vatra-language-recent-v1';
function vatraAuthRecentCodes(){
 const defaults=['uk','en','pl','de'];
 let recent=[];
 try{
  const stored=JSON.parse(localStorage.getItem(VATRA_AUTH_RECENT_LANGUAGES)||'[]');
  if(Array.isArray(stored))recent=stored.filter(code=>languages.some(pair=>pair[0]===code));
 }catch{}
 return [...new Set([...recent,...defaults])].slice(0,4);
}
function vatraRememberAuthLanguage(code){
 const ordered=[code,...vatraAuthRecentCodes().filter(value=>value!==code)];
 try{localStorage.setItem(VATRA_AUTH_RECENT_LANGUAGES,JSON.stringify(ordered.slice(0,4)));}catch{}
}
/* Four shortcuts on the blue panel; mobile has a compact equivalent below
   the form because the blue side is intentionally hidden on small screens. */
function vatraInstallAuthLanguageQuick(){
 const brand=document.querySelector('.auth-layout>.brand-side');
 const form=document.querySelector('.auth-layout>.form-side');
 if(!brand||!form)return;
 let desktop=brand.querySelector('.vatra-auth-language-quick');
 if(!desktop){
  desktop=document.createElement('nav');desktop.className='vatra-auth-language-quick';
  desktop.setAttribute('aria-label','Швидкий вибір мови');
  const foot=brand.querySelector('.brand-foot');
  if(foot)foot.before(desktop);else brand.append(desktop);
 }
 let mobile=form.querySelector('.vatra-auth-language-mobile');
 if(!mobile){
  mobile=document.createElement('nav');mobile.className='vatra-auth-language-mobile';
  mobile.setAttribute('aria-label','Швидкий вибір мови');
  const copyright=form.querySelector('.vatra-auth-mobile-copyright');
  if(copyright)copyright.before(mobile);else form.append(mobile);
 }
 // Keep the same fixed sequence as the full language picker: Ukrainian first,
 // then the selected shortcuts in their actual picker order.
 const codes=vatraAuthRecentCodes();
 for(const host of [desktop,mobile]){
  if(host.dataset.renderedLanguage===language+'|'+codes.join(',')&&host.childElementCount)return;
  host.replaceChildren();
  const heading=document.createElement('p');heading.className='vatra-auth-language-heading';
  heading.textContent='Мова інтерфейсу';host.append(heading);
  const row=document.createElement('div');row.className='vatra-auth-language-list';
  for(const code of codes){
   const choice=document.createElement('button');choice.type='button';
   choice.className='vatra-auth-language-option';choice.dataset.vatraAuthLanguage=code;
   if(code===language){choice.classList.add('is-active');choice.setAttribute('aria-current','true');}
   const flag=document.createElement('span');flag.className='vatra-auth-language-flag';
   flag.innerHTML=vatraFlagSVG(code);
   const label=document.createElement('span');
   label.textContent=({uk:'Українська',en:'English',pl:'Polski',de:'Deutsch',fr:'Français',es:'Español',pt:'Português',it:'Italiano'})[code]||
      (languages.find(([id])=>id===code)?.[1]||code).split(' — ')[0];
   choice.append(flag,label);
   choice.addEventListener('click',()=>setLanguage(code));
   row.append(choice);
  }
  const more=document.createElement('button');more.type='button';
  more.className='vatra-auth-language-all';more.textContent='Усі мови';
  more.addEventListener('click',()=>vatraShowLanguageDialog());
  row.append(more);host.append(row);
  host.dataset.renderedLanguage=language+'|'+codes.join(',');
 }
}
function vatraEnhanceLanguageSelect(select){
 if(select.dataset.vatraEnhanced==='true')return;
 select.dataset.vatraEnhanced='true';select.classList.add('vatra-language-native-hidden');
 const wrap=document.createElement('div');wrap.className='vatra-language-picker';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='vatra-language-picker-trigger';
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','vatraLanguageDialog');
 const update=()=>{
  const selected=languages.find(([code])=>code===select.value)||languages[0];
  trigger.replaceChildren();
  const glyph=document.createElement('span');glyph.innerHTML=vatraFlagSVG(selected[0]);glyph.style.flex='0 0 auto';
  const label=document.createElement('span');label.textContent=selected[1];
  const arrow=document.createElement('span');arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
  trigger.append(glyph,label,arrow);
  trigger.setAttribute('aria-label','Обрати мову. Поточна мова: '+selected[1]);
 };
 update();wrap.append(trigger);select.insertAdjacentElement('afterend',wrap);
 trigger.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  vatraShowLanguageDialog(select);
 });
 select.addEventListener('change',update);
 document.addEventListener('vatra:languagechange',update);
}
function syncLanguageNotice(){
 const status=language==='uk'?'':translatedLanguages.has(language)?'Основні елементи інтерфейсу перекладено. Переклад окремих розділів ще доповнюється.':partialLanguages.has(language)?'Цією мовою перекладено основну навігацію та елементи входу. Повний переклад ще готується.':'Повний переклад інтерфейсу цією мовою ще готується. Поки доступна українська версія.';
 document.querySelectorAll('.vatra-language-notice').forEach(el=>{if(el.textContent!==status)el.textContent=status;if(el.hidden===Boolean(status))el.hidden=!status;});
}
function install(){
 vatraInstallAuthLanguageQuick();
 const languageMount=document.querySelector('.vatra-language-settings-mount');
 if(languageMount&&!languageMount.querySelector('.vatra-language-select')){
  const row=document.createElement('label');row.className='vatra-language-pref vatra-language-dedicated';
  const heading=document.createElement('span');heading.textContent='Мова сайту';
  const selector=selectMarkup();selector.name='preferredLanguage';row.append(heading,selector);
  const hint=document.createElement('small');hint.className='vatra-language-notice';hint.setAttribute('role','status');row.append(hint);
  languageMount.append(row);
 }
 document.querySelectorAll('.vatra-language-select').forEach(select=>{if(select.value!==language){select.value=language;select.dispatchEvent(new Event('change',{bubbles:false}));}vatraEnhanceLanguageSelect(select);});
 syncLanguageNotice();
}
function setLanguage(code){
 if(!languages.some(pair=>pair[0]===code))return;
 language=code;
 vatraRememberAuthLanguage(code);
 try{localStorage.setItem('vatra-language',code);}catch{}
 updateMeta();install();translateRoot(document);
 document.dispatchEvent(new CustomEvent('vatra:languagechange',{detail:{language:code}}));
}
// Translate newly inserted or changed nodes after UI updates.
// A full document pass still runs when a user actually switches language.
let queued=false;
const pendingTranslationRoots=new Set();
new MutationObserver(records=>{
 if(running)return;
 for(const record of records){
  if(record.type==='characterData'&&record.target?.isConnected)pendingTranslationRoots.add(record.target);
  for(const node of record.addedNodes||[]){
   if(node.nodeType===1||node.nodeType===3)pendingTranslationRoots.add(node);
  }
 }
 if(queued||!pendingTranslationRoots.size)return;queued=true;
 requestAnimationFrame(()=>{
  queued=false;running=true;
  try{
   install();
   const roots=[...pendingTranslationRoots];pendingTranslationRoots.clear();
   for(const node of roots)if(node.isConnected)translateRoot(node);
  }finally{running=false;}
 });
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
function start(){running=true;try{install();setLanguage(language);}finally{running=false;}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.vatraLanguage={get language(){return language;},get isFullyLocalized(){return language==='uk';},set:setLanguage,available:languages.map(([code])=>code)};
})();
