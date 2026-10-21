import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
const base = '/LUMEN-VEIL/';
const html = await readFile('dist/index.html', 'utf8');
assert.match(html, /<title>LUMEN VEIL/);
assert.match(html, /assets\/mark\.svg/);
for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
  const url = match[1];
  assert.ok(!url.startsWith('/') || url.startsWith(base), `Absolute URL breaks Pages subpath: ${url}`);
}
await Promise.all(['assets/skyport.webp', 'assets/scene-harbor.webp', 'assets/portrait-noel.webp', 'assets/mark.svg'].map(p => stat(`dist/${p}`)));
const js = (await readdir('dist/assets')).filter(p => p.endsWith('.js'));
assert.ok(js.length > 0, 'Bundled JavaScript missing');
// All asset references loaded by Phaser are in public/assets and copied verbatim.
for (const name of ['scene-harbor', 'scene-corridor', 'scene-vault', 'scene-dock', 'portrait-sena', 'portrait-ritz']) {
  await stat(`dist/assets/${name}.webp`);
}
console.log('Pages project-base verified:', base, 'bundles:', js.length);
