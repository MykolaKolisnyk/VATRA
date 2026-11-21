import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {webcrypto} from "node:crypto";
import vm from "node:vm";

const script=await readFile("assets/js/messenger-crypto.js","utf8");
function fakeIDB(){
 const stores=new Map();
 const database={
  objectStoreNames:{contains:name=>stores.has(name)},
  createObjectStore:name=>stores.set(name,new Map()),
  transaction(name){
   const tx={oncomplete:null,onerror:null};
   tx.objectStore=()=>({
    get(key){const req={result:undefined,onsuccess:null,onerror:null};queueMicrotask(()=>{
     req.result=stores.get(name)?.get(key);req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());
    });return req;},
    put(value,key){const req={result:undefined,onsuccess:null,onerror:null};queueMicrotask(()=>{
     stores.get(name).set(key,value);req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());
    });return req;}
   });
   return tx;
  },
  close(){}
 };
 return {open(){
  const req={result:database,onupgradeneeded:null,onsuccess:null,onerror:null};
  queueMicrotask(()=>{if(!stores.size)req.onupgradeneeded?.();req.onsuccess?.();});return req;
 }};
}
function start(){
 const window={VATRA_MESSENGER_CRYPTO:null,addEventListener(){}};
 const context=vm.createContext({window,indexedDB:fakeIDB(),crypto:webcrypto,
  TextEncoder,TextDecoder,Uint8Array,Array,JSON,Promise,Error,RegExp,Map,
  btoa,atob,queueMicrotask});
 new vm.Script(script,{filename:"messenger-crypto.js"}).runInContext(context);
 return window.VATRA_MESSENGER_CRYPTO;
}
const a=start(),b=start(),backupClient=start();
const passA="a memorized but strong 2026 private phrase";
const passB="another long independent secret passphrase";
const pubA=await a.create("1001",passA),pubB=await b.create("2002",passB);
assert.ok(!JSON.stringify(await a.loadRecord("1001")).includes('"d":'),"Private ECDH scalar must never be stored outside AES-GCM envelope");
const id=webcrypto.randomUUID();
const sealed=await a.encrypt(id,"1001","2002",pubB,"Приватне повідомлення VATRA");
assert.ok(sealed.ciphertext&&!JSON.stringify(sealed).includes("Приватне"),"Server envelope must be ciphertext only");
assert.equal(await b.decrypt({...sealed,created_at:new Date().toISOString()},"2002"),"Приватне повідомлення VATRA");
assert.equal(await a.decrypt(sealed,"1001"),"Приватне повідомлення VATRA");
assert.ok((await a.fingerprint(pubB)).length>48,"Identities should have readable fingerprints");
assert.equal((await a.checkPeer("1001","2002",pubB)).changed,false);
const newPair=await webcrypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
const swapped=await webcrypto.subtle.exportKey("jwk",newPair.publicKey);
assert.equal((await a.checkPeer("1001","2002",swapped)).changed,true,"TOFU must detect key substitution");
const tampered={...sealed,ciphertext:sealed.ciphertext.slice(0,-2)+"AA"};
await assert.rejects(()=>b.decrypt(tampered,"2002"),"AES-GCM must reject modified ciphertext");
const backup=await a.exportBackup("1001");
await assert.rejects(()=>backupClient.importBackup("1001",backup,"wrong passphrase",pubA));
await backupClient.importBackup("1001",backup,passA,pubA);
assert.equal(await backupClient.decrypt(sealed,"1001"),"Приватне повідомлення VATRA");
assert.equal(a.isUnlocked("1001"),true);
a.lock();assert.equal(a.isUnlocked("1001"),false);
console.log("VATRA Messenger cryptography: encrypt/decrypt, identity binding, auth tag, pin change, encrypted backup and lock passed.");