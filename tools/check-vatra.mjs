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
 ['Gifts navigation',/data-page="gifts" href="#\/gifts"/.test(main)],
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
