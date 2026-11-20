-- Applied to production Supabase VATRA-DE on 2026-11-20.
-- Clear existing communities while preserving future creation of normal communities.
-- Retire the complete business extension (NOT the independent marketplace).
-- Historical business migrations remain intact for reproducible migration ordering.
begin;
drop policy if exists business_media_read on storage.objects;
drop policy if exists business_media_remove on storage.objects;
drop policy if exists business_media_add on storage.objects;
drop policy if exists community_owner_enable_business on public.communities;
drop table if exists
 public.business_job_applications,
 public.business_inquiry_messages,
 public.business_ratings,
 public.business_appointments,
 public.business_booking_slots,
 public.business_inquiries,
 public.business_jobs,
 public.business_store_listings,
 public.business_metrics,
 public.business_members,
 public.business_companies,
 public.business_categories;
drop schema if exists business_private cascade;
alter table public.communities drop column if exists business_enabled;
delete from public.communities;
commit;
