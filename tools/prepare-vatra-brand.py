from pathlib import Path
from io import BytesIO
from base64 import b64decode
from xml.etree import ElementTree
from PIL import Image
import cairosvg

svg_path=Path('favicon.svg')
root=ElementTree.parse(svg_path).getroot()
embedded=next((el for el in root.iter() if el.tag.rsplit('}',1)[-1]=='image'),None)
if embedded is not None:
    url=next((v for k,v in embedded.attrib.items() if k.endswith('href')),'')
    if not url.startswith('data:image/png;base64,'):
        raise ValueError('Embedded original logo is not a PNG data URI')
    source=Image.open(BytesIO(b64decode(url.split(',',1)[1]))).convert('RGBA')
else:
    # Render the current VATRA ribbon-mark vector into PNG variants.
    source=Image.open(BytesIO(cairosvg.svg2png(
        bytestring=svg_path.read_bytes(),output_width=1024,output_height=1024
    ))).convert('RGBA')

assert source.width==source.height, 'Icon must be square'
targets=[('logo.png',source),('vatra-icon.png',source)]
for size,name in [(180,'favicon.png'),(64,'favicon-small.png')]:
    targets.append((name,source.resize((size,size),Image.Resampling.LANCZOS)))
for name,frame in targets:
    output=Path('.')/name
    frame.save(output,optimize=True,compress_level=9)
    print(name,frame.size)
# A vector trace of the creator's horizontal PNG maintains its actual glyph
# outlines; export a PNG copy for places that require raster branding.
wordmark=Path('vatra-header.svg')
if wordmark.exists():
    output=Path('vatra-header.png')
    output.write_bytes(cairosvg.svg2png(
        bytestring=wordmark.read_bytes(),output_width=1060,output_height=184
    ))
    print(output, '1060x184')
print('VATRA: exported shared ribbon V logo for favicons, app icons and social UI')
