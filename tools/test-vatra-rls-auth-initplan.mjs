import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync('database/vatra_rls_auth_initplan_20261105.sql','utf8');
const names=[
 'vatra_mod_restrict_content_insert','vatra_mod_restrict_content_update',
 'vatra_mod_account_bans_read','vatra_mod_case_read',
 'vatra_staff_read','vatra_verification_requests_select',
 'vatra_verified_notices_read','vatra_support_tickets_read',
 'vatra_promo_read','vatra_support_alerts_own_read'
];
for(const name of names){
 assert.equal(s.match(new RegExp('alter policy '+name+' on public\\.','g'))?.length,1,
  name+': migration policy missing or duplicated');
}
assert.equal([...s.matchAll(/\balter policy\b/g)].length,10,'Do not change unrelated RLS policies');
const identityCalls=[...s.matchAll(/\(select auth\.uid\(\)\)/g)].length;
assert.ok(identityCalls>=12,'Expected cached identity in all previous auth policy calls');
const statements=s.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
assert.ok(!statements.replaceAll('(select auth.uid())','').includes('auth.uid()'),
 'RLS policy must not evaluate auth.uid() on each row');
assert.ok(/alter policy vatra_mod_restrict_content_update[\s\S]*?\busing\s*\([\s\S]*?\bwith check\s*\(/i.test(s),
 'UPDATE policy must preserve both old and new row predicates');
assert.ok(!/\b(drop|truncate|delete from|grant all|disable row level security)\b/i.test(s),
 'RLS optimization must not relax privileges or delete records');
console.log('VATRA: 10 existing authenticated RLS policies only cache auth.uid(), no permissive grants.');


// Private RLS helper RPC surface: protect authorization probes from forged viewer IDs.
const helperMigration=readFileSync('database/vatra_rpc_internal_grants_20261106.sql','utf8');
const protectedHelpers=[
 ['vatra_data_can_read_post','text, uuid'],
 ['vatra_data_is_friend','text, uuid'],
 ['vatra_data_is_group_member','text, uuid'],
 ['vatra_data_is_group_owner','text, uuid']
];
for(const [name,args] of protectedHelpers){
 const expected='REVOKE EXECUTE ON FUNCTION public.'+name+'('+args+')';
 assert.ok(helperMigration.includes(expected),name+': direct RPC access must be revoked');
}
assert.equal((helperMigration.match(/REVOKE EXECUTE ON FUNCTION/g)||[]).length,protectedHelpers.length,
 'Only the four verified internal helper RPC grants may change');
assert.ok(!/REVOKE[^;]*(?:vatra_data_can_read\(|vatra_data_can_write\()/i.test(helperMigration),
 'Do not break the helper functions directly referenced from app_data RLS policies');
assert.ok(!/\b(?:DROP|TRUNCATE|DELETE FROM|ALTER POLICY|DISABLE ROW LEVEL SECURITY)\b/i.test(
 helperMigration.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
),'Helper grant fix must not modify data or policies');
console.log('VATRA: internal friend/group/post authorization helpers are no longer exposed as direct RPCs.');
