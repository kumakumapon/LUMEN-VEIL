// Optional Phase 3 state is stored separately from the immutable v1 save envelope.
export const PROGRESS_VERSION = 1;
export const HERO_IDS = ['noel', 'sena', 'ritz'];
export const EQUIPMENT = Object.freeze({
  traveler: { name: '旅人の剣', slot: 'weapon', power: 0, guard: 0, owners: ['noel'] },
  skyblade: { name: '空路の細剣', slot: 'weapon', power: 8, guard: 0, owners: ['noel'] },
  quill: { name: '記録の杖', slot: 'weapon', power: 0, guard: 0, owners: ['sena'] },
  archive: { name: '星詠みの杖', slot: 'weapon', power: 7, guard: 0, owners: ['sena'] },
  wrench: { name: '整備の槌', slot: 'weapon', power: 0, guard: 0, owners: ['ritz'] },
  gearhammer: { name: '共鳴の槌', slot: 'weapon', power: 7, guard: 0, owners: ['ritz'] },
  cloth: { name: '旅装', slot: 'armor', power: 0, guard: 0, owners: HERO_IDS },
  aegis: { name: '白金の護符', slot: 'armor', power: 0, guard: 5, owners: HERO_IDS },
});
const AREA_IDS = ['harbor', 'corridor', 'vault', 'dock', 'market', 'observatory'];
const TREASURES = { 'market-cache': ['skyblade', 'gearhammer'], 'observatory-cache': ['archive', 'aegis'] };
export function freshProgress() {
  return { version: PROGRESS_VERSION, xp: { noel: 0, sena: 0, ritz: 0 },
    equipment: { noel: { weapon: 'traveler', armor: 'cloth' }, sena: { weapon: 'quill', armor: 'cloth' }, ritz: { weapon: 'wrench', armor: 'cloth' } },
    found: ['traveler', 'quill', 'wrench', 'cloth'], visited: [], treasures: [] };
}
const stringSet = (values, allowed, max) => Array.isArray(values) && values.length <= max &&
  values.every(x => typeof x === 'string' && allowed.includes(x)) && new Set(values).size === values.length;
export function parseProgress(raw) {
  if (typeof raw === 'string') {
    if (raw.length > 50000) throw Error('育成データが大きすぎます。');
    try { raw = JSON.parse(raw); } catch { throw Error('育成データがJSONではありません。'); }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== PROGRESS_VERSION) throw Error('対応していない育成データです。');
  const ids = Object.keys(EQUIPMENT);
  if (!stringSet(raw.found, ids, ids.length)) throw Error('所持品が不正です。');
  if (!stringSet(raw.visited, AREA_IDS, AREA_IDS.length)) throw Error('訪問履歴が不正です。');
  if (!stringSet(raw.treasures, Object.keys(TREASURES), Object.keys(TREASURES).length)) throw Error('宝箱情報が不正です。');
  const xp = {}, equipment = {};
  for (const id of HERO_IDS) {
    const value = raw.xp?.[id], slots = raw.equipment?.[id];
    if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) throw Error('経験値が不正です。');
    if (!slots || typeof slots !== 'object') throw Error('装備データが不正です。');
    for (const slot of ['weapon', 'armor']) {
      const item = EQUIPMENT[slots[slot]];
      if (!item || item.slot !== slot || !item.owners.includes(id) || !raw.found.includes(slots[slot])) throw Error('装備品が不正です。');
    }
    xp[id] = value; equipment[id] = { weapon: slots.weapon, armor: slots.armor };
  }
  return { version: PROGRESS_VERSION, xp, equipment, found: [...raw.found], visited: [...raw.visited], treasures: [...raw.treasures] };
}
export const levelForXp = xp => xp >= 230 ? 4 : xp >= 120 ? 3 : xp >= 45 ? 2 : 1;
export function statsFor(progress, heroId) {
  const p = parseProgress(progress), slots = p.equipment[heroId];
  if (!slots) return { level: 1, power: 0, guard: 0 };
  const level = levelForXp(p.xp[heroId]);
  return { level, power: (level - 1) * 3 + EQUIPMENT[slots.weapon].power, guard: (level - 1) * 2 + EQUIPMENT[slots.armor].guard };
}
export function equipItem(progress, heroId, itemId) {
  const p = parseProgress(progress), item = EQUIPMENT[itemId];
  if (!HERO_IDS.includes(heroId) || !item || !item.owners.includes(heroId) || !p.found.includes(itemId)) throw Error('装備できないアイテムです。');
  p.equipment[heroId][item.slot] = itemId;
  return p;
}
export function visit(progress, area) {
  const p = parseProgress(progress);
  if (AREA_IDS.includes(area) && !p.visited.includes(area)) p.visited.push(area);
  return p;
}
export function findTreasure(progress, id) {
  const p = parseProgress(progress);
  if (!Object.hasOwn(TREASURES, id) || p.treasures.includes(id)) return p;
  p.treasures.push(id);
  for (const item of TREASURES[id]) if (!p.found.includes(item)) p.found.push(item);
  return p;
}
export function grantVictory(progress, kind) {
  const p = parseProgress(progress), reward = kind === 'boss' ? 85 : kind === 'warden' ? 45 : 20;
  for (const id of HERO_IDS) p.xp[id] = Math.min(1000000, p.xp[id] + reward);
  return p;
}
// Telegraphs and targeting are deterministic, so tests and retry produce the same encounter.
export function enemyIntent(state) {
  const b = state?.battle;
  if (!b) return null;
  const alive = state.party.map((h, i) => h.hp > 0 && (state.flags.ritz || i !== 2) ? i : -1).filter(i => i >= 0);
  if (!alive.length) return null;
  const boss = b.kind === 'boss', boost = boss && b.count % 6 === 0 && b.count > 0;
  const focus = boss && b.hp <= b.maxHp / 2;
  const target = focus ? alive.reduce((a, c) => state.party[c].hp < state.party[a].hp ? c : a) : alive[Math.max(0, Math.floor(b.count / 2) - 1) % alive.length];
  const scale = state.difficulty === 'easy' ? .7 : state.difficulty === 'hard' ? 1.35 : 1;
  return { target, damage: Math.round((boss ? boost ? 36 : focus ? 27 : 22 : 14) * scale),
    name: boost ? '共鳴鐘撃' : focus ? '忘却の追撃' : '単体攻撃', boost, focus };
}
export const NPC_DIALOGUES = Object.freeze({
  market: {
    merchant: [
      { speaker: '商人ユイ', line: 'この港の物は名前を失っても、手触りだけは残るんです。' },
      { speaker: 'ノエル', line: '失われた名前を、取り戻す旅をしている。' },
      { speaker: '商人ユイ', line: 'なら倉庫の装備を使ってください。記録して、忘れないで。' }],
    navigator: [
      { speaker: '航路士', line: '観測塔の古い記録が、消えた航路を照らしてくれるはず。' },
      { speaker: 'セナ', line: '星の並びを覚えている人が、まだいたんですね。' }],
  },
  observatory: {
    scholar: [
      { speaker: '星見のエル', line: '空の環が欠けた日、最初の名前が消えました。' },
      { speaker: 'ノエル', line: 'あの輪が、すべての始まりなのか？' },
      { speaker: '星見のエル', line: '答えは保管庫に。ただし、記憶は武器にも呪いにもなります。' }],
  },
});
