-- Minimal schema contract, ONLY for a fresh disposable PostgreSQL CI service.
-- Not a production migration or a substitute for full Supabase integration tests.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema auth;
create schema private;
create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);
create table public.accounts(user_id uuid primary key,vatra_id bigint not null unique);
create table public.account_states(vatra_id bigint primary key,state text not null,blocked_until timestamptz);
