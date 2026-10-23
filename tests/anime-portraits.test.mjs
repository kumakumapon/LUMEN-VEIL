import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {animePortraitForSpeaker,npcAtlasObjectPosition,NPC_ANIME_ATLAS,NPC_ANIME_FALLBACK} from '../web/anime-portraits.mjs';
import {portraitForSpeaker} from '../web/portrait-map.mjs';

test('named NPCs have three distinct anime crops',()=>{
  const names=['商人ユイ','航路士','星見のエル'];
  assert.deepEqual(names.map(n=>animePortraitForSpeaker(n)?.column),[0,1,2]);
  assert.deepEqual([0,1,2].map(npcAtlasObjectPosition),['0%','50%','100%']);
  assert.equal(animePortraitForSpeaker('ノエル'),null);
  assert.equal(animePortraitForSpeaker('知らない人'),null);
});
test('anime atlas is valid AVIF with a WebP fallback and independent SVG portraits',()=>{
  const data=readFileSync(new URL('../public/assets/'+NPC_ANIME_ATLAS,import.meta.url));
  assert.equal(data.toString('ascii',4,12),'ftypavif');
  assert.ok(data.length>3000);
  const fallback=readFileSync(new URL('../public/assets/'+NPC_ANIME_FALLBACK,import.meta.url));
  assert.equal(fallback.toString('ascii',0,4),'RIFF');
  assert.equal(fallback.toString('ascii',8,12),'WEBP');
  assert.equal(portraitForSpeaker('商人ユイ'),'portrait-merchant.svg');
  assert.equal(portraitForSpeaker('航路士'),'portrait-navigator.svg');
  assert.equal(portraitForSpeaker('星見のエル'),'portrait-scholar.svg');
});
