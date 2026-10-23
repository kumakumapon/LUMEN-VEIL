import test from 'node:test';
import assert from 'node:assert/strict';
import {firstSteps,dialogueMood,dialogueCue} from '../web/experience.mjs';

function state(flags={},area='harbor',phase='explore'){
  return {phase,area,flags:{sena:false,sign:false,ritz:false,...flags}};
}
test('first-minute guide follows story flags without modifying the save',()=>{
  const s=state();
  const before=JSON.stringify(s);
  assert.deepEqual([firstSteps(s).step,firstSteps(s).total],[1,3]);
  assert.match(firstSteps(s).description,/WASD/);
  assert.equal(firstSteps(state({sena:true})).step,2);
  assert.equal(firstSteps(state({sena:true,sign:true},'corridor')).step,3);
  assert.equal(firstSteps(state({sena:true,sign:true,ritz:true})),null);
  assert.equal(firstSteps(state({},'harbor','battle')),null);
  assert.equal(firstSteps(null),null);
  assert.equal(JSON.stringify(s),before);
});
test('dialogue moods are deterministic and map to distinct sound cues',()=>{
  assert.equal(dialogueMood('星見のエル','記憶は武器にも呪いにもなります。'),'tense');
  assert.equal(dialogueMood('ノエル','すべての始まりなのか？'),'curious');
  assert.equal(dialogueMood('セナ','きっと光が待っています。'),'hope');
  assert.equal(dialogueMood('商人ユイ','記録して、覚えていてください。'),'warm');
  assert.equal(dialogueMood('航路士','今日も晴れです。'),'calm');
  for(const mood of ['tense','curious','hope','warm','calm'])assert.match(dialogueCue(mood),/^dialogue-/);
});
