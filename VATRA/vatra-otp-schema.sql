-- ВАТРА custom one-time codes.
-- Only the Edge Function using the service-role key may access this table.
create table if not exists public.vatra_otp_codes (
  id uuid primary key default gen_random_uuid(),
  contact_hash text not null,
  request_hash text,
  channel text not null check (channel in ('email','phone')),
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists vatra_otp_codes_contact_created_idx
  on public.vatra_otp_codes (contact_hash, created_at desc);
alter table public.vatra_otp_codes enable row level security;
revoke all on public.vatra_otp_codes from anon, authenticated;

alter table public.vatra_otp_codes add column if not exists request_hash text;
create index if not exists vatra_otp_codes_request_created_idx on public.vatra_otp_codes (request_hash, created_at desc);

grant all on public.vatra_otp_codes to service_role;
