/**
 * VATRA device-key E2EE v1 — authenticated peer-to-peer encryption for 1:1 chats.
 * Browser WebCrypto only: P-256 ECDH + HKDF-SHA256 + AES-256-GCM.
 * Keys are non-extractable CryptoKey objects kept in this device's IndexedDB.
 * Peer public-key fingerprints use trust-on-first-use (TOFU).
 *
 * LIMITATIONS: static keys (no forward secrecy / Double Ratchet), no device sync,
 * no identity verification unless fingerprints are compared out-of-band.
 * Never claim Signal-equivalent security, and never auto-downgrade to plaintext.
 */
const DB_NAME='vatra-e2ee-v1', DB_VERSION=1;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
let openPromise;

export class E2EEError extends Error{
 constructor(code,message){super(message);this.name='E2EEError';this.code=code;}
}
function assertCrypto(){
 if(!globalThis.isSecureContext||!globalThis.crypto?.subtle||!globalThis.indexedDB)
  throw new E2EEError('UNSUPPORTED','Для захищених чатів потрібні HTTPS, Web Crypto та IndexedDB. Перевірте налаштування браузера.');
}
function openStore(){
 assertCrypto();
 if(!openPromise)openPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,DB_VERSION);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('identity'))db.createObjectStore('identity');if(!db.objectStoreNames.contains('peers'))db.createObjectStore('peers');};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new E2EEError('STORAGE','Не вдалося відкрити захищене сховище ключів браузера.'));
 });
 return openPromise;
}
async function storeGet(table,key){
 const db=await openStore();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(table,'readonly'),req=tx.objectStore(table).get(key);
  req.onsuccess=()=>resolve(req.result??null);
  req.onerror=()=>reject(new E2EEError('STORAGE','Не вдалося прочитати локальний ключ.'));
 });
}
async function storePut(table,key,value){
 const db=await openStore();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(table,'readwrite');
  tx.objectStore(table).put(value,key);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(new E2EEError('STORAGE','Не вдалося зберегти ключ на цьому пристрої.'));
  tx.onabort=()=>reject(new E2EEError('STORAGE','Не вдалося зберегти ключ на цьому пристрої.'));
 });
}
function b64(bytes){
 let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return btoa(out);
}
function un64(value){
 if(typeof value!=='string'||value.length>16000||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw new E2EEError('BAD_CIPHER','Неправильний формат зашифрованого повідомлення.');
 const str=atob(value),out=new Uint8Array(str.length);
 for(let i=0;i<str.length;i++)out[i]=str.charCodeAt(i);
 return out;
}
async function sha256(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)));}
function hex(bytes){return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');}
function validateJwk(value){
 const jwk=value?.jwk;
 if(value?.v!==1||!jwk||jwk.kty!=='EC'||jwk.crv!=='P-256'||typeof jwk.x!=='string'||typeof jwk.y!=='string'||!/^[A-Za-z0-9_-]{40,50}$/.test(jwk.x)||!/^[A-Za-z0-9_-]{40,50}$/.test(jwk.y))
  throw new E2EEError('INVALID_KEY','Некоректний відкритий ключ співрозмовника.');
 return {kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,ext:true};
}
async function publicFingerprint(jwk){
 return hex(await sha256('VATRA-E2EE-P256-v1|'+jwk.x+'|'+jwk.y));
}
function assertRecord(uid,record){
 if(!record||record.uid!==uid||!record.privateKey||!record.publicJwk||typeof record.fingerprint!=='string')
  throw new E2EEError('LOCAL_KEY','Локальний ключ пошкоджений або не відповідає акаунту.');
 return record;
}
const pendingIdentity=new Map();
export async function ensureIdentity(uid,readKey,writeKey){
 assertCrypto();
 if(!uid||typeof readKey!=='function'||typeof writeKey!=='function')throw new E2EEError('CONFIG','Не вдалося встановити захищену сесію.');
 if(pendingIdentity.has(uid))return pendingIdentity.get(uid);
 const work=(async()=>{
  let local=await storeGet('identity',uid);
  const remote=await readKey(uid);
  if(local){
   local=assertRecord(uid,local);
   if(await publicFingerprint(local.publicJwk)!==local.fingerprint)
    throw new E2EEError('LOCAL_KEY','Не збігається відбиток локального ключа.');
  }else{
   if(remote)throw new E2EEError('MISSING_DEVICE_KEY','Ключ цього акаунта вже існує, але на цьому пристрої немає приватного ключа. Старі зашифровані чати тут не прочитати. Не скидайте ключ без резервної копії.');
   const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
   const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
   const publicJwk={kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,ext:true};
   local={uid,privateKey:pair.privateKey,publicJwk,fingerprint:await publicFingerprint(publicJwk),createdAt:Date.now()};
   await storePut('identity',uid,local);
  }
  if(remote){
   const jwk=validateJwk(remote),remoteFingerprint=await publicFingerprint(jwk);
   if(remoteFingerprint!==local.fingerprint||remote.fingerprint!==local.fingerprint)
    throw new E2EEError('OWN_KEY_MISMATCH','Відкритий ключ акаунта змінився або не відповідає ключу цього пристрою. Захищені чати зупинені.');
  }else{
   await writeKey(uid,{v:1,curve:'P-256',jwk:local.publicJwk,fingerprint:local.fingerprint,createdAt:local.createdAt});
   const published=await readKey(uid);
   if(!published||await publicFingerprint(validateJwk(published))!==local.fingerprint)
    throw new E2EEError('KEY_PUBLISH','Не вдалося підтвердити публікацію відкритого ключа.');
  }
  return local;
 })().finally(()=>pendingIdentity.delete(uid));
 pendingIdentity.set(uid,work);
 return work;
}
export async function prepareSession(uid,peerUid,chatId,readKey,writeKey){
 if(!uid||!peerUid||uid===peerUid||typeof chatId!=='string')throw new E2EEError('CONFIG','Неправильні учасники захищеного чату.');
 const local=await ensureIdentity(uid,readKey,writeKey);
 const remote=await readKey(peerUid);
 if(!remote)throw new E2EEError('PEER_NOT_READY','Співрозмовник ще не створив ключ захищеного спілкування. Йому потрібно відкрити розділ повідомлень у ВАТРІ.');
 const peerJwk=validateJwk(remote),peerFingerprint=await publicFingerprint(peerJwk);
 if(remote.fingerprint!==peerFingerprint)throw new E2EEError('INVALID_KEY','Перевірка відкритого ключа співрозмовника не пройшла.');
 const pinKey=uid+'|'+peerUid,previous=await storeGet('peers',pinKey);
 if(previous?.fingerprint&&previous.fingerprint!==peerFingerprint)
  throw new E2EEError('KEY_CHANGED','Ключ співрозмовника змінився. Не надсилайте повідомлення до перевірки коду безпеки особисто або через інший надійний канал.');
 if(!previous)await storePut('peers',pinKey,{fingerprint:peerFingerprint,firstSeen:Date.now()});
 const publicKey=await crypto.subtle.importKey('jwk',peerJwk,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=await crypto.subtle.deriveBits({name:'ECDH',public:publicKey},local.privateKey,256);
 const hkdf=await crypto.subtle.importKey('raw',shared,'HKDF',false,['deriveKey']);
 const fps=[local.fingerprint,peerFingerprint].sort();
 const salt=await sha256('vatra-e2ee-v1|'+chatId+'|'+fps.join('|'));
 const key=await crypto.subtle.deriveKey(
  {name:'HKDF',hash:'SHA-256',salt,info:encoder.encode('vatra-message-aes256-gcm-v1')},
  hkdf,{name:'AES-GCM',length:256},false,['encrypt','decrypt']
 );
 return {uid,peerUid,chatId,key,ownFingerprint:local.fingerprint,peerFingerprint};
}
function associated(session,senderUid,createdAt,fromFp,toFp){
 return encoder.encode(JSON.stringify(['vatra-e2ee-v1',session.chatId,senderUid,createdAt,fromFp,toFp]));
}
export async function encryptMessage(session,text,senderUid,createdAt){
 if(!session||session.uid!==senderUid||!Number.isSafeInteger(createdAt)||!text||typeof text!=='string'||text.length>2000)
  throw new E2EEError('MESSAGE','Не вдалося підготувати текст для шифрування.');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt(
  {name:'AES-GCM',iv,additionalData:associated(session,senderUid,createdAt,session.ownFingerprint,session.peerFingerprint),tagLength:128},
  session.key,encoder.encode(text)
 );
 return {v:1,alg:'ECDH-P256-HKDF-SHA256-AES256GCM',iv:b64(iv),ciphertext:b64(new Uint8Array(cipher)),senderFp:session.ownFingerprint,recipientFp:session.peerFingerprint};
}
export async function decryptMessage(session,message){
 const payload=message?.encrypted,sender=message?.senderUid,createdAt=Number(message?.createdAt);
 if(!session||!payload||payload.v!==1||payload.alg!=='ECDH-P256-HKDF-SHA256-AES256GCM'||!Number.isSafeInteger(createdAt)||(sender!==session.uid&&sender!==session.peerUid))
  throw new E2EEError('BAD_CIPHER','Захищене повідомлення має невідомий формат.');
 const own=sender===session.uid;
 const fromFp=own?session.ownFingerprint:session.peerFingerprint,toFp=own?session.peerFingerprint:session.ownFingerprint;
 if(payload.senderFp!==fromFp||payload.recipientFp!==toFp)
  throw new E2EEError('KEY_MISMATCH','Це повідомлення зашифровано іншим ключем. Звірте коди безпеки.');
 const iv=un64(payload.iv),ciphertext=un64(payload.ciphertext);
 if(iv.length!==12||ciphertext.length<16||ciphertext.length>10000)
  throw new E2EEError('BAD_CIPHER','Некоректне зашифроване повідомлення.');
 try{
  const plain=await crypto.subtle.decrypt(
   {name:'AES-GCM',iv,additionalData:associated(session,sender,createdAt,fromFp,toFp),tagLength:128},
   session.key,ciphertext
  );
  return decoder.decode(plain);
 }catch{
  throw new E2EEError('AUTH_FAILED','Не вдалося перевірити цілісність або розшифрувати повідомлення.');
 }
}
export function formatFingerprint(fp){
 return (typeof fp==='string'?fp.match(/.{1,4}/g)?.join(' ')||'':'');
}
