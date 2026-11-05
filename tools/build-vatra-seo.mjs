import {readFileSync,writeFileSync,readdirSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const source=readFileSync('vatra-backend.js','utf8');
const endpoint=source.match(/const SERVICE_URL\s*=\s*['"]([^'"]+)['"]/);
const publishable=source.match(/const PUBLIC_KEY\s*=\s*['"]([^'"]+)['"]/);
if(!endpoint||!publishable||!/^https:\/\//.test(endpoint[1]))throw new Error('Не знайдено публічної конфігурації ВАТРИ.');
const base='https://mykolakolisnyk.github.io/VATRA/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const absoluteImage=s=>typeof s==='string'&&/^https:\/\//i.test(s)?s:'';
const changeDate=value=>{
 const n=Number(value?.updatedAt||value?.modifiedAt||value?.createdAt)||0;
 const ms=n>1000000000&&n<100000000000?n*1000:n;
 return Number.isFinite(ms)&&ms>=1577836800000&&ms<Date.now()+86400000
  ?new Date(ms).toISOString():'';
};

async function readPublic(prefix){
 const rows=[];
 for(let offset=0;offset<50000;offset+=1000){
  const url=new URL(endpoint[1]+'/rest/v1/app_data');
  url.searchParams.set('select','path,value');
  url.searchParams.set('path','like.'+prefix+'/*');
  url.searchParams.set('order','path.asc');
  url.searchParams.set('limit','1000');
  url.searchParams.set('offset',String(offset));
  const response=await fetch(url,{headers:{apikey:publishable[1],Authorization:'Bearer '+publishable[1]},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error('Не вдалося завантажити відкриті сторінки ВАТРИ: HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data))throw new Error('Сервер повернув неправильний формат каталогу.');
  rows.push(...data);
  if(data.length<1000)break;
  if(offset===49000)throw new Error('Дані перевищили ліміт індексації; потрібно розбити карту сайту.');
 }
 return rows;
}
async function readVisibleIds(rpc,column){
 const response=await fetch(endpoint[1]+'/rest/v1/rpc/'+rpc,{
  method:'POST',
  headers:{apikey:publishable[1],Authorization:'Bearer '+publishable[1],'Content-Type':'application/json'},
  body:'{}',signal:AbortSignal.timeout(25000)
 });
 if(!response.ok)throw new Error('Не вдалося перевірити публічні SEO-записи: HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data)||data.some(row=>!row||typeof row[column]!=='string')){
  throw new Error('Невірна відповідь безпечного SEO-каталогу '+rpc);
 }
 return new Set(data.map(row=>row[column]));
}
function page(type,id,data,slug=id){
 const person=type==='person';
 const name=String(data.name||'').trim().slice(0,110);
 const summary=String(data.bio||data.description||'').trim().replace(/\s+/g,' ').slice(0,330) ||
  (person?'Публічний профіль учасника соціальної мережі ВАТРА.':'Відкрита спільнота української соціальної мережі ВАТРА.');
 const url=base+(person?'people/':'communities/')+encodeURIComponent(slug)+'/';
 const redirect=base+'#/'+(person?'u/':'community/')+encodeURIComponent(slug);
 const image=absoluteImage(data.avatarUrl)||base+'social-preview.png';
 const updated=changeDate(data);
 const jsonLd=JSON.stringify({'@context':'https://schema.org','@type':person?'ProfilePage':'CollectionPage',
  'name':name+' — ВАТРА','description':summary,'url':url,...(updated?{'dateModified':updated}:{}),'mainEntity':{'@type':person?'Person':'Organization','name':name}}).replace(/</g,'\\u003c');
 return '<!doctype html>\n<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+esc(name)+' — ВАТРА</title><meta name="description" content="'+esc(summary)+'"><meta name="robots" content="index,follow,max-image-preview:large">'+
  '<link rel="canonical" href="'+esc(url)+'"><link rel="icon" type="image/svg+xml" href="'+esc(base+'favicon.svg')+'">'+
  '<meta property="og:type" content="'+(person?'profile':'website')+'"><meta property="og:title" content="'+esc(name)+' — ВАТРА"><meta property="og:description" content="'+esc(summary)+'">'+
  '<meta property="og:image" content="'+esc(image)+'"><meta property="og:url" content="'+esc(url)+'">'+
  (updated?'<meta property="og:updated_time" content="'+esc(updated)+'">':'')+
  '<script type="application/ld+json">'+jsonLd+'</script>'+
  '<link rel="stylesheet" href="../../vatra-public-preview.css?v=20261105-1"></head><body>'+
  '<header class="vatra-public-topbar"><a class="vatra-public-brand" href="'+esc(base)+'"><img src="../../favicon.svg" alt=""><span>ВАТРА</span></a>'+
  '<nav class="vatra-public-nav" aria-label="Акаунт"><a href="../../auth.html">Увійти</a><a href="../../auth.html?mode=register">Зареєструватися</a></nav></header>'+
  '<main class="vatra-public-main" data-vatra-public-kind="'+(person?'person':'group')+'" data-vatra-public-id="'+esc(id)+'" data-vatra-public-name="'+esc(name)+'">'+
  '<section class="vatra-public-profile"><div class="vatra-public-profile-head">'+
  '<img class="vatra-public-avatar" src="'+esc(image)+'" alt="" loading="lazy"><div><p class="vatra-public-kicker">'+(person?'Публічна сторінка':'Публічна спільнота')+'</p>'+
  '<h1>'+esc(name)+'</h1></div></div><p>'+esc(summary)+'</p></section>'+
  '<h2 class="vatra-public-section-head" id="vatraPublicStatus" aria-live="polite">Завантажуємо відкриті дописи…</h2>'+
  '<section id="vatraPublicPosts" aria-label="Публічні дописи"></section>'+
  '<section class="vatra-public-gate"><h2>Більше можливостей у ВАТРІ</h2>'+
  '<p>Ви переглядаєте відкриту частину сторінки. Увійдіть або зареєструйтеся, щоб переглядати стрічку, підписуватися та спілкуватися.</p>'+
  '<div class="vatra-public-actions"><a href="../../auth.html">Увійти</a><a href="../../auth.html?mode=register">Зареєструватися</a></div>'+
  '<p><a href="'+esc(redirect)+'">Відкрити у ВАТРІ</a></p></section>'+
  '<footer class="vatra-public-footer">ВАТРА · українська соціальна мережа</footer></main>'+
  '<script defer src="../../vatra-public-preview.js?v=20261105-1"></script></body></html>\n';
}
// Canonical profile URLs must use the account's public @handle, not its UUID.
// Validate before using a username as a directory to prevent path traversal.
function profileSlug(value){
 const slug=String(value||'').normalize('NFC').trim().replace(/^@/,'').toLocaleLowerCase('uk-UA');
 return [...slug].length<=40 && /^[\p{L}\p{N}][\p{L}\p{N}._-]*[\p{L}\p{N}]$/u.test(slug) ? slug : '';
}
function oldProfileRedirect(slug){
 const canonical=base+'people/'+encodeURIComponent(slug)+'/';
 return '<!doctype html><html lang="uk"><head><meta charset="utf-8">'+
  '<meta name="robots" content="noindex,follow"><link rel="canonical" href="'+esc(canonical)+'">'+
  '<meta http-equiv="refresh" content="0;url='+esc(canonical)+'">'+
  '<title>Профіль переміщено — ВАТРА</title></head><body>'+
  '<p>Профіль має нову адресу: <a href="'+esc(canonical)+'">відкрити сторінку</a>.</p></body></html>';
}
const sitemapChanges=new Map();
function writeSnapshots(folder,items,type){
 const target=join(folder);
 if(existsSync(target))rmSync(target,{recursive:true,force:true});
 mkdirSync(target,{recursive:true});
 const urls=[],seen=new Set();
 const accountIds=new Set(type==='person'?items.map(([id])=>id):[]);
 for(const [id,value] of items){
  const slug=type==='person'?profileSlug(value.handle):id;
  if(!slug){
   // Profiles without a valid public handle are not indexed under opaque IDs.
   if(type==='person')console.warn('Skip SEO profile without a valid public username:',id);
   continue;
  }
  if(seen.has(slug)|| (type==='person'&&slug!==id&&accountIds.has(slug))){
   console.warn('Skip duplicated or colliding public username:',slug);
   continue;
  }
  seen.add(slug);
  const targetFolder=join(target,slug);
  mkdirSync(targetFolder,{recursive:true});
  writeFileSync(join(targetFolder,'index.html'),page(type,id,value,slug),'utf8');
  const url=base+folder+'/'+encodeURIComponent(slug)+'/';
  urls.push(url);
  const modified=changeDate(value);
  if(modified)sitemapChanges.set(url,modified.slice(0,10));
  // Previously shared UUID URLs remain accessible but are not indexed.
  if(type==='person'&&slug!==id&&!seen.has(id)){
   const alias=join(target,id);
   mkdirSync(alias,{recursive:true});
   writeFileSync(join(alias,'index.html'),oldProfileRedirect(slug),'utf8');
  }
 }
 return urls;
}
const [profiles,groups,visiblePeople,visibleCommunities]=await Promise.all([
 readPublic('publicProfiles'),readPublic('groups'),
 readVisibleIds('vatra_seo_visible_profile_ids','uid'),
 readVisibleIds('vatra_seo_visible_community_ids','group_id')
]);
const entries=rows=>rows.map(r=>[String(r.path||'').split('/')[1],r.value]).filter(([id,v])=>/^[A-Za-z0-9_-]{6,128}$/.test(id)&&v&&typeof v==='object');
const people=entries(profiles).filter(([id,p])=>visiblePeople.has(id)&&p.profileVisibility!=='private'&&p.searchable!==false&&p.name&&p.isDeleted!==true&&p.deletedAt==null);
const communities=entries(groups).filter(([id,g])=>visibleCommunities.has(id)&&g.visibility!=='private'&&g.name&&g.isDeleted!==true&&g.deletedAt==null);
const languages=['uk','en','pl','de','fr','es','pt','it'];
const links=[base+'index.html',...languages.map(lang=>base+'lang/'+lang+'/'),...writeSnapshots('people',people,'person'),...writeSnapshots('communities',communities,'group')];
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 links.map(url=>'  <url><loc>'+esc(url)+'</loc>'+(sitemapChanges.has(url)?'<lastmod>'+sitemapChanges.get(url)+'</lastmod>':'')+'</url>').join('\n')+'\n</urlset>\n';
writeFileSync('sitemap.xml',sitemap,'utf8');
console.log('Публічних профілів:',people.length,'публічних спільнот:',communities.length);
