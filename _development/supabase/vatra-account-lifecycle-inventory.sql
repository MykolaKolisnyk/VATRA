-- READ ONLY lifecycle inventory. Do not use as a deletion script.
select conrelid::regclass::text as child, confrelid::regclass::text as parent,
 pg_get_constraintdef(oid) as definition
from pg_constraint
where contype='f' and confrelid in ('public.accounts'::regclass,'auth.users'::regclass)
order by 2,1;

select table_schema,table_name,column_name,data_type
from information_schema.columns
where table_schema not in ('pg_catalog','information_schema','pg_toast')
 and (column_name ~ '(^|_)(vatra_id|user_id|owner_id|author_id|recipient_id|sender_id|member_id|actor_id|reporter_id|created_by)$'
 or column_name in ('media_path','avatar_path','cover_path','image_paths','media_items'))
order by 1,2,3;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname in ('public','storage')
order by 1,2,3;
