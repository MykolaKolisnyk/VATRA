begin;
-- Виконати після vatra-rate-limits.sql і базової схеми ВАТРИ.
-- Не змінює RLS і не видаляє жодного запису.
create or replace function public.vatra_all_actions_rate_guard()
returns trigger language plpgsql security definer
set search_path='' set row_security=off as $guard$
declare
 actor uuid:=auth.uid();
 old_messages jsonb:='{}'::jsonb;
 new_messages jsonb:='{}'::jsonb;
 number_added integer:=0;
 request_kind text;
 maximum integer;
 seconds integer;
begin
 if actor is null then return new; end if;
 -- Derived indexes, profile synchronization and presence are excluded.
 if new.path ~ '^(userChats|groupChatIndex|chatReads|groupChatReads|publicProfiles|friendProfiles|e2eeKeys|activityReadAt|privateUsers|users)/'
 then return new; end if;

 if new.path ~ '^chats/[^/]+/messages/[^/]+$'
   or new.path ~ '^groupMessages/[^/]+/[^/]+$' then
   if tg_op='INSERT' then
    perform public.vatra_consume_rate_limit(actor,'new_message',45,60);
   else
    perform public.vatra_consume_rate_limit(actor,'edit_message',50,60);
   end if;
 elsif new.path ~ '^chats/[^/]+$' then
   if tg_op='UPDATE' and jsonb_typeof(new.value->'messages')='object' then
     new_messages:=new.value->'messages';
     if jsonb_typeof(old.value->'messages')='object' then old_messages:=old.value->'messages'; end if;
     select count(*) into number_added from jsonb_object_keys(new_messages) k where not(old_messages ? k);
     if number_added>0 then
       for i in 1..least(number_added,100) loop
        perform public.vatra_consume_rate_limit(actor,'new_message',45,60);
       end loop;
     end if;
   end if;
 elsif new.path ~ '^(postLikes|postShares|postSaves|pollVotes|avatarLikes|commentLikes)/' then
   perform public.vatra_consume_rate_limit(actor,'reactions',90,60);
 elsif new.path ~ '^friendRequests/' then
   perform public.vatra_consume_rate_limit(actor,'friend_requests',20,3600);
 elsif new.path ~ '^reports/' then
   if tg_op='INSERT' then perform public.vatra_consume_rate_limit(actor,'reports',12,3600); end if;
 elsif new.path ~ '^groups/[^/]+$' then
   if tg_op='INSERT' then
     perform public.vatra_consume_rate_limit(actor,'new_communities',4,86400);
   else perform public.vatra_consume_rate_limit(actor,'edit_communities',30,3600); end if;
 elsif new.path ~ '^(groupConversations|groupMembers|groupAdmins|groupModerators|groupNotifications)/' then
   perform public.vatra_consume_rate_limit(actor,'community_actions',50,3600);
 elsif new.path ~ '^(videos|groupMedia|avatarComments|following|saved)/' then
   perform public.vatra_consume_rate_limit(actor,'social_actions',90,3600);
 else
   return new;
 end if;
 perform public.vatra_consume_rate_limit(actor,'all_mutations',180,60);
 return new;
end;
$guard$;

revoke all on function public.vatra_all_actions_rate_guard() from public,anon,authenticated;
drop trigger if exists vatra_all_actions_rate_guard on public.app_data;
create trigger vatra_all_actions_rate_guard
 before insert or update of value on public.app_data
 for each row
 when (
   new.path ~ '^(chats|groupMessages|postLikes|postShares|postSaves|pollVotes|avatarLikes|commentLikes|friendRequests|reports|groups|groupConversations|groupMembers|groupAdmins|groupModerators|groupNotifications|videos|groupMedia|avatarComments|following|saved)/'
 )
 execute function public.vatra_all_actions_rate_guard();

-- Техпідтримка: обмеження повідомлень теж контролюється сервером.
do $do$
begin
 if to_regclass('public.vatra_support_messages') is not null then
  execute $ddl$
   create or replace function public.vatra_support_rate_guard()
   returns trigger language plpgsql security definer
   set search_path='' set row_security=off as $support$
   begin
    perform public.vatra_consume_rate_limit(auth.uid(),'support_messages',20,3600);
    return new;
   end;
   $support$;
   drop trigger if exists vatra_support_rate_limit on public.vatra_support_messages;
   create trigger vatra_support_rate_limit before insert on public.vatra_support_messages
    for each row execute function public.vatra_support_rate_guard();
  $ddl$;
 end if;
end;
$do$;
commit;
select tgname,tgenabled from pg_catalog.pg_trigger
where tgrelid='public.app_data'::regclass and tgname like 'vatra_%rate_%';