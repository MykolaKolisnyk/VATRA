import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
const read=path=>readFile(path,"utf8");
for(const path of ["assets/js/admin.js","assets/css/admin.css","assets/js/announcements.js","_development/supabase/functions/public-announcements/index.ts","_development/supabase/vatra-owner-admin.sql"])await assert.rejects(stat(path),{code:"ENOENT"});
const [guard,host,settings,sql,maintenance]=await Promise.all([
 read("assets/js/account-guard.js"),read("assets/js/host.js"),read("assets/js/settings.js"),
 read("_development/supabase/migrations/20261125154722_presence_visibility_retire_admin_console.sql"),
 read("_development/supabase/migrations/20261125155024_preserve_maintenance_owner_access.sql")
]);
assert.doesNotMatch(guard,/loadAdmin|vatra-admin-menu|vatra_admin_access/);
assert.match(guard,/from\("account_states"\)/);assert.doesNotMatch(guard,/announcement/i);assert.doesNotMatch(host,/VATRA_ANNOUNCEMENT_EDGE_ENABLED/);
assert.match(host,/rpc\("vatra_maintenance_access"\)/);
for(const name of ["public.admin_console_read","public.vatra_admin_manage","public.vatra_admin_access","vatra_admin_private.console_read","vatra_admin_private.manage"])assert.ok(sql.includes("drop function "+name+"("));
assert.ok(!/drop schema|cascade|drop table/i.test(sql));
assert.match(sql,/as restrictive for select to authenticated/);
assert.match(sql,/f.status='accepted'/);
assert.match(sql,/presence_visibility in \('public','friends','private'\)/);
assert.ok(settings.includes("presence_visibility")&&settings.includes("profile_visibility,presence_visibility"));
assert.match(maintenance,/security invoker/);assert.match(maintenance,/vatra_admin_private.allowed\(\)/);
console.log("VATRA admin retirement: UI assets removed, panel RPCs retired, account protection retained and presence privacy policy checked.");
