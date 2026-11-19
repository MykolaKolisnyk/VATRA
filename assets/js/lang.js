
(() => {
  "use strict";
  if (window.VATRA_HOST_ALLOWED === false) return;


  if (document.documentElement.classList.contains("vatra-dynamic-route-pending")) return;

  const localFile=location.protocol==="file:";
  const scriptUrl=new URL(document.currentScript?.src||"assets/js/lang.js",document.baseURI);
  const ROOT=new URL("../../",scriptUrl).pathname;
  const LANGUAGE_KEY = "vatra-language";
  const validLanguage = value => value === "uk" || value === "en";
  const browserLocale = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
  function preferred() {
    const choice = saved();
    if (choice === "uk" || choice === "en") return choice;
    
    const legacy = new URLSearchParams(location.search).get("locale");
    if (legacy === "uk_UA") return "uk";
    if (legacy === "en_US") return "en";
    return browserLocale.startsWith("uk") || browserLocale.endsWith("-ua") ? "uk" : "en";
  }


  const current = localFile ? "uk" : preferred();


  const instantEnglishTitles={
    index:"Sign in · VATRA","create-account":"Create account · VATRA",feed:"Feed · VATRA",friends:"Friends · VATRA",gifts:"Gifts · VATRA",notifications:"Notifications · VATRA",profile:"My page · VATRA",verify:"Verification · VATRA",communities:"Communities · VATRA",club:"Community · VATRA",clips:"Clips · VATRA",marketplace:"Marketplace · VATRA",business:"VATRA Business","vatra-id":"VATRA ID · VATRA",
    forgot:"Password recovery · VATRA",reset:"New password · VATRA",
    "404":"Page not found",
    terms:"Terms of Service · VATRA",commerce:"Commerce Rules · VATRA",privacy:"Privacy · VATRA",
    cookies:"Cookies and browser storage · VATRA",offline:"No connection · VATRA",maintenance:"Maintenance · VATRA"
  };
  if(current==="en"){
    const segment=location.pathname.split("/").pop()?.replace(/\.html$/,"")||"index";
    const dynamicMember=/^id[1-9][0-9]{0,18}$/.test(segment);
    const dynamicClub=/^club[1-9][0-9]{0,18}$/.test(segment);


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


  if(location.protocol!=="file:"){
    const path=location.pathname.replace(/\/(create-account|forgot|reset|feed|profile|friends|gifts|communities|notifications|clips|marketplace|business|vatra-id|club|verify|terms|privacy|cookies|offline|404)\.html$/,(_all,route)=>"/"+route);
    if(path!==location.pathname)history.replaceState(history.state,"",path+location.search+location.hash);
  }
  document.documentElement.lang = current === "en" ? "en" : "uk";
  document.documentElement.dataset.language = current;
  if (current === "en") {
    document.documentElement.classList.add("i18n-pending");
    const block = document.createElement("style");
    block.className = "ui-i18n-pending-style";



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


  const languages = [
    ["uk","Українська","Ukrainian","ua",true],
    ["en","English","English","gb",true],
    ["pl","Polski","Polish","pl"],
    ["de","Deutsch","German","de"],
    ["fr","Français","French","fr"],
    ["it","Italiano","Italian","it"],
    ["ka","ქართული","Georgian","ge"],
    ["bg","Български","Bulgarian","bg"]
  ];
  const flagGroups={
    "europe-a":new Set(["pl","de","fr","it"]),
    "europe-b":new Set(["bg"]),
    "europe-c":new Set(["ge"])
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

    if(country==="ua"){
      add("rect",{x:0,y:0,width:640,height:240,fill:"#0057b8"});
      add("rect",{x:0,y:240,width:640,height:240,fill:"#ffd700"});
    }else if(country==="gb"){

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


      if (stored !== cookie) {
        try { localStorage.setItem(LANGUAGE_KEY, cookie); } catch (_) {}
      }
      return cookie;
    }
    if (validLanguage(stored)) {

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
        target.pathname = target.pathname.replace(/\/(create-account|forgot|reset|feed|profile|friends|gifts|communities|notifications|clips|marketplace|business|vatra-id|club|verify|terms|privacy|cookies|offline|404)\.html$/,(_all,route)=>"/"+route);
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

    const communityShell=page==="communities"||page==="club"||page==="notifications"||page==="friends"||page==="gifts"||page==="clips"||page==="marketplace"||page==="business"||page==="vatra-id";
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
    translate: raw => (typeof errors[raw] === "string" && errors[raw]) ? errors[raw] : raw
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
    const closeIcon = document.createElementNS("http://www.w3.org/2000/svg","svg");
    closeIcon.setAttribute("class","ui-language-close-icon");
    closeIcon.setAttribute("viewBox","0 0 24 24");
    closeIcon.setAttribute("width","19");closeIcon.setAttribute("height","19");
    closeIcon.setAttribute("fill","none");closeIcon.setAttribute("stroke","currentColor");
    closeIcon.setAttribute("stroke-width","1.8");closeIcon.setAttribute("stroke-linecap","round");
    closeIcon.setAttribute("aria-hidden","true");
    const closePath = document.createElementNS("http://www.w3.org/2000/svg","path");
    closePath.setAttribute("class","ui-language-close-path");
    closePath.setAttribute("d","M6 6l12 12M18 6 6 18");
    closeIcon.append(closePath);closeBtn.append(closeIcon);
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

    
    let scrollbarFadeTimer = null;
    let pointerInsideDialog = false;
    function showScrollbar() {
      if (scrollTrack.hidden || backdrop.hidden) return;
      scrollTrack.classList.add("is-visible");
      clearTimeout(scrollbarFadeTimer);
      scrollbarFadeTimer = null;
      if (pointerInsideDialog || dragging) return;
      scrollbarFadeTimer = setTimeout(
        () => scrollTrack.classList.remove("is-visible"), 1000);
    }
    dialog.addEventListener("pointerenter", e => {
      if (e.pointerType==="mouse" || e.pointerType==="pen") {
        pointerInsideDialog=true;showScrollbar();
      }
    });
    dialog.addEventListener("pointerleave", e => {
      if (e.pointerType==="mouse" || e.pointerType==="pen") {
        pointerInsideDialog=false;
        clearTimeout(scrollbarFadeTimer);scrollbarFadeTimer=null;
        if(!dragging)scrollTrack.classList.remove("is-visible");
      }
    });
    function updateScrollbar() {
      const viewport = list.clientHeight;
      const content = list.scrollHeight;
      const available = scrollShell.clientHeight;
      const overflow = content > viewport + 2 && viewport > 0 && available > 0;
      scrollTrack.hidden = !overflow;
      if (!overflow) { scrollTrack.classList.remove("is-visible"); return; }
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
      showScrollbar();
      scrollTrack.setPointerCapture(e.pointerId);
      moveThumb(e.clientY);
      e.preventDefault();
    });
    scrollTrack.addEventListener("pointermove", e => {
      if (dragging) moveThumb(e.clientY);
    });
    scrollTrack.addEventListener("wheel", e => {
      list.scrollTop += e.deltaY;
      showScrollbar();
      e.preventDefault();
    }, {passive:false});
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      scrollTrack.classList.remove("is-dragging");
      showScrollbar();
      if (scrollTrack.hasPointerCapture(e.pointerId)) scrollTrack.releasePointerCapture(e.pointerId);
    }
    scrollTrack.addEventListener("pointerup", endDrag);
    scrollTrack.addEventListener("pointercancel", endDrag);
    list.addEventListener("scroll", () => { updateScrollbar(); showScrollbar(); }, {passive:true});
    window.addEventListener("resize", updateScrollbar);
    if ("ResizeObserver" in window) new ResizeObserver(updateScrollbar).observe(list);
    function close() {
      clearTimeout(scrollbarFadeTimer);
      scrollbarFadeTimer=null;pointerInsideDialog=false;
      scrollTrack.classList.remove("is-visible");
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
      requestAnimationFrame(() => {
        updateScrollbar();
        pointerInsideDialog=dialog.matches(":hover");
        showScrollbar();
      });
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
      requestAnimationFrame(() => { updateScrollbar(); showScrollbar(); });
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


  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",initLanguagePicker,{once:true});
  }else{
    initLanguagePicker();
  }
})();


(()=>{
 "use strict";
 const selector=[
  ".captcha-dialog",".vatra-select-scroll-area",".vt-tour-scroll-area-001",
  ".feed-compose-dialog",".feed-story-dialog",".club-compose-dialog",
  ".vatra-post-comment-dialog-content",".vatra-gallery-picker-grid",
  ".vatra-search-history",".vatra-search-live-results",".feed-account-dropdown",
  ".vatra-notification-panel",".vatra-post-share-dialog",".vatra-post-comment-emoji-scroll",
  ".profile-message-history",".profile-compose-dialog",".profile-photo-comments",
  ".vatra-profile-details-content",".profile-report-content",
  ".profile-confirm-dialog",".profile-story-compose-dialog",
  ".vatra-post-composer-edit",".vatra-post-composer-settings",
  ".vatra-post-composer-drafts-panel",".feed-story-view",
  ".profile-story-viewer",".vatra-gift-viewer",".vatra-discovery-sidebar",".ui-vatra-market-sidebar-scroll-001",".ui-vatra-market-editor-scroll-001",".ui-vatra-market-detail-info-001",".ui-vatra-market-editor-preview-001",".ui-vatra-section-dialog-scroll-001",
  ".ui-vatra-clips-social-001 .vatra-post-comment-list","textarea"
 ].join(",");
 const timers=new WeakMap();
 const pointerInside=new WeakSet();
 function scrollable(target){
  return target?.matches?.(selector) && target.scrollHeight>target.clientHeight+1;
 }
 function release(target){
  if(!target?.matches?.(selector))return;
  clearTimeout(timers.get(target));
  timers.delete(target);
  target.classList.remove("vatra-form-scroll-active");
 }
 function reveal(target,keepVisible=false){
  if(!scrollable(target))return;
  target.classList.add("vatra-form-scroll-active");
  clearTimeout(timers.get(target));
  timers.delete(target);
  if(keepVisible || pointerInside.has(target))return;
  const timer=setTimeout(()=>{
   if(!pointerInside.has(target))target.classList.remove("vatra-form-scroll-active");
   timers.delete(target);
  },1050);
  timers.set(target,timer);
 }
 function closestScrollable(node){
  let target=node?.closest?.(selector)||null;
  while(target&&!scrollable(target))target=target.parentElement?.closest?.(selector)||null;
  return target;
 }


 document.addEventListener?.("pointerover",event=>{
  if(event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
  const target=closestScrollable(event.target);
  if(!target)return;
  pointerInside.add(target);
  reveal(target,true);
 },{capture:true,passive:true});
 document.addEventListener?.("pointerout",event=>{
  if(event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
  const from=closestScrollable(event.target);
  if(!from || from===closestScrollable(event.relatedTarget))return;
  pointerInside.delete(from);
  release(from);
 },{capture:true,passive:true});
 document.addEventListener?.("scroll",event=>reveal(event.target),{capture:true,passive:true});
 document.addEventListener?.("wheel",event=>reveal(closestScrollable(event.target)),{capture:true,passive:true});
 document.addEventListener?.("pointerdown",event=>reveal(closestScrollable(event.target)),{capture:true,passive:true});
 document.addEventListener?.("keydown",event=>{
  if(!["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(event.key))return;
  reveal(closestScrollable(document.activeElement));
 },{capture:true});
})();
