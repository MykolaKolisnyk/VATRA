import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const auth = read('auth.js');
const backend = read('vatra-backend.js');
const schema = read('app-data-schema.sql');
const authHtml = read('auth.html');
const registerHtml = read('register.html');
const indexHtml = read('index.html');

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

check('auth pages load the shared auth module and stylesheet', () => {
  for (const [name, html] of [['auth.html', authHtml], ['register.html', registerHtml]]) {
    assert.match(html, /auth\.js\?v=/, name + ' must cache-bust auth.js');
    assert.match(html, /auth\.css\?v=/, name + ' must cache-bust auth.css');
  }
});

check('auth UI keeps contact-method, password-strength and legal-document features', () => {
  assert.match(auth, /syncPhoneInputMode/);
  assert.match(auth, /selectedMethod\(\)/);
  assert.match(auth, /function isStrongPassword/);
  assert.match(auth, /Надійність пароля/);
  assert.match(auth, /Правила спільноти/);
  assert.match(auth, /Політика конфіденційності/);
  assert.match(auth, /Умови використання/);
  assert.match(auth, /window\.__vatraAuthReady\s*=\s*true/);
});

check('media upload validates user, category and file size before upload', () => {
  assert.match(backend, /if \(!user\?\.uid\)/);
  assert.match(backend, /MEDIA_FOLDERS\.has\(category\)/);
  assert.match(backend, /file\.size > maxSize/);
  assert.match(backend, /user\.uid \+ '\/' \+ category/);
  assert.match(backend, /client\.storage\.from\(MEDIA_BUCKET\)\.upload/);
});

check('database schema enables RLS and declares scoped access policies', () => {
  assert.match(schema, /alter table public\.app_data enable row level security/i);
  assert.match(schema, /create policy app_data_select/i);
  assert.match(schema, /create policy app_data_insert/i);
  assert.match(schema, /create policy app_data_update/i);
  assert.match(schema, /create policy app_data_delete/i);
  assert.match(schema, /insert into storage\.buckets/i);
  assert.match(schema, /create policy vatra_media_user_upload/i);
  assert.match(schema, /create policy vatra_media_user_delete/i);
});

check('public client files do not contain obvious server-role secrets', () => {
  for (const [name, source] of [['vatra-backend.js', backend], ['auth.js', auth], ['script.js', read('script.js')]]) {
    assert.doesNotMatch(source, /service_role|sb_secret_[A-Za-z0-9_-]{10,}/i, name + ' must not expose a server secret');
  }
});

check('main entry page loads the application module and it imports the backend', () => {
  assert.match(indexHtml, /script\.js/);
  assert.match(read('script.js'), /vatra-backend\.js/);
});

console.log('VATRA static checks passed:');
for (const name of checks) console.log('  ✓ ' + name);
console.log('Note: these are static regression checks, not live Supabase or browser end-to-end tests.');
