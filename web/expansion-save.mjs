import { parseSave, snapshot } from './model.mjs';
import { freshProgress, parseProgress } from './expansion.mjs';
// The existing IndexedDB database and store are unchanged; only a second key is added.
const DB_NAME = 'lumen-veil-save-v1', STORE = 'slots';
const SAVE_KEY = 'chapter-zero', EXPANSION_KEY = 'chapter-zero-expansion';
async function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(Error('IndexedDBが利用できません。')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onerror = () => reject(request.error ?? Error('保存領域を開けませんでした。'));
    request.onblocked = () => reject(Error('別のタブが保存領域を使用しています。'));
    request.onsuccess = () => resolve(request.result);
  });
}
async function transact(mode, fn) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      try { fn(tx.objectStore(STORE), resolve, reject); } catch (e) { tx.abort(); reject(e); }
      tx.onerror = () => reject(tx.error ?? Error('保存に失敗しました。'));
      tx.onabort = () => reject(tx.error ?? Error('保存が中断されました。'));
    });
  } finally { db.close(); }
}
export async function saveProgress(progress) {
  const safe = JSON.stringify(parseProgress(progress));
  return transact('readwrite', (store, resolve) => { store.put(safe, EXPANSION_KEY); store.transaction.oncomplete = () => resolve(); });
}
export async function loadProgress() {
  return transact('readonly', (store, resolve, reject) => {
    const request = store.get(EXPANSION_KEY);
    request.onsuccess = () => { try { resolve(request.result === undefined ? freshProgress() : parseProgress(request.result)); } catch (e) { reject(e); } };
    request.onerror = () => reject(request.error ?? Error('育成データを読めません。'));
  });
}
export function exportAdventure(state, progress) {
  return JSON.stringify({ ...JSON.parse(snapshot(state)), expansion: parseProgress(progress) });
}
export async function importAdventure(text) {
  if (typeof text !== 'string' || text.length > 200000) throw Error('ファイルが大きすぎます。');
  // Validate both components before starting the write transaction.
  const state = parseSave(text), raw = JSON.parse(text);
  const progress = raw.expansion === undefined ? freshProgress() : parseProgress(raw.expansion);
  await transact('readwrite', (store, resolve) => {
    store.put(snapshot(state), SAVE_KEY);
    store.put(JSON.stringify(progress), EXPANSION_KEY);
    store.transaction.oncomplete = () => resolve();
  });
  return { state, progress };
}
