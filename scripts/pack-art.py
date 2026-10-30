"""Pack generated production sheets without repainting them (requires Pillow).

python scripts/pack-art.py /path/to/sources.json
Keys: backgrounds {name:path}, sprites {actor:path}, expressions [{actors:[],path:...}].
Originals are retained. Frames share one scale per actor and a common foot anchor.
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets'


def pack_sprite(source, destination):
    im = Image.open(source).convert('RGBA')
    frames = []
    for row in range(4):
        for col in range(4):
            cell = im.crop((round(col * im.width / 4), round(row * im.height / 4),
                            round((col + 1) * im.width / 4), round((row + 1) * im.height / 4)))
            # Ignore nearly transparent antialiasing when measuring the silhouette.
            bbox = cell.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
            if not bbox:
                raise ValueError(f'Empty frame {row}/{col}: {source}')
            frames.append(cell.crop(bbox))
    def foot_center(frame):
        feet = frame.getchannel('A').crop((0, max(0, frame.height - 14), frame.width, frame.height)).point(lambda a: 255 if a > 64 else 0).getbbox()
        return (feet[0] + feet[2]) / 2 if feet else frame.width / 2
    extent = max(max(foot_center(f), f.width - foot_center(f)) for f in frames)
    scale = min(112 / extent, 320 / max(f.height for f in frames))
    atlas = Image.new('RGBA', (1024, 1536))
    for i, frame in enumerate(frames):
        frame = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        # Foot center, rather than asymmetric hair/cape center, is the movement anchor.
        alpha = frame.getchannel('A')
        feet = alpha.crop((0, max(0, frame.height - 14), frame.width, frame.height)).point(lambda a: 255 if a > 64 else 0).getbbox()
        center = (feet[0] + feet[2]) / 2 if feet else frame.width / 2
        x = round(128 - center)
        if x < 0 or x + frame.width > 256:
            raise ValueError(f'Frame {i} exceeds horizontal padding: {source}')
        atlas.alpha_composite(frame, (i % 4 * 256 + x, i // 4 * 384 + 352 - frame.height))
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination, quality=86, method=6)


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    for name, source in spec.get('backgrounds', {}).items():
        im = Image.open(source).convert('RGB')
        im.thumbnail((1440, 960), Image.Resampling.LANCZOS)
        im.save(OUT / f'{name}.webp', quality=84, method=6)
    for actor, source in spec.get('sprites', {}).items():
        pack_sprite(source, OUT / 'sprites' / f'{actor}.webp')
    dest = OUT / 'expressions'
    dest.mkdir(exist_ok=True)
    for sheet in spec.get('expressions', []):
        im = Image.open(sheet['path']).convert('RGB')
        for row, actor in enumerate(sheet['actors']):
            for col, expression in enumerate(['calm', 'joy', 'worry', 'surprise']):
                face = im.crop((round(col * im.width / 4), round(row * im.height / 3),
                                round((col + 1) * im.width / 4), round((row + 1) * im.height / 3)))
                face = face.resize((384, 384), Image.Resampling.LANCZOS)
                face.save(dest / f'{actor}-{expression}.webp', quality=85, method=6)
                face.save(dest / f'{actor}-{expression}.avif', quality=67, speed=6)


if __name__ == '__main__':
    main()
