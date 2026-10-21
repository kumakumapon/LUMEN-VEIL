import { freshLiving, parseLiving } from './living.mjs';
const DB_NAME='lumen-veil-save-v1', STORE='slots', KEY='chapter-zero-living';
async function database(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
    req.onerror=()=>reject(req.error||Error('保存領域を開けませんでした。'));
    req.onblocked=()=>reject(Error('保存領域を使用中です。'));
    req.onsuccess=()=>resolve(req.result);
  });
}
export async function loadLiving(){
  const db=await database();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY);
    req.onsuccess=()=>{try{resolve(req.result===undefined?freshLiving():parseLiving(req.result));}catch(e){reject(e);}};
    req.onerror=()=>reject(req.error||Error('冒険情報を読み込めません。'));
  });}finally{db.close();}
}
export async function saveLiving(value){
  const text=JSON.stringify(parseLiving(value)),db=await database();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(text,KEY);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('冒険情報を保存できません。'));
    tx.onabort=()=>reject(tx.error||Error('冒険情報の保存が中断されました。'));
  });}finally{db.close();}
}
