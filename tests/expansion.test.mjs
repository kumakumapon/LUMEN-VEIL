import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { newGame, interact, parseSave, snapshot, battleAction } from '../web/model.mjs';
import { freshProgress, parseProgress, equipItem, findTreasure, visit, grantVictory, levelForXp, statsFor, enemyIntent, NPC_DIALOGUES } from '../web/expansion.mjs';
import { exportAdventure } from '../web/expansion-save.mjs';

test('v1 save stays unchanged while optional exploration areas round-trip', () => {
  const original = newGame();
  const legacy = snapshot(original);
  assert.equal(JSON.parse(legacy).version, 1);
  assert.equal(JSON.parse(legacy).expansion, undefined);
  const market = interact(original, 'to-market');
  assert.equal(market.area, 'market');
  assert.equal(interact(market, 'to-harbor').area, 'harbor');
  const tower = interact(original, 'to-observatory');
  assert.equal(tower.area, 'observatory');
  assert.equal(parseSave(snapshot(tower)).area, 'observatory');
  assert.deepEqual(parseSave(legacy), original);
});

test('new gear and level growth are validated and do not mutate v1 hero schema', () => {
  let progress = freshProgress();
  assert.equal(levelForXp(0), 1);
  assert.throws(() => equipItem(progress, 'noel', 'archive'), /装備/);
  assert.throws(() => equipItem(progress, 'noel', 'skyblade'), /装備/);
  progress = findTreasure(progress, 'market-cache');
  assert.deepEqual(progress.found.filter(x => x === 'skyblade'), ['skyblade']);
  progress = findTreasure(progress, 'market-cache');
  assert.equal(progress.treasures.length, 1);
  progress = equipItem(progress, 'noel', 'skyblade');
  progress = grantVictory(progress, 'warden');
  assert.equal(statsFor(progress, 'noel').level, 2);
  assert.equal(statsFor(progress, 'noel').power, 11);
  assert.equal(parseProgress(JSON.stringify(progress)).xp.noel, 45);
  assert.throws(() => parseProgress({ ...progress, xp: { ...progress.xp, noel: -1 } }), /経験値/);
  assert.throws(() => parseProgress({ ...progress, equipment: { ...progress.equipment, noel: { weapon: 'archive', armor: 'cloth' } } }), /装備/);
});

test('equipment bonus affects battle but old command behavior remains supported', () => {
  const base = interact(interact(interact(newGame(), 'sena'), 'sign'), 'to-corridor');
  const battle = interact(base, 'ritz');
  const vanilla = battleAction(battle, 'attack');
  let progress = grantVictory(findTreasure(freshProgress(), 'market-cache'), 'warden');
  progress = equipItem(progress, 'noel', 'skyblade');
  const enhanced = battleAction(battle, 'attack', progress);
  assert.equal(vanilla.battle.hp - enhanced.battle.hp, 11);
  assert.equal(vanilla.party[0].power, enhanced.party[0].power);
  assert.equal(JSON.parse(snapshot(enhanced)).expansion, undefined);
});

test('AI chooses target deterministically and escalates below half HP', () => {
  const battle = interact(interact(interact(newGame(), 'sena'), 'sign'), 'to-corridor');
  const boss = { ...battle, phase: 'battle', battle: { kind: 'boss', hp: 90, maxHp: 270, count: 6 } };
  const a = enemyIntent(boss), b = enemyIntent(boss);
  assert.deepEqual(a, b);
  assert.equal(a.name, '共鳴鐘撃');
  assert.equal(a.focus, true);
  assert.equal(a.target, 1);
});

test('side quest NPC dialogue and optional progress export support legacy import', () => {
  const progress = visit(findTreasure(freshProgress(), 'observatory-cache'), 'observatory');
  assert.equal(NPC_DIALOGUES.observatory.scholar.length, 3);
  const saved = exportAdventure(newGame(), progress);
  assert.deepEqual(parseSave(saved), newGame());
  assert.equal(parseProgress(JSON.parse(saved).expansion).found.includes('archive'), true);
  assert.throws(() => parseProgress({ ...progress, visited: ['__proto__'] }), /訪問/);
});

test('walk mesh routes around obstacles and never exits the navigable bounds', () => {
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
    import {walkable,routeTo} from './src/navigation.ts';
    const route=routeTo('harbor',{x:.2,y:.7},{x:.89,y:.58});
    if(route.length<2||route.some(p=>!walkable('harbor',p.x,p.y)))process.exit(2);
    if(walkable('harbor',.43,.64))process.exit(3);
    console.log(route.length);
  `], { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
  assert.ok(Number(output.trim()) >= 2);
});
