import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('navigation reaches a goal, does not snap backwards, and refuses invalid targets',()=>{
  const result=execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    import {routeTo,walkable} from './src/navigation.ts';
    const start={x:.19,y:.73},goal={x:.69,y:.57};
    const path=routeTo('harbor',start,goal);
    assert.ok(path.length>0,'A normal quest target must be reachable');
    assert.ok(path.every(p=>walkable('harbor',p.x,p.y)),'Waypoints must be traversable');
    assert.ok(Math.hypot(path.at(-1).x-goal.x,path.at(-1).y-goal.y)<.001);
    const nearby=routeTo('harbor',start,{x:.191,y:.731});
    assert.ok(nearby.length>0,'A nearby click must not trigger a reset');
    const invalid=routeTo('harbor',start,{x:NaN,y:NaN});
    assert.deepEqual(invalid,[],'An invalid route must not return the start as a fake destination');
    console.log('navigation routes OK');
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.match(result,/navigation routes OK/);
});
