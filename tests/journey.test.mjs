import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,interact,battleAction} from '../web/model.mjs';
import {freshLiving,parseLiving} from '../web/living.mjs';
import {parseMemories} from '../web/story.mjs';
const fight=()=>['sena','sign','to-corridor','ritz'].reduce((s,id)=>interact(s,id),newGame());
test('old sidecars migrate and new restored memories and ending choice roundtrip',()=>{
 const old=freshLiving();delete old.memory;
 assert.deepEqual(parseLiving(old).memory,{restored:[],choice:null});
 const value=freshLiving();value.memory={restored:['street','mira'],choice:'letter'};
 assert.deepEqual(parseLiving(JSON.parse(JSON.stringify(value))),value);
 assert.throws(()=>parseMemories({restored:['mira','mira'],choice:null}));
 assert.throws(()=>parseMemories({restored:[],choice:'unknown'}));
});
test('enemy intent stays fixed through player action and cover protects its target',()=>{
 let s=fight();const intent=structuredClone(s.battle.intent);
 s=battleAction(s,'guard');assert.deepEqual(s.battle.intent,intent);
 const hp=s.party.map(p=>p.hp);s=battleAction(s,'attack');
 assert.ok(s.party[0].hp<hp[0]);assert.equal(s.party[1].hp,hp[1]);
 assert.equal(hp[0]-s.party[0].hp,Math.floor(intent.damage/2));
});
test('echo is an extra action without advancing enemy cadence or regenerating resonance',()=>{
 let s=fight();s=battleAction(s,'attack');s.resonance=100;
 const turn=s.battle.actorIndex,count=s.battle.count;
 s=battleAction(s,'echo');assert.equal(s.battle.actorIndex,turn);assert.equal(s.battle.count,count);assert.equal(s.resonance,0);
});
