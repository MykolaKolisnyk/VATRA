#!/usr/bin/env node
// VATRA: configure Supabase Auth delivery with the official Management API.
// No secrets are stored in the repository, logs or versioned templates.
// Dry-run is the default. --apply makes the production change only after all
// external credentials are provided as environment variables.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const TEMPLATE = p => readFileSync(new URL(p, ROOT), 'utf8').trim();
const PROJECT_REF = 'rjasunoawrxvetwadylh';
const SITE_URL = 'https://mykolakolisnyk.github.io/VATRA/';
const clean = value => String(value || '').trim();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function fail(message) { throw new Error(message); }
export function makeAuthPayload(env = process.env) {
 const read = name => clean(env[name]);
 const required = (name,label=name) => {
  const value = read(name);
  if (!value) fail('Не заповнено ' + label + ' (змінна ' + name + ').');
  return value;
 };
 const channel=(read('VATRA_AUTH_CHANNEL')||'both').toLowerCase();
 if(!['email','sms','both'].includes(channel))fail('VATRA_AUTH_CHANNEL має бути email, sms або both.');
 const payload={
  site_url:SITE_URL
  // Не змінюємо наявний redirect allowlist: він може містити інші адреси.
 };
 if(channel==='email'||channel==='both'){
  const from=required('VATRA_EMAIL_FROM');
  if(!validEmail(from))fail('VATRA_EMAIL_FROM має бути дійсною адресою поштової скриньки.');
  const host=required('VATRA_SMTP_HOST');
  const port=required('VATRA_SMTP_PORT');
  if(!/^\d{2,5}$/.test(port)||Number(port)<1||Number(port)>65535)fail('Некоректний SMTP порт.');
  const smtpUser=required('VATRA_SMTP_USER');
  if(host.toLowerCase()==='smtp.gmail.com'){
   if(!/^(465|587)$/.test(port))fail('Для Gmail SMTP використовуйте порт 465 або 587.');
   if(from.toLowerCase()!==smtpUser.toLowerCase())fail('Для Gmail SMTP VATRA_EMAIL_FROM має збігатися з VATRA_SMTP_USER.');
  }
  Object.assign(payload,{
   external_email_enabled:true,
   mailer_autoconfirm:false,
   mailer_secure_email_change_enabled:true,
   smtp_admin_email:from,
   smtp_host:host,
   smtp_port:port,
   smtp_user:smtpUser,
   smtp_pass:required('VATRA_SMTP_PASSWORD'),
   smtp_sender_name:'ВАТРА',
   mailer_subjects_confirmation:'ВАТРА — підтвердження акаунта',
   mailer_subjects_magic_link:'ВАТРА — код входу',
   mailer_subjects_recovery:'ВАТРА — відновлення доступу',
   mailer_templates_confirmation_content:TEMPLATE('supabase/auth-templates/otp-email.html'),
   mailer_templates_magic_link_content:TEMPLATE('supabase/auth-templates/otp-email.html'),
   mailer_templates_recovery_content:TEMPLATE('supabase/auth-templates/otp-email.html')
  });
 }
 if(channel==='sms'||channel==='both'){
  const provider=required('VATRA_SMS_PROVIDER').toLowerCase();
  if(!['twilio','vonage','messagebird'].includes(provider))fail('SMS-провайдер: twilio, vonage або messagebird.');
  Object.assign(payload,{
   external_phone_enabled:true,
   sms_autoconfirm:false,
   sms_template:TEMPLATE('supabase/auth-templates/otp-sms.txt'),
   sms_provider:provider
  });
  if(provider==='twilio')Object.assign(payload,{
   sms_twilio_account_sid:required('VATRA_SMS_TWILIO_ACCOUNT_SID'),
   sms_twilio_auth_token:required('VATRA_SMS_TWILIO_AUTH_TOKEN'),
   sms_twilio_message_service_sid:required('VATRA_SMS_TWILIO_MESSAGE_SERVICE_SID')
  });
  if(provider==='vonage')Object.assign(payload,{
   sms_vonage_api_key:required('VATRA_SMS_VONAGE_API_KEY'),
   sms_vonage_api_secret:required('VATRA_SMS_VONAGE_API_SECRET'),
   sms_vonage_from:required('VATRA_SMS_VONAGE_FROM')
  });
  if(provider==='messagebird')Object.assign(payload,{
   sms_messagebird_access_key:required('VATRA_SMS_MESSAGEBIRD_ACCESS_KEY'),
   sms_messagebird_originator:required('VATRA_SMS_MESSAGEBIRD_ORIGINATOR')
  });
 }
 // A named sender requires carrier/provider-side approval. This script does
 // not claim VATRA appears as the actual sender until the provider confirms it.
 return payload;
}
export function deliverySummary(payload) {
 const hasEmail=!!payload.smtp_admin_email;
 const hasSms=!!payload.sms_provider;
 const emailDomain=(payload.smtp_admin_email||'').split('@')[1]||null;
 return {
  project:PROJECT_REF,
  website:SITE_URL,
  email:{configured:hasEmail,senderName:hasEmail?'ВАТРА':null,senderDomain:emailDomain,templates:hasEmail?3:0,deliveryConfirmed:false},
  sms:{configured:hasSms,provider:payload.sms_provider||null,senderIdVerified:false,deliveryConfirmed:false},
  accountAutoConfirm:false,
  credentialsPrinted:false
 };
}
export async function configureAuth({env=process.env,fetchFn=fetch,apply=false}={}) {
 const payload = makeAuthPayload(env);
 const summary = deliverySummary(payload);
 if (!apply) return {mode:'dry-run', ...summary};
 const token = clean(env.VATRA_SUPABASE_ACCESS_TOKEN);
 if (!token) fail('Потрібен VATRA_SUPABASE_ACCESS_TOKEN з правом auth_config_write.');
 const response = await fetchFn('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/config/auth', {
  method: 'PATCH',
  headers: {
   'Authorization':'Bearer ' + token,
   'Content-Type':'application/json',
   'Accept':'application/json'
  },
  body: JSON.stringify(payload)
 });
 if (!response.ok) {
  // The API may echo SMTP/SMS credentials. Never print its raw response.
  fail('Supabase Management API відмовив у налаштуванні (HTTP ' + response.status + '). Перевірте право auth_config_write, тариф і налаштування провайдерів.');
 }
 return {mode:'applied',...summary,deliveryConfirmed:false};
}
const direct = process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url;
if (direct) {
 const apply = process.argv.includes('--apply');
 const argv = process.argv.slice(2);
 if (argv.some(arg=>!['--apply','--dry-run'].includes(arg)) || (argv.includes('--apply')&&argv.includes('--dry-run'))) {
  console.error('Використання: node tools/configure-vatra-auth.mjs [--dry-run | --apply]');
  process.exitCode=2;
 } else {
  try {
   const result=await configureAuth({apply});
   console.log(JSON.stringify(result,null,2));
   if (apply) console.log('Збережено конфігурацію. Далі перевірте реальну доставку на контрольовані email/номер у Supabase і на стороні провайдерів.');
  } catch(error) {console.error('Налаштування VATRA: ' + error.message);process.exitCode=1;}
 }
}
