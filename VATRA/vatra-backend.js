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
function reportConnection(online, reason = '') {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vatra:connection', {
      detail: { online, reason: String(reason || '') }
    }));
  } catch {}
}
function databaseError(error) {
  // The query layer may already have classified this error. Preserve its code
  // rather than converting a useful RLS/schema diagnosis to DATABASE_ERROR.
  if (['SCHEMA_NOT_READY', 'PERMISSION_DENIED', 'NETWORK_ERROR', 'DATABASE_ERROR'].includes(error?.code)) return error;
  const message = String(error?.message || error || '');
  console.error('[ВАТРА: database]', { message, code: error?.code || '', details: error?.details || '', hint: error?.hint || '' });
  const code = String(error?.code || '').toUpperCase();
  const schemaMissing = ['42P01', 'PGRST204', 'PGRST205'].includes(code)
    || /relation .*app_data.* does not exist|could not find the table .*app_data|schema cache.*app_data/i.test(message);
  const permission = /permission|row.level.security|not allowed|42501/i.test(message);
  const network = /fetch|network|failed to send|load failed|timeout|connection/i.test(message);
  if (network) reportConnection(false, 'network');
  const wrapped = new Error(schemaMissing
    ? 'Схема бази ВАТРИ неповна: таблицю app_data або потрібний стовпець не знайдено. У Supabase SQL Editor виконай повний файл VATRA/app-data-schema.sql.'
    : permission
      ? 'Supabase відхилив запис через правила доступу (RLS). Перевір, що в правильному проєкті виконано актуальний файл VATRA/app-data-schema.sql, а ти ввійшов у свій акаунт.'
      : network
        ? 'Не вдається з’єднатися з ВАТРОЮ. Перевір інтернет і спробуй ще раз.'
        : 'Не вдалося виконати дію. Спробуй ще раз трохи пізніше.');
  wrapped.code = schemaMissing ? 'SCHEMA_NOT_READY' : permission ? 'PERMISSION_DENIED' : (network ? 'NETWORK_ERROR' : 'DATABASE_ERROR');
  // Preserve only the provider's short error code for support diagnostics; do not
  // expose SQL text, row values, tokens, or other potentially sensitive details.
  wrapped.dbCode = String(error?.code || '').slice(0, 24);
  return wrapped;
}
function authError(error, context = '') {
  const source = [error?.code, error?.message, error?.name].filter(Boolean).join(' ').toLowerCase();
  let code = context === 'email-delivery' ? 'auth/email-delivery-failed' : context === 'sms-delivery' ? 'auth/sms-delivery-failed' : context === 'delivery' ? 'auth/otp-delivery-failed' : context === 'verify-otp' ? 'auth/invalid-otp' : 'auth/invalid-credential';
  if (/already.*registered|already.*exists|user_already_exists|email.*taken|phone.*already.*(registered|exists|used|in[ _-]?use)|already.*phone.*(registered|exists|used|in[ _-]?use)/.test(source)) code = 'auth/email-already-in-use';
  else if (/email.*invalid|invalid.*email|email_address_invalid/.test(source)) code = 'auth/invalid-email';
  else if (/weak.password|password.*short|password.*should/.test(source)) code = 'auth/weak-password';
  else if (/\b429\b|rate.?limit|too.many.(requests|attempts)|over_request_rate_limit|over_email_send_rate_limit|over_sms_send_rate_limit|over_phone_send_rate_limit/.test(source)) code = 'auth/too-many-requests';
  else if (/email[_ ]address[_ ]not[_ ]authorized|email address not authorized/.test(source)) code = 'auth/email-not-authorized';
  else if (/email.*(send|deliver).*(fail|error|reject)|(?:fail|error|reject).*(send|deliver).*email|smtp.*(error|fail)/.test(source)) code = 'auth/email-delivery-failed';
  else if (/sms_provider_not_configured|sms.*(send|deliver).*(fail|error)|(?:fail|error).*(send|deliver).*sms|twilio.*(error|fail)/.test(source)) code = 'auth/sms-delivery-failed';
  else if (/phone.*invalid|invalid.*phone|phone_number_invalid/.test(source)) code = 'auth/invalid-phone-number';
  else if (/phone_provider_disabled|sms_provider_disabled|not enabled|email_provider_disabled|signup_disabled/.test(source)) code = 'auth/operation-not-allowed';
  else if (/otp.*expired|token.*expired|expired.*token/.test(source)) code = 'auth/otp-expired';
  else if (/invalid.*(?:otp|token|code)|(?:otp|token|code).*(?:invalid|wrong)/.test(source)) code = 'auth/invalid-otp';
  else if (/network|fetch|load failed/.test(source)) code = 'auth/network-request-failed';
  else if (/user.not.found/.test(source)) code = 'auth/user-not-found';
  const messages = {
    'auth/email-already-in-use': 'Ця електронна пошта або номер телефону вже використовується. Увійдіть до наявного акаунта або відновіть пароль.',
    'auth/invalid-email': 'Введи коректну адресу електронної пошти.',
    'auth/weak-password': 'Пароль має бути надійнішим.',
    'auth/otp-delivery-failed': 'Supabase не зміг надіслати код. Перевір налаштування Auth → Email/Phone provider, SMTP/SMS-провайдера та ліміти в журналах Supabase.',
    'auth/too-many-requests': 'Supabase тимчасово обмежив запити. Зачекай щонайменше 5 хвилин і не натискай повторно. Для публічної реєстрації через email налаштуй власний SMTP; перевір Authentication → Rate Limits.',
    'auth/email-not-authorized': 'Supabase без власного SMTP не надсилає листи на довільні адреси. Потрібно налаштувати SMTP у Supabase → Authentication → SMTP Settings.',
    'auth/email-delivery-failed': 'Supabase не зміг надіслати лист. Перевір SMTP, підтверджений домен та ліміт відправлення.',
    'auth/sms-delivery-failed': 'Supabase не зміг надіслати SMS. Перевір Authentication → Providers → Phone і налаштування SMS-провайдера.',
    'auth/operation-not-allowed': 'Цей спосіб входу вимкнений. Перевір Authentication → Providers у Supabase.',
    'auth/network-request-failed': 'Не вдається з’єднатися з ВАТРОЮ. Перевір інтернет.',
    'auth/user-not-found': 'Акаунт не знайдено.',
    'auth/invalid-credential': 'Перевір правильність коду або пароля й спробуй ще раз.',
    'auth/invalid-otp': 'Код неправильний. Перевір усі цифри та спробуй ще раз.',
    'auth/invalid-phone-number': 'Перевір номер у міжнародному форматі, наприклад +380XXXXXXXXX.',
    'auth/otp-expired': 'Термін дії коду завершився. Запроси новий код.'
  };
  const err = new Error(messages[code] || 'Не вдалося виконати дію. Перевір дані та повтори спробу.');
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
    'image/gif': 'gif', 'image/avif': 'avif',
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
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from(TABLE).select('path,value')
      .or(conditions.join(',')).range(from, from + pageSize - 1);
    if (error) throw databaseError(error);
    reportConnection(true);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  rows.sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));
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
async function insertNode(path, value) {
  const { error } = await client.from(TABLE).insert({
    path,
    value: clone(value),
    updated_at: new Date().toISOString()
  });
  if (error) throw databaseError(error);
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
  // Delete in batches from the beginning: each successful batch shrinks the
  // result set, so large branches cannot leave stale descendants behind.
  const batchSize = 500;
  while (true) {
    const { data, error } = await client.from(TABLE).select('path')
      .like('path', path + '/%').limit(batchSize);
    if (error) throw databaseError(error);
    if (!data || !data.length) break;
    for (const row of data) await removeNode(row.path);
    if (data.length < batchSize) break;
  }
}
// Friend changes require an atomic, permission-checked database operation.
// Do not read/write another person's RLS-protected friends/<uid> root in the browser.
function friendUid(input) {
  const uid = String(input || '').trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uid)) {
    throw new Error('Не вдалося визначити акаунт користувача.');
  }
  return uid;
}
function friendshipRpcError(error) {
  const code = String(error?.code || '').toUpperCase();
  if (code === 'PGRST202' || code === '42883' ||
      /function public\.vatra_(accept_friend|remove_friend|repair_my_friends).*not found|schema cache.*vatra_/i.test(String(error?.message || ''))) {
    const setup = new Error('Для взаємної дружби потрібне оновлення Supabase: запустіть SQL із файлу VATRA/friends-mutual-fix.sql у SQL Editor.');
    setup.code = 'FRIENDS_SQL_REQUIRED';
    return setup;
  }
  return databaseError(error);
}
export async function acceptFriendRequest(senderUid) {
  const { data, error } = await client.rpc('vatra_accept_friend', { p_sender: friendUid(senderUid) });
  if (error) throw friendshipRpcError(error);
  return data === true;
}
export async function removeFriendship(otherUid) {
  const { data, error } = await client.rpc('vatra_remove_friend', { p_other: friendUid(otherUid) });
  if (error) throw friendshipRpcError(error);
  return data === true;
}
export async function listProfileFriends(ownerUid) {
 const { data, error } = await client.rpc('vatra_list_profile_friends', { p_owner: friendUid(ownerUid) });
 if (error) throw friendshipRpcError(error);
 return Array.isArray(data) ? data.filter(uid => typeof uid === 'string') : [];
}
export async function repairMyFriendships() {
  const { data, error } = await client.rpc('vatra_repair_my_friends');
  if (error) throw friendshipRpcError(error);
  return Number(data) || 0;
}

export async function createPost(reference, value) {
  const path = cleanPath(reference.path);
  if (!/^posts\/[^/]+$/.test(path)) {
    throw new Error('Створення допису має використовувати окремий запис posts/<id>.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Дані допису мають бути об’єктом.');
  }
  // Re-check the live Supabase session before writing. A stale UI state or
  // mismatched author must not create a post under another account.
  const { data: authData, error: authCheckError } = await client.auth.getUser();
  if (authCheckError) throw authError(authCheckError);
  const signedInUser = authData?.user;
  if (!signedInUser) {
    const notSignedIn = new Error('Сесія завершилася. Увійдіть у ВАТРУ ще раз.');
    notSignedIn.code = 'auth/no-session';
    throw notSignedIn;
  }
  if (String(value.authorUid || '') !== String(signedInUser.id)) {
    const wrongOwner = new Error('Не вдалося підтвердити власника допису. Оновіть сторінку та увійдіть у свій акаунт знову.');
    wrongOwner.code = 'auth/author-mismatch';
    throw wrongOwner;
  }
  // New posts use a plain INSERT. This avoids the extra UPDATE-policy check
  // that can make an INSERT ... ON CONFLICT upsert fail under strict RLS.
  await insertNode(path, value);
}
export async function set(reference, value) {
  const path = cleanPath(reference.path);
  if (!path) throw new Error('Шлях до даних не вказано.');
  // Posts are always stored as individual rows so the database can verify
  // authorUid on every write. Never merge a new post into a legacy "posts" root.
  if (/^posts\/[^/]+$/.test(path)) {
    await upsertNode(path, value);
    return;
  }
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
  // Keep post deletion aligned with the per-post RLS policy.
  if (/^posts\/[^/]+$/.test(path)) {
    await removeNode(path);
    return;
  }
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
const realtimeWatchers = new Map();
let realtimeChannel = null;
function ensureRealtimeChannel() {
  if (realtimeChannel) return;
  realtimeChannel = client.channel('vatra-live-data')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, payload => {
      const changedPath = cleanPath(payload?.new?.path || payload?.old?.path || '');
      for (const watcher of realtimeWatchers.values()) {
        const watchedPath = watcher.path;
        if (!changedPath || changedPath === watchedPath || changedPath.startsWith(watchedPath + '/') || watchedPath.startsWith(changedPath + '/')) void watcher.poll();
      }
    }).subscribe();
}
export function onValue(reference, callback, errorCallback) {
  let active = true, running = false;
  let lastValue = Symbol('first');
  const poll = async () => {
    if (!active || running) return;
    running = true;
    let value;
    try {
      value = await readTree(reference.path);
    } catch (error) {
      const wrapped = databaseError(error);
      try {
        if (typeof errorCallback === 'function') errorCallback(wrapped);
        else console.warn('Помилка читання даних:', wrapped.message);
      } catch (handlerError) {
        console.error('[ВАТРА] Помилка обробника помилки читання:', handlerError);
      } finally { running = false; }
      return;
    }
    try {
      if (!active) return;
      const encoded = JSON.stringify(value);
      if (encoded !== lastValue) {
        // Rendering errors are not database errors and must not claim missing
        // SQL/RLS. Retry this value on the next poll if the view failed.
        await callback(new DataSnapshot(reference.path, value));
        lastValue = encoded;
      }
    } catch (error) {
      console.error('[ВАТРА] Помилка оновлення інтерфейсу після читання даних:', reference.path, error);
    } finally { running = false; }
  };
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  realtimeWatchers.set(id, { path: cleanPath(reference.path), poll });
  ensureRealtimeChannel();
  void poll();
  const timer = setInterval(poll, 20000);
  return () => {
    active = false; clearInterval(timer); realtimeWatchers.delete(id);
    if (!realtimeWatchers.size && realtimeChannel) { client.removeChannel(realtimeChannel); realtimeChannel = null; }
  };
}

async function functionErrorCode(error) {
  try {
    const response = error?.context;
    if (response?.clone) return String((await response.clone().json())?.error || '');
  } catch {}
  return '';
}
export async function sendVatraOtp({ channel, contact }) {
  const { data, error } = await client.functions.invoke('vatra-otp', {
    body: { action: 'send', channel, contact }
  });
  const serverCode = data?.error || (error ? await functionErrorCode(error) : '');
  if (serverCode) {
    const map = {
      OTP_SERVICE_NOT_CONFIGURED: ['vatra/service-not-configured', 'Сервер підтвердження ВАТРИ ще не налаштований.'],
      RATE_LIMITED: ['vatra/rate-limited', 'Забагато кодів за останню годину. Спробуй пізніше.'],
      WAIT_BEFORE_RESEND: ['vatra/wait-resend', 'Зачекай 30 секунд перед повторним надсиланням.'],
      DELIVERY_NOT_CONFIGURED: ['vatra/delivery-not-configured', 'Відправник email або SMS ВАТРИ ще не налаштований. Для email потрібен підтверджений домен, для SMS — активний провайдер.'],
      DELIVERY_FAILED: ['vatra/delivery-failed', 'Не вдалося доставити код ВАТРИ. Перевір адресу/номер і спробуй пізніше.'],
      OTP_STORAGE_FAILED: ['vatra/service-not-configured', 'Сховище кодів ВАТРИ не налаштоване. Застосуй останній SQL-файл і перевір секрети Edge Function.'],
      OTP_INTERNAL_ERROR: ['vatra/delivery-failed', 'Сервер ВАТРИ не зміг обробити запит. Перевір Edge Function та її журнали.'],
      EMAIL_PROVIDER_NOT_CONFIGURED: ['vatra/delivery-not-configured', 'Для email не налаштовано відправника ВАТРИ. Додай RESEND_API_KEY і VATRA_EMAIL_FROM у секрети Edge Function.'],
      SMS_PROVIDER_NOT_CONFIGURED: ['vatra/delivery-not-configured', 'Для SMS не налаштовано провайдера ВАТРИ. Додай дані Twilio у секрети Edge Function.'],
      EMAIL_DELIVERY_FAILED: ['vatra/delivery-failed', 'Поштовий сервіс не прийняв лист ВАТРИ. Перевір підтверджений домен і адресу відправника.'],
      SMS_DELIVERY_FAILED: ['vatra/delivery-failed', 'SMS-сервіс не прийняв повідомлення ВАТРИ. Перевір Twilio, номер відправника й доступність SMS для країни.'],
      INVALID_CONTACT: ['auth/invalid-email', 'Перевір email або номер телефону.'],
    };
    const [code, message] = map[serverCode] || ['vatra/delivery-failed', 'Не вдалося надіслати код ВАТРИ.'];
    const wrapped = new Error(message); wrapped.code = code; throw wrapped;
  }
  if (error) { const wrapped = new Error('Не вдалося надіслати код ВАТРИ. Перевір налаштування пошти або SMS.'); wrapped.code = 'vatra/delivery-failed'; throw wrapped; }
  return data;
}
export async function verifyVatraOtpAndCreateUser({ channel, contact, code, password, firstName, lastName }) {
  const { data, error } = await client.functions.invoke('vatra-otp', {
    body: { action: 'verify', channel, contact, code, password, firstName, lastName }
  });
  const serverCode = data?.error || (error ? await functionErrorCode(error) : '');
  if (serverCode) {
    const map = {
      OTP_SERVICE_NOT_CONFIGURED: ['vatra/service-not-configured', 'Сервер підтвердження ВАТРИ ще не налаштований.'],
      INVALID_CODE: ['vatra/invalid-code', 'Код неправильний. Перевір його та спробуй ще раз.'],
      CODE_EXPIRED: ['vatra/code-expired', 'Термін дії коду завершився. Надішли новий код.'],
      TOO_MANY_ATTEMPTS: ['vatra/too-many-attempts', 'Забагато неправильних спроб. Надішли новий код.'],
      ACCOUNT_EXISTS: ['auth/email-already-in-use', 'Цей email або номер уже зареєстрований. Увійди в акаунт.'],
      INVALID_REGISTRATION_DATA: ['vatra/registration-data', 'Перевір ім’я, прізвище та пароль.'],
      ACCOUNT_CREATION_FAILED: ['vatra/account-creation-failed', 'Не вдалося створити акаунт. Спробуй пізніше.'],
    };
    const [codeName, message] = map[serverCode] || ['vatra/verify-failed', 'Не вдалося підтвердити код.'];
    const wrapped = new Error(message); wrapped.code = codeName; throw wrapped;
  }
  if (error) { const wrapped = new Error('Не вдалося підтвердити код. Перевір налаштування ВАТРИ.'); wrapped.code = 'vatra/verify-failed'; throw wrapped; }
  return data;
}

export async function signUpWithPassword({ email, phone, password, userData = {}, captchaToken = '' }) {
  const options = { data: userData };
  if (phone) options.channel = 'sms';
  if (captchaToken) options.captchaToken = captchaToken;
  const credentials = email
    ? { email: String(email).trim().toLowerCase(), password, options }
    : { phone: String(phone).trim(), password, options };
  const { data, error } = await client.auth.signUp(credentials);
  if (error) throw authError(error, email ? 'email-delivery' : 'sms-delivery');
  // Supabase deliberately returns an empty identities array for an already-used
  // email in projects that conceal account enumeration. Never treat that as a new account.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    const duplicate = new Error('Ця електронна пошта або номер телефону вже використовується.');
    duplicate.code = 'auth/email-already-in-use';
    throw duplicate;
  }
  return { user: toCompatUser(data.user), session: data.session };
}

export async function resendSignupOtp({ email, phone, captchaToken = '' }) {
  const options = captchaToken ? { captchaToken } : undefined;
  const payload = email
    ? { type: 'signup', email: String(email).trim().toLowerCase(), ...(options ? { options } : {}) }
    : { type: 'sms', phone: String(phone).trim(), ...(options ? { options } : {}) };
  const { error } = await client.auth.resend(payload);
  if (error) throw authError(error, email ? 'email-delivery' : 'sms-delivery');
}

export async function sendOtp({ email, phone, shouldCreateUser = false, userData = {}, captchaToken = '' }) {
  const options = { shouldCreateUser, data: userData };
  if (captchaToken) options.captchaToken = captchaToken;
  const payload = email ? { email, options } : { phone, options };
  const { error } = await client.auth.signInWithOtp(payload);
  if (error) throw authError(error, email ? 'email-delivery' : 'sms-delivery');
}
export async function verifyOtp({ email, phone, token, type = '', captchaToken = '' }) {
  const payload = email ? { email, token, type: type || 'email' } : { phone, token, type: type || 'sms' };
  if (captchaToken) payload.options = { captchaToken };
  const { data, error } = await client.auth.verifyOtp(payload);
  if (error) throw authError(error, 'verify-otp');
  currentAuth.currentUser = toCompatUser(data.user);
  return { user: currentAuth.currentUser, session: data.session };
}
export async function updatePhoneNumber(phone) { const { error } = await client.auth.updateUser({ phone }); if (error) throw authError(error); }
export async function verifyPhoneChange(phone, token) { const { data, error } = await client.auth.verifyOtp({ phone, token, type: 'phone_change' }); if (error) throw authError(error); currentAuth.currentUser = toCompatUser(data.user); return currentAuth.currentUser; }
export async function signInWithPhoneOtp(phone, captchaToken = '') {
  return sendOtp({ phone, shouldCreateUser: false, captchaToken });
}
export async function createUserWithEmailAndPassword(_auth, email, password, userData = {}) {
  const { data, error } = await client.auth.signUp({ email: String(email || '').trim().toLowerCase(), password, options: { data: userData } });
  if (error) throw authError(error);
  // Supabase can return a user with an empty identities array for a duplicate
  // email when account enumeration protection is enabled.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    const duplicate = new Error('Ця електронна пошта вже використовується. Увійдіть до наявного акаунта.');
    duplicate.code = 'auth/email-already-in-use';
    throw duplicate;
  }
  const user = toCompatUser(data.user);
  currentAuth.currentUser = user;
  return { user, session: data.session };
}
export async function signInWithEmailAndPassword(_auth, email, password) {
  const identifier = String(email || '').trim();
  const credentials = identifier.startsWith('+')
    ? { phone: identifier, password }
    : { email: identifier.toLowerCase(), password };
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error) throw authError(error);
  const user = toCompatUser(data.user);
  currentAuth.currentUser = user;
  return { user, session: data.session };
}
export async function signInWithPassword(_auth, identifier, password) {
  return signInWithEmailAndPassword(_auth, identifier, password);
}
export async function verifyPasswordCredentials(identifier, password) {
  const contact = String(identifier || '').trim();
  if (!contact || !password) throw new Error('Введіть контакт і пароль.');
  const credentials = contact.startsWith('+')
    ? { phone: contact, password }
    : { email: contact.toLowerCase(), password };
  // Validate credentials with a short-lived client so the main browser session
  // is not created until the user completes the in-app human check.
  const verifier = createClient(SERVICE_URL, PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await verifier.auth.signInWithPassword(credentials);
  if (error) throw authError(error);
  if (!data?.user?.id) throw new Error('Не вдалося перевірити облікові дані.');
  try { await verifier.auth.signOut(); } catch {}
  return true;
}

export async function setAccountPassword(password) {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw authError(error);
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
  const redirectTo = new URL('auth.html?mode=new-password', window.location.href).toString();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw authError(error);
}
export function onAuthStateChanged(_auth, callback) {
  let active = true;
  let lastUid = Symbol('initial-auth-state');
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    const user = toCompatUser(session?.user || null);
    currentAuth.currentUser = user;
    // Supabase emits TOKEN_REFRESHED and USER_UPDATED events for the same
    // account. Reinitializing the app for those events looked like a page refresh.
    const uid = user?.uid || null;
    if (uid === lastUid) return;
    lastUid = uid;
    window.setTimeout(() => { if (active) callback(user); }, 0);
  });
  return () => { active = false; subscription.unsubscribe(); };
}
