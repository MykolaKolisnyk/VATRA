# VATRA — службові файли розробки

**Цю папку не використовує працюючий інтерфейс сайту.** Вона потрібна для перевірки та розвитку VATRA.

| Підпапка | Призначення |
| --- | --- |
| `tests/smoke/` | Перевірки функціональності, браузерів, месенджера, RLS |
| `tests/audit/` | Перевірки структури, стилів, перекладів, листів, навантаження |
| `tools/` | Збірка `dist/` та підтримка версій ресурсів |
| `supabase/migrations/` | Історія SQL-міграцій |
| `supabase/functions/` | Код Edge Functions |
| `supabase/operations/` | Службові SQL-операції |
| `docs/` | Архітектура та обмеження безпеки |
| `email-templates/` | Шаблони листів Supabase Auth |

Команди запускати з кореня VATRA:

```bash
node _development/tools/revision-assets.mjs
node _development/tests/audit/check-layout.mjs
node _development/tests/audit/css-cascade-audit.mjs
npm install --no-save --no-package-lock esbuild@0.28.2
node _development/tools/build-static.mjs
```

GitHub Actions залишається в `.github/workflows/check-site.yml`, бо GitHub читає workflow тільки звідти.

Публічні файли сайту зберігаються в корені та `assets/`; збірка `dist/` не включає цю папку. Коли продукт буде повністю протестовано, а міграції надійно збережено, `_development/` можна прибрати з релізної версії репозиторію. GitHub Actions автоматично пропустить перевірки, якщо папки більше немає; сам workflow за бажанням можна видалити окремо. Це не є командою на видалення реальних даних Supabase.
