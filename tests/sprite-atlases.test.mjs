import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ACTORS=['noel','sena','ritz','merchant','navigator','scholar'];
const DIRECTIONS=['down','up','left','right'];

test('all six editable HD-2D atlases contain 4 directions and 4 gait frames',()=>{
  for(const actor of ACTORS){
    const svg=readFileSync(new URL(`../public/assets/sprites/${actor}.svg`,import.meta.url),'utf8');
    assert.match(svg,/<svg\s/);
    assert.match(svg,/width="1024" height="1536" viewBox="0 0 1024 1536"/);
    const positions=[...svg.matchAll(/<g transform="translate\((\d+) (\d+)\)">/g)]
      .map(match=>[Number(match[1]),Number(match[2])]);
    assert.equal(positions.length,16,`${actor}: missing frames`);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      assert.deepEqual(positions[row*4+col],[col*256,row*384],`${actor} ${DIRECTIONS[row]} frame ${col}`);
    }
    assert.doesNotMatch(svg,/<image\s/i,'Atlas should be standalone vector artwork');
    assert.ok(svg.length>15000,`${actor}: unexpected empty sheet`);
  }
});
test('Phaser uses static atlas frames, and retains procedural fallback',()=>{
  const world=readFileSync(new URL('../src/world.ts',import.meta.url),'utf8');
  assert.match(world,/this\.load\.svg\('atlas-'\+id/);
  assert.match(world,/texture\.add\(dir\+'-'\+col,0,col\*256,row\*384,256,384\)/);
  assert.match(world,/if\(this\.loadedAtlases\.has\(id\)\)continue/);
  assert.match(world,/fieldTextureKey\(id,dir,frame\)/);
});
