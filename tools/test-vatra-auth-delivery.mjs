import assert from 'node:assert/strict';
import {makeAuthPayload, configureAuth,deliverySummary} from './configure-vatra-auth.mjs';

const env = {
 VATRA_SUPABASE_ACCESS_TOKEN: 'token-private-do-not-print',
 VATRA_EMAIL_FROM:'noreply@verified-domain.example',
 VATRA_SMTP_HOST:'smtp.verified-domain.example',
 VATRA_SMTP_PORT:'587',
 VATRA_SMTP_USER:'smtp-user',
 VATRA_SMTP_PASSWORD:'smtp-private-do-not-print',
 VATRA_SMS_PROVIDER:'twilio',
 VATRA_SMS_TWILIO_ACCOUNT_SID:'AC012345678901234567890123456789',
 VATRA_SMS_TWILIO_AUTH_TOKEN:'twilio-private-do-not-print',
 VATRA_SMS_TWILIO_MESSAGE_SERVICE_SID:'MG012345678901234567890123456789'
};
const payload=makeAuthPayload(env);
assert.equal(payload.smtp_sender_name,'ВАТРА');
assert.equal(payload.smtp_admin_email,env.VATRA_EMAIL_FROM);
assert.equal(payload.sms_provider,'twilio');
assert.equal(payload.sms_autoconfirm,false);
assert.equal(payload.mailer_autoconfirm,false);
assert.equal(payload.external_email_enabled,true);
assert.equal(payload.external_phone_enabled,true);
assert.ok(payload.mailer_templates_confirmation_content.includes('{{ .Token }}'));
assert.ok(payload.mailer_templates_magic_link_content.includes('{{ .Token }}'));
assert.ok(payload.mailer_templates_recovery_content.includes('{{ .Token }}'));
assert.ok(payload.sms_template.includes('{{ .Code }}'));
assert.ok(payload.uri_allow_list.includes('mode=new-password'));
for(const forbidden of ['smtp_password','smtp_secret','smtp_auth_token'])assert.ok(!Object.hasOwn(payload,forbidden));
const sanitized=JSON.stringify(deliverySummary(payload));
for(const secret of ['smtp-private-do-not-print','twilio-private-do-not-print','token-private-do-not-print'])
 assert.ok(!sanitized.includes(secret),'Secret leaked into summary');

let apiCalls=0,req=null;
const fakeFetch=async(url,options)=>{
 apiCalls++;req={url,options};
 return {ok:true,status:200};
};
const dry=await configureAuth({env,fetchFn:fakeFetch});
assert.equal(dry.mode,'dry-run');
assert.equal(apiCalls,0,'Default mode must never change production config');
const result=await configureAuth({env,fetchFn:fakeFetch,apply:true});
assert.equal(result.mode,'applied');
assert.equal(result.deliveryConfirmed,false,'Config success is not proof of delivery');
assert.equal(apiCalls,1);
assert.equal(req.url,'https://api.supabase.com/v1/projects/rjasunoawrxvetwadylh/config/auth');
assert.equal(req.options.method,'PATCH');
assert.equal(req.options.headers.Authorization,'Bearer '+env.VATRA_SUPABASE_ACCESS_TOKEN);
assert.equal(JSON.parse(req.options.body).sms_template,payload.sms_template);
assert.ok(!JSON.stringify(result).includes(env.VATRA_SMTP_PASSWORD),'Never print SMTP secret');
const badConfig={...env,VATRA_SMS_PROVIDER:'nonexistent'};
assert.throws(()=>makeAuthPayload(badConfig),/SMS-провайдер/);
assert.throws(()=>makeAuthPayload({...env,VATRA_SMS_TWILIO_AUTH_TOKEN:''}),/VATRA_SMS_TWILIO_AUTH_TOKEN/);
assert.throws(()=>makeAuthPayload({...env,VATRA_EMAIL_FROM:'x'}),/VATRA_EMAIL_FROM/);
assert.throws(()=>makeAuthPayload({...env,VATRA_SMTP_PORT:'not-a-port'}),/SMTP порт/);
const vonage=makeAuthPayload({...env,
 VATRA_SMS_PROVIDER:'vonage',
 VATRA_SMS_VONAGE_API_KEY:'example-key',
 VATRA_SMS_VONAGE_API_SECRET:'example-private',
 VATRA_SMS_VONAGE_FROM:'VATRA'});
assert.equal(vonage.sms_provider,'vonage');
assert.equal(vonage.sms_vonage_from,'VATRA');
const messagebird=makeAuthPayload({...env,
 VATRA_SMS_PROVIDER:'messagebird',
 VATRA_SMS_MESSAGEBIRD_ACCESS_KEY:'example-private',
 VATRA_SMS_MESSAGEBIRD_ORIGINATOR:'VATRA'});
assert.equal(messagebird.sms_provider,'messagebird');
assert.equal(messagebird.sms_messagebird_originator,'VATRA');
const errors=[];
try {
 await configureAuth({env,apply:true,fetchFn:async()=>({ok:false,status:401,text:async()=>env.VATRA_SMTP_PASSWORD})});
}catch(e){errors.push(e.message);}
assert.equal(errors.length,1);
assert.ok(!errors[0].includes(env.VATRA_SMTP_PASSWORD),'API error must not leak provider response');
console.log('VATRA auth delivery setup: dry-run, payload, provider validation and safe Management API patch verified.');
