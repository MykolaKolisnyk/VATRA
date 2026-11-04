# VATRA — очищення історій через 24 години

Історія зберігається в `public.app_data` як `posts/<id>` із `kind: "story"`.
Клієнт показує її не довше 24 годин. Якщо автор знову відкриє стрічку,
клієнт видаляє свої прострочені записи та їхні файли.

## Серверне очищення

`vatra-story-cleanup` — Edge Function, що запускається службовим запитом
із *secret key* на заголовку `apikey`, **не через публічний/anon-ключ**.
Використовується `withSupabase({ auth: "secret" })` і `verify_jwt = false`.

1. Розгорни Edge Function із цієї папки, не змінюючи режим перевірки секретного ключа.
2. У Supabase → Database → Extensions увімкни `pg_cron` і `pg_net`.
3. У Supabase Vault створи секрети `vatra_project_url` (адреса свого проєкту
   `https://<ref>.supabase.co`) і `vatra_story_cleanup_secret` (secret key
   проєкту з Supabase → Settings → API Keys). Не додавай цей ключ у GitHub чи чат.
4. У SQL Editor створи завдання для очищення раз на 15 хвилин:

```sql
select cron.schedule(
  'vatra-story-cleanup-every-15m',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name='vatra_project_url') || '/functions/v1/vatra-story-cleanup',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey',(select decrypted_secret from vault.decrypted_secrets
                  where name='vatra_story_cleanup_secret')
      ),
      body := '{"dryRun":false}'::jsonb
    );
  $$
);
```

Виклик із `{"dryRun":true}` лише підраховує записи й не видаляє файли.
Рекомендовано спочатку виконати його як контрольний тест.

Не видаляй файли напряму із `storage.objects`: це лишить сміття в самому
сховищі. Edge Function користується Storage API та видаляє лише файли з
власної папки автора. Якщо Storage API не відповість, запис залишиться
для повторної спроби.

**Приватність:** поточний бакет `vatra-media` має `public=true`.
Тому до окремого переходу на приватне сховище пряме посилання
на зображення історії потенційно доступне стороннім. Це потрібно
виправити окремою міграцією з RLS та короткоживучими підписаними URL.
