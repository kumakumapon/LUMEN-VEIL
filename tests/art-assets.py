"""Validate shipped artwork dimensions, frame boundaries, alpha, and size budgets."""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'public/assets'
actors = ['noel', 'sena', 'ritz', 'merchant', 'navigator', 'scholar']
for actor in actors:
    path = assets / 'sprites' / f'{actor}.webp'
    assert path.stat().st_size < 768 * 1024, path
    image = Image.open(path).convert('RGBA')
    assert image.size == (1024, 1536), path
    for row in range(4):
        for col in range(4):
            frame = image.crop((col*256,row*384,(col+1)*256,(row+1)*384))
            bounds = frame.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
            assert bounds and 0 < bounds[0] < bounds[2] < 256, (actor,row,col,bounds)
            assert 0 < bounds[1] < bounds[3] <= 353 and bounds[3] >= 350, (actor,row,col,bounds)
    faces=[]
    for expression in ['calm','joy','worry','surprise']:
        for extension in ['webp','avif']:
            path = assets / 'expressions' / f'{actor}-{expression}.{extension}'
            assert Image.open(path).size == (384,384), path
            assert path.stat().st_size < 100*1024, path
        faces.append((assets / 'expressions' / f'{actor}-{expression}.webp').read_bytes())
    assert len(set(faces)) == 4, actor
for name in ['scene-market','scene-observatory']:
    path = assets / f'{name}.webp'
    assert Image.open(path).size == (1440,960)
    assert path.stat().st_size < 512*1024
print('PASS: six transparent 16-frame sheets, aligned feet, 24 distinct expressions, backgrounds and byte budgets')
