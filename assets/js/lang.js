/* VATRA: one language selector for every public and account page. */
(() => {
  "use strict";
  if (window.VATRA_HOST_ALLOWED === false) return;
  // The initial GitHub Pages router is replaced by the actual /idN or /clubN
  // document. Do not start a second, competing English translation request.
  if (document.documentElement.classList.contains("vatra-dynamic-route-pending")) return;
  // Resolve assets from the current script to support arbitrary local server paths.
  const localFile=location.protocol==="file:";
  const scriptUrl=new URL(document.currentScript?.src||"assets/js/lang.js",document.baseURI);
  const ROOT=new URL("../../",scriptUrl).pathname;
  const LANGUAGE_KEY = "vatra-language";
  const validLanguage = value => value === "uk" || value === "en";
  const browserLocale = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
  function preferred() {
    const choice = saved();
    if (choice === "uk" || choice === "en") return choice;
    /* Honor an old locale query only for backwards compatibility. */
    const legacy = new URLSearchParams(location.search).get("locale");
    if (legacy === "uk_UA") return "uk";
    if (legacy === "en_US") return "en";
    return browserLocale.startsWith("uk") || browserLocale.endsWith("-ua") ? "uk" : "en";
  }
  // file:// blocks fetch() in mainstream browsers. Keep the Ukrainian fallback
  // visible; use a local HTTP server for the fully translated experience.
  const current = localFile ? "uk" : preferred();
  // Titles must be correct BEFORE the asynchronous English JSON arrives. Watch
  // the original <title> as HTML is parsed; no duplicate title or extra script.
  const instantEnglishTitles={
    index:"Sign in · VATRA","create-account":"Create account · VATRA",feed:"Feed · VATRA",notifications:"Notifications · VATRA",profile:"My page · VATRA",verify:"Verification · VATRA",communities:"Communities · VATRA",club:"Community · VATRA",
    forgot:"Password recovery · VATRA",reset:"New password · VATRA",
    "404":"404 Page not found · VATRA",
    terms:"Terms of Service · VATRA",privacy:"Privacy · VATRA",
    cookies:"Cookies and browser storage · VATRA",offline:"No connection · VATRA"
  };
  if(current==="en"){
    const segment=location.pathname.split("/").pop()?.replace(/\.html$/,"")||"index";
    const dynamicMember=/^id[1-9][0-9]{0,18}$/.test(segment);
    const dynamicClub=/^club[1-9][0-9]{0,18}$/.test(segment);
    // Deep-linked profiles and clubs are rendered in place by 404.html;
    // never flash "404" in the English tab before their data loads.
    const title=dynamicMember?instantEnglishTitles.profile:
      dynamicClub?instantEnglishTitles.club:
      instantEnglishTitles[segment]||instantEnglishTitles["404"];
    if(title){
      const applyTitle=()=>{
        const node=document.head.querySelector("title");
        if(node&&node.textContent!==title)node.textContent=title;
      };
      const observer=new MutationObserver(applyTitle);
      observer.observe(document.head,{childList:true,subtree:true,characterData:true});
      applyTitle();
      document.addEventListener("DOMContentLoaded",()=>{
        applyTitle();observer.disconnect();
      },{once:true});
    }
  }
  // Preserve profile.html so Ctrl+U re-requests real HTML (HTTP 200).
  // Other legacy extensionless routes retain their existing behavior.
  // Direct requests to /VATRA/create-account, /feed, etc. resolve on GitHub Pages.
  if(location.protocol!=="file:"){
    const path=location.pathname.replace(/\/(create-account|forgot|reset|feed|verify|terms|privacy|cookies|offline|404)\.html$/,(_all,route)=>"/"+route);
    if(path!==location.pathname)history.replaceState(history.state,"",path+location.search+location.hash);
  }
  document.documentElement.lang = current === "en" ? "en" : "uk";
  document.documentElement.dataset.language = current;
  if (current === "en") {
    document.documentElement.classList.add("i18n-pending");
    const block = document.createElement("style");
    block.className = "ui-i18n-pending-style";
    // Keep the original loading splash moving, but suspend all page-entrance
    // animations until the English dictionary is applied and content is visible.
    // visibility:hidden alone DOES NOT pause animations.
    block.textContent = "html.i18n-pending body{visibility:hidden!important}" +
      "html.i18n-pending body>.vatra-auth-loading{visibility:visible!important}" +
      "html.i18n-pending body > :not(.vatra-auth-loading)," +
      "html.i18n-pending body > :not(.vatra-auth-loading) *," +
      "html.i18n-pending body > :not(.vatra-auth-loading) *::before," +
      "html.i18n-pending body > :not(.vatra-auth-loading) *::after" +
      "{animation-play-state:paused!important}";
    document.head.append(block);
  }
  const nativeLabels = {
    uk: "Українська", en: "English"
  };
  // The complete language directory remains visible. Only languages with
  // published dictionaries (Ukrainian and English) are selectable.
  const languages = [
    ["uk","Українська","Ukrainian","ua",true],
    ["en","English","English","gb",true],
    ["pl","Polski","Polish","pl"],["de","Deutsch","German","de"],
    ["fr","Français","French","fr"],["es","Español","Spanish","es"],
    ["it","Italiano","Italian","it"],["pt","Português","Portuguese","pt"],
    ["ro","Română","Romanian","ro"],["nl","Nederlands","Dutch","nl"],
    ["cs","Čeština","Czech","cz"],["sk","Slovenčina","Slovak","sk"],
    ["hu","Magyar","Hungarian","hu"],["bg","Български","Bulgarian","bg"],
    ["el","Ελληνικά","Greek","gr"],["tr","Türkçe","Turkish","tr"],
    ["sv","Svenska","Swedish","se"],["da","Dansk","Danish","dk"],
    ["no","Norsk","Norwegian","no"],["fi","Suomi","Finnish","fi"],
    ["et","Eesti","Estonian","ee"],["lt","Lietuvių","Lithuanian","lt"],
    ["lv","Latviešu","Latvian","lv"],["hr","Hrvatski","Croatian","hr"],
    ["sr","Српски","Serbian","rs"],["sl","Slovenščina","Slovenian","si"],
    ["ka","ქართული","Georgian","ge"],["ja","日本語","Japanese","jp"],
    ["ko","한국어","Korean","kr"],["zh","中文","Chinese","cn"],
    ["ar","العربية","Arabic","sa"],["he","עברית","Hebrew","il"],
    ["hi","हिन्दी","Hindi","in"],["id","Bahasa Indonesia","Indonesian","id"],
    ["vi","Tiếng Việt","Vietnamese","vn"],["th","ไทย","Thai","th"]
  ];
  const flagGroups={
    "europe-a":new Set(["ua","gb","pl","de","fr","es","it","pt","ro"]),
    "europe-b":new Set(["nl","cz","sk","hu","bg","gr","tr","se","dk"]),
    "europe-c":new Set(["no","fi","ee","lt","lv","hr","rs","si","ge"]),
    "world":new Set(["jp","kr","cn","sa","il","in","id","vn","th"])
  };
  let flagSerial=0;
  function flag(country) {
    const ns="http://www.w3.org/2000/svg";
    const svg=document.createElementNS(ns,"svg");
    svg.classList.add("language-flag","ui-language-flag-"+(++flagSerial));
    svg.setAttribute("viewBox","0 0 640 480");
    svg.setAttribute("preserveAspectRatio","xMidYMid meet");
    svg.setAttribute("shape-rendering","geometricPrecision");
    svg.setAttribute("aria-hidden","true");
    const add=(tag,attributes)=>{
      const element=document.createElementNS(ns,tag);
      for(const [name,value] of Object.entries(attributes))element.setAttribute(name,String(value));
      svg.append(element);
    };
    // The active languages use self-contained SVGs so their flags always show.
    if(country==="ua"){
      add("rect",{x:0,y:0,width:640,height:240,fill:"#0057b8"});
      add("rect",{x:0,y:240,width:640,height:240,fill:"#ffd700"});
    }else if(country==="gb"){
      // Exact, sharp Union Jack paths from VATRA's existing flag SVG sprite.
      add("path",{fill:"#012169",d:"M0 0h640v480H0z"});
      add("path",{fill:"#fff",d:"m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"});
      add("path",{fill:"#c8102e",d:"m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"});
      add("path",{fill:"#fff",d:"M241 0v480h160V0zM0 160v160h640V160z"});
      add("path",{fill:"#c8102e",d:"M0 193v96h640v-96zM273 0v480h96V0z"});
    }else{
      const group=Object.keys(flagGroups).find(key=>flagGroups[key].has(country))||"europe-a";
      const use=document.createElementNS(ns,"use");
      use.setAttribute("href",ROOT+"assets/flags/"+group+".svg#flag-"+country);
      svg.append(use);
    }
    return svg;
  }
  // Remember an explicit choice across reloads and browser restarts. The
  // cookie also recovers preferences if a browser removes only localStorage.
  // A browser which clears ALL site data cannot retain either store.
  function cookieLanguage() {
    if (localFile) return null;
    try {
      const part = document.cookie.split(";").map(item => item.trim())
        .find(item => item.startsWith(LANGUAGE_KEY + "="));
      const value = part ? decodeURIComponent(part.slice(LANGUAGE_KEY.length + 1)) : null;
      return validLanguage(value) ? value : null;
    } catch (_) { return null; }
  }
  function saveCookie(lang) {
    if (localFile || !validLanguage(lang)) return;
    try {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = LANGUAGE_KEY + "=" + encodeURIComponent(lang) +
        "; Max-Age=31536000; Path=" + ROOT + "; SameSite=Lax" + secure;
    } catch (_) {}
  }
  function saved() {
    const cookie = cookieLanguage();
    let stored = null;
    try { stored = localStorage.getItem(LANGUAGE_KEY); } catch (_) {}
    if (cookie) {
      // The cookie is authoritative when an old redirect or a browser
      // extension has overwritten only the localStorage key.
      if (stored !== cookie) {
        try { localStorage.setItem(LANGUAGE_KEY, cookie); } catch (_) {}
      }
      return cookie;
    }
    if (validLanguage(stored)) {
      // Migrate selections made before cookies were introduced.
      saveCookie(stored);
      return stored;
    }
    return null;
  }
  function persist(lang) {
    if (!validLanguage(lang)) return;
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (_) {}
    saveCookie(lang);
  }
  /* A single URL per page. Language is a saved UI preference, not a path. */
  /* Legacy links may still be saved by users, but new pages never generate them. */
  function bindLocalizedLinks() {
    for (const link of document.querySelectorAll("a[href]")) {
      const raw = link.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
      try {
        const target = new URL(raw, location.href);
        if (target.origin !== location.origin || !target.pathname.startsWith(ROOT)) continue;
        if (target.pathname.startsWith(ROOT + "assets/")) continue;
        target.pathname = target.pathname.replace(/^\/VATRA\/(?:ua|en)\//,ROOT);
        if (target.pathname.endsWith("/auth.html") || target.pathname.endsWith("/index.html")) {
          target.pathname = target.pathname.replace(/(?:auth|index)\.html$/, "");
        }
        target.pathname = target.pathname.replace(/\/(create-account|forgot|reset|feed|verify|terms|privacy|cookies|offline|404)\.html$/,(_all,route)=>"/"+route);
        target.pathname = target.pathname.replace(/\/account(?:\.html)?$/,"/verify");
        target.searchParams.delete("locale");
        link.href = target.href;
      } catch (_) {}
    }
  }
  let errors = {};
  const pageFromPath = () => {
    if (document.body?.dataset.page === "offline") return "offline";
    if (document.body?.dataset.page === "not-found") return "404";
    if (location.pathname === ROOT || location.pathname.endsWith("/index.html")) return "index";
    const segment=location.pathname.split("/").pop()?.replace(/\.html$/,"")||"index";
    if(/^id[1-9][0-9]{0,18}$/.test(segment))return "profile";
    if(/^club[1-9][0-9]{0,18}$/.test(segment))return "club";
    return segment;
  };
  const domReady = new Promise(resolve => {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded",resolve,{once:true});
    else resolve();
  });
  // Static legal/error pages need no auth splash. Only an actual, still-pending
  // English dictionary request may create the SAME loader after DOM is ready.
  // Fast translations never get an artificial loading screen.
  let staticLocaleLoader=null;
  if(current==="en")domReady.then(()=>{
    if(!document.documentElement.classList.contains("i18n-pending"))return;
    const body=document.body;
    if(!body?.matches(".policy-page,.error-page")||
      body.querySelector(".vatra-auth-loading"))return;
    const overlay=document.createElement("div");
    overlay.id="vatra-auth-loading";
    overlay.className="vatra-auth-loading ui-static-locale-loading-001";
    overlay.setAttribute("role","status");
    overlay.setAttribute("aria-live","polite");
    const content=document.createElement("div");
    content.className="vatra-auth-loading-content ui-static-locale-content-001";
    const symbol=document.createElement("img");
    symbol.className="vatra-auth-loading-symbol ui-static-locale-symbol-001";
    symbol.src=ROOT+"assets/logo/vatra-symbol.svg";
    symbol.alt="";
    symbol.width=68;symbol.height=68;
    const title=document.createElement("span");
    title.className="vatra-auth-loading-title vt-static-locale-title-001";
    title.textContent="VATRA";
    const caption=document.createElement("p");
    caption.className="vatra-auth-loading-caption vt-static-locale-caption-001";
    caption.textContent="Loading VATRA";
    const track=document.createElement("div");
    track.className="vatra-auth-loading-track ui-static-locale-track-001";
    track.setAttribute("aria-hidden","true");
    const bar=document.createElement("span");
    bar.className="vatra-auth-loading-indicator ui-static-locale-indicator-001";
    track.append(bar);
    content.append(symbol,title,caption,track);
    overlay.append(content);
    body.prepend(overlay);
    staticLocaleLoader=overlay;
  });
  const timeout = new AbortController();
  const stop = setTimeout(() => timeout.abort(),7000);
  const translations = localFile ? Promise.resolve({}) : fetch(ROOT + "assets/i18n/" + current + ".json",{signal:timeout.signal,cache:"no-cache"})
    .then(res => { if (!res.ok) throw new Error("translations unavailable"); return res.json(); })
    .catch(() => ({}))
    .finally(() => clearTimeout(stop));
  function applyTranslation(table) {
    const page=pageFromPath();
    // Community pages reuse the Feed's shared header/sidebar translations.
    const communityShell=page==="communities"||page==="club"||page==="notifications"||page==="friends"||page==="gifts";
    const entry=table.__pages?.[page]||(communityShell?table.__pages?.feed:null);
    if (!entry) return;
    for (const element of document.querySelectorAll("[data-i18n]")) {
      const record=entry.nodes?.[element.getAttribute("data-i18n")];
      if (!record) continue;
      const nodes=[...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE);
      for (const [ordinal,value] of Object.entries(record.text||{})) {
        if (nodes[Number(ordinal)]) nodes[Number(ordinal)].nodeValue=value;
      }
      for (const [name,value] of Object.entries(record.attrs||{})) {
        if (name==="value" && ("value" in element) && element.value!==element.defaultValue) continue;
        element.setAttribute(name,value);
      }
    }
    // Feed metadata belongs to /feed, not to the new /communities or /club pages.
    if(communityShell)return;
    const meta=entry.meta||{};
    if (meta.title) document.title=meta.title;
    for (const [name,value] of Object.entries(meta)) {
      if (name==="title") continue;
      const selector=name.startsWith("og:")?'meta[property="'+name+'"]':'meta[name="'+name+'"]';
      const node=document.querySelector(selector);
      if (node) node.setAttribute("content",value);
    }
  }
  const ready=Promise.all([domReady,translations]).then(([,json])=>{
    errors=json&&typeof json==="object"?json:{};
    applyTranslation(errors);
  }).finally(()=>{
    document.documentElement.classList.remove("i18n-pending");
    if(staticLocaleLoader){
      document.body.dataset.authReady="true";
      staticLocaleLoader.remove();
    }
  });
  window.VATRA_LANGUAGE = {
    locale: current,
    ready,
    translate: raw => current==="en" ? (errors[raw] || raw) : raw
  };

  const english = current === "en";
  const words = english
    ? {name:"Language",heading:"Choose your language",details:"VATRA interface language",search:"Search languages",future:"In development",current:"Selected",close:"Close",empty:"No matching languages"}
    : {name:"Мова",heading:"Оберіть мову",details:"Мова інтерфейсу VATRA",search:"Пошук мов",future:"У розробці",current:"Обрано",close:"Закрити",empty:"Мов не знайдено"};

  let pickerInitialized=false;
  function initLanguagePicker() {
    if(pickerInitialized)return;
    pickerInitialized=true;
    bindLocalizedLinks();
    const triggers = [...document.querySelectorAll("[data-language-trigger]")];
    if (!triggers.length) return;
    // Draw the active-language flag, name and chevron immediately. Even if
    // an optional list item fails to render, the footer trigger stays usable.
    let triggerOrdinal=0;
    for(const trigger of triggers){
      const id=++triggerOrdinal;
      trigger.replaceChildren();
      trigger.append(flag(english ? "gb" : "ua"));
      const label=document.createElement("span");
      label.className="vt-language-trigger-label-"+id;
      label.textContent=nativeLabels[current];
      const chevron=document.createElementNS("http://www.w3.org/2000/svg","svg");
      chevron.classList.add("language-chevron","ui-language-trigger-chevron-"+id);
      chevron.setAttribute("viewBox","0 0 24 24");
      chevron.setAttribute("aria-hidden","true");
      const down=document.createElementNS("http://www.w3.org/2000/svg","path");
      down.setAttribute("d","m6 9 6 6 6-6");
      down.setAttribute("class","ui-language-chevron-path-"+id);
      chevron.append(down);
      trigger.append(label,chevron);
      trigger.setAttribute("aria-label",words.name+": "+nativeLabels[current]);
      trigger.setAttribute("aria-expanded","false");
      trigger.addEventListener("click",open);
    }
    const backdrop = document.createElement("div");
    backdrop.className = "language-backdrop ui-language-backdrop";
    backdrop.hidden = true;
    const dialog = document.createElement("section");
    dialog.className = "language-dialog ui-language-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "vatra-language-heading");
    const headingRow = document.createElement("div");
    headingRow.className = "language-heading-row ui-language-heading-row";
    const texts = document.createElement("div");
    texts.className = "ui-language-heading-copy";
    const heading = document.createElement("h2");
    heading.id = "vatra-language-heading";
     heading.className = "vt-language-dialog-heading";
    heading.textContent = words.heading;
    const details = document.createElement("p");
    details.className = "vt-language-dialog-description";
     details.textContent = words.details;
    texts.append(heading, details);
    const closeBtn = document.createElement("button");
    closeBtn.className = "language-close vt-language-close-button";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", words.close);
    closeBtn.textContent = "×";
    headingRow.append(texts, closeBtn);
    const searchField = document.createElement("div");
    searchField.className = "field language-search-field vt-language-search-label";
    const searchShell = document.createElement("span");
    searchShell.className = "vatra-input-shell language-search-shell";
    const searchHint = document.createElement("span");
    searchHint.className = "vatra-floating-hint vt-language-search-caption";
    searchHint.setAttribute("aria-hidden","true");
    searchHint.textContent = words.search;
    const search = document.createElement("input");
    search.className = "control language-search ui-language-search-input";
    search.type = "search";
    search.id = "vatra-language-search";
    search.name = "vatra-language-search";
    search.autocomplete = "off";
    search.placeholder = " "; // The floating hint replaces the native placeholder.
    search.setAttribute("aria-label", words.search);
    const clearSearch=document.createElement("button");
    clearSearch.className="language-search-clear vt-language-clear-button";
    clearSearch.type="button";
    clearSearch.hidden=true;
    clearSearch.setAttribute("aria-label",english?"Clear search":"Очистити пошук");
    const clearIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    clearIcon.setAttribute("viewBox","0 0 24 24");
    clearIcon.setAttribute("aria-hidden","true");
    const cross=document.createElementNS("http://www.w3.org/2000/svg","path");
    cross.setAttribute("d","M18 6 6 18M6 6l12 12");
    clearIcon.append(cross);
    clearSearch.append(clearIcon);
    searchShell.append(search,searchHint,clearSearch);
    searchField.append(searchShell);
    const syncSearchHint=()=>searchShell.classList.toggle("is-floating",Boolean(search.value));
    search.addEventListener("input",syncSearchHint);
    search.addEventListener("change",syncSearchHint);
    search.addEventListener("blur",syncSearchHint);
    const list = document.createElement("div");
    list.className = "language-grid ui-language-options-grid";
    list.tabIndex = 0;
    list.setAttribute("role", "region");
    list.setAttribute("aria-label", words.heading);
    const notFound = document.createElement("p");
    notFound.className = "language-empty vt-language-no-results";
    notFound.textContent = words.empty;
    notFound.hidden = true;
    let restoreFocus = null;
    for (const [code,name,englishName,country,enabled] of languages) {
      const button = document.createElement("button");
      button.className = "language-option vt-language-choice-" + code + (code === current ? " is-selected" : "");
      button.type = "button";
      button.dataset.search = (code + " " + name + " " + englishName).toLocaleLowerCase();
      button.append(flag(country));
      const copy = document.createElement("span");
      copy.className = "language-option-copy vt-language-copy-" + code;
      const strong = document.createElement("strong");
      strong.className = "vt-language-name-" + code;
       strong.textContent = name;
      const subtitle = document.createElement("small");
      subtitle.className = "vt-language-caption-" + code;
       subtitle.textContent = code === current ? words.current : (enabled ? englishName : words.future);
      copy.append(strong, subtitle);
      button.append(copy);
      if (code === current) button.setAttribute("aria-current", "true");
      if (!enabled) {
        button.disabled = true;
        button.setAttribute("aria-label", name + " — " + words.future);
        button.title = words.future;
      } else {
        button.addEventListener("click", () => {
          if (code === current) { close(); return; }
          persist(code);
          location.reload(); // Keep the selected language on this page.
        });
      }
      list.append(button);
    }
    const scrollShell = document.createElement("div");
    scrollShell.className = "language-scroll-shell ui-language-scroll-shell";
    const scrollTrack = document.createElement("div");
    scrollTrack.className = "language-scroll-track ui-language-scroll-track";
    scrollTrack.setAttribute("aria-hidden", "true");
    const scrollThumb = document.createElement("span");
    scrollThumb.className = "language-scroll-thumb ui-language-scroll-thumb";
    scrollTrack.append(scrollThumb);
    scrollShell.append(list, scrollTrack);
    dialog.append(headingRow, searchField, scrollShell, notFound);
    backdrop.append(dialog);
    document.body.append(backdrop);

    /* Custom VATRA scrollbar. Native scrolling stays active for wheel, touch and keys. */
    function updateScrollbar() {
      const viewport = list.clientHeight;
      const content = list.scrollHeight;
      const available = scrollShell.clientHeight;
      const overflow = content > viewport + 2 && viewport > 0 && available > 0;
      scrollTrack.hidden = !overflow;
      if (!overflow) return;
      const thumbHeight = Math.max(38, Math.min(available, available * viewport / content));
      const travel = Math.max(0, available - thumbHeight);
      const progress = Math.max(0, Math.min(1, list.scrollTop / (content - viewport)));
      scrollThumb.style.height = thumbHeight + "px";
      scrollThumb.style.transform = "translateY(" + (progress * travel) + "px)";
    }
    let dragging = false;
    let dragOffset = 0;
    function moveThumb(clientY) {
      const bounds = scrollTrack.getBoundingClientRect();
      const travel = Math.max(0, bounds.height - scrollThumb.offsetHeight);
      const target = Math.max(0, Math.min(travel, clientY - bounds.top - dragOffset));
      list.scrollTop = travel > 0 ? (target / travel) * (list.scrollHeight - list.clientHeight) : 0;
    }
    scrollTrack.addEventListener("pointerdown", e => {
      if (e.button !== 0 || scrollTrack.hidden) return;
      const bounds = scrollThumb.getBoundingClientRect();
      dragOffset = e.target === scrollThumb ? e.clientY - bounds.top : bounds.height / 2;
      dragging = true;
      scrollTrack.classList.add("is-dragging");
      scrollTrack.setPointerCapture(e.pointerId);
      moveThumb(e.clientY);
      e.preventDefault();
    });
    scrollTrack.addEventListener("pointermove", e => {
      if (dragging) moveThumb(e.clientY);
    });
    scrollTrack.addEventListener("wheel", e => {
      list.scrollTop += e.deltaY;
      e.preventDefault();
    }, {passive:false});
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      scrollTrack.classList.remove("is-dragging");
      if (scrollTrack.hasPointerCapture(e.pointerId)) scrollTrack.releasePointerCapture(e.pointerId);
    }
    scrollTrack.addEventListener("pointerup", endDrag);
    scrollTrack.addEventListener("pointercancel", endDrag);
    list.addEventListener("scroll", updateScrollbar, {passive:true});
    window.addEventListener("resize", updateScrollbar);
    if ("ResizeObserver" in window) new ResizeObserver(updateScrollbar).observe(list);
    function close() {
      for(const trigger of triggers)trigger.setAttribute("aria-expanded","false");
      backdrop.hidden = true;
      document.body.classList.remove("language-dialog-open");
      if (restoreFocus) restoreFocus.focus();
    }
    function open(e) {
      restoreFocus = e?.currentTarget || document.activeElement;
      for(const trigger of triggers)trigger.setAttribute("aria-expanded","true");
      search.value = "";
      syncSearchHint();
      clearSearch.hidden = true;
      [...list.children].forEach(node => { node.hidden = false; });
      notFound.hidden = true;
      backdrop.hidden = false;
      document.body.classList.add("language-dialog-open");
      search.focus();
      requestAnimationFrame(updateScrollbar);
    }
    search.addEventListener("input", () => {
      clearSearch.hidden = !search.value;
      const q = search.value.trim().toLocaleLowerCase();
      let count = 0;
      for (const node of list.children) {
        node.hidden = !node.dataset.search.includes(q);
        if (!node.hidden) count++;
      }
      notFound.hidden = count > 0;
      list.scrollTop = 0;
      requestAnimationFrame(updateScrollbar);
    });
    clearSearch.addEventListener("click",()=>{
      search.value="";
      search.dispatchEvent(new Event("input",{bubbles:true}));
      search.focus();
    });
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", e => {
      if (backdrop.hidden) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") {
        const tabbable = [...dialog.querySelectorAll("button:not(:disabled):not([hidden]),input:not([hidden])")].filter(x => x.offsetParent !== null);
        const first=tabbable[0], last=tabbable[tabbable.length-1];
        if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
        else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
      }
    });
    // The same handler opens the original full search-and-scroll language dialog.
    // Keep expanded state synchronized for keyboard and screen-reader users.
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",initLanguagePicker,{once:true});
  }else{
    initLanguagePicker();
  }
})();