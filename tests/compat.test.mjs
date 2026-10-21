import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, parseSave, snapshot, interact, SAVE_VERSION } from '../web/model.mjs';
import { exportGame } from '../web/save.mjs';

// Frozen v1 fixture created before the renderer migration; it must remain consumable forever.
const legacy = readFileSync(new URL('./fixtures/legacy-v1.json', import.meta.url), 'utf8').trim();
test('old save v1 loads without changing area, flags, records or hero stats', () => {
  const parsed = parseSave(legacy);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.area, 'corridor');
  assert.equal(parsed.flags.sena, true);
  assert.equal(parsed.flags.sign, true);
  assert.deepEqual(parsed.records, ['letter']);
  assert.equal(parsed.party[0].hp, 180);
  assert.equal(parsed.party[0].mp, 48);
  assert.equal(parsed.phase, 'explore');
  assert.equal(parsed.battle, null);
});

test('v1 export remains version 1 and never persists rendering / ATB state', () => {
  let state = parseSave(legacy);
  const json = exportGame(state);
  const data = JSON.parse(json);
  assert.equal(data.version, SAVE_VERSION);
  assert.equal(data.area, 'corridor');
  assert.equal(data.renderer, undefined);
  assert.equal(data.atb, undefined);
  assert.deepEqual(parseSave(json).records, ['letter']);
});

test('quest and party remain playable after importing the v1 fixture', () => {
  let s = parseSave(legacy);
  s = interact(s, 'ritz');
  assert.equal(s.phase, 'battle');
  const stable = parseSave(snapshot(s));
  assert.equal(stable.phase, 'explore');
  assert.equal(stable.area, 'corridor');
  assert.equal(stable.battle, null);
  assert.equal(stable.flags.sign, true);
});

test('IndexedDB namespace remains unchanged by the renderer migration', () => {
  const src = readFileSync(new URL('../web/save.mjs', import.meta.url), 'utf8');
  assert.match(src, /const DB_NAME = 'lumen-veil-save-v1'/);
  assert.match(src, /const STORE = 'slots'/);
  assert.match(src, /const KEY = 'chapter-zero'/);
});
