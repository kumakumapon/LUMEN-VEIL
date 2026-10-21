import { AREAS, HOTSPOTS, PARTY, objective, newGame, interact, activeHero, battleAction, retryBattle } from './model.mjs';
import { saveGame, loadGame, importGame, exportGame } from './save.mjs';
import { WorldStage } from './game/stage';
import { ActiveTimeGauge } from './game/atb';
import { LumenAudio } from './game/music';
import faceNoel from './assets/portrait-noel.webp?url';
import faceSena from './assets/portrait-sena.webp?url';
import faceRitz from './assets/portrait-ritz.webp?url';
const $ = id => document.getElementById(id);
let state = null;
let saved = false;
let saveQueue = Promise.resolve();
let settings = { volume: .28, reduceMotion: false, fontScale: 1, difficulty: 'normal' };
try {
  const raw = JSON.parse(localStorage.getItem('lumen-veil-settings') || '{}');
  if (typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1) settings.volume = raw.volume;
  if (typeof raw.reduceMotion === 'boolean') settings.reduceMotion = raw.reduceMotion;
  if (typeof raw.fontScale === 'number' && raw.fontScale >= 1 && raw.fontScale <= 1.2) settings.fontScale = raw.fontScale;
  if (['easy', 'normal', 'hard'].includes(raw.difficulty)) settings.difficulty = raw.difficulty;
} catch { /* Settings may be unavailable in restricted browsing contexts. */ }
const soundtrack = new LumenAudio();
let world = null;
let atb = null;
function beep(high = false) {
  soundtrack.unlock();
  soundtrack.sound(high ? 'arts' : 'select');
}
function soundAction(kind) {
  soundtrack.unlock();
  soundtrack.sound(kind);
}
document.addEventListener('visibilitychange', () => soundtrack.visibility(document.hidden));
function notice(message, isError = false) {
  const out = $('notice'); out.textContent = message; out.style.color = isError ? '#ffb7a8' : '';
}
function persistSettings() {
  try { localStorage.setItem('lumen-veil-settings', JSON.stringify(settings)); } catch { /* optional */ }
  document.documentElement.style.setProperty('--text-scale', String(settings.fontScale));
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  if (state) state.difficulty = settings.difficulty;
  soundtrack.setVolume(settings.volume);
  if (state) world?.sync(state, settings.reduceMotion);
}
async function checkpoint() {
  if (!state) return;
  const current = state;
  try {
    saveQueue = saveQueue.catch(() => {}).then(() => saveGame(current));
    await saveQueue; saved = true; notice('記憶を保存しました。');
  }
  catch (e) { notice(`保存できません：${e?.message || '不明なエラー'}`, true); }
  renderButtons();
}
function renderButtons() {
  $('btn-save').disabled = !state;
  $('btn-journal').disabled = !state;
  $('btn-load').disabled = !saved;
  $('btn-title-continue').disabled = !saved;
}
function switchScreen(view) {
  $('title-screen').hidden = view !== 'title';
  $('game-screen').hidden = !['explore', 'battle', 'defeat'].includes(view);
  $('ending-screen').hidden = view !== 'ending';
}
function text(id, value) { $(id).textContent = value; }
function syncWorld() {
  if (!world || !state || state.phase === 'ending') return;
  world.sync(state, settings.reduceMotion);
}
function beginAtb() {
  if (state?.phase === 'battle') atb?.charge(activeHero(state) ?? 0);
  else atb?.stop();
}
function commandAvailability(ready) {
  if (!state || state.phase !== 'battle' || !state.battle) return;
  const heroId = activeHero(state);
  const available = heroId !== null && ready;
  document.querySelectorAll('[data-command]').forEach(button => {
    const key = button.dataset.command;
    const invalid = key === 'echo' && (state.resonance < 100 || !state.battle.lastAction)
      || key === 'arts' && (heroId === null || state.party[heroId].mp < 8);
    button.disabled = !available || invalid;
  });
}
function performHotspot(id) {
  if (!state || state.phase !== 'explore') return;
  const previous = state;
  state = interact(state, id);
  if (state !== previous) soundAction(state.phase === 'battle' ? 'damage' : 'move');
  render();
  if (state.phase === 'battle') beginAtb();
  else void checkpoint();
}
function render() {
  if (!state) { switchScreen('title'); renderButtons(); return; }
  switchScreen(state.phase);
  soundtrack.setCue(state.phase === 'battle' || state.phase === 'defeat' ? 'battle' : state.phase === 'ending' ? 'ending' : state.area);
  renderButtons();
  if (state.phase === 'ending') {
    text('ending-copy', state.records.length === 2
      ? '消えた手紙と航海士ミラの名を記録した。小さな光を携え、飛空艇は雲海の向こうへ。'
      : '消えた名前を取り戻す手掛かりを求め、飛空艇は雲海の向こうへ。');
    return;
  }
  const area = AREAS[state.area];
  syncWorld();
  $('landscape').className = `landscape area-${state.area}`;
  text('area-kicker', area.kicker.toUpperCase());
  text('area-title', area.label);
  text('area-description', area.description);
  text('scene-location', `${String(Object.keys(AREAS).indexOf(state.area) + 1).padStart(2, '0')} / ${state.area.toUpperCase()}`);
  text('area-index', String(Object.keys(AREAS).indexOf(state.area) + 1).padStart(2, '0'));
  text('objective', objective(state));
  text('narrative', state.battle?.log || state.narrative);
  $('battle-panel').hidden = state.phase !== 'battle';
  $('defeat-panel').hidden = state.phase !== 'defeat';
  $('hotspots').hidden = state.phase !== 'explore';
  text('section-title', state.phase === 'explore' ? 'EXPLORE — 探索' : state.phase === 'battle' ? 'COMMAND — 戦闘' : 'DEFEAT — 敗北');
  const hotspots = $('hotspots'); hotspots.replaceChildren();
  if (state.phase === 'explore') for (const h of HOTSPOTS[state.area]) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'hotspot';
    button.dataset.hotspot = h.id;
    const symbol = document.createElement('span'); symbol.className = 'hotspot-symbol'; symbol.textContent = h.icon;
    const content = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = h.label;
    const detail = document.createElement('small'); detail.textContent = h.caption;
    content.append(title, detail); button.append(symbol, content); hotspots.append(button);
    button.addEventListener('click', () => performHotspot(h.id));
  }
  const party = $('party'); party.replaceChildren();
  for (const [i, hero] of state.party.entries()) {
    if (i === 2 && !state.flags.ritz) continue;
    const row = document.createElement('div'); row.className = 'party-member';
    const portrait = document.createElement('span'); portrait.className = 'party-symbol has-portrait';
    const art = document.createElement('img'); art.alt = ''; art.src = [faceNoel, faceSena, faceRitz][i]; portrait.append(art);
    const info = document.createElement('div');
    const heading = document.createElement('div'); heading.className = 'party-top';
    const name = document.createElement('span'); name.textContent = hero.name;
    const role = document.createElement('small'); role.textContent = hero.role;
    heading.append(name, role); info.append(heading);
    for (const key of ['hp', 'mp']) {
      const label = document.createElement('div'); label.className = `party-stats ${key}`;
      const l = document.createElement('span'); l.textContent = key.toUpperCase();
      const meter = document.createElement('progress'); meter.max = key === 'hp' ? hero.maxHp : hero.maxMp; meter.value = hero[key];
      meter.setAttribute('aria-label', `${hero.name} ${key.toUpperCase()}`);
      const count = document.createElement('b'); count.textContent = `${hero[key]}/${meter.max}`;
      label.append(l, meter, count); info.append(label);
    }
    row.append(portrait, info); party.append(row);
  }
  $('resonance').value = state.resonance;
  text('resonance-number', `${state.resonance}%`);
  if (state.battle) {
    const b = state.battle;
    text('foe-name', b.name);
    $('foe-hp').max = b.maxHp; $('foe-hp').value = b.hp;
    $('foe-break').max = b.maxBreak; $('foe-break').value = b.break;
    text('foe-intent', b.stagger ? 'BREAK! 敵の次の行動を妨害できる。' : b.kind === 'boss' ? '予告：共鳴鐘撃（定期的に強力な攻撃）' : '予告：機械兵の単体攻撃');
    const heroId = activeHero(state);
    text('active-hero', heroId === null ? '操作できる仲間がいない。' : `${state.party[heroId].name} のターン  /  WAIT`);
    const echo = document.querySelector('[data-command="echo"]');
    commandAvailability(atb?.ready ?? true);
  }
}
function start() {
  state = newGame(settings.difficulty);
  beep(true); render(); beginAtb(); void checkpoint();
}
async function resume() {
  try {
    const result = await loadGame();
    if (!result) { notice('再開できる記録がありません。', true); return; }
    state = result; settings.difficulty = state.difficulty;
    persistSettings(); beep(true); render(); beginAtb(); notice('保存された記憶を読み込みました。');
  } catch (e) { notice(`読み込めません：${e?.message || '不明なエラー'}`, true); }
}
$('btn-start').addEventListener('click', start);
$('btn-new').addEventListener('click', start);
$('btn-ending-new').addEventListener('click', start);
$('btn-retry').addEventListener('click', () => { state = retryBattle(state); soundAction('victory'); render(); beginAtb(); });
$('btn-load').addEventListener('click', () => { void resume(); });
$('btn-title-continue').addEventListener('click', () => { void resume(); });
$('btn-save').addEventListener('click', () => { void checkpoint(); });
$('commands').addEventListener('click', event => {
  const command = event.target.closest('button[data-command]');
  if (!command || command.disabled || !state || state.phase !== 'battle') return;
  if (atb && !atb.ready) return;
  const previous = state.battle?.hp ?? 0;
  const kind = command.dataset.command;
  state = battleAction(state, kind);
  soundAction(kind === 'attack' || kind === 'arts' || kind === 'echo' || kind === 'guard' ? kind : 'select');
  world?.effect(kind, Math.max(0, previous - (state.battle?.hp ?? 0)));
  render(); beginAtb();
  if (state.phase === 'explore') { soundAction('victory'); void checkpoint(); }
  if (state.phase === 'defeat') soundAction('damage');
});
function modal(title, body) {
  text('modal-title', title); $('modal-content').replaceChildren(); $('modal-content').append(body);
  if (!$('overlay').open) $('overlay').showModal();
  atb?.setPaused(true);
}
$('btn-close').addEventListener('click', () => { $('overlay').close(); atb?.setPaused(false); });
$('overlay').addEventListener('click', e => { if (e.target === $('overlay')) { $('overlay').close(); atb?.setPaused(false); } });
$('overlay').addEventListener('close', () => atb?.setPaused(false));
$('btn-journal').addEventListener('click', () => {
  if (!state) return;
  const container = document.createElement('div');
  const description = document.createElement('p'); description.textContent = `目的：${objective(state)}`; container.append(description);
  const records = [{ id: 'letter', title: '宛名のない手紙', content: '「夜明けを忘れないで」' }, { id: 'badge', title: '航海士ミラの名札', content: '誰かが覚えている限り、名前は消えない。' }];
  const list = document.createElement('div'); list.className = 'modal-list';
  for (const entry of records) { const p = document.createElement('p'); p.textContent = state.records.includes(entry.id) ? `${entry.title} — ${entry.content}` : 'まだ見つけていない記憶'; list.append(p); }
  container.append(list);
  const actions = document.createElement('div'); actions.className = 'modal-actions';
  const exportButton = document.createElement('button'); exportButton.textContent = 'セーブJSONを書き出す';
  exportButton.addEventListener('click', () => {
    const blob = new Blob([exportGame(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'lumen-veil-save-v1.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('セーブデータを書き出しました。');
  });
  const importButton = document.createElement('button'); importButton.textContent = 'セーブJSONを読み込む';
  importButton.addEventListener('click', () => $('import-file').click());
  actions.append(exportButton, importButton); container.append(actions);
  const note = document.createElement('p'); note.textContent = 'セーブはこの端末のブラウザ内に保存されます。端末を変える場合はJSONを移行してください。'; container.append(note);
  modal('冒険の記録', container);
});
$('import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 200_000) { notice('ファイルが大きすぎます。', true); return; }
  try {
    const imported = await importGame(await file.text());
    state = imported; saved = true; settings.difficulty = imported.difficulty;
    persistSettings(); $('overlay').close(); render(); beginAtb(); notice('保存された記憶を取り込みました。');
  } catch (e) { notice(`インポートに失敗：${e?.message || '不正なデータ'}`, true); }
});
$('btn-settings').addEventListener('click', () => {
  const container = document.createElement('div');
  const description = document.createElement('p'); description.textContent = '演出・音量・戦闘難易度を調整できます。設定はこの端末に保持されます。'; container.append(description);
  const controls = [
    { label: 'BGM・効果音', id: 'setting-volume', type: 'range', min: 0, max: 1, step: .05, value: settings.volume },
    { label: '文字サイズ', id: 'setting-font', type: 'range', min: 1, max: 1.2, step: .1, value: settings.fontScale },
    { label: '演出を減らす', id: 'setting-reduce', type: 'checkbox', value: settings.reduceMotion },
  ];
  for (const cfg of controls) {
    const label = document.createElement('label'); label.className = 'setting-row'; label.textContent = cfg.label;
    const input = document.createElement('input'); input.id = cfg.id; input.type = cfg.type;
    if (cfg.type === 'checkbox') input.checked = cfg.value;
    else { input.min = cfg.min; input.max = cfg.max; input.step = cfg.step; input.value = cfg.value; }
    input.addEventListener('input', () => {
      if (cfg.id === 'setting-volume') settings.volume = Number(input.value);
      if (cfg.id === 'setting-font') settings.fontScale = Number(input.value);
      if (cfg.id === 'setting-reduce') settings.reduceMotion = input.checked;
      persistSettings();
    }); label.append(input); container.append(label);
  }
  const difficulty = document.createElement('label'); difficulty.className = 'setting-row'; difficulty.textContent = '難易度';
  const options = document.createElement('select');
  for (const [value, name] of [['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'むずかしい']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = name;
    if (value === settings.difficulty) option.selected = true;
    options.append(option);
  }
  options.addEventListener('change', () => { settings.difficulty = options.value; persistSettings(); if (state) void checkpoint(); });
  difficulty.append(options); container.append(difficulty);
  modal('設定', container);
});
document.addEventListener('keydown', event => {
  if ($('overlay').open || !state) return;
  if (state.phase === 'battle' && /^[1-4]$/.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
    const command = $('commands').querySelectorAll('button')[Number(event.key) - 1];
    if (command && !command.disabled) { command.click(); event.preventDefault(); }
  }
  if (state.phase === 'explore' && event.target?.tagName !== 'CANVAS' && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
    const buttons = [...$('hotspots').querySelectorAll('button')];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
    buttons[(current + buttons.length + direction) % buttons.length].focus(); event.preventDefault();
  }
});
// Initialize optional scene + gauge without replacing the pure legacy state.
atb = new ActiveTimeGauge($('atb-meter'), $('atb-indicator'), commandAvailability);
try {
  world = new WorldStage($('world-stage'), id => performHotspot(id), () => soundtrack.sound('move'));
} catch (e) {
  console.warn('Phaser renderer unavailable; standard game controls remain active.', e);
}
try {
  const existing = await loadGame();
  saved = !!existing;
  notice(saved ? '保存された記憶があります。「続きから」で再開できます。' : '記憶は、この端末に保存されます。');
} catch (e) { notice(`保存領域を確認できません：${e.message}`, true); }
persistSettings();
render();
