import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('score respects mute and hidden tabs without scheduling more oscillators',()=>{
  const result=execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    const document=globalThis.document=new EventTarget(); document.hidden=false;
    const window=globalThis.window=new EventTarget(); window.setInterval=()=>1;
    let context,notes=0;
    const parameter={setValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}};
    class Audio {
      state='suspended'; currentTime=0; destination={};
      constructor(){context=this;}
      createGain(){return {gain:parameter,connect(){return this;}};}
      createOscillator(){notes++;return {frequency:parameter,connect(){return this;},start(){},stop(){}};}
      async resume(){this.state='running';} async suspend(){this.state='suspended';}
    }
    window.AudioContext=Audio;
    const {OriginalScore}=await import('./src/sound.ts');
    const score=new OriginalScore(); score.setSettings({volume:0});
    document.dispatchEvent(new Event('pointerdown')); await Promise.resolve();
    assert.equal(context,undefined);
    score.setSettings({volume:.3}); document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve(); await Promise.resolve();
    score.effect('area-market'); assert.ok(notes>0);
    const previous=notes;
    score.setSettings({volume:0}); score.effect('attack');
    assert.equal(context.state,'suspended'); assert.equal(notes,previous);
    score.setSettings({volume:.3}); await Promise.resolve();
    document.hidden=true; document.dispatchEvent(new Event('visibilitychange'));
    score.effect('attack'); assert.equal(context.state,'suspended'); assert.equal(notes,previous);
    console.log('audio lifecycle OK');
  `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.match(result,/audio lifecycle OK/);
});
