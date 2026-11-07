# VATRA — шаблони листів Supabase

У VATRA використовується **тільки email + пароль**. Телефон, SMS, вхід або реєстрація за номером не передбачені.

Ці файли містять **оригінальні тіла листів для Supabase** (не копії CSS і не додаткові версії). Кожен файл потрібно один раз вставити у відповідне поле **Body → Source** у [Supabase Dashboard](https://supabase.com/dashboard/project/rjasunoawrxvetwadylh/auth/templates) та натиснути **Save changes**. Коміт у GitHub **не змінює автоматично** активні шаблони Supabase.

| Розділ у Supabase | Файл в репозиторії | Subject (можна скопіювати) |
|---|---|---|
| Confirm sign up | `confirmation.html` | `VATRA — Підтвердження пошти / Confirm email` |
| Invite user | `invite.html` | `VATRA — Запрошення / Invitation` |
| Magic link or OTP | `magic-link.html` | `VATRA — Код входу / Sign-in code` |
| Change email address | `email-change.html` | `VATRA — Зміна пошти / Email change` |
| Reset password | `recovery.html` | `VATRA — Код відновлення пароля / Password recovery` |
| Reauthentication | `reauthentication.html` | `VATRA — Код підтвердження / Verification code` |
| Password changed (Security) | `password-changed.html` | `VATRA — Пароль змінено / Password changed` |
| Email address changed (Security) | `email-address-changed.html` | `VATRA — Пошту змінено / Email changed` |

## Мова листа

Поточна форма реєстрації в `assets/js/auth.js` передає `preferred_locale` зі значенням `uk` або `en` у метаданих Supabase. **Саме `.Data.preferred_locale`**, а не `.Data.preferredLanguage`, використано в усіх восьми шаблонах.

- Для `en` відображається англійський текст.
- Для `uk` або відсутніх метаданих — український.
- Після реєстрації мова листів визначається збереженими метаданими акаунта; лише зміна мови сторінки без зміни цих метаданих не перемикає мову автоматичного листа. У Dashboard тема листа одна на обидві мови, тому в прикладах тема двомовна.

## Безпечні змінні Supabase

- **Підтвердження, запрошення, зміна пошти:** `{{ .ConfirmationURL }}`.
- **Зміна адреси:** `{{ .NewEmail }}`.
- **Magic link:** `{{ .Token }}` та `{{ .ConfirmationURL }}`. Цей тип листа не додає авторизацію за телефоном.
- **Відновлення пароля:** `{{ .Token }}` (звичайний цифровий код Supabase), `{{ .RedirectTo }}` (сторінка `reset.html` для введення коду) і `{{ .ConfirmationURL }}` (захищене посилання).
- **Повторна автентифікація:** `{{ .Token }}`.
- **Сповіщення про зміну пароля:** без OTP; посилання веде на офіційну сторінку відновлення VATRA.
- **Сповіщення про зміну електронної адреси:** `{{ .OldEmail }}` та `{{ .Email }}` (доступні для Security notification «Email address changed»).

Реєстрація підтверджується **посиланням**, оскільки поточна форма реєстрації не має окремого екрану введення коду. Відновлення пароля підтримує **код та посилання**.

## Перед запуском

1. Переконайтеся, що **Site URL** і **Redirect URLs** у Supabase відповідають `https://mykolakolisnyk.github.io/VATRA/` та потрібним `/ua/` і `/en/` сторінкам акаунта й `reset.html`.
2. У **SMTP Settings** налаштовується відправник листів VATRA. Вміст HTML-шаблонів не змінює ім’я чи адресу SMTP-відправника.
3. Після збереження шаблону надішліть тестове підтвердження та відновлення пароля, перевірте лист українською й англійською та завершення дії в браузері. Не вставляйте у репозиторій приватні ключі чи паролі.

Інші типи шаблонів, як-от телефонні сповіщення чи зміна номера, **не потрібні** і не додаються.

## Два сповіщення безпеки

У Supabase → Authentication → Emails → Security треба окремо ввімкнути **Password changed** і **Email address changed** та натиснути **Save changes**. Далі відкрийте кожний шаблон, скопіюйте відповідний HTML з GitHub у **Body → Source**, введіть відповідний **Subject** з таблиці вище та збережіть. Зміни в GitHub самі по собі не змінюють листи в Supabase. Використовуйте **Preview**, а потім надішліть тестовий лист. Жодних телефонних сповіщень не вмикаємо.
