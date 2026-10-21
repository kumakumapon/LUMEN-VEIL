import { EQUIPMENT, grantVictory, parseProgress } from './expansion.mjs';

// Separate optional sidecar; the original v1 save and phase-3 progress never change shape.
export const LIVING_VERSION = 1;
export const QUESTS = Object.freeze({
  letter: { title:'宛名のない手紙', description:'港で消えた手紙の記憶を見つける', gold:90, xp:20 },
  lamp: { title:'青緑の灯火', description:'リッツと記憶灯を修復する', gold:120, xp:35 },
  star: { title:'星環の記録', description:'観測塔で星図の箱を発見する', gold:110, xp:25 },
});
export const SHOP = Object.freeze({
  sunsteel: { name:'夜明けの細剣', price:140, description:'ノエルの攻撃力を強化' },
  scribe: { name:'黎明の記録杖', price:150, description:'セナの攻撃力を強化' },
  mechanic: { name:'白金の工具槌', price:150, description:'リッツの攻撃力を強化' },
  ward: { name:'星灯の守り', price:120, description:'全員が装備できる防具' },
});
export function freshLiving() { return { version:LIVING_VERSION, gold:200, accepted:[], claimed:[], purchased:[] }; }
const unique=(values, allowed)=>Array.isArray(values)&&values.length<=allowed.length&&values.every(x=>typeof x==='string'&&allowed.includes(x))&&new Set(values).size===values.length;
export function parseLiving(raw) {
  if(typeof raw==='string'){if(raw.length>20000)throw Error('冒険情報が大きすぎます。');try{raw=JSON.parse(raw)}catch{throw Error('冒険情報がJSONではありません。')}}
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==LIVING_VERSION)throw Error('冒険情報の形式が不正です。');
  if(!Number.isSafeInteger(raw.gold)||raw.gold<0||raw.gold>1000000)throw Error('所持金が不正です。');
  const quests=Object.keys(QUESTS),goods=Object.keys(SHOP);
  if(!unique(raw.accepted,quests)||!unique(raw.claimed,quests)||!unique(raw.purchased,goods))throw Error('依頼・購入履歴が不正です。');
  if(raw.claimed.some(x=>!raw.accepted.includes(x)))throw Error('未受注の報酬は受け取れません。');
  return {version:LIVING_VERSION,gold:raw.gold,accepted:[...raw.accepted],claimed:[...raw.claimed],purchased:[...raw.purchased]};
}
export function questReady(id,state,progress) {
  if(!Object.hasOwn(QUESTS,id))return false;
  if(id==='letter')return state.records.includes('letter');
  if(id==='lamp')return !!state.flags.lamp;
  return progress.treasures.includes('observatory-cache');
}
export function questStatus(living,id,state,progress){
  const data=parseLiving(living);
  if(!Object.hasOwn(QUESTS,id))throw Error('存在しない依頼です。');
  return data.claimed.includes(id)?'claimed':!data.accepted.includes(id)?'available':questReady(id,state,progress)?'ready':'active';
}
export function acceptQuest(living,id){
  const data=parseLiving(living);
  if(!Object.hasOwn(QUESTS,id))throw Error('存在しない依頼です。');
  if(!data.accepted.includes(id))data.accepted.push(id);
  return data;
}
export function claimQuest(living,id,state,progress){
  const data=parseLiving(living),p=parseProgress(progress);
  if(questStatus(data,id,state,p)!=='ready')throw Error('まだ報酬を受け取れません。');
  const reward=QUESTS[id];
  data.gold=Math.min(1000000,data.gold+reward.gold);data.claimed.push(id);
  // Use the existing level progression logic, but with the quest's own XP value.
  for(const hero of ['noel','sena','ritz'])p.xp[hero]=Math.min(1000000,p.xp[hero]+reward.xp);
  return {living:data,progress:p};
}
export function buyItem(living,progress,id){
  const data=parseLiving(living),p=parseProgress(progress),item=SHOP[id];
  if(!item||!EQUIPMENT[id])throw Error('取り扱いのない商品です。');
  if(data.purchased.includes(id)||p.found.includes(id))throw Error('この装備はすでに所持しています。');
  if(data.gold<item.price)throw Error('所持金が足りません。');
  data.gold-=item.price;data.purchased.push(id);p.found.push(id);
  return {living:data,progress:parseProgress(p)};
}
// A transparent extension of enemyIntent: select an unguarded hero when possible,
// react to low HP, and use a telegraphed piercing strike on periodic turns.
export function tacticalIntent(state,progress=null){
  const b=state?.battle;
  if(!b)return null;
  const active=state.party.map((h,i)=>h.hp>0&&(state.flags.ritz||i!==2)?i:-1).filter(i=>i>=0);
  if(!active.length)return null;
  const boss=b.kind==='boss';
  const danger=boss&&b.hp<=b.maxHp*.45;
  const heavy=b.count>0&&b.count%6===0&&boss;
  const piercing=b.count>0&&b.count%4===0&&!heavy;
  const guards=new Set(b.guard||[]);
  const open=active.filter(i=>!guards.has(i));
  const candidates=open.length?open:active;
  const target=danger?candidates.reduce((best,i)=>state.party[i].hp<state.party[best].hp?i:best):candidates[Math.max(0,Math.floor(b.count/2)-1)%candidates.length];
  const scale=state.difficulty==='easy'?.7:state.difficulty==='hard'?1.35:1;
  const base=boss?(heavy?36:danger?27:22):(piercing?20:14);
  return {target,damage:Math.round(base*scale),piercing,boost:heavy,focus:danger,name:heavy?'共鳴鐘撃':piercing?'装甲貫通':danger?'忘却の追撃':'単体攻撃'};
}
