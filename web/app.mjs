import { AREAS, HOTSPOTS, PARTY, objective, newGame, interact, activeHero, battleAction, retryBattle } from './model.mjs';
import { saveGame, loadGame } from './save.mjs';
import { EQUIPMENT, NPC_DIALOGUES, enemyIntent, equipItem, findTreasure, freshProgress, grantVictory, levelForXp, statsFor, visit } from './expansion.mjs';
import { saveProgress, loadProgress, importAdventure, exportAdventure } from './expansion-save.mjs';
import { QUESTS, SHOP, freshLiving, acceptQuest, claimQuest, questStatus, buyItem, tacticalIntent } from './living.mjs';
import { saveLiving, loadLiving } from './living-save.mjs';
import { portraitForSpeaker } from './portrait-map.mjs';
const $ = id => document.getElementById(id);
let state = null;
let nearbyTarget = null;
let progress = freshProgress();
let living = freshLiving();
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
function beep(high = false) {
  window.dispatchEvent(new CustomEvent('lv:sfx', { detail: { name: high ? 'confirm' : 'select' } }));
}
function announce() {
  // The quest state and settings are observed by Phaser, ATB and Web Audio.
  // Presentation state is deliberately excluded from old IndexedDB snapshots.
  window.dispatchEvent(new CustomEvent('lv:render', { detail: { state, settings } }));
}
function notice(message, isError = false) {
  const out = $('notice'); out.textContent = message; out.style.color = isError ? '#ffb7a8' : '';
}
function persistSettings() {
  try { localStorage.setItem('lumen-veil-settings', JSON.stringify(settings)); } catch { /* optional */ }
  document.documentElement.style.setProperty('--text-scale', String(settings.fontScale));
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  if (state) state.difficulty = settings.difficulty;
  window.dispatchEvent(new CustomEvent('lv:settings', { detail: settings }));
}
async function checkpoint() {
  if (!state) return;
  const current = state;
  try {
    const currentProgress = progress, currentLiving=living;
    saveQueue = saveQueue.catch(() => {}).then(async () => { await saveGame(current); await saveProgress(currentProgress); await saveLiving(currentLiving); });
    await saveQueue; saved = true; notice('記憶を保存しました。');
  }
  catch (e) { notice(`保存できません：${e?.message || '不明なエラー'}`, true); }
  renderButtons();
}
function availableHotspots(){
  if(!state)return [];
  return HOTSPOTS[state.area].filter(h=>!(h.id==='sena'&&state.flags.sena)&&!(h.id==='ritz'&&state.flags.ritz));
}
function renderButtons() {
  $('btn-save').disabled = !state;
  $('btn-journal').disabled = !state;
  $('btn-gear').disabled = !state;
  $('btn-quests').disabled = !state;
  $('btn-shop').disabled = !state || state.area !== 'market' || state.phase !== 'explore';
  $('gold-count').textContent = state ? `${living.gold} G` : ''; 
  $('btn-load').disabled = !saved;
  $('btn-title-continue').disabled = !saved;
}
function switchScreen(view) {
  $('game-screen').classList.toggle('explore-mode', view === 'explore');
  $('title-screen').hidden = view !== 'title';
  $('game-screen').hidden = !['explore', 'battle', 'defeat'].includes(view);
  $('ending-screen').hidden = view !== 'ending';
}
function text(id, value) { $(id).textContent = value; }
function nextGoal(s) {
  if(s.phase!=='explore')return null;
  const id=!s.flags.sena?'sena':!s.flags.sign?'sign':!s.flags.ritz?'ritz':!s.flags.lamp?'lamp':!s.flags.key?'key':!s.flags.boss?'boss':!s.flags.escaped?'escape':null;
  if(!id)return null;
  const area={sena:'harbor',sign:'harbor',ritz:'corridor',lamp:'corridor',key:'corridor',boss:'vault',escape:'dock'}[id];
  if(s.area===area)return {area,id};
  const exit={harbor:area==='corridor'?'to-corridor':area==='vault'?'to-corridor':'to-corridor',
    corridor:area==='harbor'?'to-harbor':area==='vault'||area==='dock'?'to-vault':'to-harbor',
    vault:area==='dock'?'to-dock':'to-corridor',
    dock:'to-vault',market:'to-harbor',observatory:'to-harbor'}[s.area];
  return {area:s.area,id:exit};
}
function updateGuide() {
  const goal=nextGoal(state);
  const panel=$('journey-guide');
  panel.hidden=!goal;
  if(!goal)return;
  const marker=HOTSPOTS[goal.area]?.find(h=>h.id===goal.id);
  $('journey-goal').textContent=objective(state);
  $('journey-instruction').textContent=marker?`次は「${marker.label}」へ。光る印をタップ、または歩いて近づいてEキーで調べよう。`:'画面の光る印を調べて、物語を進めよう。';
  $('btn-guide-route').disabled=!marker;
}
function showControls() {
  const content=document.createElement('div');content.className='control-guide';
  for(const [heading,description] of [
    ['1 · 歩く','PC：WASD・矢印キー。スマートフォン：行きたい場所をタップ。'],
    ['2 · 話す・調べる','NPCや光る印に近づき、Eキーか「話す・調べる」を押す。目印をタップしても移動できる。'],
    ['3 · 目的地がわからない','「目的地へ案内」を押すと、次に進む場所まで自動で歩く。'],
    ['4 · 冒険の記録','上部メニューから保存・装備・依頼を確認。戦闘ではATBゲージが満ちたらコマンドを選ぶ。']
  ]){const h=document.createElement('h3');h.textContent=heading;const p=document.createElement('p');p.textContent=description;content.append(h,p);}
  modal('操作ガイド',content);
}
$('btn-guide-help').addEventListener('click',showControls);
$('btn-guide-route').addEventListener('click',()=>{
  const goal=state&&nextGoal(state);
  if(!goal)return;
  $('field-feedback').hidden=true;
  window.dispatchEvent(new CustomEvent('lv:walk',{detail:goal}));
});
window.addEventListener('lv:navigation-feedback',event=>{
  const feedback=$('field-feedback');
  feedback.textContent=event.detail?.message||'進めない場所です。';
  feedback.hidden=false;
});
function render() {
  if (!state) { switchScreen('title'); renderButtons(); announce(); return; }
  switchScreen(state.phase);
  renderButtons();
  if (state.phase === 'ending') {
    text('ending-copy', state.records.length === 2
      ? '消えた手紙と航海士ミラの名を記録した。小さな光を携え、飛空艇は雲海の向こうへ。'
      : '消えた名前を取り戻す手掛かりを求め、飛空艇は雲海の向こうへ。');
    announce(); return;
  }
  const area = AREAS[state.area];
  $('landscape').className = `landscape area-${state.area}`;
  text('area-kicker', area.kicker.toUpperCase());
  text('area-title', area.label);
  text('area-description', area.description);
  text('scene-location', `${String(Object.keys(AREAS).indexOf(state.area) + 1).padStart(2, '0')} / ${state.area.toUpperCase()}`);
  text('area-index', String(Object.keys(AREAS).indexOf(state.area) + 1).padStart(2, '0'));
  text('objective', objective(state));
  updateGuide();
  text('narrative', state.battle?.log || state.narrative);
  $('battle-panel').hidden = state.phase !== 'battle';
  $('defeat-panel').hidden = state.phase !== 'defeat';
  $('hotspots').hidden = state.phase !== 'explore';
  text('section-title', state.phase === 'explore' ? 'EXPLORE — 探索' : state.phase === 'battle' ? 'COMMAND — 戦闘' : 'DEFEAT — 敗北');
  const hotspots = $('hotspots'); hotspots.replaceChildren();
  if (state.phase === 'explore') for (const h of availableHotspots()) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'hotspot';
    button.dataset.hotspot = h.id;
    const symbol = document.createElement('span'); symbol.className = 'hotspot-symbol'; symbol.textContent = h.icon;
    const content = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = h.label;
    const detail = document.createElement('small'); detail.textContent = h.caption;
    content.append(title, detail); button.append(symbol, content); hotspots.append(button);
    // DOM shortcuts act immediately. Cancel any previous Phaser walk callback so
    // a stale marker cannot send the player back to a prior area.
    button.addEventListener('click', () => selectHotspot(h.id));
  }
  const party = $('party'); party.replaceChildren();
  for (const [i, hero] of state.party.entries()) {
    if (i === 2 && !state.flags.ritz) continue;
    const row = document.createElement('div'); row.className = 'party-member';
    const portrait = document.createElement('span'); portrait.className = 'party-symbol portrait';
    const image = document.createElement('img'); image.src = `${import.meta.env.BASE_URL}assets/portrait-${hero.id}.webp`;
    image.alt = ''; image.loading = 'lazy'; portrait.append(image);
    if (state.phase === 'battle' && i === activeHero(state)) row.classList.add('is-active');
    const info = document.createElement('div');
    const heading = document.createElement('div'); heading.className = 'party-top';
    const name = document.createElement('span'); name.textContent = hero.name;
    const role = document.createElement('small'); role.textContent = `${hero.role} · Lv.${levelForXp(progress.xp[hero.id])}`;
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
    const plan = enemyIntent({ ...state, battle: { ...b, count: b.count + (b.count % 2 === 0 ? 2 : 1) } });
    const tactics=tacticalIntent(state,progress);
    text('foe-intent', b.stagger ? 'BREAK! 敵の次の行動を妨害できる。' : tactics ? `敵AI予告：${tactics.name} → ${state.party[tactics.target].name}${tactics.piercing?'（防御貫通）':''}` : '敵の行動を観察する');
    const heroId = activeHero(state);
    text('active-hero', heroId === null ? '操作できる仲間がいない。' : `${state.party[heroId].name} のターン  /  WAIT`);
    const echo = document.querySelector('[data-command="echo"]');
    echo.disabled = state.resonance < 100 || !b.lastAction;
    const arts = document.querySelector('[data-command="arts"]'); arts.disabled = heroId === null || state.party[heroId].mp < 8;
  }
  announce();
}
function showNearbyMenu() {
  if(!state||state.phase!=='explore')return;
  const panel=document.createElement('div');panel.className='nearby-menu';
  const note=document.createElement('p');note.textContent='フィールドの光の印をタップするか、近づいてEキーで調べられます。周辺一覧からも選べます。';
  panel.append(note);
  for(const h of availableHotspots()){
    const button=document.createElement('button');button.type='button';button.className='nearby-item';button.dataset.hotspot=h.id;
    button.textContent=`${h.icon} ${h.label} — ${h.caption}`;
    button.addEventListener('click',()=>{$('overlay').close();selectHotspot(h.id);});
    panel.append(button);
  }
  modal('周辺を探す',panel);
}
$('btn-nearby').addEventListener('click',showNearbyMenu);
$('btn-interact').addEventListener('click',()=>{
  if(nearbyTarget&&state?.phase==='explore')window.dispatchEvent(new Event('lv:interact-nearest'));
});
window.addEventListener('lv:proximity',event=>{
  nearbyTarget=event.detail?.id||null;
  $('field-target-name').textContent=event.detail?.name||'光の印に近づこう';
  $('btn-interact').disabled=!nearbyTarget;
});
function selectHotspot(id) {
  if (!state || state.phase !== 'explore') return;
  // Cancel any in-flight movement before changing the scene or quest state.
  window.dispatchEvent(new Event('lv:cancel-walk'));
  const old = state;
  state = interact(state, id);
  $('field-feedback').hidden=true;
  nearbyTarget=null;$('btn-interact').disabled=true;
  $('field-target-name').textContent='光の印に近づこう';
  if (state.area !== old.area) progress = visit(progress, state.area);
  if (id === 'market-cache' || id === 'observatory-cache') progress = findTreasure(progress, id);
  window.dispatchEvent(new CustomEvent('lv:sfx', { detail: { name: state.records.length > old.records.length ? 'pickup' : 'select' } }));
  render();
  const dialogue = NPC_DIALOGUES[old.area]?.[id];
  if (dialogue) showConversation(dialogue);
  if (state.phase !== 'battle') void checkpoint();
}
window.addEventListener('lv:hotspot', event => selectHotspot(event.detail.id));
function start() {
  state = newGame(settings.difficulty);
  progress = visit(freshProgress(), 'harbor');
  living = freshLiving();
  beep(true); render(); window.dispatchEvent(new Event('lv:reset-field')); void checkpoint();
}
async function resume() {
  try {
    const result = await loadGame();
    if (!result) { notice('再開できる記録がありません。', true); return; }
    const loadedProgress = await loadProgress();
    const loadedLiving=await loadLiving();
    state = result; progress = loadedProgress; living=loadedLiving; settings.difficulty = state.difficulty;
    persistSettings(); beep(true); render(); window.dispatchEvent(new Event('lv:reset-field')); notice('保存された記憶を読み込みました。');
  } catch (e) { notice(`読み込めません：${e?.message || '不明なエラー'}`, true); }
}
$('btn-start').addEventListener('click', start);
$('btn-new').addEventListener('click', start);
$('btn-ending-new').addEventListener('click', start);
$('btn-retry').addEventListener('click', () => { state = retryBattle(state); beep(true); render(); });
$('btn-load').addEventListener('click', () => { void resume(); });
$('btn-title-continue').addEventListener('click', () => { void resume(); });
$('btn-save').addEventListener('click', () => { void checkpoint(); });
$('commands').addEventListener('click', event => {
  const command = event.target.closest('button[data-command]');
  if (!command || command.disabled || !state || state.phase !== 'battle') return;
  if (window.__lvAtbReady && !window.__lvAtbReady()) return;
  const before = state;
  state = battleAction(state, command.dataset.command, progress);
  if (before.phase === 'battle' && state.phase === 'explore') progress = grantVictory(progress, before.battle.kind);
  window.dispatchEvent(new CustomEvent('lv:combat', { detail: {
    command: command.dataset.command,
    broke: !!state.battle?.stagger && !before.battle?.stagger,
    won: before.phase === 'battle' && state.phase === 'explore',
  } }));
  window.dispatchEvent(new CustomEvent('lv:sfx', { detail: { name: state.phase === 'explore' ? 'victory' : command.dataset.command } }));
  render();
  if (state.phase === 'explore') void checkpoint();
});
function showConversation(lines) {
  if(!Array.isArray(lines)||lines.length===0)return;
  const container=document.createElement('div');container.className='conversation cinematic-conversation';
  const portraitFrame=document.createElement('div');portraitFrame.className='cinematic-portrait-frame';
  const portrait=document.createElement('img');portrait.className='dialogue-portrait';portrait.alt='';portrait.decoding='async';
  const portraitGlow=document.createElement('div');portraitGlow.className='cinematic-portrait-glow';portraitGlow.setAttribute('aria-hidden','true');
  portraitFrame.append(portraitGlow,portrait);
  const story=document.createElement('div');story.className='cinematic-dialogue-copy';
  const eyebrow=document.createElement('span');eyebrow.className='cinematic-dialogue-eyebrow';eyebrow.textContent='LUMEN VEIL · CONVERSATION';
  const speaker=document.createElement('h3');
  const line=document.createElement('p');line.className='cinematic-dialogue-line';line.setAttribute('aria-live','polite');
  const controls=document.createElement('div');controls.className='cinematic-dialogue-controls';
  const progress=document.createElement('span');progress.className='cinematic-dialogue-progress';progress.setAttribute('aria-label','会話の進行状況');
  const hint=document.createElement('span');hint.className='cinematic-dialogue-hint';hint.textContent='Enter / Space で進む';
  const next=document.createElement('button');next.type='button';next.className='primary-btn cinematic-next';
  controls.append(progress,hint,next);
  story.append(eyebrow,speaker,line,controls);
  container.append(portraitFrame,story);
  let index=0;
  const overlay=$('overlay');
  const controller=new AbortController();
  const cleanup=()=>{controller.abort();overlay.classList.remove('dialogue-cinematic');};
  overlay.addEventListener('close',cleanup,{once:true,signal:controller.signal});
  const update=()=>{
    const current=lines[index];
    speaker.textContent=current.speaker;
    line.textContent=current.line;
    const filename=portraitForSpeaker(current.speaker);
    portrait.onerror=()=>{portrait.onerror=null;portrait.src=`${import.meta.env.BASE_URL}assets/portrait-vald.webp`;};
    portrait.src=`${import.meta.env.BASE_URL}assets/${filename}`;
    portrait.alt=`${current.speaker}の立ち絵`;
    portraitFrame.dataset.speaker=current.speaker;
    progress.textContent=`${String(index+1).padStart(2,'0')} / ${String(lines.length).padStart(2,'0')}`;
    next.textContent=index===lines.length-1?'会話を終える':'次へ  ›';
    container.classList.remove('cinematic-line-enter');
    // Restart entrance on each line without delaying screen-reader text.
    if(!settings.reduceMotion){void container.offsetWidth;container.classList.add('cinematic-line-enter');}
  };
  const advance=()=>{
    if(index+1>=lines.length){overlay.close();return;}
    index++;update();beep();
  };
  next.addEventListener('click',advance,{signal:controller.signal});
  overlay.addEventListener('keydown',event=>{
    if(event.repeat||!overlay.open)return;
    if(event.key==='Enter'||event.key===' '){
      if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
      event.preventDefault();event.stopPropagation();advance();
    }
  },{capture:true,signal:controller.signal});
  update();
  overlay.classList.add('dialogue-cinematic');
  modal('会話',container);
  next.focus({preventScroll:true});
}
function openGear() {
  if (!state) return;
  const container = document.createElement('div'); container.className = 'gear-menu';
  const intro = document.createElement('p'); intro.textContent = '戦闘で経験値を獲得し、装備を変えると能力が上がります。'; container.append(intro);
  for (const hero of state.party) {
    if (hero.id === 'ritz' && !state.flags.ritz) continue;
    const row = document.createElement('section'); row.className = 'gear-row';
    const stats = statsFor(progress, hero.id);
    const title = document.createElement('h3'); title.textContent = `${hero.name} · Lv.${stats.level} / EXP ${progress.xp[hero.id]} / 攻撃+${stats.power} 防御+${stats.guard}`; row.append(title);
    for (const slot of ['weapon', 'armor']) {
      const label = document.createElement('label'); label.textContent = slot === 'weapon' ? '武器' : '防具';
      const select = document.createElement('select'); select.dataset.gearHero = hero.id; select.dataset.gearSlot = slot;
      for (const id of progress.found) {
        const item = EQUIPMENT[id];
        if (item.slot !== slot || !item.owners.includes(hero.id)) continue;
        const option = document.createElement('option'); option.value = id; option.textContent = `${item.name} (攻+${item.power} 防+${item.guard})`;
        option.selected = progress.equipment[hero.id][slot] === id; select.append(option);
      }
      select.addEventListener('change', () => {
        try { progress = equipItem(progress, hero.id, select.value); render(); void checkpoint(); openGear(); }
        catch (error) { notice(error.message, true); }
      });
      label.append(select); row.append(label);
    }
    container.append(row);
  }
  modal('装備・育成', container);
}
const gearButton = document.createElement('button');
gearButton.id = 'btn-gear'; gearButton.type = 'button'; gearButton.textContent = '装備・育成'; gearButton.disabled = true;
$('btn-journal').insertAdjacentElement('afterend', gearButton);
gearButton.addEventListener('click', openGear);
const questButton=document.createElement('button');questButton.id='btn-quests';questButton.type='button';questButton.textContent='依頼';questButton.disabled=true;
gearButton.insertAdjacentElement('afterend',questButton);
const shopButton=document.createElement('button');shopButton.id='btn-shop';shopButton.type='button';shopButton.textContent='ショップ';shopButton.disabled=true;
questButton.insertAdjacentElement('afterend',shopButton);
const gold=document.createElement('span');gold.id='gold-count';gold.className='gold-count';shopButton.insertAdjacentElement('afterend',gold);
function openQuests(){
  if(!state)return;
  const panel=document.createElement('div');panel.className='quest-menu';
  const intro=document.createElement('p');intro.textContent='依頼を受け、探索や戦闘で条件を満たしたら報酬を受け取れます。';panel.append(intro);
  for(const [id,quest] of Object.entries(QUESTS)){
    const status=questStatus(living,id,state,progress);
    const row=document.createElement('section');row.className='quest-row';row.dataset.quest=id;
    const title=document.createElement('h3');title.textContent=quest.title;
    const description=document.createElement('p');description.textContent=quest.description;
    const reward=document.createElement('small');reward.textContent=`報酬：${quest.gold} G / 経験値 ${quest.xp}`;
    const button=document.createElement('button');button.type='button';button.dataset.questAction=id;
    button.textContent=status==='available'?'依頼を受ける':status==='ready'?'報酬を受け取る':status==='claimed'?'達成済み':'進行中';
    button.disabled=status==='active'||status==='claimed';
    button.addEventListener('click',()=>{
      try{
        if(status==='available')living=acceptQuest(living,id);
        else if(status==='ready')({living,progress}=claimQuest(living,id,state,progress));
        render();void checkpoint();openQuests();
      }catch(error){notice(error.message,true);}
    });
    row.append(title,description,reward,button);panel.append(row);
  }
  modal('依頼の記録',panel);
}
function openShop(){
  if(!state||state.area!=='market'||state.phase!=='explore')return;
  const panel=document.createElement('div');panel.className='shop-menu';
  const intro=document.createElement('p');intro.textContent=`商人ユイ「旅の支度をしましょう！」 所持金：${living.gold} G`;panel.append(intro);
  for(const [id,item] of Object.entries(SHOP)){
    const row=document.createElement('section');row.className='shop-row';row.dataset.shopItem=id;
    const label=document.createElement('div');label.textContent=`${item.name} — ${item.price} G`;
    const caption=document.createElement('small');caption.textContent=item.description;
    const button=document.createElement('button');button.type='button';button.dataset.buyItem=id;
    const owned=progress.found.includes(id);
    button.textContent=owned?'購入済み':'購入する';button.disabled=owned||living.gold<item.price;
    button.addEventListener('click',()=>{
      try{({living,progress}=buyItem(living,progress,id));render();void checkpoint();openShop();}
      catch(error){notice(error.message,true);}
    });
    row.append(label,caption,button);panel.append(row);
  }
  modal('白帆の市場 — 装備店',panel);
}
questButton.addEventListener('click',openQuests);
shopButton.addEventListener('click',openShop);

function openAdventureMenu(){
  const panel=document.createElement('div');
  panel.className='adventure-menu';
  const description=document.createElement('p');
  description.textContent='やりたいことを選んでください。探索中は「次にすること」から目的地へ案内できます。';
  panel.append(description);
  const actions=[
    ['btn-save','セーブする','現在の冒険をこの端末に保存'],
    ['btn-load','続きから','保存した冒険を再開'],
    ['btn-journal','冒険の記録','集めた記憶とセーブデータ'],
    ['btn-gear','装備・育成','仲間の装備とレベルを確認'],
    ['btn-quests','依頼を確認','進行中のクエストと報酬'],
    ['btn-shop','ショップ','武器・防具を購入'],
    ['btn-settings','設定','音量・文字サイズ・難易度'],
  ];
  for(const [id,label,detail] of actions){
    const target=$(id);
    if(!target)continue;
    const button=document.createElement('button');
    button.type='button';button.className='adventure-menu-item';
    button.disabled=target.disabled;
    const title=document.createElement('strong');title.textContent=label;
    const small=document.createElement('small');small.textContent=detail;
    button.append(title,small);
    button.addEventListener('click',()=>{$('overlay').close();target.click();});
    panel.append(button);
  }
  modal('冒険メニュー',panel);
}
$('btn-main-menu').addEventListener('click',openAdventureMenu);
function modal(title, body) {
  text('modal-title', title); $('modal-content').replaceChildren(); $('modal-content').append(body);
  if (!$('overlay').open) $('overlay').showModal();
}
$('btn-close').addEventListener('click', () => $('overlay').close());
$('overlay').addEventListener('click', e => { if (e.target === $('overlay')) $('overlay').close(); });
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
    const blob = new Blob([exportAdventure(state, progress, living)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'lumen-veil-adventure-v1.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('セーブデータを書き出しました。');
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
    const imported = await importAdventure(await file.text());
    state = imported.state; progress = imported.progress; living=imported.living; saved = true; settings.difficulty = state.difficulty;
    persistSettings(); $('overlay').close(); render(); notice('保存された記憶を取り込みました。');
  } catch (e) { notice(`インポートに失敗：${e?.message || '不正なデータ'}`, true); }
});
$('btn-settings').addEventListener('click', () => {
  const container = document.createElement('div');
  const description = document.createElement('p'); description.textContent = '演出・音量・戦闘難易度を調整できます。設定はこの端末に保持されます。'; container.append(description);
  const controls = [
    { label: 'BGM・効果音の音量', id: 'setting-volume', type: 'range', min: 0, max: 1, step: .05, value: settings.volume },
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
  if (state.phase === 'explore' && $('hotspots').contains(document.activeElement) && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
    const buttons = [...$('hotspots').querySelectorAll('button')];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
    buttons[(current + buttons.length + direction) % buttons.length].focus(); event.preventDefault();
  }
});
try {
  const existing = await loadGame();
  saved = !!existing;
  notice(saved ? '保存された記憶があります。「続きから」で再開できます。' : '記憶は、この端末に保存されます。');
} catch (e) { notice(`保存領域を確認できません：${e.message}`, true); }
persistSettings();
render();
document.documentElement.dataset.lumenReady = 'true';
