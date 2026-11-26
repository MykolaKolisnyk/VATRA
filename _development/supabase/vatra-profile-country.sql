begin;
set local lock_timeout='3s';
alter table public.profile_details drop constraint vatra_profile_details_field_key_check,
 add constraint vatra_profile_details_field_key_check check(field_key in ('short_bio','relationship','hometown','languages','family','city','address','mobile_phone','additional_phone','website','activities','hobbies','favorite_music','favorite_movies','favorite_tv','favorite_books','favorite_games','favorite_quotes','about_me','school','university','education_extra','workplace','job_title','career_extra','military_service','political_views','worldview','life_priorities','important_in_people','attitude_to_smoking','attitude_to_alcohol','inspiration','country')),
 add constraint vatra_profile_details_country_check check(field_key <> 'country' or field_value in ('UA','GB','PL','DE','FR','IT','BG','GE'));
commit;
