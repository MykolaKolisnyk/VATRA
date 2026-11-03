from pathlib import Path
from io import BytesIO
from base64 import b64decode
from xml.etree import ElementTree
from PIL import Image

root=ElementTree.parse('VATRA/favicon.svg').getroot()
image=next(el for el in root.iter() if el.tag.rsplit('}',1)[-1]=='image')
url=next(v for k,v in image.attrib.items() if k.endswith('href'))
assert url.startswith('data:image/png;base64,')
source=Image.open(BytesIO(b64decode(url.split(',',1)[1]))).convert('RGBA')
# Кожен колір та форма логотипу залишаються з оригіналу.
# Прибираємо лише суцільне чорне тло ПОЗА синім квадратом.
pixels=source.load()
width,height=source.size
for y in range(height):
    x_positions=[x for x in range(width) if
      (lambda c: c[2]>60 and c[2]>c[0]*1.27 and c[2]>=c[1]*1.04)(pixels[x,y])]
    if not x_positions:
        for x in range(width):
            pixels[x,y]=(0,0,0,0)
        continue
    left=min(x_positions)
    right=max(x_positions)
    for x in range(left):
        pixels[x,y]=(0,0,0,0)
    for x in range(right+1,width):
        pixels[x,y]=(0,0,0,0)
Path('VATRA/logo.png').parent.mkdir(parents=True,exist_ok=True)
source.save('VATRA/logo.png',optimize=True)
for size in [180,64]:
    icon=source.resize((size,size),Image.Resampling.LANCZOS)
    name='favicon.png' if size==180 else 'favicon-small.png'
    icon.save('VATRA/'+name,optimize=True)
print('Підключено оригінальний логотип, без перемальовування:',source.size)
