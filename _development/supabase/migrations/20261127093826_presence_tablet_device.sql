alter table public.profile_presence
 drop constraint profile_presence_device_type_check,
 add constraint profile_presence_device_type_check check (device_type in ('desktop','mobile','tablet'));
