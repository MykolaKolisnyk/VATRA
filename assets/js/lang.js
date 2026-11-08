/* VATRA: one language selector for every public and account page. */
(() => {
  "use strict";
  if (window.VATRA_HOST_ALLOWED === false) return;
  // Resolve assets from the current script to support arbitrary local server paths.
  const localFile=location.protocol==="file:";
  const scriptUrl=new URL(document.currentScript?.src||"assets/js/lang.js",document.baseURI);
  const ROOT=new URL("../../",scriptUrl).pathname;
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
  document.documentElement.lang = current === "en" ? "en" : "uk";
  document.documentElement.dataset.language = current;
  if (current === "en") {
    document.documentElement.classList.add("i18n-pending");
    const block = document.createElement("style");
    block.className = "ui-i18n-pending-style";
    block.textContent = "html.i18n-pending body{visibility:hidden!important}";
    document.head.append(block);
  }
  const nativeLabels = {
    uk: "Українська", en: "English"
  };
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
  const flagGroups = {
    "europe-a": new Set(["ua","gb","pl","de","fr","es","it","pt","ro"]),
    "europe-b": new Set(["nl","cz","sk","hu","bg","gr","tr","se","dk"]),
    "europe-c": new Set(["no","fi","ee","lt","lv","hr","rs","si","ge"]),
    "world": new Set(["jp","kr","cn","sa","il","in","id","vn","th"])
  };
  let flagSerial=0;
  function flag(groupCode) {
    const group = Object.keys(flagGroups).find(key => flagGroups[key].has(groupCode)) || "europe-a";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const instance=++flagSerial;
    svg.classList.add("language-flag","ui-language-flag-"+instance);
    svg.setAttribute("viewBox", "0 0 640 480");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.classList.add("ui-language-flag-symbol-"+instance);
    use.setAttribute("href", ROOT + "assets/flags/" + group + ".svg#flag-" + groupCode);
    svg.append(use);
    return svg;
  }
  function saved() {
    try { return localStorage.getItem("vatra-language"); } catch (_) { return null; }
  }
  function persist(lang) {
    try { localStorage.setItem("vatra-language", lang); } catch (_) {}
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
        target.searchParams.delete("locale");
        link.href = target.href;
      } catch (_) {}
    }
  }
  let errors = {};
  const pageFromPath = () => {
    if (document.body?.dataset.page === "not-found") return "404";
    if (location.pathname === ROOT || location.pathname.endsWith("/index.html")) return "index";
    return location.pathname.split("/").pop()?.replace(/\.html$/, "") || "index";
  };
  const domReady = new Promise(resolve => {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded",resolve,{once:true});
    else resolve();
  });
  const timeout = new AbortController();
  const stop = setTimeout(() => timeout.abort(),7000);
  const translations = localFile ? Promise.resolve({}) : fetch(ROOT + "assets/i18n/" + current + ".json",{signal:timeout.signal,cache:"no-cache"})
    .then(res => { if (!res.ok) throw new Error("translations unavailable"); return res.json(); })
    .catch(() => ({}))
    .finally(() => clearTimeout(stop));
  function applyTranslation(table) {
    const entry = table.__pages?.[pageFromPath()];
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
  }).finally(()=>document.documentElement.classList.remove("i18n-pending"));
  window.VATRA_LANGUAGE = {
    locale: current,
    ready,
    translate: raw => current==="en" ? (errors[raw] || raw) : raw
  };

  const english = current === "en";
  const words = english
    ? {name:"Language",heading:"Choose your language",details:"VATRA interface language",search:"Search languages",future:"In development",current:"Selected",close:"Close",empty:"No matching languages"}
    : {name:"Мова",heading:"Оберіть мову",details:"Мова інтерфейсу VATRA",search:"Пошук мов",future:"У розробці",current:"Обрано",close:"Закрити",empty:"Мов не знайдено"};

  document.addEventListener("DOMContentLoaded", () => {
    bindLocalizedLinks();
    const triggers = [...document.querySelectorAll("[data-language-trigger]")];
    if (!triggers.length) return;
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
    const searchField = document.createElement("label");
    searchField.className = "field language-search-field vt-language-search-label";
    const searchCaption = document.createElement("span");
    searchCaption.className = "vt-language-search-caption";
     searchCaption.textContent = words.search;
    const search = document.createElement("input");
    search.className = "control language-search ui-language-search-input";
    search.type = "search";
    search.autocomplete = "off";
    search.placeholder = words.search;
    search.setAttribute("aria-label", words.search);
    searchField.append(searchCaption,search);
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
       const selectable=Boolean(enabled)&&!(localFile&&code==="en");
       const unavailableReason=localFile&&enabled
         ?"Запустіть локальний HTTP-сервер для перекладів" : words.future;
       subtitle.textContent = code === current ? words.current : (selectable ? englishName : unavailableReason);
      copy.append(strong, subtitle);
      button.append(copy);
      if (code === current) button.setAttribute("aria-current", "true");
      if (!selectable) {
        button.disabled = true;
        button.setAttribute("aria-label", name + " — " + unavailableReason);
        button.title = unavailableReason;
      } else {
        button.addEventListener("click", () => {
          if (code === current) { close(); return; }
          persist(code);
          location.reload(); // Same HTML URL; reload only the chosen JSON translation.
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
      backdrop.hidden = true;
      document.body.classList.remove("language-dialog-open");
      if (restoreFocus) restoreFocus.focus();
    }
    function open(e) {
      restoreFocus = e?.currentTarget || document.activeElement;
      search.value = "";
      [...list.children].forEach(node => { node.hidden = false; });
      notFound.hidden = true;
      backdrop.hidden = false;
      document.body.classList.add("language-dialog-open");
      search.focus();
      requestAnimationFrame(updateScrollbar);
    }
    search.addEventListener("input", () => {
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
    let triggerOrdinal = 0;
    for (const trigger of triggers) {
      const textId = ++triggerOrdinal;
      trigger.replaceChildren();
      trigger.append(flag(english ? "gb" : "ua"));
      const label = document.createElement("span");
      label.className = "vt-language-trigger-label-" + textId;
       label.textContent = nativeLabels[current];
      const chevron = document.createElement("span");
      chevron.className = "language-chevron vt-language-trigger-chevron-" + textId;
      chevron.textContent = "⌄";
      trigger.append(label, chevron);
      trigger.setAttribute("aria-label", words.name + ": " + nativeLabels[current]);
      trigger.addEventListener("click", open);
    }
  });
})();