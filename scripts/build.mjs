import { cp, mkdir, rm, stat, readFile } from 'node:fs/promises';
const source = new URL('../web/', import.meta.url);
const target = new URL('../dist/', import.meta.url);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
for (const path of ['index.html', 'app.mjs', 'model.mjs', 'save.mjs', 'styles.css', 'assets/skyport.svg', 'assets/skyport.webp', 'assets/forgotten-bell.webp']) {
  await stat(new URL(path, target));
}
const html = await readFile(new URL('index.html', target), 'utf8');
if (/(?:src|href)=[\"']\/(?:assets|styles\.css|app\.mjs)/.test(html)) {
  throw Error('Absolute asset URL found; Pages project paths must remain relative');
}
console.log('Built dist/ (static relative paths, GitHub Pages ready).');
