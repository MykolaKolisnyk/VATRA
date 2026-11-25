import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
const runtime=await readFile("assets/js/ads.js","utf8");
function fixture({enabled=true,consent=false,hidden=true,width=210,adSlot="1234567890"}={}){
 const listeners=new Map(),scripts=[],placeholder={tag:"p"};
 const app={hidden},body={dataset:{authReady:hidden?"false":"true"}};
 const slot={dataset:{},childNodes:[placeholder],getBoundingClientRect:()=>({width}),getClientRects:()=>width?[{}]:[],replaceChildren(...children){this.childNodes=children;}};
 const meta={"vatra-adsense-client":"ca-pub-6237550910505008","vatra-adsense-slot":adSlot,"vatra-adsense-enabled":String(enabled)};
 const document={readyState:"complete",body,head:{append(s){scripts.push(s);}},querySelector(s){if(s==="#feed-app")return app;if(s==="#feed-google-ad-slot")return slot;return {content:meta[s.match(/name="([^"]+)"/)?.[1]]};},createElement(tag){return {tag,style:{},dataset:{},events:{},addEventListener(k,fn){this.events[k]=fn;}};}};
 const window={VATRA_ADS_CONSENT:{canRequestAds:()=>consent},addEventListener(k,fn){listeners.set(k,fn);},removeEventListener(k){listeners.delete(k);}};
 runInNewContext(runtime,{window,document,encodeURIComponent,MutationObserver:class{constructor(fn){this.fn=fn;}observe(){}disconnect(){}},ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){}disconnect(){}}});
 return {slot,scripts,window,show(){app.hidden=false;body.dataset.authReady="true";listeners.get("resize")?.();},consent(){consent=true;listeners.get("vatra:ads-consent-changed")?.();},width(n){width=n;listeners.get("resize")?.();},resize(){listeners.get("resize")?.();}};
}
for(const options of [{enabled:false,hidden:false,consent:true},{adSlot:"",hidden:false,consent:true}])assert.equal(fixture(options).scripts.length,0);
const f=fixture();f.show();assert.equal(f.scripts.length,0);f.width(0);f.consent();assert.equal(f.scripts.length,0);f.width(210);assert.equal(f.scripts.length,1);f.resize();assert.equal(f.scripts.length,1);f.scripts[0].events.load();assert.equal(f.window.adsbygoogle.length,1);assert.equal(f.slot.dataset.adsLoaded,"true");f.resize();assert.equal(f.window.adsbygoogle.length,1);
const g=fixture({hidden:false,consent:true});g.scripts[0].events.error();assert.equal(g.slot.childNodes[0].tag,"p");assert.equal(g.slot.dataset.adsPending,undefined);
console.log("VATRA AdSense: disabled by default, consent/auth/width gates, one request and script failure recovery verified.");
