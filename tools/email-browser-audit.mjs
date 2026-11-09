/* Rendered Supabase Go-template email compatibility checks.
   Run after VATRA_AUDIT_EMAIL_OUTPUT=1 go run tools/email-template-audit.go.
   Fixtures are generated in CI; no production emails or accounts are touched. */
import assert from "node:assert/strict";
import {readFile,mkdir} from "node:fs/promises";
import {chromium,firefox,webkit} from "playwright";

const templates=["confirmation","invite","recovery","magic-link","email-change",
 "reauthentication","password-changed","email-address-changed"];
await mkdir("audit-screenshots",{recursive:true});
for(const [engine,kind] of [["chromium",chromium],["firefox",firefox],["webkit",webkit]]){
 const browser=await kind.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce"});
  await context.route("**/*",route=>route.abort()); // External logo network is not required for box geometry.
  try{
   for(const locale of ["uk","en"]){
    for(const name of templates){
     const html=await readFile("audit-email/"+name+"-"+locale+".html","utf8");
     for(const width of [320,390,600]){
      const page=await context.newPage();
      try{
       await page.setViewportSize({width,height:780});
       await page.setContent(html,{waitUntil:"domcontentloaded"});
       const metrics=await page.evaluate(()=>{
        const bounds=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}};
        const table=document.querySelector('table[role="presentation"]');
        const content=[...document.querySelectorAll("body *")].filter(el=>{
         const cs=getComputedStyle(el),b=el.getBoundingClientRect();
         return cs.display!=="none"&&cs.visibility!=="hidden"&&b.width>0&&
          (b.left< -2||b.right>innerWidth+2);
        }).slice(0,6).map(el=>({tag:el.tagName,cls:el.className,geometry:bounds(el)}));
        return {overflow:document.documentElement.scrollWidth-innerWidth,
         table:table?bounds(table):null,offenders:content,
         links:[...document.querySelectorAll("a[href]")].length,
         headings:document.querySelectorAll("h1").length,
         lang:document.documentElement.lang};
       });
       assert.ok(metrics.table&&metrics.table.left>=-2&&metrics.table.right<=width+2&&
        metrics.overflow<=2&&metrics.offenders.length===0&&
        metrics.links>=1&&metrics.headings===1&&metrics.lang===locale,
        engine+" "+locale+" "+name+" "+width+
        ": rendered email layout or semantics invalid: "+JSON.stringify(metrics));
       if(["confirmation","recovery","password-changed"].includes(name)&&width===320){
        await page.screenshot({path:"audit-screenshots/email-"+engine+"-"+name+"-"+locale+"-320.png",fullPage:true});
       }
      }finally{await page.close();}
     }
    }
   }
  }finally{await context.close();}
 }finally{await browser.close();}
 console.log("VATRA "+engine+" email: 8 bilingual templates at 320/390/600px, no overflow");
}
console.log("VATRA rendered Supabase email visual checks passed.");
