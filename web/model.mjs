// Pure, deterministic game state. No DOM or storage APIs here.
import { enemyIntent, statsFor } from './expansion.mjs';
export const SAVE_VERSION = 1;
export const PARTY = [
  { id: 'noel', name: 'ノエル', role: '運び屋 / 剣', maxHp: 180, maxMp: 48, power: 24, art: '黎明斬' },
  { id: 'sena', name: 'セナ', role: '記録士 / 術', maxHp: 145, maxMp: 75, power: 19, art: '雷の記述' },
  { id: 'ritz', name: 'リッツ', role: '整備士 / 技', maxHp: 210, maxMp: 42, power: 22, art: '解体撃' },
];
export const AREAS = {
  harbor: { label: '浮遊港オルテ', kicker: '空の果て、名を失う港', description: '雲海の向こうに白い塔がそびえ、壊れた環が空を横切る。届けるはずの手紙から、宛名だけが消えた。' },
  corridor: { label: '回廊の整備区画', kicker: '失われた歯車の音', description: '灯の消えた通路には、かつて使われていた記録装置と破損した空路が残されている。' },
  vault: { label: '白紙の保管庫', kicker: '鐘の音が文字を消す', description: '白金の扉の向こう、壁に刻まれた何千もの名前が音もなく薄れていく。' },
  dock: { label: '雲海の船着き場', kicker: 'それでも朝は来る', description: '飛空艇の帆が朝の光を受けている。街は消えかけているが、まだ間に合う。' },
  market: { label: '白帆の市場', kicker: '名のない品物にも歴史がある', description: '帆布の屋台と機械仕掛けの時計が並ぶ。忘れられた道具の記憶が、まだ誰かを待っている。' },
  observatory: { label: '星環の観測塔', kicker: '空の環と、消えた星座', description: '砕けた環の欠片を望む高い塔。星図の余白に、かつての旅人の名前が残されている。' },
};
export const HOTSPOTS = {
  harbor: [
    { id: 'sena', label: '銀髪の記録士', icon: '✦', caption: '記憶を記す少女に話す' },
    { id: 'sign', label: '消えた案内板', icon: '◇', caption: '記憶灯をかざして調べる' },
    { id: 'letter', label: '宛先のない手紙', icon: '✉', caption: '失われた約束の痕跡' },
    { id: 'to-corridor', label: '整備区画へ', icon: '➜', caption: '港の奥に続く通路' },
    { id: 'to-market', label: '白帆の市場', icon: '◈', caption: '道具と物語が集まる市場' },
    { id: 'to-observatory', label: '星環の観測塔', icon: '✧', caption: '失われた星図を探す' },
  ],
  corridor: [
    { id: 'ritz', label: '助けを求める声', icon: '⚔', caption: '機械兵に囲まれた整備士' },
    { id: 'lamp', label: '故障した記憶灯', icon: '✧', caption: '装置を復元する' },
    { id: 'badge', label: '古い名札', icon: '✦', caption: '寄り道の記憶を残す' },
    { id: 'key', label: '保管庫の鍵', icon: '◇', caption: '復元した灯で見つける' },
    { id: 'to-vault', label: '保管庫へ', icon: '➜', caption: '鐘の音がする扉' },
    { id: 'to-harbor', label: '港へ戻る', icon: '↶', caption: '浮遊港オルテに戻る' },
  ],
  vault: [
    { id: 'boss', label: '忘鐘 — 無名の守護機', icon: '⚔', caption: '消失を告げる機械の鐘' },
    { id: 'to-dock', label: '船着き場へ', icon: '➜', caption: '街から脱出する' },
    { id: 'to-corridor', label: '回廊へ戻る', icon: '↶', caption: '整備区画に戻る' },
  ],
  dock: [
    { id: 'escape', label: '飛空艇に乗る', icon: '✦', caption: '次の空へ旅立つ' },
    { id: 'to-vault', label: '保管庫へ戻る', icon: '↶', caption: '忘れ物を確かめる' },
  ],
  market: [
    { id: 'merchant', label: '商人ユイ', icon: '✦', caption: '忘れられた道具の話を聞く' },
    { id: 'navigator', label: '航路士', icon: '◇', caption: '空の道について話す' },
    { id: 'market-cache', label: '忘れられた装備箱', icon: '✧', caption: '装備品を手に入れる' },
    { id: 'to-harbor', label: '浮遊港へ戻る', icon: '↶', caption: '港の広場へ戻る' },
  ],
  observatory: [
    { id: 'scholar', label: '星見のエル', icon: '✦', caption: '星の記録を聞く' },
    { id: 'observatory-cache', label: '古い星図の箱', icon: '✧', caption: '装備品を見つける' },
    { id: 'to-harbor', label: '浮遊港へ戻る', icon: '↶', caption: '港の広場へ戻る' },
  ],
};
export function newGame(difficulty = 'normal') {
  return {
    version: SAVE_VERSION, phase: 'explore', area: 'harbor',
    flags: { sena: false, sign: false, ritz: false, lamp: false, key: false, boss: false, escaped: false },
    records: [], party: PARTY.map(h => ({ ...h, hp: h.maxHp, mp: h.maxMp })),
    difficulty, resonance: 0, battle: null,
    narrative: 'ノエル「……宛名が、消えている。誰に届けるはずだったんだ？」',
  };
}
export function objective(s) {
  if (!s.flags.sena) return '港にいる記録士に話しかける';
  if (!s.flags.sign) return '消えた案内板を記憶灯で調べる';
  if (!s.flags.ritz) return '回廊で整備士を救出する';
  if (!s.flags.lamp) return '整備区画で記憶灯を修復する';
  if (!s.flags.key) return '記憶灯で保管庫の鍵を見つける';
  if (!s.flags.boss) return '保管庫の守護機「忘鐘」を止める';
  if (!s.flags.escaped) return '船着き場で飛空艇に乗る';
  return '序章クリア — 次の空へ';
}
const said = (s, narrative) => ({ ...s, narrative });
const flag = (s, name, narrative) => said({ ...s, flags: { ...s.flags, [name]: true } }, narrative);
const record = (s, id, narrative) => said({ ...s, records: s.records.includes(id) ? s.records : [...s.records, id] }, narrative);
const move = (s, area, narrative) => said({ ...s, area }, narrative);
const spawn = (s, kind) => {
  const boss = kind === 'boss';
  return {
    ...s, phase: 'battle',
    battle: {
      kind, name: boss ? '忘鐘 — 無名の守護機' : '灰翼の機械兵',
      hp: boss ? 270 : 105, maxHp: boss ? 270 : 105,
      break: 100, maxBreak: 100, stagger: false, guard: [],
      count: 0, actorIndex: 0, lastAction: null,
      log: boss ? '鐘の内側で失われた名前が明滅する。次の大技を警戒せよ。' : '機械兵が回廊を塞いだ！',
    },
    narrative: boss ? '忘鐘「──名を、返せ。」' : 'リッツ「そこの人！ 手を貸して！」',
  };
};
export function interact(state, id) {
  if (state.phase !== 'explore') return state;
  const s = state;
  if (!HOTSPOTS[s.area]?.some(p => p.id === id)) return said(s, 'その場所はまだ調べられない。');
  switch (id) {
    case 'sena': return s.flags.sena ? said(s, 'セナ「記録は、覚えている誰かがいる限り消えません。」') : flag(s, 'sena', 'セナ「私はセナ。消えてしまった名前を記録しています。あなたの手紙も、調べさせてください。」');
    case 'sign': return s.flags.sena ? flag(s, 'sign', '記憶灯をかざすと、消えた文字が青く浮かびあがる。「整備区画／記憶保管庫」——進む道が見えた。') : said(s, '文字が薄れて読めない。近くの記録士なら分かるかもしれない。');
    case 'letter': return record(s, 'letter', '封筒の裏に、消えかけた筆跡があった。「夜明けを忘れないで」——誰の声だろう。');
    case 'to-corridor': return s.flags.sign ? move(s, 'corridor', '錆びついた歯車を越え、薄暗い回廊へと足を踏み入れた。') : said(s, '行き先を示す案内板が読めない。');
    case 'to-market': return move(s, 'market', '帆布の屋根が並ぶ市場へ。名前を忘れた道具たちが、静かに輝いている。');
    case 'to-observatory': return move(s, 'observatory', '星環の観測塔へ。空を横切る環の欠片が、遠い記憶を呼び起こす。');
    case 'merchant': return said(s, '商人ユイ「名前が消えても、この道具を作った手の温かさは覚えています。」');
    case 'navigator': return said(s, '航路士「観測塔には、空路を照らす古い星図が残っています。」');
    case 'scholar': return said(s, '星見のエル「砕けた環と、消えた名前。保管庫に答えが眠っているかもしれません。」');
    case 'market-cache': return said(s, '倉庫に眠る細剣と槌を発見した。装備画面で身につけられる。');
    case 'observatory-cache': return said(s, '古い星図の箱から、星詠みの杖と白金の護符を見つけた。');
    case 'ritz': return s.flags.ritz ? said(s, 'リッツ「助けてくれてありがと！ 灯の調子、一緒に見よう。」') : spawn(s, 'warden');
    case 'lamp': return s.flags.ritz ? flag(s, 'lamp', 'リッツ「ここの歯車を直せば……ほら！」記憶灯に青緑の火がともり、消えた足跡が戻ってきた。') : said(s, '細かな修理が必要だ。整備士の助けを探そう。');
    case 'badge': return record(s, 'badge', '錆びた名札には「航海士ミラ」と書かれていた。いつかその名を誰かに届けよう。');
    case 'key': return s.flags.lamp ? flag(s, 'key', '記憶灯の光が壁の隠し溝を照らした。透明だった鍵に輪郭が戻り、保管庫の錠が解ける。') : said(s, '鍵の形が曖昧で、つかむことができない。記憶灯が必要だ。');
    case 'to-vault': return s.flags.key ? move(s, 'vault', '白金の扉が開く。奥から、すべての名を消す鐘の音がした。') : said(s, '保管庫の扉は固く閉ざされている。');
    case 'boss': return s.flags.boss ? said(s, '忘鐘は沈黙し、文字の消失は止まっている。') : spawn(s, 'boss');
    case 'to-dock': return s.flags.boss ? move(s, 'dock', '鐘が止まった一瞬の静寂を背に、船着き場へ駆けた。') : said(s, '鐘の音が街を満たしている。先に守護機を止めなくては。');
    case 'to-harbor': return move(s, 'harbor', '夜明け前の港へ戻った。');
    case 'to-corridor': return move(s, 'corridor', '回廊へ戻った。');
    case 'escape': return s.flags.boss ? { ...flag(s, 'escaped', '飛空艇が白い雲海へ滑り出す。消えた名前を取り戻す旅が、ここから始まる。'), phase: 'ending' } : said(s, 'まず忘鐘を止めよう。');
    default: return s;
  }
}
export function activeHero(s) {
  if (!s.battle) return null;
  for (let i = 0; i < s.party.length; i++) {
    const ix = (s.battle.actorIndex + i) % s.party.length;
    if (s.party[ix].hp > 0 && (s.flags.ritz || ix !== 2)) return ix;
  }
  return null;
}
export function battleAction(state, command, progress = null) {
  if (state.phase !== 'battle' || !state.battle) return state;
  if (!['attack', 'arts', 'echo', 'guard'].includes(command)) return state;
  const s = structuredClone(state), b = s.battle;
  const actorId = activeHero(s);
  if (actorId === null) return s;
  const hero = s.party[actorId];
  let damage = 0, shred = 0;
  let text = `${hero.name}：`;
  if (command === 'arts') {
    if (hero.mp < 8) { b.log = 'MPが足りない。通常攻撃か防御を選ぼう。'; return s; }
    hero.mp -= 8;
    damage = actorId === 0 ? 32 : actorId === 1 ? 34 : 29;
    shred = actorId === 2 ? 44 : 34;
    text += `${hero.art}！`;
  } else if (command === 'attack') {
    damage = hero.power;
    shred = 12;
    text += '攻撃！';
  } else if (command === 'guard') {
    b.guard = [...new Set([...b.guard, actorId])];
    text += '身構えて衝撃に備える。';
  } else {
    if (s.resonance < 100 || !b.lastAction) { b.log = '残響には共鳴100と、再演できる直前の味方の技が必要だ。'; return s; }
    s.resonance -= 100;
    damage = Math.max(1, Math.floor(b.lastAction.damage * .6));
    shred = Math.floor(b.lastAction.shred * .6);
    text += `${b.lastAction.owner}の「${b.lastAction.name}」を残響で再演！`;
  }
  if (damage > 0) {
    if (progress) damage += statsFor(progress, hero.id).power;
    if (b.stagger) damage = Math.round(damage * 1.4);
    b.hp = Math.max(0, b.hp - damage);
    b.break = Math.max(0, b.break - shred);
    text += ` ${damage}ダメージ。`;
    if (command !== 'echo') {
      b.lastAction = { owner: hero.name, name: command === 'arts' ? hero.art : '攻撃', damage, shred };
      s.resonance = Math.min(100, s.resonance + (command === 'arts' ? 32 : 24));
    }
    if (b.break === 0 && !b.stagger) { b.stagger = true; text += ' BREAK！敵がひるんだ。'; }
  }
  b.count++;
  b.actorIndex = (actorId + 1) % s.party.length;
  if (b.hp === 0) {
    const isBoss = b.kind === 'boss';
    s.phase = 'explore'; s.battle = null;
    s.resonance = Math.min(100, s.resonance + 15);
    s.party = s.party.map(h => ({ ...h, hp: Math.min(h.maxHp, h.hp + 28) }));
    s.flags[isBoss ? 'boss' : 'ritz'] = true;
    s.narrative = isBoss ? '忘鐘は静止し、保管庫の文字が戻りはじめた。セナ「名前が……読める！」' : '機械兵は崩れ落ちた。リッツ「ありがとう！ この灯は私が直せるよ！」';
    return s;
  }
  // Every second player action invites an enemy action. WAIT pauses time during selection.
  if (b.count % 2 === 0) {
    if (b.stagger) {
      text += ' 敵は崩れて行動できない。';
      b.stagger = false;
      b.break = b.maxBreak;
    } else {
      const plan = enemyIntent(s);
      if (!plan) { b.log = text; return s; }
      const victim = plan.target;
      const target = s.party[victim];
      let hit = plan.damage;
      if (progress) hit = Math.max(1, hit - statsFor(progress, target.id).guard);
      if (b.guard.includes(victim)) { hit = Math.floor(hit / 2); b.guard = b.guard.filter(x => x !== victim); }
      target.hp = Math.max(0, target.hp - hit);
      text += ` 敵の戦術：${plan.name}。`;
      text += ` ${b.name}の反撃！${target.name}に${hit}ダメージ。`;
    }
  }
  b.log = text;
  if (s.party.every((h, i) => h.hp === 0 || (i === 2 && !s.flags.ritz))) {
    s.phase = 'defeat';
    s.narrative = '視界が白く染まる。──まだ、諦められない。';
  }
  return s;
}
export function retryBattle(state) {
  if (state.phase !== 'defeat' || !state.battle) return state;
  const s = structuredClone(state), kind = s.battle.kind;
  s.party = PARTY.map((h, i) => ({ ...h, hp: h.maxHp, mp: h.maxMp }));
  return spawn({ ...s, battle: null, resonance: 0 }, kind);
}
// A strict, allowlisted save validator. Reject corrupted data and unknown versions.
export function parseSave(input) {
  if (typeof input !== 'string' || input.length > 200_000) throw Error('セーブデータが大きすぎます。');
  let raw;
  try { raw = JSON.parse(input); } catch { throw Error('JSONを読み取れません。'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== SAVE_VERSION) throw Error('対応していないセーブ形式です。');
  if (!['explore', 'ending'].includes(raw.phase) || !Object.hasOwn(AREAS, raw.area)) throw Error('進行状態が不正です。');
  if (!['easy', 'normal', 'hard'].includes(raw.difficulty) || !Number.isInteger(raw.resonance) || raw.resonance < 0 || raw.resonance > 100) throw Error('設定値が不正です。');
  const keys = ['sena', 'sign', 'ritz', 'lamp', 'key', 'boss', 'escaped'];
  if (!raw.flags || keys.some(key => typeof raw.flags[key] !== 'boolean')) throw Error('イベント情報が不正です。');
  if (!Array.isArray(raw.party) || raw.party.length !== PARTY.length || raw.party.some((h, i) => h.id !== PARTY[i].id || !Number.isInteger(h.hp) || h.hp < 0 || h.hp > PARTY[i].maxHp || !Number.isInteger(h.mp) || h.mp < 0 || h.mp > PARTY[i].maxMp)) throw Error('キャラクター情報が不正です。');
  if (!Array.isArray(raw.records) || raw.records.some(x => !['letter', 'badge'].includes(x))) throw Error('記録が不正です。');
  if (typeof raw.narrative !== 'string' || raw.narrative.length > 2000) throw Error('文章データが不正です。');
  // Save includes only known fields, so unknown object keys are never trusted.
  return {
    ...newGame(raw.difficulty), phase: raw.phase, area: raw.area,
    flags: Object.fromEntries(keys.map(k => [k, raw.flags[k]])),
    records: [...new Set(raw.records)],
    party: PARTY.map((h, i) => ({ ...h, hp: raw.party[i].hp, mp: raw.party[i].mp })),
    resonance: raw.resonance, narrative: raw.narrative,
  };
}
export function snapshot(state) {
  const safe = { ...state, battle: null, phase: state.phase === 'battle' || state.phase === 'defeat' ? 'explore' : state.phase };
  return JSON.stringify(safe);
}
