begin;
alter policy business_media_read on storage.objects using (
 bucket_id='business-media' and (select business_private.current_member()) is not null and
 (business_private.my_role(business_private.media_company(name)) in ('owner','admin','editor') or
 exists(select 1 from public.business_companies c where c.id=business_private.media_company(storage.objects.name) and (c.logo_path=storage.objects.name or c.cover_path=storage.objects.name))));
alter policy business_media_remove on storage.objects using (
 bucket_id='business-media' and business_private.my_role(business_private.media_company(name)) in ('owner','admin','editor')
 and not exists(select 1 from public.business_companies c where c.id=business_private.media_company(storage.objects.name) and (c.logo_path=storage.objects.name or c.cover_path=storage.objects.name)));
commit;