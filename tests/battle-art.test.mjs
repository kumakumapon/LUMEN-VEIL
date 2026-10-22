import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('battle artwork preserves aspect ratio and fits desktop, mobile, and short viewports', () => {
  const result = execFileSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    import {fitArtwork,battleArtLayout} from './src/battle-art.ts';
    for(const [w,h] of [[1440,420],[960,420],[390,380],[320,220],[844,260]]){
      const layout=battleArtLayout(w,h);
      for(const [index,slot] of [layout.enemy,...layout.heroes].entries()){
        const source=index===0?[512,614]:[427,640];
        const size=fitArtwork(...source,slot.maxWidth,slot.maxHeight);
        assert.ok(Math.abs(size.width/size.height-source[0]/source[1])<1e-9);
        assert.ok(slot.x-size.width/2>=0 && slot.x+size.width/2<=w);
        assert.ok(slot.y-size.height>=0 && slot.y<=h);
      }
    }
    for(const n of [0,-1,NaN,Infinity])assert.throws(()=>fitArtwork(n,640,120,200),RangeError);
    console.log('battle art layout OK');
  `], {cwd:new URL('..',import.meta.url),encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.match(result,/battle art layout OK/);
});
