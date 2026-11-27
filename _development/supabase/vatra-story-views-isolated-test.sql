-- Run as disposable DB administrator, then simulate actual authenticated/anon roles.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000001',102);
insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000001',102) on conflict do nothing;
do $$ begin
 if (select count(*) from public.story_views)<>0 then raise exception 'viewer can read list'; end if;
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000002',103); raise exception 'forged viewer accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000003',102); raise exception 'expired story accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.story_views(story_id,viewer_vatra_id,viewed_at) values('10000000-0000-0000-0000-000000000002',102,now()-interval '1 day'); raise exception 'forged time accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000001',103); raise exception 'friends-only story accepted'; exception when insufficient_privilege then null; end;
 if (select count(*) from public.story_views)<>0 then raise exception 'unrelated user read list'; end if;
end $$;
insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000002',103);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ begin
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000002',104); raise exception 'blocked viewer accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ begin
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000002',105); raise exception 'disabled account accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin
 if (select count(*) from public.story_views)<>2 then raise exception 'owner count/dedup failed'; end if;
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000002',101); raise exception 'self view accepted'; exception when insufficient_privilege then null; end;
 begin update public.story_views set viewed_at=now(); raise exception 'update accepted'; exception when insufficient_privilege then null; end;
 begin delete from public.story_views; raise exception 'delete accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.test_blocks values(101,103);
set role authenticated;
do $$ begin if (select count(*) from public.story_views)<>1 then raise exception 'blocked viewer still exposed'; end if; end $$;
reset role;
delete from public.stories where id='10000000-0000-0000-0000-000000000001';
do $$ begin if (select count(*) from public.story_views)<>1 then raise exception 'story cascade failed'; end if; end $$;
set role anon;
do $$ begin
 begin perform count(*) from public.story_views; raise exception 'anon read accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.story_views(story_id,viewer_vatra_id) values('10000000-0000-0000-0000-000000000002',103); raise exception 'anon insert accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
