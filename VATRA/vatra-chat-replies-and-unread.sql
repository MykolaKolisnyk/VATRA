-- VATRA: ordinary private chat message update, 30 October 2026; consolidated 3 November 2026.
-- Apply in the existing Supabase project SQL Editor. RLS stays enabled.
-- Chats remain accessible only to authorized participants according to app_data policies.
-- Ordinary new messages are not end-to-end encrypted. Old encrypted entries remain intact.
-- Paste this entire file into SQL Editor for the existing VATRA Supabase project.
-- No RLS settings are changed. The operation can be run again safely.
-- The final status query must return "Готово".
-- Only this chat guard and trigger are modified; RLS is not disabled.
-- Existing messages remain untouched. Ordinary text is not end-to-end encrypted.

begin;

create or replace function public.vatra_e2ee_guard()
returns trigger
language plpgsql
set search_path = ''
as $vatra_e2ee$
declare
  actor_uid text := auth.uid()::text;
  old_messages jsonb := '{}'::jsonb;
  new_messages jsonb := '{}'::jsonb;
  message_id text;
  message_payload jsonb;
begin
  if actor_uid is null then
    raise exception 'VATRA E2EE: authentication required';
  end if;

  if new.path ~ '^chats/[^/]+/messages/[^/]+$' then
    message_id := split_part(new.path, '/', 4);
    new_messages := jsonb_build_object(message_id, new.value);
    if tg_op = 'UPDATE' then
      old_messages := jsonb_build_object(message_id, old.value);
    end if;
  elsif new.path ~ '^chats/[^/]+/messages$' then
    new_messages := new.value;
    if tg_op = 'UPDATE' then
      old_messages := old.value;
    end if;
  elsif new.path ~ '^chats/[^/]+$' then
    if tg_op = 'UPDATE' then
      if coalesce(new.value -> 'members', '{}'::jsonb)
         is distinct from coalesce(old.value -> 'members', '{}'::jsonb) then
        raise exception 'VATRA E2EE: chat membership cannot be rewritten';
      end if;
      old_messages := coalesce(old.value -> 'messages', '{}'::jsonb);
    end if;
    new_messages := coalesce(new.value -> 'messages', '{}'::jsonb);
  else
    raise exception 'VATRA E2EE: unsupported chat data path';
  end if;

  if jsonb_typeof(new_messages) is distinct from 'object'
     or jsonb_typeof(old_messages) is distinct from 'object' then
    raise exception 'VATRA E2EE: invalid message container';
  end if;

  for message_id in select jsonb_object_keys(new_messages) loop
    message_payload := new_messages -> message_id;

    if message_payload is distinct from old_messages -> message_id then
      if (old_messages ? message_id)
         and old_messages -> message_id ->> 'senderUid' is distinct from actor_uid then
        raise exception 'VATRA E2EE: only the author may edit a message';
      end if;

      -- Sender must always match the authenticated account.
      if jsonb_typeof(message_payload) is distinct from 'object'
         or message_payload ->> 'senderUid' is distinct from actor_uid then
        raise exception 'VATRA CHAT: invalid sender';
      end if;
      if message_payload ? 'encrypted' then
        -- Keep the original strict format for historic E2EE records.
        if message_payload ? 'text'
           or message_payload -> 'encrypted' ->> 'v' is distinct from '1'
           or message_payload -> 'encrypted' ->> 'alg' is distinct from 'ECDH-P256-HKDF-SHA256-AES256GCM-ECDSA'
           or message_payload -> 'encrypted' ->> 'ciphertext' is null
           or message_payload -> 'encrypted' ->> 'iv' is null
           or message_payload -> 'encrypted' ->> 'signature' is null then
          raise exception 'VATRA CHAT: invalid legacy encrypted record';
        end if;
      else
        -- New ordinary messages: RLS still limits read/write to chat members.
        if jsonb_typeof(message_payload -> 'text') is distinct from 'string'
           or length(trim(message_payload ->> 'text')) not between 1 and 2000 then
          raise exception 'VATRA CHAT: message text must contain 1 to 2000 characters';
        end if;
      end if;
    end if;
  end loop;

  for message_id in select jsonb_object_keys(old_messages) loop
    if not (new_messages ? message_id)
       and old_messages -> message_id ->> 'senderUid' is distinct from actor_uid then
      raise exception 'VATRA E2EE: only the author may remove a message';
    end if;
  end loop;

  return new;
end;
$vatra_e2ee$;

drop trigger if exists vatra_require_encrypted_messages on public.app_data;
create trigger vatra_require_encrypted_messages
before insert or update of value on public.app_data
for each row
when (new.path ~ '^chats/[^/]+(/messages(/.*)?)?$')
execute function public.vatra_e2ee_guard();

commit;

-- Check that the updated function and trigger are installed in THIS database.
select case when
  position('VATRA CHAT: message text must contain 1 to 2000 characters'
    in pg_get_functiondef('public.vatra_e2ee_guard()'::regprocedure)) > 0
  and exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='app_data'
      and c.relrowsecurity
      and t.tgname='vatra_require_encrypted_messages'
      and t.tgenabled in ('O', 'A')
      and not t.tgisinternal
  ) then 'Готово' else 'Потрібна перевірка SQL'
end as chat_migration_status;


-- Additional fix (3 November 2026): publish a trusted inbox preview to BOTH people.
-- A client cannot write to another user's userChats row because of RLS.
-- This trigger runs server-side after the same validated message is stored.
begin;

create or replace function public.vatra_chat_sync_inboxes()
returns trigger language plpgsql security definer
set search_path = '' set row_security = off
as $vatra_chat_sync$
declare
  chat_id text;
  chat_root jsonb;
  members jsonb;
  message jsonb;
  previous_messages jsonb := '{}'::jsonb;
  item record;
  participant text;
  other_participant text;
  sender text;
  stamp bigint;
  preview text;
  index_path text;
  row_value jsonb;
begin
  if new.path ~ '^chats/[^/]+/messages/[^/]+$' then
    chat_id := split_part(new.path,'/',2);
    message := new.value;
    select c.value into chat_root from public.app_data c where c.path='chats/'||chat_id;
  elsif new.path ~ '^chats/[^/]+$' then
    chat_id := split_part(new.path,'/',2);
    chat_root := new.value;
    if jsonb_typeof(new.value -> 'messages') <> 'object' then return new; end if;
    if tg_op='UPDATE' and jsonb_typeof(old.value->'messages')='object' then
      previous_messages := old.value->'messages';
    end if;
    -- Sync only newly added messages to avoid notifications for metadata edits.
    for item in select key, value from jsonb_each(new.value->'messages')
                where not(previous_messages ? key)
                order by coalesce((value->>'createdAt')::bigint,0) desc limit 1
    loop
      message := item.value;
    end loop;
  else
    return new;
  end if;

  if message is null or jsonb_typeof(message)<>'object' then return new; end if;
  members := chat_root->'members';
  sender := message->>'senderUid';
  if sender is null or jsonb_typeof(members)<>'object'
     or not(members ? sender) then return new; end if;
  stamp := coalesce(nullif(message->>'createdAt','')::bigint,
                    floor(extract(epoch from clock_timestamp())*1000)::bigint);
  preview := case when message ? 'encrypted' then 'Повідомлення'
             else left(coalesce(message->>'text','Повідомлення'),120) end;
  for participant in select jsonb_object_keys(members) loop
    -- Preserve the original chat's otherUid for both sender and recipient.
    if participant !~ '^[0-9a-fA-F-]{36}$' then continue; end if;
    select key into other_participant from jsonb_object_keys(members) key
      where key<>participant limit 1;
    if other_participant is null then continue; end if;
    index_path := 'userChats/'||participant||'/'||chat_id;
    row_value := jsonb_build_object(
      'otherUid',other_participant,'updatedAt',stamp,
      'lastMessage',jsonb_build_object('text',preview,'senderUid',sender,'createdAt',stamp)
    );
    insert into public.app_data(path,value,updated_at)
    values(index_path,row_value,clock_timestamp())
    on conflict (path) do update
      set value=coalesce(public.app_data.value,'{}'::jsonb)||excluded.value,
          updated_at=clock_timestamp()
      where coalesce(nullif(public.app_data.value->'lastMessage'->>'createdAt','')::bigint,0)<=stamp;
  end loop;
  return new;
end;
$vatra_chat_sync$;

revoke all on function public.vatra_chat_sync_inboxes() from public,anon,authenticated;
drop trigger if exists vatra_chat_sync_inboxes on public.app_data;
create trigger vatra_chat_sync_inboxes
 after insert or update of value on public.app_data
 for each row
 when (new.path ~ '^chats/[^/]+(/messages/[^/]+)?$')
 execute function public.vatra_chat_sync_inboxes();

commit;

-- Diagnostic: two enabled chat triggers means replies and inbox updates are configured.
select tgname,tgenabled
from pg_catalog.pg_trigger
where tgrelid='public.app_data'::regclass
  and tgname in ('vatra_require_encrypted_messages','vatra_chat_sync_inboxes')
order by tgname;
