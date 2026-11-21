begin;
create table public.business_jobs(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.business_companies(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 2 and 120),
 description text not null check(char_length(btrim(description)) between 10 and 4000),
 city text not null default '' check(char_length(city)<=100),
 employment_type text not null check(employment_type in ('full-time','part-time','contract','internship','remote')),
 status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now()
);
create index business_jobs_company_idx on public.business_jobs(company_id,created_at desc);
create index business_jobs_open_idx on public.business_jobs(created_at desc) where status='open';
create table public.business_job_applications(
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.business_jobs(id) on delete cascade,
 member_vatra_id bigint not null default business_private.current_member() references public.accounts(vatra_id) on delete cascade,
 note text not null default '' check(char_length(note)<=1500),
 status text not null default 'submitted' check(status in ('submitted','reviewed','shortlisted','declined','withdrawn')),
 created_at timestamptz not null default now(),
 unique(job_id,member_vatra_id)
);
create index business_job_applications_member_idx on public.business_job_applications(member_vatra_id,created_at desc);
create function business_private.job_accepts_applications(job uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.business_jobs j where j.id=job and j.status='open' and business_private.my_role(j.company_id) is null);
$$;
revoke all on function business_private.job_accepts_applications(uuid) from public,anon,authenticated;
grant execute on function business_private.job_accepts_applications(uuid) to authenticated;
create function business_private.can_manage_job(job uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.business_jobs j where j.id=job and business_private.my_role(j.company_id) in ('owner','admin','manager'));
$$;
revoke all on function business_private.can_manage_job(uuid) from public,anon,authenticated;
grant execute on function business_private.can_manage_job(uuid) to authenticated;
alter table public.business_jobs enable row level security;
alter table public.business_job_applications enable row level security;
revoke all on public.business_jobs,public.business_job_applications from public,anon,authenticated;
grant select on public.business_jobs,public.business_job_applications to authenticated;
grant insert(company_id,title,description,city,employment_type),update(title,description,city,employment_type,status) on public.business_jobs to authenticated;
grant insert(job_id,note),update(status) on public.business_job_applications to authenticated;
create function business_private.has_job_application(job uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_job_applications a where a.job_id=job and a.member_vatra_id=business_private.current_member());
$$;
revoke all on function business_private.has_job_application(uuid) from public,anon,authenticated;
grant execute on function business_private.has_job_application(uuid) to authenticated;
create policy business_jobs_read on public.business_jobs for select to authenticated using((select business_private.current_member()) is not null and (status='open' or business_private.my_role(company_id) in ('owner','admin','manager') or business_private.has_job_application(id)));
create policy business_jobs_add on public.business_jobs for insert to authenticated with check(business_private.my_role(company_id) in ('owner','admin','manager') and status='open');
create policy business_jobs_edit on public.business_jobs for update to authenticated using(business_private.my_role(company_id) in ('owner','admin','manager')) with check(business_private.my_role(company_id) in ('owner','admin','manager'));
create policy business_job_apps_read on public.business_job_applications for select to authenticated using(member_vatra_id=(select business_private.current_member()) or business_private.can_manage_job(job_id));
create policy business_job_apps_apply on public.business_job_applications for insert to authenticated with check(member_vatra_id=(select business_private.current_member()) and status='submitted' and business_private.job_accepts_applications(job_id));
create policy business_job_apps_withdraw on public.business_job_applications for update to authenticated
using(member_vatra_id=(select business_private.current_member()) and status in ('submitted','reviewed','shortlisted'))
with check(member_vatra_id=(select business_private.current_member()) and status='withdrawn');
create policy business_job_apps_review on public.business_job_applications for update to authenticated
using(business_private.can_manage_job(job_id) and member_vatra_id<>(select business_private.current_member()) and status in ('submitted','reviewed','shortlisted','declined'))
with check(business_private.can_manage_job(job_id) and member_vatra_id<>(select business_private.current_member()) and status in ('reviewed','shortlisted','declined'));
commit;
