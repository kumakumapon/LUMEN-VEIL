import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, interact, battleAction, objective, activeHero, retryBattle, parseSave, snapshot } from '../web/model.mjs';
function advance(s, ids) { return ids.reduce((x, id) => interact(x, id), s); }
function win(s, useEcho = false) {
  let turns = 0;
  while (s.phase === 'battle' && turns++ < 100) {
    let cmd = s.party[activeHero(s)].mp>=8?'arts':'attack';
    if (useEcho && s.resonance === 100 && s.battle.lastAction) cmd = 'echo';
    s = battleAction(s, cmd);
  }
  assert.ok(turns < 100, 'battle should terminate');
  assert.equal(s.phase, 'explore');
  return s;
}
test('chapter-zero walkthrough from harbor to ending', () => {
  let s = newGame();
  assert.equal(s.area, 'harbor');
  assert.match(objective(s), /記録士/);
  assert.equal(interact(s, 'to-corridor').area, 'harbor');
  s = advance(s, ['letter', 'sena', 'sign', 'to-corridor']);
  assert.equal(s.area, 'corridor');
  s = interact(s, 'ritz'); assert.equal(s.phase, 'battle');
  s = win(s, true); assert.equal(s.flags.ritz, true);
  s = advance(s, ['badge', 'lamp', 'key', 'to-vault']); assert.equal(s.area, 'vault');
  s = interact(s, 'boss'); assert.equal(s.phase, 'battle');
  s = win(s, true); assert.equal(s.flags.boss, true);
  s = advance(s, ['to-dock', 'escape']);
  assert.equal(s.phase, 'ending'); assert.equal(s.flags.escaped, true);
  assert.deepEqual(s.records, ['letter', 'badge']);
});
test('lamp is gated by Ritz; vault by key', () => {
  const s = advance(newGame(), ['sena', 'sign', 'to-corridor']);
  assert.equal(interact(s, 'lamp').flags.lamp, false);
  assert.equal(interact(s, 'key').flags.key, false);
  assert.equal(interact(s, 'to-vault').area, 'corridor');
});
test('resonance repeats latest ally damage at 60 percent and never refunds itself', () => {
  let s = advance(newGame(), ['sena', 'sign', 'to-corridor', 'ritz']);
  s = win(s);
  s = advance(s, ['lamp', 'key', 'to-vault', 'boss']);
  s.resonance = 0;
  s = battleAction(s, 'arts');
  assert.equal(s.resonance, 32);
  s = battleAction(s, 'arts');
  assert.equal(s.resonance, 64);
  s = battleAction(s, 'arts');
  assert.equal(s.resonance, 96);
  s = battleAction(s, 'attack');
  assert.equal(s.resonance, 100);
  const expected = Math.floor(s.battle.lastAction.damage * .6);
  const hp = s.battle.hp;
  s = battleAction(s, 'echo');
  assert.equal(s.resonance, 0);
  assert.equal(s.battle.hp, hp - expected);
});
test('unsupported commands and echo without fuel have no gameplay side effects', () => {
  let s = advance(newGame(), ['sena', 'sign', 'to-corridor', 'ritz']);
  const before = JSON.stringify(s);
  s = battleAction(s, 'echo');
  assert.equal(s.battle.count, 0);
  assert.equal(s.battle.hp, 140);
  assert.match(s.battle.log, /残響/);
  assert.deepEqual(battleAction(s, 'deleteEverything'), s);
  assert.notEqual(JSON.stringify(s), before);
});
test('defeat and retry restores both active heroes', () => {
  let s = advance(newGame('hard'), ['sena', 'sign', 'to-corridor', 'ritz']);
  let n = 0;
  while (s.phase === 'battle' && n++ < 100) s = battleAction(s, 'guard');
  assert.equal(s.phase, 'defeat');
  const t = retryBattle(s);
  assert.equal(t.phase, 'battle');
  assert.equal(activeHero(t), 0);
  assert.equal(t.party[0].hp, 180);
  assert.equal(t.party[1].hp, 145);
});
test('save snapshot is stable in a battle and valid for import', () => {
  let s = advance(newGame(), ['sena', 'sign', 'to-corridor', 'ritz']);
  assert.equal(s.phase, 'battle');
  const saved = snapshot(s);
  const load = parseSave(saved);
  assert.equal(load.phase, 'explore');
  assert.equal(load.area, 'corridor');
  assert.equal(load.flags.ritz, false);
  assert.equal(load.battle, null);
});
test('corrupted and unknown-version saves are rejected, allowlist strips extra fields', () => {
  const good = JSON.parse(snapshot(newGame()));
  assert.throws(() => parseSave('{broken json}'), /JSON/);
  assert.throws(() => parseSave(JSON.stringify({ ...good, version: 9 })), /対応/);
  assert.throws(() => parseSave(JSON.stringify({ ...good, area: '../../etc' })), /進行/);
  assert.throws(() => parseSave(JSON.stringify({ ...good, party: [{ id: 'noel', hp: 9999, mp: 1 }] })), /キャラクター/);
  assert.throws(() => parseSave('x'.repeat(200_001)), /大きすぎ/);
  const parsed = parseSave(JSON.stringify({ ...good, admin: true }));
  assert.equal(parsed.admin, undefined);
});
