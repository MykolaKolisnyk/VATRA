/* Public VATRA snapshots: read only five RLS-approved public posts.
   No session or private record is requested and no write operation is possible. */
(() => {
  'use strict';
  const root = document.querySelector('[data-vatra-public-kind][data-vatra-public-id]');
  const list = document.getElementById('vatraPublicPosts');
  const status = document.getElementById('vatraPublicStatus');
  if (!root || !list || !status) return;
  const kind = root.dataset.vatraPublicKind;
  const id = root.dataset.vatraPublicId || '';
  const pageSize = 5;
  if (!['person', 'group'].includes(kind) || !/^[a-z0-9-]{32,36}$/i.test(id)) {
    status.textContent = 'Не вдалося визначити публічну сторінку.';
    return;
  }
  const endpoint = 'https://rjasunoawrxvetwadylh.supabase.co/rest/v1/app_data';
  // This is the public publishable/anon key, never a service-role secret.
  const publicKey = 'sb_publishable_agvPTuxV0igjxgjfd0JdWw_87GaCUS-';
  const validMediaUrl = value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' ? u.href : '';
    } catch { return ''; }
  };
  const textNode = (tag, value, className = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = String(value || '');
    return node;
  };
  const safeDate = stamp => {
    const number = Number(stamp);
    return Number.isFinite(number) && number > 1000000000
      ? new Intl.DateTimeFormat('uk-UA', { day:'numeric', month:'long', year:'numeric' }).format(new Date(number))
      : '';
  };
  function card(post) {
    const article = document.createElement('article');
    article.className = 'vatra-public-post';
    const header = document.createElement('header');
    header.append(textNode('strong', post.authorName || (kind === 'person' ? root.dataset.vatraPublicName : 'Учасник спільноти')));
    header.append(textNode('time', safeDate(post.createdAt)));
    article.append(header);
    const message = String(post.text || '').trim();
    if (message) article.append(textNode('p', message, 'vatra-public-post-text'));
    const urls = Array.isArray(post.imageUrls) && post.imageUrls.length ? post.imageUrls.slice(0, 3) : [post.imageUrl];
    for (const media of urls) {
      const src = validMediaUrl(media);
      if (!src) continue;
      const image = document.createElement('img');
      image.src = src;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = 'Фото з публічного допису';
      image.className = 'vatra-public-post-image';
      article.append(image);
    }
    const videoUrl = validMediaUrl(post.videoUrl);
    if (videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'none';
      video.controls = true;
      video.playsInline = true;
      video.className = 'vatra-public-post-video';
      article.append(video);
    }
    return article;
  }
  async function load() {
    const url = new URL(endpoint);
    url.searchParams.set('select', 'path,value');
    url.searchParams.set('path', 'like.' + (kind === 'person' ? 'posts/*' : 'groupPosts/' + id + '/*'));
    // Never download private/friends-only content and filter only in the browser.
    url.searchParams.set('value->>visibility', 'eq.public');
    if (kind === 'person') url.searchParams.set('value->>authorUid', 'eq.' + id);
    // JSON sorting avoids downloading the whole feed before choosing a batch.
    url.searchParams.set('order', 'value->>createdAt.desc');
    url.searchParams.set('limit', String(pageSize));
    const response = await fetch(url, {
      headers: { apikey: publicKey },
      cache:'no-store',
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Невірна відповідь сервера.');
    const posts = rows
      .map(row => row && typeof row.value === 'object' ? row.value : null)
      .filter(post => post && (post.visibility == null || post.visibility === 'public')
        && (kind === 'group' || post.authorUid === id));
    list.replaceChildren(...posts.map(card));
    status.textContent = posts.length ? 'Останні відкриті дописи' : 'Поки немає відкритих дописів.';
    status.dataset.state = 'ready';
  }
  load().catch(() => {
    // Do not fall back to cached private data or an unfiltered query.
    status.textContent = 'Зараз не вдалося завантажити відкриті дописи. Спробуйте пізніше.';
    status.dataset.state = 'error';
  });
})();
