/* Offline real-browser Messenger smoke; never touches the production API. */
import assert from "node:assert/strict";

const passphrase="VATRA long local-only test phrase with several words";

function installMock(setup){
 const owner=String(setup.owner);
 const store={messages:[],keys:{...setup.peerKeys},authCallback:null};
 window.__vatraMessengerTest=store;
 class Query{
  constructor(table){this.table=table;this.action="select";this.filters={};this.payload=null;}
  select(){return this;}
  eq(k,v){this.filters[k]=String(v);return this;}
  in(k,values){this.filters[k]=values.map(String);return this;}
  or(){return this;}
  order(){return this;}
  limit(){return this;}
  insert(value){this.action="insert";this.payload=value;return this;}
  maybeSingle(){return Promise.resolve(this.execute(true));}
  single(){return Promise.resolve(this.execute(true));}
  then(resolve,reject){return Promise.resolve(this.execute(false)).then(resolve,reject);}
  execute(single){
   if(this.action==="insert"){
    const item=structuredClone(this.payload);
    if(this.table==="messenger_keys"){
     const id=String(item.vatra_id);
     if(store.keys[id])return {data:null,error:{message:"Duplicate public key"}};
     store.keys[id]=item.public_key;
     return {data:single?item:null,error:null};
    }
    if(this.table==="messenger_messages"){
     if(String(item.sender_id)!==owner)return {data:null,error:{message:"Wrong sender"}};
     Object.assign(item,{created_at:new Date().toISOString(),deleted_for_all_at:null,
      deleted_for_sender_at:null,deleted_for_recipient_at:null});
     store.messages.unshift(item);
     return {data:single?{id:item.id}:null,error:null};
    }
   }
   if(this.table==="accounts")
    return {data:single?{vatra_id:Number(owner)}:[{vatra_id:Number(owner)}],error:null};
   if(this.table==="messenger_keys"){
    const key=store.keys[this.filters.vatra_id];
    const record=key?{public_key:key}:null;
    return {data:single?record:record?[record]:[],error:null};
   }
   if(this.table==="public_profiles"){
    let rows=[{vatra_id:1001,display_name:"Test Alice"},{vatra_id:2002,display_name:"Test Bob"}];
    const selected=this.filters.vatra_id;
    if(Array.isArray(selected))rows=rows.filter(row=>selected.includes(String(row.vatra_id)));
    else if(selected)rows=rows.filter(row=>String(row.vatra_id)===selected);
    return {data:single?rows[0]||null:rows,error:null};
   }
   if(this.table==="messenger_messages"){
    const rows=store.messages.filter(row=>String(row.sender_id)===owner||String(row.recipient_id)===owner);
    return {data:single?rows[0]||null:rows,error:null};
   }
   return {data:single?null:[],error:null};
  }
 }
 const client={
  auth:{
   getUser:async()=>({data:{user:{id:"test-user-"+owner,email_confirmed_at:"2026-01-01T00:00:00Z"}},error:null}),
   onAuthStateChange:callback=>{store.authCallback=callback;return {data:{subscription:{unsubscribe(){}}}};}
  },
  from:table=>new Query(table),
  rpc:async(name,args)=>{
   if(name!=="messenger_delete_message")return {data:null,error:{message:"Unknown RPC"}};
   const row=store.messages.find(item=>item.id===args.p_id);
   if(!row||![String(row.sender_id),String(row.recipient_id)].includes(owner))
    return {data:false,error:{message:"Unauthorized"}};
   if(args.p_scope==="everyone"){
    if(String(row.sender_id)!==owner)return {data:false,error:{message:"Sender only"}};
    Object.assign(row,{ciphertext:null,nonce:null,salt:null,sender_public_key:null,
     recipient_public_key:null,deleted_for_all_at:new Date().toISOString()});
   }else if(args.p_scope==="mine"){
    row[String(row.sender_id)===owner?"deleted_for_sender_at":"deleted_for_recipient_at"]=new Date().toISOString();
   }else return {data:false,error:{message:"Invalid scope"}};
   return {data:true,error:null};
  },
  channel:()=>({on(){return this;},subscribe(){return this;},unsubscribe(){return this;}}),
  removeChannel:async()=>{}
 };
 window.supabase={createClient:()=>client};
}

async function setup(browser,base,owner,peerKeys={}){
 const context=await browser.newContext({locale:"uk-UA",serviceWorkers:"block",acceptDownloads:true});
 await context.route("**/assets/js/host.js",route=>route.fulfill({
  status:200,contentType:"text/javascript",body:"window.VATRA_HOST_ALLOWED=true;"
 }));
 await context.route("**/cdn.jsdelivr.net/**",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:"("+installMock.toString()+")("+JSON.stringify({owner,peerKeys})+");"
 }));
 await context.route("https://cxrcycxrlkufozomsxcs.supabase.co/**",route=>route.abort("blockedbyclient"));
 const page=await context.newPage();
 await page.goto(base+"messenger.html",{waitUntil:"domcontentloaded"});
 await page.locator("#messenger-key-dialog").waitFor({state:"visible",timeout:18000});
 await page.locator("#messenger-passphrase").fill(passphrase);
 await page.locator("#messenger-key-confirm").fill(passphrase);
 await page.locator("#messenger-key-submit").click();
 await page.locator("#messenger-key-dialog").waitFor({state:"hidden",timeout:18000});
 const pub=await page.evaluate(id=>window.__vatraMessengerTest.keys[id],String(owner));
 assert.ok(pub?.x?.length===43&&pub?.y?.length===43&&!pub.d,
  "Key registration must publish only an ECDH public key");
 return {context,page,publicKey:pub};
}

export async function runMessengerBrowserSmoke({browser,base}){
 let alice,bob;
 try{
  bob=await setup(browser,base,2002);
  alice=await setup(browser,base,1001,{2002:bob.publicKey});
  const page=alice.page,plaintext="Encrypted VATRA browser smoke";
  await page.locator("#messenger-new-button").click();
  await page.locator("#messenger-recipient-id").fill("2002");
  await page.locator('#messenger-new-form button[type="submit"]').click();
  await page.locator("#messenger-chat-heading").getByText("Test Bob").waitFor({timeout:12000});
  await page.locator("#messenger-compose-text").fill(plaintext);
  await page.locator("#messenger-send").click();
  await page.locator(".vatra-messenger-message-bubble").getByText(plaintext).waitFor({timeout:12000});
  const encrypted=await page.evaluate(()=>structuredClone(window.__vatraMessengerTest.messages[0]));
  assert.ok(encrypted.ciphertext&&!JSON.stringify(encrypted).includes(plaintext),
   "Simulated server must receive ciphertext, never plaintext");
  assert.equal(await bob.page.evaluate(row=>window.VATRA_MESSENGER_CRYPTO.decrypt(row,"2002"),encrypted),plaintext,
   "Second browser with recipient key must decrypt the encrypted message");
  await page.locator(".vatra-messenger-message-delete").first().click();
  await page.locator("#messenger-delete-mine").click();
  await page.waitForFunction(()=>document.querySelectorAll(".vatra-messenger-message").length===0,null,{timeout:12000});
  const hidden=await page.evaluate(()=>structuredClone(window.__vatraMessengerTest.messages[0]));
  assert.ok(hidden.deleted_for_sender_at&&hidden.ciphertext,
   "Delete for me must leave the recipient's ciphertext intact");
  assert.equal(await bob.page.evaluate(row=>window.VATRA_MESSENGER_CRYPTO.decrypt(row,"2002"),hidden),plaintext);
  await page.locator("#messenger-compose-text").fill("Revoke this message");
  await page.locator("#messenger-send").click();
  await page.locator(".vatra-messenger-message").first().waitFor({timeout:12000});
  await page.locator(".vatra-messenger-message-delete").first().click();
  await page.locator("#messenger-delete-everyone").click();
  await page.waitForFunction(()=>window.__vatraMessengerTest.messages.some(row=>row.deleted_for_all_at),
   null,{timeout:12000});
  const revoked=await page.evaluate(()=>window.__vatraMessengerTest.messages.find(row=>row.deleted_for_all_at));
  assert.equal(revoked.ciphertext,null);
  assert.equal(revoked.nonce,null);
  assert.equal(revoked.salt,null);
  assert.equal(await bob.page.evaluate(row=>window.VATRA_MESSENGER_CRYPTO.decrypt(row,"2002"),revoked),"");
  console.log("VATRA Messenger browser: encrypted delivery across two browsers and both deletion scopes passed.");
 }finally{
  if(alice)await alice.context.close();
  if(bob)await bob.context.close();
 }
}
