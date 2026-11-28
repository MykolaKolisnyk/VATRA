-- Disposable database: reuse the story visibility fixture, never production accounts.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000001',102,'heart');
do $$ begin
 if (select count(*) from public.story_reactions)<>1 then raise exception 'reactor cannot read own reaction'; end if;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000001',102,'like'); raise exception 'duplicate accepted'; exception when unique_violation then null; end;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',103,'like'); raise exception 'forged reactor accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000003',102,'like'); raise exception 'expired story accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',102,'sticker'); raise exception 'unsupported reaction accepted'; exception when check_violation then null; end;
 begin update public.story_reactions set reactor_vatra_id=103; raise exception 'reactor changed'; exception when insufficient_privilege then null; end;
 begin update public.story_reactions set created_at=now(); raise exception 'timestamp changed'; exception when insufficient_privilege then null; end;
 update public.story_reactions set reaction='fire' where story_id='10000000-0000-0000-0000-000000000001';
 if (select reaction from public.story_reactions)<>'fire' then raise exception 'reaction change failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
 if (select count(*) from public.story_reactions)<>0 then raise exception 'unrelated reaction disclosed'; end if;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000001',103,'like'); raise exception 'friends-only reaction accepted'; exception when insufficient_privilege then null; end;
end $$;
insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',103,'wow');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ begin
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',104,'like'); raise exception 'blocked reaction accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ begin
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',105,'like'); raise exception 'disabled reaction accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare affected integer; begin
 if (select count(*) from public.story_reactions)<>2 then raise exception 'owner list failed'; end if;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',101,'like'); raise exception 'self reaction accepted'; exception when insufficient_privilege then null; end;
 update public.story_reactions set reaction='sad'; get diagnostics affected=row_count;
 if affected<>0 then raise exception 'owner modified reactions'; end if;
 delete from public.story_reactions; get diagnostics affected=row_count;
 if affected<>0 then raise exception 'owner deleted reactions'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
delete from public.story_reactions where story_id='10000000-0000-0000-0000-000000000001' and reactor_vatra_id=102;
do $$ begin if (select count(*) from public.story_reactions)<>0 then raise exception 'withdrawal failed'; end if; end $$;
insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000001',102,'heart');
reset role;
insert into public.test_blocks values(101,103);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin if (select count(*) from public.story_reactions)<>1 then raise exception 'blocked reactor exposed'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ declare affected integer; begin
 if (select count(*) from public.story_reactions)<>0 then raise exception 'blocked story reaction exposed'; end if;
 update public.story_reactions set reaction='sad'; get diagnostics affected=row_count;
 if affected<>0 then raise exception 'blocked mutation accepted'; end if;
end $$;
reset role;
delete from public.stories where id='10000000-0000-0000-0000-000000000001';
do $$ begin if (select count(*) from public.story_reactions)<>1 then raise exception 'cascade failed'; end if; end $$;
set role anon;
do $$ begin
 begin perform count(*) from public.story_reactions; raise exception 'anonymous read accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.story_reactions(story_id,reactor_vatra_id,reaction) values('10000000-0000-0000-0000-000000000002',103,'like'); raise exception 'anonymous insert accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
