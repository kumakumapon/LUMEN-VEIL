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
const windowWithBridge = window as Window & { __lvAtbReady?: () => boolean; __lvLatestState?: GameView | null; __lvSettings?: Settings };
windowWithBridge.__lvAtbReady = () => atb.ready;
windowWithBridge.__lvLatestState = null;
windowWithBridge.__lvSettings = {volume:.28,reduceMotion:false,fontScale:1,difficulty:'normal'};

window.addEventListener('lv:render', (event: Event) => {
  const detail = (event as CustomEvent<GameEvent>).detail;
  windowWithBridge.__lvLatestState = detail.state;
  score.setGame(detail.state);
  score.setSettings(detail.settings);
  windowWithBridge.__lvSettings = detail.settings;
  if(detail.state && detail.state.phase !== 'ending') startRenderer();
  atb.sync(detail.state);
});
window.addEventListener('lv:settings', (event: Event) => {
  const settings = (event as CustomEvent<Settings>).detail;
  windowWithBridge.__lvSettings = settings;
  score.setSettings(settings);
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

// Creating a Phaser canvas inside an initially hidden screen can yield a zero-size
// WebGL context. Wait until the first game render has made #game-screen visible.
let rendererQueued = false;
function startRenderer(): void {
  if (rendererQueued) return;
  rendererQueued = true;
  window.requestAnimationFrame(() => {
    try {
      const parent = document.getElementById('phaser-stage');
      if (parent) new Phaser.Game({
        type: Phaser.CANVAS,
        parent,
        width: 960,
        height: 420,
        transparent: true,
        antialias: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [WorldScene],
        input: { activePointers: 3 },
        fps: { target: 60, forceSetTimeOut: false },
      });
    } catch(error) {
      console.warn('Phaser unavailable; DOM controls remain playable.', error);
    }
  });
}

await import('../web/app.mjs');
