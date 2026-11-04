// VATRA public SEO snapshots. Only currently PUBLIC profiles/communities.
// Run by GitHub Actions. No service-role token, private tables or personal email data.
import fs from 'node:fs/promises';
import path from 'node:path';
const SITE='https://mykolakolisnyk.github.io/VATRA/';
const API='https://rjasunoawrxvetwadylh.supabase.co/rest/v1/';
const KEY=process.env.VATRA_SUPABASE_PUBLISHABLE_KEY;
if(!KEY)throw new Error('Set VATRA_SUPABASE_PUBLISHABLE_KEY for the public read-only Data API');
const H={apikey:KEY,'Content-Type':'application/json'};
const safeText=(value,max=180)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=html;
const imageURL=value=>/^https:\/\/[^\s"'<>]{1,1800}$/i.test(String(value||''))?String(value):SITE+'social-preview.svg';
const abs=(folder,id)=>SITE+folder+'/'+encodeURIComponent(id)+'/';
const jsonLD=data=>JSON.stringify(data).replace(/</g,'\\u003c');
async function getRows(prefix){
 const items=[];let start=0;
 for(;;){
  const url=new URL(API+'app_data');
  url.searchParams.set('select','path,value');url.searchParams.set('path','like.'+prefix+'/*');
  url.searchParams.set('order','path.asc');url.searchParams.set('offset',String(start));url.searchParams.set('limit','1000');
  const response=await fetch(url,{headers:H});
  if(!response.ok)throw new Error('Public data API returned '+response.status+' for '+prefix);
  const next=await response.json();if(!Array.isArray(next))throw new Error('Unexpected response');
  items.push(...next);if(next.length<1000)break;start+=next.length;
  if(start>100000)throw new Error('Unexpectedly large public dataset');
 }
 return items;
}
async function publicState(kind,id){
 const response=await fetch(API+'rpc/vatra_public_ban_status',{method:'POST',headers:H,body:JSON.stringify({_kind:kind,_target:id})});
 if(!response.ok)throw new Error('Status API '+response.status+' for '+kind);
 const status=await response.json();return status&&!status.blocked&&!status.deleted;
}
async function validOnly(rows,kind){
 const valid=[];
 for(const row of rows){
  const id=String(row.path||'').split('/')[1],v=row.value;
  if(!v||typeof v!=='object'||!id)continue;
  if(kind==='account'){
   if(!/^[a-f0-9-]{36}$/i.test(id)||v.profileVisibility==='private'||v.searchable===false||v.deleted||v.isDeleted)continue;
  }else{
   if(!/^[A-Za-z0-9_-]{8,128}$/.test(id)||v.visibility==='private'||v.isDeleted||v.deleted)continue;
  }
  try{if(await publicState(kind,id))valid.push({id,value:v});}
  catch(e){console.warn('Skip record with unverified visibility:',kind,id,e.message);}
 }
 return valid;
}
function documentPage(kind,id,value){
 const profile=kind==='account',name=safeText(value.name||(profile?'Учасник ВАТРИ':'Спільнота ВАТРИ'),90);
 const url=abs(profile?'people':'communities',id);
 const type=profile?'ProfilePage':'CollectionPage';
 const description=safeText(
  (profile?value.bio:value.description)||(
   profile?'Публічний профіль у ВАТРІ — українській соціальній мережі для спілкування, дописів, друзів і фотографій.':
   'Публічна спільнота ВАТРИ: обговорення, дописи, фотографії, відео й нові знайомства.'
  ),160);
 const title=name+' — ВАТРА';
 const picture=imageURL(value.avatarUrl||value.coverUrl);
 const schema={'@context':'https://schema.org','@type':type,name:title,description,url,inLanguage:'uk-UA',isPartOf:{'@type':'WebSite',name:'ВАТРА',url:SITE},mainEntity:profile?{'@type':'Person',name}:{'@type':'Organization',name}};
 const href=SITE+'#/'+(profile?'profile':'community')+'/'+encodeURIComponent(id);
 return `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${html(title)}</title><meta name="description" content="${html(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}"><link rel="icon" href="${SITE}favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${profile?'profile':'website'}"><meta property="og:site_name" content="ВАТРА">
<meta property="og:locale" content="uk_UA"><meta property="og:title" content="${html(title)}">
<meta property="og:description" content="${html(description)}"><meta property="og:image" content="${html(picture)}">
<meta property="og:url" content="${url}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${html(title)}"><meta name="twitter:description" content="${html(description)}">
<meta name="twitter:image" content="${html(picture)}">
<script type="application/ld+json">${jsonLD(schema)}</script>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f5f8fd;color:#203957;font:16px/1.5 system-ui,sans-serif;padding:20px;box-sizing:border-box}
main{width:min(580px,100%);box-sizing:border-box;padding:30px;border:1px solid #dfe8f4;border-radius:18px;background:#fff;box-shadow:0 18px 40px #22426c15}
.avatar{width:92px;height:92px;object-fit:cover;border-radius:18px}h1{font-size:clamp(22px,4vw,31px);line-height:1.25;margin:18px 0 10px}
p{color:#5a718f}a{display:inline-block;margin-top:8px;padding:12px 19px;border-radius:11px;background:#0757f5;color:white;text-decoration:none;font-weight:700}
small{display:block;margin-top:20px;color:#8092a7}</style>
</head><body><main><img class="avatar" src="${html(picture)}" alt=""><h1>${html(name)}</h1><p>${html(description)}</p><a href="${href}">Відкрити ${profile?'профіль':'спільноту'} у ВАТРІ</a><small>ВАТРА · Українська соціальна мережа</small></main></body></html>`;
}
const unavailable=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Сторінка недоступна — ВАТРА</title></head><body><main><h1>Сторінка недоступна</h1><p>Цей профіль або спільнота більше не є загальнодоступними.</p><a href="${SITE}">Повернутися до ВАТРИ</a></main></body></html>`;
const people=await validOnly(await getRows('publicProfiles'),'account');
const communities=await validOnly(await getRows('groups'),'community');
for(const [folder,records,kind] of [['people',people,'account'],['communities',communities,'community']]){
 await fs.mkdir(folder,{recursive:true});
 const published=new Set(records.map(record=>record.id));
 for(const item of await fs.readdir(folder,{withFileTypes:true})){
  if(!item.isDirectory()||published.has(item.name)||!/^[A-Za-z0-9_-]{8,128}$/.test(item.name))continue;
  const existing=path.join(folder,item.name,'index.html');
  try{await fs.access(existing);await fs.writeFile(existing,unavailable);}
  catch{}
 }
 for(const {id,value} of records){
  const dir=path.join(folder,id);await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'index.html'),documentPage(kind,id,value));
 }
}
const langs=['uk','en','pl','de','fr','es','pt','it'];
const links=[SITE+'index.html',...langs.map(code=>SITE+'lang/'+code+'/'),...people.map(row=>abs('people',row.id)),...communities.map(row=>abs('communities',row.id))];
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+links.map(url=>'  <url><loc>'+xml(url)+'</loc></url>').join('\n')+'\n</urlset>\n';
await fs.writeFile('sitemap.xml',sitemap);
console.log('Generated public SEO pages: '+people.length+' people; '+communities.length+' communities; '+links.length+' sitemap URLs.');