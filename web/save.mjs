import { parseSave, snapshot } from './model.mjs';
const DB_NAME = 'lumen-veil-save-v1';
const STORE = 'slots';
const KEY = 'chapter-zero';
function database() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(Error('IndexedDBが利用できません。')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error ?? Error('保存領域を開けませんでした。'));
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(Error('別のタブが保存領域を使用しています。'));
  });
}
async function transact(mode, action) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      let value;
      request.onsuccess = () => { value = request.result; };
      request.onerror = () => reject(request.error ?? Error('保存データへのアクセスに失敗しました。'));
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? Error('保存処理が中断されました。'));
      tx.onerror = () => reject(tx.error ?? Error('保存処理に失敗しました。'));
    });
  } finally { db.close(); }
}
export async function saveGame(state) { await transact('readwrite', store => store.put(snapshot(state), KEY)); }
export async function loadGame() {
  const data = await transact('readonly', store => store.get(KEY));
  return typeof data === 'string' ? parseSave(data) : null;
}
export async function importGame(text) {
  const parsed = parseSave(text); // validate BEFORE mutating the existing save
  await saveGame(parsed);
  return parsed;
}
export function exportGame(state) { return snapshot(state); }
