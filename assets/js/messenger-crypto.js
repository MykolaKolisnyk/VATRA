/* VATRA Messenger: audited-browser-primitive beta. Not Signal/Double Ratchet.
   Only ciphertext crosses Supabase. Encrypted private key stays in local IndexedDB.
   The user's passphrase is never sent, stored, or logged. */
(()=>{
 "use strict";
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 const DB="vatra-messenger-identity-v1",ITERATIONS=600000;
 const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const raw=text=>Uint8Array.from(atob(String(text).replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(text.length/4)*4,"=")),x=>x.charCodeAt(0));
 const random=n=>crypto.getRandomValues(new Uint8Array(n));
 const context=(id,from,to)=>encoder.encode("VATRA-MESSENGER-V1|"+id+"|"+from+"|"+to);
 let active=null;
 const openDB=()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("identities"))req.result.createObjectStore("identities");if(!req.result.objectStoreNames.contains("trusted"))req.result.createObjectStore("trusted");};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 async function store(name,mode,work){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(name,mode),obj=tx.objectStore(name);
   let req;try{req=work(obj);}catch(e){db.close();reject(e);return;}
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error);};
  });
 }
 const read=(name,key)=>store(name,"readonly",obj=>obj.get(key));
 const put=(name,key,value)=>store(name,"readwrite",obj=>obj.put(value,key));
 async function passwordKey(pass,salt){
  const material=await crypto.subtle.importKey("raw",encoder.encode(pass),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITERATIONS},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 }
 async function protect(jwk,pass){
  if(Array.from(pass).length<14)throw Error("Використайте парольну фразу щонайменше з 14 символів.");
  const salt=random(16),iv=random(12),key=await passwordKey(pass,salt);
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(jwk)));
  return {salt:b64(salt),iv:b64(iv),data:b64(encrypted)};
 }
 async function unprotect(box,pass){
  const key=await passwordKey(pass,raw(box.salt));
  const result=await crypto.subtle.decrypt({name:"AES-GCM",iv:raw(box.iv)},key,raw(box.data));
  return JSON.parse(decoder.decode(result));
 }
 const same=(a,b)=>!!a&&!!b&&a.kty===b.kty&&a.crv===b.crv&&a.x===b.x&&a.y===b.y;
 function validatePublic(jwk){
  if(jwk?.kty!=="EC"||jwk?.crv!=="P-256"||!(/^[A-Za-z0-9_-]{43}$/).test(jwk.x||"")||!(/^[A-Za-z0-9_-]{43}$/).test(jwk.y||""))throw Error("Неприпустимий відкритий ключ учасника.");
  return jwk;
 }
 async function loadRecord(owner){return read("identities",String(owner));}
 async function create(owner,pass){
  if(await loadRecord(owner))throw Error("Ключ уже існує на цьому пристрої.");
  const pair=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const pub=validatePublic(await crypto.subtle.exportKey("jwk",pair.publicKey));
  const privateJwk=await crypto.subtle.exportKey("jwk",pair.privateKey);
  const backup={version:1,owner:String(owner),publicKey:pub,box:await protect(privateJwk,pass)};
  await put("identities",String(owner),backup);
  const privateKey=await crypto.subtle.importKey("jwk",privateJwk,{name:"ECDH",namedCurve:"P-256"},false,["deriveBits"]);
  active={owner:String(owner),privateKey,publicKey:pub};
  return pub;
 }
 async function unlock(owner,pass,remote){
  const saved=await loadRecord(owner);
  if(!saved)throw Error("На цьому пристрої немає ключа. Імпортуйте резервну копію.");
  if(saved.owner!==String(owner)||!same(saved.publicKey,remote))throw Error("Ключ пристрою не збігається з ключем акаунта. Надсилання заблоковано.");
  let jwk;
  try{jwk=await unprotect(saved.box,pass);}catch(_){throw Error("Неправильна парольна фраза або пошкоджена копія ключа.");}
  const privateKey=await crypto.subtle.importKey("jwk",jwk,{name:"ECDH",namedCurve:"P-256"},false,["deriveBits"]);
  active={owner:String(owner),privateKey,publicKey:saved.publicKey};
  return true;
 }
 async function importBackup(owner,text,pass,remote){
  let parsed;
  try{parsed=JSON.parse(text);}catch(_){throw Error("Це не резервна копія ключа VATRA.");}
  if(parsed.version!==1||parsed.owner!==String(owner)||!same(parsed.publicKey,remote)||!parsed.box)throw Error("Резервна копія не належить поточному акаунту або ключ уже змінено.");
  await unprotect(parsed.box,pass); // Authenticate before persisting.
  await put("identities",String(owner),parsed);
  return unlock(owner,pass,remote);
 }
 async function exportBackup(owner){
  const value=await loadRecord(owner);
  if(!value)throw Error("Резервної копії немає.");
  return JSON.stringify(value,null,2);
 }
 async function fingerprint(jwk){
  validatePublic(jwk);
  const sha=new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(jwk.crv+"."+jwk.x+"."+jwk.y)));
  return Array.from(sha,x=>x.toString(16).padStart(2,"0")).join("").toUpperCase().match(/.{1,4}/g).join(" ");
 }
 async function checkPeer(owner,peer,jwk){
  const key=String(owner)+":"+String(peer),value=await fingerprint(jwk),old=await read("trusted",key);
  if(old&&old!==value)return {changed:true,expected:old,actual:value};
  if(!old)await put("trusted",key,value);
  return {changed:false,actual:value};
 }
 async function trustPeer(owner,peer,jwk){await put("trusted",String(owner)+":"+String(peer),await fingerprint(jwk));}
 async function messageKey(peerPublic,salt,id,from,to){
  if(!active)throw Error("Спочатку розблокуйте ключ повідомлень.");
  const publicKey=await crypto.subtle.importKey("jwk",validatePublic(peerPublic),{name:"ECDH",namedCurve:"P-256"},false,[]);
  const shared=await crypto.subtle.deriveBits({name:"ECDH",public:publicKey},active.privateKey,256);
  const secret=await crypto.subtle.importKey("raw",shared,"HKDF",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt,info:context(id,from,to)},secret,
   {name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 }
 async function encrypt(id,sender,recipient,recipientKey,text){
  if(!active||active.owner!==String(sender))throw Error("Ключ відправника недоступний.");
  const salt=random(32),nonce=random(12),key=await messageKey(recipientKey,salt,id,sender,recipient);
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,additionalData:context(id,sender,recipient)},key,encoder.encode(text));
  return {id,sender_id:Number(sender),recipient_id:Number(recipient),ciphertext:b64(ciphertext),
   nonce:b64(nonce),salt:b64(salt),sender_public_key:active.publicKey,recipient_public_key:recipientKey};
 }
 async function decrypt(row,owner){
  if(row.deleted_for_all_at)return "";
  if(!active||active.owner!==String(owner))throw Error("Ключ недоступний.");
  const outgoing=String(row.sender_id)===String(owner);
  const ownPublic=outgoing?row.sender_public_key:row.recipient_public_key;
  if(!same(ownPublic,active.publicKey))throw Error("Це повідомлення для іншого ключа.");
  const peer=outgoing?row.recipient_public_key:row.sender_public_key;
  const key=await messageKey(peer,raw(row.salt),row.id,row.sender_id,row.recipient_id);
  const bytes=await crypto.subtle.decrypt({name:"AES-GCM",iv:raw(row.nonce),additionalData:context(row.id,row.sender_id,row.recipient_id)},key,raw(row.ciphertext));
  return decoder.decode(bytes);
 }
 window.VATRA_MESSENGER_CRYPTO=Object.freeze({
  loadRecord,create,unlock,importBackup,exportBackup,encrypt,decrypt,fingerprint,checkPeer,trustPeer,same,
  isUnlocked:owner=>!!active&&active.owner===String(owner),
  lock:()=>{active=null;}
 });
 window.addEventListener("pagehide",()=>{active=null;});
})();