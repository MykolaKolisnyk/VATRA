import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {chromium,firefox,webkit} from "playwright";

const script=await readFile("assets/js/vatra-player.js","utf8"),css=await readFile("assets/css/vatra-player.css","utf8");
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [320,760]){
   const page=await browser.newPage({viewport:{width,height:680}});
   try{
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.route("https://vatra-player.test/**",route=>route.fulfill({contentType:"text/html",body:'<!doctype html><html lang="uk"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><main><video controls style="aspect-ratio:16/9"></video></main></body></html>'}));
    await page.goto("https://vatra-player.test/");
    await page.addStyleTag({content:css});
    await page.addScriptTag({content:script});
    await page.evaluate(()=>{
     const video=document.querySelector("video");
     let paused=true;
     Object.defineProperties(video,{paused:{get:()=>paused},duration:{get:()=>120},currentTime:{value:0,writable:true}});
     video.play=()=>{paused=false;video.dispatchEvent(new Event("play"));return Promise.resolve();};
     video.pause=()=>{paused=true;video.dispatchEvent(new Event("pause"));};
     localStorage.setItem("vatra:player-volume",".4");
     window.VATRA_PLAYER.attach(video);
    });
    const root=page.locator(".vatra-player-root-001"),play=root.locator(".vatra-player-play-001");
    assert.equal(await root.count(),1);
    assert.equal(await page.locator("video").evaluate(v=>v.controls),false);
    await play.click();assert.equal(await play.getAttribute("aria-label"),"Пауза");
    await play.click();assert.equal(await play.getAttribute("aria-label"),"Відтворити");
    await root.locator(".vatra-player-seek-001").evaluate(el=>{el.value="75";el.dispatchEvent(new Event("input"));});
    assert.equal(await page.locator("video").evaluate(v=>v.currentTime),75);
    await root.locator(".vatra-player-speed-001").selectOption("1.5");
    assert.equal(await page.locator("video").evaluate(v=>v.playbackRate),1.5);
    await root.focus();await page.keyboard.press("ArrowLeft");
    assert.equal(await page.locator("video").evaluate(v=>v.currentTime),70);
    const bounds=await root.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,height:el.clientHeight,bar:el.querySelector(".vatra-player-bar-001").getBoundingClientRect().width}));
    assert.ok(bounds.width<=width&&bounds.scroll<=bounds.width+1&&bounds.height>0&&bounds.bar<=bounds.width,name+" player geometry "+JSON.stringify(bounds));
    assert.deepEqual(errors,[]);
   }finally{await page.close();}
  }
 }finally{await browser.close();}
 console.log("VATRA Player "+name+": real DOM controls, keyboard, speed, desktop/mobile layout verified; synthetic media timeline.");
}
