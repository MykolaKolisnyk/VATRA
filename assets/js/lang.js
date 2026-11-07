/* VATRA: one language selector for every public and account page. */
(() => {
  "use strict";
  if (window.VATRA_HOST_ALLOWED === false) return;
  const ROOT = "/VATRA/";
  const route = location.pathname.slice(ROOT.length);
  const explicit = route.startsWith("ua/") ? "uk" : route.startsWith("en/") ? "en" : null;
  const browserLocale = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
  function preferred() {
    const explicitLocale = new URLSearchParams(location.search).get("locale");
    if (explicitLocale === "uk_UA") return "uk";
    if (explicitLocale === "en_US") return "en";
    const choice = saved();
    if (choice === "uk" || choice === "en") return choice;
    return browserLocale.startsWith("uk") || browserLocale.endsWith("-ua") ? "uk" : "en";
  }
  const current = explicit || preferred();
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
  function flag(groupCode) {
    const group = Object.keys(flagGroups).find(key => flagGroups[key].has(groupCode)) || "europe-a";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("language-flag");
    svg.setAttribute("viewBox", "0 0 640 480");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
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
  function pathFor(lang) {
    const route = location.pathname.slice(ROOT.length).replace(/^(?:ua|en)\//, "");
    const filename = route === "index.html" || route === "auth.html" ? "" : route;
    const query = new URLSearchParams(location.search);
    query.set("locale", lang === "en" ? "en_US" : "uk_UA");
    if (new RegExp("^id[1-9][0-9]*/?$").test(filename)) return ROOT + filename + "?" + query + location.hash;
    return ROOT + (lang === "en" ? "en/" : "ua/") + filename + "?" + query + location.hash;
  }
  /* Explicit /ua/ and /en/ URLs win; root and legacy paths route to the browser preference. */
  const isProfile = new RegExp("^id[1-9][0-9]*/?$").test(route);
  if (!explicit && !isProfile) {
    location.replace(pathFor(current));
    return;
  }

  /* Keep address bar and internal navigation consistent with the active locale. */
  if (explicit || isProfile) {
    const expected = current === "en" ? "en_US" : "uk_UA";
    const address = new URL(location.href);
    if (address.searchParams.get("locale") !== expected) {
      address.searchParams.set("locale", expected);
      history.replaceState(history.state,"",address.pathname+address.search+address.hash);
    }
  }
  function bindLocalizedLinks() {
    const tag = current === "en" ? "en_US" : "uk_UA";
    for(const link of document.querySelectorAll('a[href]')){
      const raw=link.getAttribute("href");
      if(!raw||raw.startsWith("#")||raw.startsWith("mailto:")||raw.startsWith("tel:"))continue;
      try {
        const address=new URL(raw,location.href);
        if(address.origin!==location.origin||!address.pathname.startsWith(ROOT))continue;
        if(address.pathname.startsWith(ROOT+"assets/"))continue;
        if(address.pathname.endsWith("/auth.html")||address.pathname.endsWith("/index.html")) {
          address.pathname=address.pathname.replace(/(?:auth|index)\.html$/,"");
        }
        address.searchParams.set("locale",tag);
        link.href=address.href;
      } catch(_) {}
    }
  }
  let errors = {};
  const ready = current === "en"
    ? fetch(ROOT + "assets/i18n/en.json").then(r => r.ok ? r.json() : {}).then(value => { errors = value; }).catch(() => {})
    : Promise.resolve();
  window.VATRA_LANGUAGE = {
    locale: current,
    ready,
    translate: text => current === "en" ? (errors[text] || text) : text
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
    backdrop.className = "language-backdrop";
    backdrop.hidden = true;
    const dialog = document.createElement("section");
    dialog.className = "language-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "vatra-language-heading");
    const headingRow = document.createElement("div");
    headingRow.className = "language-heading-row";
    const texts = document.createElement("div");
    const heading = document.createElement("h2");
    heading.id = "vatra-language-heading";
    heading.textContent = words.heading;
    const details = document.createElement("p");
    details.textContent = words.details;
    texts.append(heading, details);
    const closeBtn = document.createElement("button");
    closeBtn.className = "language-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", words.close);
    closeBtn.textContent = "×";
    headingRow.append(texts, closeBtn);
    const searchField = document.createElement("label");
    searchField.className = "field language-search-field";
    const searchCaption = document.createElement("span");
    searchCaption.textContent = words.search;
    const search = document.createElement("input");
    search.className = "control language-search";
    search.type = "search";
    search.autocomplete = "off";
    search.placeholder = words.search;
    search.setAttribute("aria-label", words.search);
    searchField.append(searchCaption,search);
    const list = document.createElement("div");
    list.className = "language-grid";
    const notFound = document.createElement("p");
    notFound.className = "language-empty";
    notFound.textContent = words.empty;
    notFound.hidden = true;
    let restoreFocus = null;
    for (const [code,name,englishName,country,enabled] of languages) {
      const button = document.createElement("button");
      button.className = "language-option" + (code === current ? " is-selected" : "");
      button.type = "button";
      button.dataset.search = (code + " " + name + " " + englishName).toLocaleLowerCase();
      button.append(flag(country));
      const copy = document.createElement("span");
      copy.className = "language-option-copy";
      const strong = document.createElement("strong");
      strong.textContent = name;
      const subtitle = document.createElement("small");
      subtitle.textContent = code === current ? words.current : (enabled ? englishName : words.future);
      copy.append(strong, subtitle);
      button.append(copy);
      if (code === current) button.setAttribute("aria-current", "true");
      if (!enabled) {
        button.disabled = true;
        button.setAttribute("aria-label", name + " — " + words.future);
      } else {
        button.addEventListener("click", () => {
          if (code === current) { close(); return; }
          persist(code);
          location.assign(pathFor(code));
        });
      }
      list.append(button);
    }
    dialog.append(headingRow, searchField, list, notFound);
    backdrop.append(dialog);
    document.body.append(backdrop);
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
    }
    search.addEventListener("input", () => {
      const q = search.value.trim().toLocaleLowerCase();
      let count = 0;
      for (const node of list.children) {
        node.hidden = !node.dataset.search.includes(q);
        if (!node.hidden) count++;
      }
      notFound.hidden = count > 0;
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
    for (const trigger of triggers) {
      trigger.replaceChildren();
      trigger.append(flag(english ? "gb" : "ua"));
      const label = document.createElement("span");
      label.textContent = nativeLabels[current];
      const chevron = document.createElement("span");
      chevron.className = "language-chevron";
      chevron.textContent = "⌄";
      trigger.append(label, chevron);
      trigger.setAttribute("aria-label", words.name + ": " + nativeLabels[current]);
      trigger.addEventListener("click", open);
    }
  });
})();