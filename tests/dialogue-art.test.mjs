import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitCandidates,setDialoguePortrait} from '../web/dialogue-art.mjs';

test('dialogue expresses each mood and retains original portraits as fallbacks',()=>{
  for(const [mood,face] of Object.entries({calm:'calm',warm:'joy',hope:'joy',tense:'worry',curious:'surprise'})){
    const list=portraitCandidates('商人ユイ',mood);
    assert.equal(list[0].file,`expressions/merchant-${face}.avif`);
    assert.equal(list[1].file,`expressions/merchant-${face}.webp`);
    assert.ok(list.some(item=>item.file==='portrait-merchant.svg'));
    assert.equal(list.at(-1).file,'portrait-vald.webp');
  }
  assert.equal(portraitCandidates('不明','calm')[0].file,'portrait-vald.webp');
});

test('failed requests exhaust a finite fallback chain and new lines reset it',()=>{
  const image={dataset:{},style:{},hidden:false};
  setDialoguePortrait(image,'商人ユイ','tense','/LUMEN-VEIL/');
  assert.equal(image.dataset.expression,'worry');
  image.onerror();
  assert.ok(image.src.endsWith('merchant-worry.webp'));
  let attempts=1;
  while(image.onerror){image.onerror();assert.ok(++attempts<10);}
  assert.equal(image.hidden,true);
  setDialoguePortrait(image,'ノエル','warm','/LUMEN-VEIL/');
  assert.equal(image.hidden,false);
  assert.equal(image.dataset.expression,'joy');
});
