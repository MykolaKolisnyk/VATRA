-- VATRA community content preferences, enforced in the Supabase database.
-- Apply after app-data-schema.sql. Existing RLS remains enabled.
create or replace function public.vatra_enforce_community_content_prefs()
returns trigger language plpgsql security definer
set search_path='' set row_security=off
as $vatra$
declare uid uuid := auth.uid(); group_id text; grp jsonb; manager boolean;
begin
  if uid is null then return new; end if; -- trusted server publisher
  if new.path ~ '^groupPosts/[^/]+/[^/]+$' then
    group_id:=split_part(new.path,'/',2);
    select value into grp from public.app_data where path='groups/'||group_id;
    if grp is null then raise exception 'Спільнота не існує'; end if;
    manager := public.vatra_data_is_group_owner(group_id,uid)
      or exists (select 1 from public.app_data a
         where a.path='groupAdmins/'||group_id||'/'||uid::text and a.value='true'::jsonb)
      or (
       coalesce((grp->>'moderatorsCanPost')::boolean,true)
       and exists (select 1 from public.app_data a
         where a.path='groupModerators/'||group_id||'/'||uid::text and a.value='true'::jsonb)
      );
    if not manager then raise exception 'Лише керівники або модератори з дозволом можуть публікувати дописи'; end if;
    if coalesce(new.value->>'authorType','user')='group' and not (
      public.vatra_data_is_group_owner(group_id,uid)
      or exists (select 1 from public.app_data a where a.path='groupAdmins/'||group_id||'/'||uid::text and a.value='true'::jsonb)
    ) then raise exception 'Публікація від імені спільноти недоступна'; end if;
  elsif new.path ~ '^comments/g_[^_]+_[^_]+/[^/]+$' then
    group_id:=substring(split_part(new.path,'/',2) from '^g_([^_]+)_');
    if group_id is not null then
      select value into grp from public.app_data where path='groups/'||group_id;
      if grp is not null and coalesce((grp->>'commentsEnabled')::boolean,true)=false then
        raise exception 'Коментарі спільноти вимкнені';
      end if;
    end if;
  end if;
  return new;
end;
$vatra$;
revoke all on function public.vatra_enforce_community_content_prefs() from public,anon,authenticated;
drop trigger if exists vatra_community_content_prefs on public.app_data;
create trigger vatra_community_content_prefs
 before insert on public.app_data
 for each row execute function public.vatra_enforce_community_content_prefs();
