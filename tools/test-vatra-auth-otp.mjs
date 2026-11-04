import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const auth=read('auth.js'),backend=read('vatra-backend.js'),css=read('auth.css');
for(const file of ['auth.html','register.html']){
 const html=read(file);
 for(const id of ['authForm','otpWrap','otpCode','otpResend','otpChange','otpStatus','otpTitle','recoveryResendOtp']){
  assert.ok(html.includes('id="'+id+'"'),file+': missing '+id);
 }
 assert.ok(html.includes('Вхід з паролем')&&html.includes('Код у SMS'),file+': missing password-login choice');
 assert.ok(html.includes('name="authMethod" value="email"')&&html.includes('name="authMethod" value="phone" disabled'),file+': email auth active and SMS deliberately disabled');
 assert.ok(html.includes('name="recoveryMethod" value="phone"')&&!html.includes('name="recoveryMethod" value="phone" disabled'),file+': phone recovery option must be selectable');
 assert.ok(!html.includes('Український простір для своїх'),file+': remove exclusive brand slogan');
 assert.ok(html.includes('id="recoveryMethodWrap"')&&!html.includes('id="recoveryMethodWrap" hidden'),'Recovery method switch must be visible');
 assert.ok(html.includes('id="authExistingHelp" hidden')&&html.includes('id="authGoLogin"'),file+': existing account sign-in action missing');
 assert.ok(html.includes('<h2 id="recoveryTitle">Відновлення пароля</h2>'),file+': old recovery heading remained');
 assert.ok(html.includes('auth.js?v=20261104-auth-recovery-flags3'),file+': stale auth JS version');
 assert.ok(html.includes('auth.css?v=20261104-auth-recovery-flags3'),file+': stale auth CSS version');
 assert.ok(!html.includes('без SMS-коду')&&!html.includes('без коду'),file+': outdated password-only description');
}
const required=[
 "await signUpWithPassword({...fields,password:details.password,userData:details.userData})",
 "if(pendingOtp){await confirmOtp();return;}",
 "await startOtp('signup'",
 "const enabled=false; // Login always uses an account password.",
 "existing?.exists?.()",
 "await resendSignupOtp(fields)",
 "await finishRegistration({...challenge,user})",
 "await verifyOtp(challenge.isPhone?",
 "type:challenge.kind==='signup'?'signup':'email'",
 "type:'recovery'",
 "await sendPasswordResetEmail(auth,contact.toLowerCase())",
 "beginRecoveryCooldown()",
 "$('#password').autocomplete=m==='login'?'current-password':'new-password'",
 "loginByCode=false",
];
for(const snippet of required)assert.ok(auth.includes(snippet),'Auth flow regression: '+snippet);
// An OTP can only be consumed once. A database failure after successful code
// verification must not force an already-verified new user to reuse that code.
assert.ok(auth.includes("challenge.verifiedUser?{user:challenge.verifiedUser,session:true}:await verifyOtp("),'Verified signup must be retryable without consuming the OTP twice');
assert.ok(auth.includes("if(!challenge.checkedNewAccount){"),'Existing-account protection should run once, not after partial profile writes');
assert.ok(auth.includes("otpField.required=false;otpField.readOnly=true;"),'Verified signup should not require the spent code');
assert.match(auth,/await finishRegistration\(\{\.\.\.challenge,user\}\);\s*pendingOtp=null;return;/,'Do not clear OTP guard before profile writes finish');
assert.ok(auth.includes("input.readOnly=false;"),'Changing contact must reset the OTP field state');
assert.ok(auth.includes('signUpWithPassword('),'New signup must refuse duplicate accounts before sending OTP');
assert.ok(!auth.includes('await sendVatraOtp'),'Missing custom Edge Function must not be used');
assert.ok(auth.includes('const VATRA_SMS_AUTH_ENABLED=false'),'Production rollout must not advertise unavailable SMS OTP');
assert.ok(auth.includes("VATRA_SMS_AUTH_ENABLED||mode==='login'"),'Phone password login should remain available while signup SMS is off');
assert.ok(auth.includes("function currentRecoveryMethod(){return VATRA_SMS_RECOVERY_UI_ENABLED?"),'Phone/email recovery selector should be readable without SMS signup');
assert.ok(auth.includes("if(details.isPhone&&!VATRA_SMS_AUTH_ENABLED)"),'Hidden or modified SMS controls cannot start delivery');
assert.ok(auth.includes("verifiedUser.email_confirmed_at"),'Registration must check server-confirmed email before creating any VATRA profile');
assert.ok(auth.includes("await db.client.auth.getUser()"),'Verification must call the trusted Supabase Auth server');
for(const code of ['+380','+48','+49','+33','+34','+351','+39','+44','+1'])assert.ok(auth.includes("dial:'"+code+"'"),'Country dial code missing: '+code);
assert.ok(auth.includes("if(reg&&auth.currentUser)"),'Active session must never silently register another account');
assert.ok(auth.includes("$('#recoveryMethodWrap').hidden=false"),'Recovery choice must always be visible');
assert.ok(auth.includes("syncExistingAccountHelp(mode==='register'&&err?.code==='auth/email-already-in-use')"),'Duplicate account should show a useful login action');
assert.ok(css.includes('Recovery dialog: compact, readable, responsive'),'Recovery must have compact modal layout');
const errorFnStart=auth.indexOf('function authContactErrorText(');
const errorFnEnd=auth.indexOf('\nfunction syncExistingAccountHelp(',errorFnStart);
assert.ok(errorFnStart>=0&&errorFnEnd>errorFnStart,'Missing per-channel error formatter');
const contactError=runInNewContext(auth.slice(errorFnStart,errorFnEnd)+'\nauthContactErrorText;',{
 errors:{'auth/too-many-requests':'Спробуйте пізніше.'}
});
assert.match(contactError({code:'auth/email-already-in-use'},false,'register'),/Електронна пошта вже зареєстрована/);
assert.match(contactError({code:'auth/email-already-in-use'},true,'register'),/Номер телефону уже зареєстрований/);
assert.equal(contactError({code:'auth/too-many-requests'},false,'register'),'Спробуйте пізніше.');

assert.ok(backend.includes('client.auth.signInWithOtp')&&backend.includes('client.auth.verifyOtp'),'Supabase OTP calls missing');
assert.ok(css.includes('.vatra-auth-otp')&&css.includes('#recoveryDialog .vatra-recovery-methods'),'Recovery options should reuse VATRA style');
assert.ok(css.includes('.vatra-method-symbol')&&css.includes('is-awaiting-code'),'OTP CSS missing');
assert.ok(auth.includes('const VATRA_SMS_RECOVERY_UI_ENABLED=true'),'SMS recovery is opt-in at the UI only, never SMS registration');
assert.ok(auth.includes('sendOtp({phone:contact,shouldCreateUser:false})'),'Recovery SMS must NEVER create new accounts');
assert.ok(auth.includes("verifyOtp(phone?{phone:contact,token:code}"),'Phone recovery verifies OTP before password change');
assert.ok(auth.includes('function countryFlagSvg(iso)')&&auth.includes('function enhanceCountryMenu(select,row)'),'SVG flag picker must exist');
assert.ok(auth.includes('aria-selected')&&auth.includes("role','listbox'"),'Country picker must support accessible selection');
assert.ok(css.includes('.vatra-phone-country-trigger')&&css.includes('.vatra-phone-country-option'),'Custom flags picker must have responsive styles');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces mismatch');
const email=read('supabase/auth-templates/otp-email.html');
const sms=read('supabase/auth-templates/otp-sms.txt');
assert.ok(email.includes('{{ .Token }}')&&email.includes('VATRA'),'Email template missing global brand or token');
assert.ok(sms.includes('{{ .Code }}')&&sms.includes('VATRA'),'SMS template missing global brand or token');
for(const template of [email,sms])assert.ok(!/sb_secret_|sk_(?:live|test)_/.test(template),'Template contains secret material');
assert.ok(auth.includes('preferredLanguage:vatraSignupLanguage()'),'Signup must attach chosen language to Supabase user metadata');
assert.ok(auth.includes("localStorage.getItem('vatra-language')"),'Signup should recover the selected language from VATRA settings');
for(const lang of ['uk','pl','de','fr','es','pt','it']){
 assert.ok(email.includes('eq .Data.preferredLanguage "'+lang+'"'),'Missing locale branch: '+lang);
}
assert.ok(email.includes('Your verification code'),'English fallback must be present');
assert.ok(email.includes('Українська соціальна мережа')&&email.includes('Ukrainian social network'),'Brand should identify VATRA as Ukrainian in localized email');
assert.ok(!/для своїх|тільки для українців|лише для українців/i.test(email),'No exclusionary slogan in VATRA mail');
assert.ok(!sms.includes('ВАТРА')&&sms.includes('Never share'),'SMS fallback must be understandable internationally');
assert.ok(email.includes('https://mykolakolisnyk.github.io/VATRA/'),'Keep VATRA website link');


// Exercise the actual confirmOtp implementation with a fake, already verified
// user. No network requests, real accounts, or live SMS/email are involved.
const retryStart=auth.indexOf('async function confirmOtp(){');
const retryEnd=auth.indexOf("\n$('#otpChange')",retryStart);
assert.ok(retryStart>=0&&retryEnd>retryStart,'Cannot isolate confirmOtp for behavioral tests');
const confirmationImplementation=auth.slice(retryStart,retryEnd);
const newAccount={id:'new-account-test',created_at:new Date().toISOString()};
const elements={
 '#otpCode':{value:'123456',required:true,readOnly:false},
 '#submit':{textContent:'',disabled:false},
};
const notices=[],navigations=[];
let verificationCalls=0,profileLookups=0,passwordChanges=0,registrationAttempts=0;
const challenge={kind:'signup',contact:'test@example.invalid',isPhone:false,password:'not-a-real-password',requestedAt:Date.now()};
const context={
 pendingOtp:challenge,
 mode:'register',
 submitting:false,
 suppressAuthRedirect:false,
 db:{},
 errors:{},
 $:selector=>elements[selector]||null,
 otpNotice:(message,isError)=>notices.push({message,isError}),
 syncOtpCooldown:()=>{},
 startAuthRateLimitCooldown:()=>{},
 ref:(_db,path)=>({path}),
 get:async()=>{profileLookups++;return {exists:()=>false};},
 verifyOtp:async()=>{verificationCalls++;return {user:newAccount,session:{access_token:'test-only'}};},
 setAccountPassword:async()=>{passwordChanges++;},
 finishRegistration:async()=>{registrationAttempts++;if(registrationAttempts===1)throw new Error('Temporary storage failure');},
 location:{replace:path=>navigations.push(path)}
};
const confirm=runInNewContext(confirmationImplementation+'\nconfirmOtp;',context);
await confirm();
assert.equal(verificationCalls,1,'Initial valid code must be verified once');
assert.equal(profileLookups,1,'New account must be checked before first write');
assert.equal(registrationAttempts,1,'First registration write attempted');
assert.equal(context.pendingOtp,challenge,'Incomplete registration must retain verified session state');
assert.equal(challenge.verifiedUser,newAccount,'Successful verification must persist for retry');
assert.equal(elements['#otpCode'].required,false,'Spent OTP must not block retry');
assert.equal(elements['#submit'].textContent,'Завершити реєстрацію');
assert.ok(notices.some(x=>x.isError),'Write failure should be visible');
elements['#otpCode'].value='';
await confirm();
assert.equal(verificationCalls,1,'Retry must never re-use an already consumed OTP');
assert.equal(profileLookups,1,'Retry must not reject partial new-profile data as existing account');
assert.equal(registrationAttempts,2,'Retry should finish pending page creation');
assert.equal(passwordChanges,0,'Confirmed signup must not overwrite the password after OTP');
assert.equal(context.pendingOtp,null,'Successful completion clears pending challenge');

const existingChecks=[],existingNavigation=[];
const existingChallenge={kind:'signup',contact:'registered@example.invalid',isPhone:false,password:'not-a-real-password',requestedAt:Date.now()};
const existingContext={
 ...context,pendingOtp:existingChallenge,
 $:selector=>elements[selector]||null,
 get:async()=>{existingChecks.push(true);return {exists:()=>true};},
 verifyOtp:async()=>({user:{id:'existing-account-test',created_at:new Date(0).toISOString()},session:{access_token:'test-only'}}),
 setAccountPassword:async()=>{throw new Error('Existing password must never change');},
 finishRegistration:async()=>{throw new Error('Existing profile must never change');},
 location:{replace:path=>existingNavigation.push(path)}
};
const confirmExisting=runInNewContext(confirmationImplementation+'\nconfirmOtp;',existingContext);
elements['#otpCode'].value='123456';
await confirmExisting();
assert.equal(existingChecks.length,1,'Existing account must be checked');
assert.deepEqual(existingNavigation,['index.html'],'An existing user should go to their current page');

assert.ok(!auth.includes("if(loginByCode){await startOtp('login'"),'Normal login must not send an OTP');
assert.ok(auth.includes("type:challenge.kind==='signup'?'signup':'email'"),'Signup confirmation must use signup OTP type');
assert.ok(backend.includes('data.user.identities.length === 0'),'Supabase duplicate identity guard must remain');
for(const file of ['auth.html','register.html']){
 const html=read(file);
 assert.ok(html.includes('class="recovery-protection human-captcha"'),'Recovery must reuse the same human-check presentation');
}
console.log('VATRA auth: verified signup, occupied-email checks, password login, recovery and markup validated.');
