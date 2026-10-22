import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {portraitForSpeaker} from '../web/portrait-map.mjs';

test('each named NPC has a dedicated portrait, not the legacy fallback',()=>{
  assert.equal(portraitForSpeaker('商人ユイ'),'portrait-merchant.svg');
  assert.equal(portraitForSpeaker('航路士'),'portrait-navigator.svg');
  assert.equal(portraitForSpeaker('星見のエル'),'portrait-scholar.svg');
  assert.equal(new Set(['商人ユイ','航路士','星見のエル'].map(portraitForSpeaker)).size,3);
});
test('hero portraits and unknown speaker fallback remain compatible',()=>{
  assert.equal(portraitForSpeaker('ノエル'),'portrait-noel.webp');
  assert.equal(portraitForSpeaker('セナ'),'portrait-sena.webp');
  assert.equal(portraitForSpeaker('リッツ'),'portrait-ritz.webp');
  assert.equal(portraitForSpeaker('知らない人物'),'portrait-vald.webp');
});
test('NPC portrait assets are independent scalable illustrations',()=>{
  for(const name of ['merchant','navigator','scholar']){
    const xml=readFileSync(new URL(`../public/assets/portrait-${name}.svg`,import.meta.url),'utf8');
    assert.match(xml,/viewBox="0 0 512 640"/);
    assert.match(xml,/<svg[\s>]/);
    assert.ok(xml.length>1800);
    assert.doesNotMatch(xml,/https?:\/\//);
  }
});
