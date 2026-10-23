/* Сумісний шар даних для старого інтерфейсу ВАТРИ.
   Повідомлення про помилки не містять назви конкретного проєкту. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SERVICE_URL = 'https://rjasunoawrxvetwadylh.supabase.co';
const PUBLIC_KEY = 'sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-';
const TABLE = 'app_data';
const client = createClient(SERVICE_URL, PUBLIC_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const currentAuth = { currentUser: null };

function cleanPath(path = '') { return String(path).split('/').filter(Boolean).join('/'); }
function clone(value) { return value === undefined ? null : JSON.parse(JSON.stringify(value)); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function setDeep(root, parts, value) {
  let cursor = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!isObject(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  if (parts.length) cursor[parts[parts.length - 1]] = clone(value);
  return root;
}
function removeDeep(root, parts) {
  if (!parts.length || !isObject(root)) return root;
  let cursor = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isObject(cursor[parts[i]])) return root;
    cursor = cursor[parts[i]];
  }
  if (isObject(cursor)) delete cursor[parts[parts.length - 1]];
  return root;
}
function getDeep(root, parts) {
  let cursor = root;
  for (const key of parts) {
    if (cursor == null || !Object.prototype.hasOwnProperty.call(Object(cursor), key)) return null;
    cursor = cursor[key];
  }
  return cursor === undefined ? null : cursor;
}
function databaseError(error) {
  const message = String(error?.message || error || '');
  const permission = /permission|row.level.security|not allowed|42501/i.test(message);
  const wrapped = new Error(permission
    ? 'Запит відхилено правилами доступу до бази даних.'
    : /fetch|network|failed to send|load failed/i.test(message)
      ? 'Не вдалося підключитися до бази даних. Перевір інтернет і налаштування підключення.'
      : 'Не вдалося виконати операцію з базою даних. Перевір налаштування та спробуй ще раз.');
  wrapped.code = permission ? 'PERMISSION_DENIED' : (error?.code || 'DATABASE_ERROR');
  return wrapped;
}
function authError(error) {
  const source = String(error?.code || error?.message || '').toLowerCase();
  let code = 'auth/invalid-credential';
  if (/already.*registered|already.*exists|user_already_exists|email.*taken/.test(source)) code = 'auth/email-already-in-use';
  else if (/email.*invalid|invalid.*email|email_address_invalid/.test(source)) code = 'auth/invalid-email';
  else if (/weak.password|password.*short|password.*should/.test(source)) code = 'auth/weak-password';
  else if (/rate.limit|too.many.requests|over_request_rate_limit|over_email_send_rate_limit/.test(source)) code = 'auth/too-many-requests';
  else if (/disabled|not enabled|email_provider_disabled|signup_disabled/.test(source)) code = 'auth/operation-not-allowed';
  else if (/network|fetch|load failed/.test(source)) code = 'auth/network-request-failed';
  else if (/user.not.found/.test(source)) code = 'auth/user-not-found';
  const err = new Error(error?.message || 'Не вдалося виконати дію. Перевір дані та повтори спробу.');
  err.code = code;
  return err;
}
function toCompatUser(user) {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return { ...user, uid: user.id, displayName: metadata.displayName || metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Користувач ВАТРИ' };
}
export function initializeApp(config = {}) { return { name: '[DEFAULT]', options: config }; }
export function getAuth() { return currentAuth; }
export function getDatabase() { return { client }; }

const MEDIA_BUCKET = 'vatra-media';
const MEDIA_FOLDERS = new Set(['posts', 'avatars', 'covers', 'videos']);
function safeMediaExtension(type = '') {
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'video/ogg': 'ogv', 'video/x-m4v': 'm4v'
  };
  return map[type] || 'bin';
}
export async function uploadMedia(file, category = 'posts') {
  if (!file || typeof file.size !== 'number') throw new Error('Не вдалося прочитати файл. Вибери його ще раз.');
  const user = currentAuth.currentUser;
  if (!user?.uid) throw new Error('Спочатку увійди у свій акаунт.');
  if (!MEDIA_FOLDERS.has(category)) throw new Error('Непідтримуваний тип файлу.');
  const maxSize = category === 'videos' ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxSize) throw new Error(category === 'videos'
    ? 'Відео має бути меншим за 50 МБ.'
    : 'Фото має бути меншим за 15 МБ.');
  const ext = safeMediaExtension(file.type);
  const id = globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
  const path = user.uid + '/' + category + '/' + Date.now() + '-' + id + '.' + ext;
  const { data, error } = await client.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '31536000', upsert: false, contentType: file.type || 'application/octet-stream'
  });
  if (error) {
    const message = String(error.message || '');
    if (/bucket.*not found|no such bucket/i.test(message)) throw new Error('Файлове сховище ще не налаштоване. Виконай оновлений SQL-файл з архіву.');
    if (/row.level.security|permission|not allowed/i.test(message)) throw new Error('Завантаження заборонене правилами доступу. Виконай оновлений SQL-файл з архіву.');
    if (/too large|payload|size/i.test(message)) throw new Error('Файл завеликий. Спробуй менше фото або відео.');
    throw databaseError(error);
  }
  const { data: publicData } = client.storage.from(MEDIA_BUCKET).getPublicUrl(data?.path || path);
  if (!publicData?.publicUrl) throw new Error('Файл завантажився, але посилання не вдалося створити.');
  return publicData.publicUrl;
}
export function ref(_db, path = '') { return { path: cleanPath(path) }; }
export function push(reference) {
  const template = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx';
  const key = (globalThis.crypto?.randomUUID?.() || template.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  })).replace(/-/g, '');
  return { path: [reference.path, key].filter(Boolean).join('/'), key };
}
export class DataSnapshot {
  constructor(path, value) { this.key = path.split('/').pop() || null; this._value = value; }
  val() { return clone(this._value); }
  exists() { return this._value !== null && this._value !== undefined; }
  child(path) { return new DataSnapshot(path, getDeep(this._value, cleanPath(path).split('/').filter(Boolean))); }
}
async function readTree(path) {
  path = cleanPath(path);
  if (!path) throw new Error('Шлях до даних не вказано.');
  const parts = path.split('/');
  const conditions = ['path.eq.' + path, 'path.like.' + path + '/%'];
  const ancestors = [];
  for (let i = 1; i < parts.length; i++) ancestors.push(parts.slice(0, i).join('/'));
  if (ancestors.length) conditions.push('path.in.(' + ancestors.join(',') + ')');
  const { data, error } = await client.from(TABLE).select('path,value').or(conditions.join(',')).range(0, 4999);
  if (error) throw databaseError(error);
  const rows = (data || []).slice().sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  const root = {};
  for (const row of rows) setDeep(root, row.path.split('/'), row.value);
  if (!rows.length) return null;
  return clone(getDeep(root, parts));
}
export async function get(reference) { return new DataSnapshot(reference.path, await readTree(reference.path)); }
async function findStoredAncestors(path) {
  const parts = path.split('/').filter(Boolean);
  const candidates = [];
  for (let i = 1; i < parts.length; i++) candidates.push(parts.slice(0, i).join('/'));
  if (!candidates.length) return [];
  const { data, error } = await client.from(TABLE).select('path,value').in('path', candidates);
  if (error) throw databaseError(error);
  return (data || []).sort((a, b) => b.path.length - a.path.length);
}
async function upsertNode(path, value) {
  const { error } = await client.from(TABLE).upsert({ path, value: clone(value), updated_at: new Date().toISOString() }, { onConflict: 'path' });
  if (error) throw databaseError(error);
}
async function removeNode(path) {
  const { error } = await client.from(TABLE).delete().eq('path', path);
  if (error) throw databaseError(error);
}
async function deleteDescendants(path) {
  const { data, error } = await client.from(TABLE).select('path').like('path', path + '/%').limit(5000);
  if (error) throw databaseError(error);
  for (const row of data || []) await removeNode(row.path);
}
export async function set(reference, value) {
  const path = cleanPath(reference.path);
  if (!path) throw new Error('Шлях до даних не вказано.');
  const ancestors = await findStoredAncestors(path);
  if (ancestors.length) {
    // The parent row owns this nested object. Update that row only; this is
    // compatible with the per-user access rules and avoids stale duplicates.
    const nearest = ancestors[0];
    const relative = path.slice(nearest.path.length + 1).split('/');
    const changed = setDeep(clone(nearest.value), relative, value);
    await deleteDescendants(nearest.path);
    await upsertNode(nearest.path, changed);
    return;
  }
  await deleteDescendants(path);
  await upsertNode(path, value);
}
export async function update(reference, patch) {
  const path = cleanPath(reference.path);
  const current = await readTree(path);
  const next = isObject(current) && isObject(patch) ? { ...current, ...clone(patch) } : clone(patch);
  await set(reference, next);
}
export async function remove(reference) {
  const path = cleanPath(reference.path);
  if (!path) throw new Error('Шлях до даних не вказано.');
  const ancestors = await findStoredAncestors(path);
  if (ancestors.length) {
    const nearest = ancestors[0];
    const relative = path.slice(nearest.path.length + 1).split('/');
    const changed = removeDeep(clone(nearest.value), relative);
    await deleteDescendants(nearest.path);
    await upsertNode(nearest.path, changed);
    return;
  }
  await deleteDescendants(path);
  await removeNode(path);
}
export function onValue(reference, callback, errorCallback) {
  let active = true, running = false;
  let lastValue = Symbol('first');
  const poll = async () => {
    if (!active || running) return;
    running = true;
    try {
      const value = await readTree(reference.path);
      const encoded = JSON.stringify(value);
      if (encoded !== lastValue) {
        lastValue = encoded;
        callback(new DataSnapshot(reference.path, value));
      }
    } catch (error) {
      const wrapped = databaseError(error);
      if (typeof errorCallback === 'function') errorCallback(wrapped);
      else console.warn('Помилка читання даних:', wrapped.message);
    } finally { running = false; }
  };
  void poll();
  const timer = setInterval(poll, 3500);
  return () => { active = false; clearInterval(timer); };
}
export async function createUserWithEmailAndPassword(_auth, email, password, userData = {}) {
  const { data, error } = await client.auth.signUp({ email, password, options: { data: userData } });
  if (error) throw authError(error);
  return { user: toCompatUser(data.user), session: data.session };
}
export async function signInWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw authError(error);
  const user = toCompatUser(data.user);
  currentAuth.currentUser = user;
  return { user, session: data.session };
}
export async function signOut() {
  const { error } = await client.auth.signOut();
  if (error) throw authError(error);
  currentAuth.currentUser = null;
}
export async function updateProfile(_user, profile) {
  const displayName = profile?.displayName || '';
  const { data, error } = await client.auth.updateUser({ data: { displayName, name: displayName, full_name: displayName } });
  if (error) throw authError(error);
  currentAuth.currentUser = toCompatUser(data.user);
  return data.user;
}
export async function sendPasswordResetEmail(_auth, email) {
  const redirectTo = new URL('auth.html', window.location.href).toString();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw authError(error);
}
export function onAuthStateChanged(_auth, callback) {
  let active = true;
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    const user = toCompatUser(session?.user || null);
    currentAuth.currentUser = user;
    window.setTimeout(() => { if (active) callback(user); }, 0);
  });
  return () => { active = false; subscription.unsubscribe(); };
}
