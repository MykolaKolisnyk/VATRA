from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

source=Path('VATRA')
files=sorted(source.glob('*.sql'))
assert len(files)>=20, 'Incomplete SQL catalog'
output=source/'VATRA-ALL-SQL.zip'
guide='''ВАТРА · SQL-комплект
=========================
ВАЖЛИВО: НЕ ВИКОНУЙТЕ всі SQL-файли поспіль в існуючій базі.
В архіві є базові схеми, застарілі/альтернативні оновлення,
функції адміністрування та міграції, що перекривають одне одного.

Для ВЖЕ НАЛАШТОВАНОЇ бази ВАТРИ пріоритетно застосуйте:
1. vatra-unique-handles-verification.sql
2. vatra-handle-availability.sql
3. vatra-chat-replies-and-unread.sql
4. vatra-rate-limits.sql
5. vatra-all-actions-rate-limits.sql
6. vatra-group-chats.sql
7. vatra-community-bell.sql
8. vatra-disable-gift-orders.sql

Примітки:
- Якщо пункт уже застосований, ознайомтеся з його SQL перед повтором.
- vatra-unique-handles-verification.sql виявляє вже наявні дублікати псевдонімів
  і зупиняється, поки їх не буде узгоджено.
- Деякі файли вимагають попередніх залежностей. Не запускати наосліп.
- НЕ запускайте app-data-schema.sql поверх робочого проєкту без резервної копії,
  бо він перевизначає правила доступу RLS до app_data.
- Перед запуском зробіть резервну копію даних і перевірте міграції в тестовій БД.
- Платні замовлення вимкнені до впровадження справжньої оплати.
- Файли з назвами gifts-orders, gifts-order-cancellation і chat-message-mode-update
  залишені для історичної сумісності, це не інструкція виконувати їх зараз.
- Робочі зміни не активуються просто від завантаження архіву.
'''
with ZipFile(output,'w',compression=ZIP_DEFLATED,compresslevel=8) as archive:
    archive.writestr('READ-FIRST.txt',guide)
    for path in files:
        archive.write(path,'SQL/'+path.name)
print('SQL files:',len(files),'zip bytes:',output.stat().st_size)
