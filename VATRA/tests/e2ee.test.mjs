// Run: node --test VATRA/tests/e2ee.test.mjs
// No Supabase credentials and no external dependencies needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
Object.defineProperty(globalThis,'isSecureContext',{configurable:true,value:true});

// The app stores non-extractable WebCrypto keys in IndexedDB.
// Node has no IndexedDB, so emulate just the transactions used by this module.
const stores=new Map();
const fakeDb={
 objectStoreNames:{contains:name=>stores.has(name)},
 createObjectStore(name){stores.set(name,new Map());},
 transaction(name){
  const tx={oncomplete:null,onerror:null,onabort:null};
  tx.objectStore=()=>({
   get(key){
    const request={result:null,onsuccess:null,onerror:null};
    queueMicrotask(()=>{request.result=stores.get(name).get(key);request.onsuccess?.();});
    return request;
   },
   put(value,key){
    stores.get(name).set(key,value);
    queueMicrotask(()=>tx.oncomplete?.());
   }
  });
  return tx;
 }
};
Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{
 open(name,version){
  const request={result:fakeDb,onupgradeneeded:null,onsuccess:null,onerror:null};
  queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.();});
  return request;
 }
}});
const {ensureIdentity,prepareSession,encryptMessage,decryptMessage}=await import('../vatra-e2ee.js');
const published=new Map(),read=async uid=>published.get(uid)||null,write=async(uid,value)=>{published.set(uid,structuredClone(value));};

test('new identities create independent non-extractable device keys',async()=>{
 const alice=await ensureIdentity('alice',read,write);
 const bob=await ensureIdentity('bob',read,write);
 assert.equal(alice.privateKey.extractable,false);
 assert.equal(alice.privateSignKey.extractable,false);
 assert.notEqual(alice.fingerprint,bob.fingerprint);
 assert.match(published.get('alice').fingerprint,/^[0-9a-f]{64}$/);
 assert.equal(published.get('alice').privateKey,undefined);
 assert.equal(published.get('alice').privateSignKey,undefined);
});
test('encrypted and signed messages round-trip in both directions',async()=>{
 const a=await prepareSession('alice','bob','alice_bob',read,write);
 const b=await prepareSession('bob','alice','alice_bob',read,write);
 const createdAt=Date.now();
 const encrypted=await encryptMessage(a,'Привіт, ВАТРО! 🔒','alice',createdAt);
 assert.ok(encrypted.signature);
 assert.ok(encrypted.ciphertext&&!encrypted.ciphertext.includes('Привіт'));
 assert.equal(await decryptMessage(b,{senderUid:'alice',createdAt,encrypted}),'Привіт, ВАТРО! 🔒');
 assert.equal(await decryptMessage(a,{senderUid:'alice',createdAt,encrypted}),'Привіт, ВАТРО! 🔒');
 const reverse=await encryptMessage(b,'Слава Україні!','bob',createdAt+1);
 assert.equal(await decryptMessage(a,{senderUid:'bob',createdAt:createdAt+1,encrypted:reverse}),'Слава Україні!');
 const again=await encryptMessage(a,'Привіт, ВАТРО! 🔒','alice',createdAt);
 assert.notEqual(encrypted.iv,again.iv,'Each message uses a fresh random nonce');
});
test('signature, sender and authentication metadata tampering is rejected',async()=>{
 const a=await prepareSession('alice','bob','alice_bob',read,write);
 const b=await prepareSession('bob','alice','alice_bob',read,write);
 const createdAt=Date.now();
 const encrypted=await encryptMessage(a,'private','alice',createdAt);
 const changed={...encrypted,signature:(encrypted.signature[0]==='A'?'B':'A')+encrypted.signature.slice(1)};
 await assert.rejects(()=>decryptMessage(b,{senderUid:'alice',createdAt,encrypted:changed}));
 await assert.rejects(()=>decryptMessage(b,{senderUid:'bob',createdAt,encrypted}));
 await assert.rejects(()=>decryptMessage(b,{senderUid:'alice',createdAt:createdAt+1,encrypted}));
});
test('missing recipient key blocks sending rather than falling back to plaintext',async()=>{
 await assert.rejects(()=>prepareSession('alice','never-registered','alice_never-registered',read,write),{code:'PEER_NOT_READY'});
});
test('substituted peer identity key is rejected after first use',async()=>{
 const original=published.get('bob');
 const fake=structuredClone(original);fake.jwk.x='A'+fake.jwk.x.slice(1);
 published.set('bob',fake);
 await assert.rejects(()=>prepareSession('alice','bob','alice_bob',read,write),{code:'INVALID_KEY'});
 published.set('bob',original);
});
test('second device without the private key cannot silently take over identity',async()=>{
 stores.get('identity').delete('alice');
 await assert.rejects(()=>ensureIdentity('alice',read,write),{code:'MISSING_DEVICE_KEY'});
});
