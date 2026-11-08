/* VATRA official-host check. Client-side deterrent, not copy protection. */
(() => {
  "use strict";
  // Public VATRA runs on the official HTTPS origin only. This check prevents
  // unmodified copies from running elsewhere, but cannot protect downloadable
  // static source from someone who edits or removes JavaScript.
  const allowed=location.protocol==="https:" &&
    location.hostname==="mykolakolisnyk.github.io" &&
    /^\/VATRA(?:\/|$)/.test(location.pathname);
  window.VATRA_HOST_ALLOWED = allowed;
  if (allowed) return;
  document.documentElement.setAttribute("data-vatra-denied", "");
  const style = document.createElement("style");
  style.textContent = 'html[data-vatra-denied] body{visibility:hidden!important}body.vatra-access-blocked{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f8f9fd;font-family:Onest,system-ui,sans-serif;color:#2C3850}body.vatra-access-blocked main{width:min(100% - 32px,460px);padding:36px 30px;background:#fff;border:1px solid #e3e8f2;border-radius:19px;text-align:center}body.vatra-access-blocked h1{margin:0 0 12px;font-size:25px}body.vatra-access-blocked p{color:#627187;line-height:1.6}body.vatra-access-blocked a{color:#2865D8;font-weight:700;text-decoration:none}';
  document.head.append(style);
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.createElement("main");
    container.className = "ui-host-blocked-container";
    const heading = document.createElement("h1");
    heading.className = "vt-host-blocked-heading";
    heading.textContent = "VATRA";
    const p = document.createElement("p");
    p.className = "vt-host-blocked-explanation";
    p.textContent = "Будь ласка, відкрийте VATRA на офіційному сайті.";
    const a = document.createElement("a");
    a.className = "vt-host-blocked-link";
    a.href = "https://mykolakolisnyk.github.io/VATRA/";
    a.textContent = "Перейти до VATRA";
    container.append(heading, p, a);
    document.body.replaceChildren(container);
    document.body.className = "vatra-access-blocked";
    document.title = "VATRA";
    document.documentElement.removeAttribute("data-vatra-denied");
  }, { once:true });
})();
