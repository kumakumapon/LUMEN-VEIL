import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, interact, parseSave, snapshot, battleAction } from '../web/model.mjs';
import { freshProgress, equipItem } from '../web/expansion.mjs';
import { freshLiving, parseLiving, acceptQuest, claimQuest, questStatus, buyItem, tacticalIntent } from '../web/living.mjs';
import { exportAdventure } from '../web/expansion-save.mjs';

test('quest lifecycle: accept, fulfill, claim once, and persist',()=>{
  const initial=newGame(),p=freshProgress();
  let living=acceptQuest(freshLiving(),'letter');
  assert.equal(questStatus(living,'letter',initial,p),'active');
  const letter=interact(initial,'letter');
  assert.equal(questStatus(living,'letter',letter,p),'ready');
  const result=claimQuest(living,'letter',letter,p);
  assert.equal(result.living.gold,290);
  assert.equal(result.progress.xp.noel,20);
  assert.equal(questStatus(result.living,'letter',letter,result.progress),'claimed');
  assert.throws(()=>claimQuest(result.living,'letter',letter,result.progress),/報酬/);
  assert.deepEqual(parseLiving(JSON.stringify(result.living)),result.living);
});

test('shop enforces funds, ownership, equipment compatibility, and saves old v1 state',()=>{
  const before=snapshot(newGame());
  const first=buyItem(freshLiving(),freshProgress(),'sunsteel');
  assert.equal(first.living.gold,60);
  assert.ok(first.progress.found.includes('sunsteel'));
  assert.equal(equipItem(first.progress,'noel','sunsteel').equipment.noel.weapon,'sunsteel');
  assert.throws(()=>buyItem(first.living,first.progress,'sunsteel'),/すでに/);
  assert.throws(()=>buyItem(first.living,first.progress,'scribe'),/所持金/);
  assert.deepEqual(parseSave(exportAdventure(newGame(),first.progress,first.living)),newGame());
  assert.equal(snapshot(newGame()),before);
});

test('tampered sidecar and purchases are rejected without changing original v1 data',()=>{
  const living=freshLiving();
  assert.throws(()=>parseLiving({...living,gold:-1}),/所持金/);
  assert.throws(()=>parseLiving({...living,claimed:['letter']}),/未受注/);
  assert.throws(()=>parseLiving({...living,purchased:['__proto__']}),/購入/);
  assert.throws(()=>acceptQuest(living,'__proto__'),/存在しない/);
  assert.equal(JSON.parse(snapshot(newGame())).version,1);
});

test('enemy tactical choices respond to guarded heroes and phases',()=>{
  let s=interact(interact(interact(newGame(),'sena'),'sign'),'to-corridor');
  s=interact(s,'ritz');
  const unguarded=tacticalIntent(s);
  s={...s,battle:{...s.battle,count:4,guard:[0]}};
  const pierced=tacticalIntent(s);
  assert.notEqual(pierced.target,0);
  assert.equal(pierced.piercing,true);
  assert.equal(pierced.name,'装甲貫通');
  assert.ok(pierced.damage>unguarded.damage);
  assert.deepEqual(tacticalIntent(s),pierced);
  const after=battleAction(s,'attack');
  assert.equal(after.battle.count,5);
});

test('tile data covers all six areas with collision-aware walkable cells',()=>{
  // Node 22 native TS type stripping, no Phaser or DOM required.
  return import('node:child_process').then(({execFileSync})=>{
    const result=execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`
      import {createTiles,tileAt,TILE_COLUMNS,TILE_ROWS} from './src/tilemaps.ts';
      for(const a of ['harbor','corridor','vault','dock','market','observatory']){
        const tiles=createTiles(a);
        if(tiles.length!==TILE_COLUMNS*TILE_ROWS||!tiles.some(t=>t.blocked))process.exit(2);
      }
      if(!tileAt('harbor',.43,.64).blocked)process.exit(3);
      console.log('tile grid OK');
    `],{cwd:new URL('..',import.meta.url),encoding:'utf8',stdio:['ignore','pipe','ignore']});
    assert.match(result,/tile grid OK/);
  });
});
