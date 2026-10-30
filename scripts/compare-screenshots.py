"""Make reviewable visual diffs: python scripts/compare-screenshots.py BASELINE CURRENT OUT.

Requires Pillow. Reports changes; geometry/gameplay gates remain in e2e.py.
Moving characters and effects can differ legitimately, so changes need human review.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

before, after, output = map(Path, sys.argv[1:4])
output.mkdir(parents=True, exist_ok=True)
report=[]
for path in sorted(after.glob('*.png')):
    previous=before/path.name
    if not previous.exists():
        report.append({'name':path.name,'status':'new'})
        continue
    a,b=Image.open(previous).convert('RGB'),Image.open(path).convert('RGB')
    if a.size != b.size:
        report.append({'name':path.name,'status':'size-changed','before':a.size,'after':b.size})
        continue
    diff=ImageChops.difference(a,b)
    diff.save(output/path.name)
    report.append({'name':path.name,'status':'compared','mean_difference':sum(ImageStat.Stat(diff).mean)/3/255})
assert report, 'No screenshots to compare'
(output/'report.json').write_text(json.dumps(report,indent=2))
print(f'Compared {len(report)} captures; review {output}/report.json and diff images')
