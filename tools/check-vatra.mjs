import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root='VATRA';
const files=readdirSync(root).filter(x=>x.endsWith('.js'));
let passed=0;
for(const filename of files){
 const source=readFileSync(join(root,filename),'utf8');
 const run=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
 if(run.status!==0)throw new Error(filename+': SyntaxError\n'+(run.stderr||run.stdout));
 if(/\${3,}\s*\(/.test(source))throw new Error(filename+': undefined $$$ selector');
 if(/(?<!\$)\$(?!\$)\s*\([^)]*\)\s*\.\s*forEach\s*\(/.test(source))
   throw new Error(filename+': querySelector() result used like an array');
 passed++;
}
const main=readFileSync('VATRA/index.html','utf8');
const scriptText=readFileSync('VATRA/script.js','utf8');
const giftText=readFileSync('VATRA/vatra-gifts.js','utf8');
const sql=readFileSync('VATRA/vatra-gifts.sql','utf8');
const styling=readFileSync('VATRA/vatra-interface-fixes.css','utf8');
for(const [label,test] of [
 ['Gifts not in sidebar',!/class="nav" data-page="gifts"/.test(main)],
 ['Profile gift preview',giftText.includes('vatra-gift-preview-card')],
 ['Manual gift orders',readFileSync('VATRA/vatra-gifts-orders.sql','utf8').includes('vatra_gifts_place_order')],
 ['Gifts module',/src="vatra-gifts\.js\?v=[^"]+"/.test(main)],
 ['Gifts stylesheet',/href="vatra-gifts\.css\?v=[^"]+"/.test(main)],
 ['Gifts page handling',scriptText.includes("if(page==='gifts'){")],
 ['Visible delete comment',scriptText.includes('class="vatra-comment-delete"')],
 ['No blue bar',styling.includes('nav a.nav.active::before')],
 ['Server-only gift transfer',sql.includes('vatra_gifts_send(_item_id uuid,_recipient uuid)')],
 ['Server-only gift issue',sql.includes('revoke all on public.vatra_gift_catalog')],
 ['Holiday gift claims',sql.includes('vatra_gifts_claim_holiday')],
 ['Gift privacy',sql.includes('vatra_gifts_set_visibility')],
 ['Original vector artwork',giftText.includes('const paths={')]
])assert.ok(test,label+' missing');
const re=/(?:src|href)="([^"]+\.js)(?:\?v=[^"]*)?"/g;
for(const match of main.matchAll(re)){
 const local=match[1];if(/^https?:\/\//.test(local))continue;
 assert.ok(existsSync(join(root,local)),'Missing local module: '+local);
}
console.log('VATRA check passed: '+passed+' JavaScript modules and navigation/gift/UI invariants.');

// Gift presentation and cancellation regressions
const giftCss=readFileSync('VATRA/vatra-gifts.css','utf8');
const ordersSql=readFileSync('VATRA/vatra-gifts-order-cancellation.sql','utf8');
const giftCatalogSql=readFileSync('VATRA/vatra-gifts-collection-update.sql','utf8');
assert.ok(!/\b(?:alert|confirm)\s*\(/.test(giftText),'Browser alert/confirm reintroduced');
assert.ok(giftText.includes('giftConfirm(')&&giftText.includes('giftToast('),'Custom gift dialogs missing');
assert.ok(giftText.includes('vatra-profile-link vatra-gift-preview-link'),'Friends and gifts must share button class');
assert.ok(giftCss.includes('vatra-profile-friends button.vatra-profile-link'),'Shared friend/gift hover style missing');
assert.ok(ordersSql.includes('DELETE FROM public.vatra_gift_orders WHERE id=_order_id'),'Cancelled order must be permanently removed');
assert.ok(ordersSql.includes("DELETE FROM public.vatra_gift_orders WHERE status='cancelled'"),'Old cancelled orders must be cleaned');
for(const code of ['snowglobe','letter','clover','musicbox','swan','diamond']){
 assert.ok(giftText.includes(code+':'),code+' artwork missing');
 assert.ok(giftCatalogSql.includes("'"+code+"'"),code+' SQL catalog missing');
}

const adminGiftSrc=readFileSync('VATRA/vatra-admin-center.js','utf8');
const adminGiftStart=adminGiftSrc.indexOf('function installGiftAdminEvents(){');
const adminGiftEnd=adminGiftSrc.indexOf('async function renderDashboard(){',adminGiftStart);
assert.ok(adminGiftStart>=0&&adminGiftEnd>adminGiftStart,'Gift admin handlers absent');
assert.ok(!/\\balert\\s*\\(/.test(adminGiftSrc.slice(adminGiftStart,adminGiftEnd)),'Native alert in gift admin');
assert.ok(giftText.includes('let artSerial=0;'),'Each SVG gift requires a unique gradient id');
