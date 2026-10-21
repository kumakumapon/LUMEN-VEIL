import Phaser from 'phaser';
import { WorldScene } from './world';
import { AtbDirector } from './atb';
import { OriginalScore } from './sound';
import type { GameEvent, GameView, Settings } from './types';
import './styles.css';

// Instantiate presentation layers *before* the original app begins emitting state.
// Neither renderer, ATB nor audio ever mutate the saved v1 model.
const score = new OriginalScore();
const atb = new AtbDirector();
const windowWithBridge = window as Window & { __lvAtbReady?: () => boolean; __lvLatestState?: GameView | null };
windowWithBridge.__lvAtbReady = () => atb.ready;
windowWithBridge.__lvLatestState = null;

window.addEventListener('lv:render', (event: Event) => {
  const detail = (event as CustomEvent<GameEvent>).detail;
  windowWithBridge.__lvLatestState = detail.state;
  score.setGame(detail.state);
  score.setSettings(detail.settings);
  atb.sync(detail.state);
});
window.addEventListener('lv:settings', (event: Event) => {
  score.setSettings((event as CustomEvent<Settings>).detail);
});
window.addEventListener('lv:sfx', (event: Event) => {
  score.effect((event as CustomEvent<{ name: string }>).detail.name);
});
let stopped = false;
const step = (now: number):void => {
  if(stopped)return;
  atb.frame(now);
  window.requestAnimationFrame(step);
};
window.requestAnimationFrame(step);
window.addEventListener('pagehide', () => { stopped = true; });

// If WebGL/Canvas is blocked, the existing DOM hotspot/command UI still works.
try {
  const parent = document.getElementById('phaser-stage');
  if (parent) new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 420,
    transparent: true,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio||1,1.5),
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [WorldScene],
    input: { activePointers: 3 },
    fps: { target: 60, forceSetTimeOut: false },
  });
} catch (error) { console.warn('Phaser disabled; accessible DOM gameplay remains available.',error); }

await import('../web/app.mjs');
