from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

source=Path('database/reference')
files=sorted(source.rglob('*.sql'))
assert len(files)>=20, 'Incomplete SQL catalog'
output=Path('database/exports/VATRA-ALL-SQL.zip')
output.parent.mkdir(parents=True,exist_ok=True)
guide='''ВАТРА · ДОВІДКОВИЙ SQL-ПАКЕТ
Не запускати всі SQL-файли один за одним: частина є історичними
або перезаписує налаштування безпеки. Цей експорт зібрано лише з
database/reference/, без застосованих міграцій і архівів.
Актуальна структура бази: docs/DATABASE.md.
Перед змінами в Supabase потрібні резервна копія, тестове середовище
і аудит залежностей. Порядок виконання не визначається назвою файлу.
'''
with ZipFile(output,'w',compression=ZIP_DEFLATED,compresslevel=8) as archive:
    archive.writestr('READ-FIRST.txt',guide)
    for path in files:
        archive.write(path,'SQL/'+str(path.relative_to(source)))
print('SQL files:',len(files),'zip bytes:',output.stat().st_size)
