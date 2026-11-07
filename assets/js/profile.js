/* VATRA public numeric-ID route. Never expose private auth data publicly. */
(() => {
  "use strict";
  const ROOT="/VATRA/";
  const english=window.VATRA_LANGUAGE?.locale==="en"||/^\/VATRA\/en\//.test(location.pathname);
  const match=location.pathname.match(/^\/VATRA\/(?:(?:ua|en)\/)?id([1-9]\d*)\/?$/);
  const t=(uk,en)=>english?en:uk;
  const heading=document.getElementById("profile-heading");
  const description=document.getElementById("profile-description");
  const number=document.getElementById("public-vatra-id");
  const home=document.getElementById("profile-home");
  const signIn=document.getElementById("profile-signin");
  const endpoint=ROOT+(english?"en/":"ua/");
  if(english){
    document.documentElement.lang="en";
    home.textContent="Home";
    signIn.textContent="Sign in to VATRA";
    const footer=document.querySelector(".footer");
    if(footer){
      footer.querySelector("nav")?.querySelectorAll("a").forEach(link=>{
        if(link.textContent==="Умови використання"){link.textContent="Terms of Service";link.href="/VATRA/en/terms.html";}
        if(link.textContent==="Конфіденційність"){link.textContent="Privacy";link.href="/VATRA/en/privacy.html";}
      });
      const copyright=footer.querySelector("span");
      if(copyright)copyright.innerHTML="© 2026 <b>VATRA</b> · Your people. Your stories.";
      const trigger=footer.querySelector("[data-language-trigger]");
      if(trigger){trigger.setAttribute("aria-label","Choose language");trigger.textContent="English";}
    }
  }
  home.href=endpoint;
  signIn.href=endpoint;
  if(!match || !Number.isSafeInteger(Number(match[1]))){
    heading.textContent=t("Сторінку не знайдено","Page not found");
    description.textContent=t("Перевірте адресу та поверніться до VATRA.","Check the address and return to VATRA.");
    document.title=t("Сторінку не знайдено · VATRA","Page not found · VATRA");
    return;
  }
  const id=Number(match[1]);
  document.title="VATRA ID "+id+" · VATRA";
  number.textContent="VATRA ID "+id;
  number.hidden=false;
  description.textContent=t("Завантаження профілю…","Loading profile…");
  if(!window.supabase?.createClient){
    description.textContent=t("Немає з’єднання. Оновіть сторінку.","Unable to connect. Refresh this page.");
    return;
  }
  const client=window.supabase.createClient("https://rjasunoawrxvetwadylh.supabase.co","sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-",{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
  });
  (async()=>{
    try {
      const {data,error}=await client.from("vatra_directory")
        .select("vatra_id").eq("vatra_id",id).maybeSingle();
      if(error)throw error;
      if(!data){
        heading.textContent=t("Профіль не знайдено","Profile not found");
        number.hidden=true;
        description.textContent=t("VATRA ID з таким номером не існує.","There is no VATRA account with this ID.");
        document.title=t("Профіль не знайдено · VATRA","Profile not found · VATRA");
        return;
      }
      heading.textContent=t("Сторінка користувача VATRA","VATRA member profile");
      description.textContent=t("Особистий номер користувача у VATRA.","This member’s permanent VATRA number.");
      const {data:session}=await client.auth.getUser();
      if(session?.user){
        const {data:own}=await client.from("accounts").select("vatra_id").eq("user_id",session.user.id).maybeSingle();
        if(own && Number(own.vatra_id)===id){
          heading.textContent=t("Моя сторінка","My page");
          const given=String(session.user.user_metadata?.first_name||"").trim();
          if(given)description.textContent=given;
          signIn.textContent=t("Налаштування акаунта","Account settings");
          signIn.href=endpoint+"account.html";
        }
      }
    } catch(error){
      description.textContent=t("Не вдалося завантажити профіль. Спробуйте ще раз.","Unable to load this profile. Please try again.");
    }
  })();
})();