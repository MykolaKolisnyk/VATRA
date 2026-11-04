import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
const auth=read('auth.js'),backend=read('vatra-backend.js'),css=read('auth.css');
for(const file of ['auth.html','register.html']){
 const html=read(file);
 for(const id of ['authForm','otpWrap','otpCode','otpResend','otpChange','otpStatus','otpTitle','loginOtpToggle','recoveryResendOtp']){
  assert.ok(html.includes('id="'+id+'"'),file+': missing '+id);
 }
 assert.ok(html.includes('Код на email')&&html.includes('Код у SMS'),file+': missing delivery choices');
 assert.ok(html.includes('name="authMethod" value="email"')&&html.includes('name="authMethod" value="phone"'),file+': missing auth methods');
 assert.ok(html.includes('auth.js?v=20261104-otp1'),file+': stale auth JS version');
 assert.ok(html.includes('auth.css?v=20261104-otp1'),file+': stale auth CSS version');
 assert.ok(!html.includes('без SMS-коду')&&!html.includes('без коду'),file+': outdated password-only description');
}
const required=[
 "shouldCreateUser:kind==='signup'",
 "if(pendingOtp){await confirmOtp();return;}",
 "await startOtp('signup'",
 "await startOtp('login'",
 "existing?.exists?.()",
 "await setAccountPassword(challenge.password)",
 "await finishRegistration({...challenge,user})",
 "await verifyOtp(challenge.isPhone?",
 "type:'email'",
 "type:'recovery'",
 "await sendPasswordResetEmail(auth,contact.toLowerCase())",
 "beginRecoveryCooldown()",
 "if(loginByCode){await startOtp('login'",
 "loginByCode=true",
];
for(const snippet of required)assert.ok(auth.includes(snippet),'Auth flow regression: '+snippet);
// An OTP can only be consumed once. A database failure after successful code
// verification must not force an already-verified new user to reuse that code.
assert.ok(auth.includes("challenge.verifiedUser?{user:challenge.verifiedUser,session:true}:await verifyOtp("),'Verified signup must be retryable without consuming the OTP twice');
assert.ok(auth.includes("if(!challenge.checkedNewAccount){"),'Existing-account protection should run once, not after partial profile writes');
assert.ok(auth.includes("otpField.required=false;otpField.readOnly=true;"),'Verified signup should not require the spent code');
assert.match(auth,/await finishRegistration\(\{\.\.\.challenge,user\}\);\s*pendingOtp=null;return;/,'Do not clear OTP guard before profile writes finish');
assert.ok(auth.includes("input.readOnly=false;"),'Changing contact must reset the OTP field state');
assert.ok(!auth.includes('signUpWithPassword('),'Old registration bypasses OTP');
assert.ok(!auth.includes('await sendVatraOtp'),'Missing custom Edge Function must not be used');
assert.ok(backend.includes('client.auth.signInWithOtp')&&backend.includes('client.auth.verifyOtp'),'Supabase OTP calls missing');
assert.ok(css.includes('.vatra-auth-otp')&&css.includes('.vatra-auth-method-card')===false,'Auth CSS missing or duplicate component layer');
assert.ok(css.includes('.vatra-method-symbol')&&css.includes('is-awaiting-code'),'OTP CSS missing');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces mismatch');
const email=read('supabase/auth-templates/otp-email.html');
const sms=read('supabase/auth-templates/otp-sms.txt');
assert.ok(email.includes('{{ .Token }}')&&email.includes('ВАТРА'),'Email template missing brand or token');
assert.ok(sms.includes('{{ .Code }}')&&sms.includes('ВАТРА'),'SMS template missing brand or token');
for(const template of [email,sms])assert.ok(!/sb_secret_|sk_(?:live|test)_/.test(template),'Template contains secret material');
console.log('VATRA auth OTP: registration, passwordless login, recovery, resend, markup, branding validated.');
