import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSave, snapshot, SAVE_VERSION } from '../web/model.mjs';

// Captured independently of the new presentation engine's state.
const LEGACY_SAVE = {
  version: 1, phase: 'explore', area: 'corridor',
  flags: { sena: true, sign: true, ritz: true, lamp: true, key: false, boss: false, escaped: false },
  records: ['letter', 'badge'],
  party: [
    { id:'noel', name:'ノエル', role:'運び屋 / 剣', maxHp:180, maxMp:48, hp:149, mp:30, power:24, art:'黎明斬' },
    { id:'sena', name:'セナ', role:'記録士 / 術', maxHp:145, maxMp:75, hp:120, mp:53, power:19, art:'雷の記述' },
    { id:'ritz', name:'リッツ', role:'整備士 / 技', maxHp:210, maxMp:42, hp:210, mp:42, power:22, art:'解体撃' },
  ],
  difficulty:'normal', resonance:64, battle:null,
  narrative:'リッツが記憶灯を修復した。'
};
test('existing v1 JSON data survives engine migration unchanged', () => {
  assert.equal(SAVE_VERSION, 1);
  const restored = parseSave(JSON.stringify(LEGACY_SAVE));
  assert.equal(restored.area, 'corridor');
  assert.deepEqual(restored.flags, LEGACY_SAVE.flags);
  assert.deepEqual(restored.records, LEGACY_SAVE.records);
  assert.deepEqual(restored.party.map(h => [h.hp,h.mp]), [[149,30],[120,53],[210,42]]);
  assert.equal(restored.resonance,64);
  const roundtrip = parseSave(snapshot(restored));
  assert.deepEqual(roundtrip, restored);
});
test('database name, store and save key remain unchanged', async () => {
  const implementation = await readFile(new URL('../web/save.mjs', import.meta.url),'utf8');
  assert.match(implementation, /const DB_NAME = 'lumen-veil-save-v1'/);
  assert.match(implementation, /const STORE = 'slots'/);
  assert.match(implementation, /const KEY = 'chapter-zero'/);
  assert.match(implementation, /const parsed = parseSave\(text\); \/\/ validate BEFORE mutating/);
});
test('v1 save rejects invalid payloads without requiring renderer fields', () => {
  assert.throws(()=>parseSave(JSON.stringify({...LEGACY_SAVE,version:2})),/対応/);
  assert.throws(()=>parseSave(JSON.stringify({...LEGACY_SAVE,party:[]})),/キャラクター/);
  const s=JSON.parse(snapshot(parseSave(JSON.stringify({...LEGACY_SAVE,animation:'walk',atb:99}))));
  assert.equal(s.atb,undefined);
  assert.equal(s.animation,undefined);
});
