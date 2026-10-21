import Phaser from 'phaser';
import sceneHarbor from '../assets/scene-harbor.webp?url';
import sceneCorridor from '../assets/scene-corridor.webp?url';
import sceneVault from '../assets/scene-vault.webp?url';
import sceneDock from '../assets/scene-dock.webp?url';
import portraitNoel from '../assets/portrait-noel.webp?url';
import portraitSena from '../assets/portrait-sena.webp?url';
import portraitRitz from '../assets/portrait-ritz.webp?url';
import bellPicture from '../assets/forgotten-bell.webp?url';

export type Place = 'harbor' | 'corridor' | 'vault' | 'dock';
export type Phase = 'explore' | 'battle' | 'defeat' | 'ending';
export type GameView = {
  area: Place;
  phase: Phase;
  flags: { ritz: boolean; boss: boolean; [name: string]: boolean };
  battle: null | { name: string; kind: string; stagger: boolean; hp: number; maxHp: number };
  party: { name: string; hp: number; maxHp: number }[];
};

type Landmark = { id: string; name: string; x: number; y: number; symbol: string };
const LANDMARKS: Record<Place, Landmark[]> = {
  harbor: [
    { id: 'sena', name: 'セナ', x: 250, y: 245, symbol: '✦' },
    { id: 'sign', name: '案内板', x: 490, y: 223, symbol: '◇' },
    { id: 'letter', name: '手紙', x: 734, y: 282, symbol: '✉' },
    { id: 'to-corridor', name: '整備区画へ', x: 1050, y: 239, symbol: '➜' },
  ],
  corridor: [
    { id: 'ritz', name: 'リッツ', x: 240, y: 251, symbol: '⚔' },
    { id: 'lamp', name: '記憶灯', x: 450, y: 206, symbol: '✧' },
    { id: 'badge', name: '名札', x: 680, y: 280, symbol: '✦' },
    { id: 'key', name: '保管庫の鍵', x: 873, y: 218, symbol: '◇' },
    { id: 'to-vault', name: '保管庫へ', x: 1070, y: 253, symbol: '➜' },
    { id: 'to-harbor', name: '港へ戻る', x: 130, y: 335, symbol: '↶' },
  ],
  vault: [
    { id: 'boss', name: '忘鐘', x: 545, y: 231, symbol: '⚔' },
    { id: 'to-dock', name: '船着き場へ', x: 1040, y: 258, symbol: '➜' },
    { id: 'to-corridor', name: '回廊へ戻る', x: 155, y: 317, symbol: '↶' },
  ],
  dock: [
    { id: 'escape', name: '飛空艇', x: 811, y: 222, symbol: '✦' },
    { id: 'to-vault', name: '保管庫へ戻る', x: 160, y: 308, symbol: '↶' },
  ],
};

const WIDTH = 1200;
const HEIGHT = 410;

/** Phaser handles visuals and optional map input only; the legacy game model is authoritative. */
class JourneyScene extends Phaser.Scene {
  private latest: GameView | null = null;
  private shownArea: Place | null = null;
  private shownPhase: Phase | null = null;
  private scenery?: Phaser.GameObjects.Image;
  private tint?: Phaser.GameObjects.Rectangle;
  private particles: Phaser.GameObjects.GameObject[] = [];
  private hero?: Phaser.GameObjects.Container;
  private party: Phaser.GameObjects.Container[] = [];
  private markers: Phaser.GameObjects.Container[] = [];
  private enemy?: Phaser.GameObjects.Container;
  private markerPulses: Phaser.Tweens.Tween[] = [];
  private keys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private destination: { x: number; y: number; id: string } | null = null;
  private onInteract: (id: string) => void;
  private onStep: () => void;
  private reduceMotion = false;

  constructor(onInteract: (id: string) => void, onStep: () => void) {
    super({ key: 'JourneyScene' });
    this.onInteract = onInteract;
    this.onStep = onStep;
  }

  preload(): void {
    this.load.image('scene-harbor', sceneHarbor);
    this.load.image('scene-corridor', sceneCorridor);
    this.load.image('scene-vault', sceneVault);
    this.load.image('scene-dock', sceneDock);
    this.load.image('face-noel', portraitNoel);
    this.load.image('face-sena', portraitSena);
    this.load.image('face-ritz', portraitRitz);
    this.load.image('enemy-bell', bellPicture);
  }

  create(): void {
    this.scenery = this.add.image(WIDTH / 2, HEIGHT / 2, 'scene-harbor').setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.tint = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x081427, .28).setDepth(1);
    this.add.rectangle(WIDTH / 2, 381, WIDTH, 58, 0x091a31, .48).setDepth(2);
    this.add.text(26, 24, '◈ LUMEN VEIL   /   EXPLORE', { color: '#e7e9df', fontFamily: 'serif', fontSize: '15px', stroke: '#081427', strokeThickness: 4 }).setDepth(8);
    this.keys = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[]) => {
      if (!this.latest || this.latest.phase !== 'explore' || targets.length) return;
      this.game.canvas.focus();
      this.walkTo(pointer.worldX, pointer.worldY, null);
    });
    if (this.latest) this.redraw();
  }

  sync(state: GameView, reduced: boolean): void {
    this.latest = state;
    this.reduceMotion = reduced;
    if (!this.scenery || !this.scene.isActive()) return;
    if (this.shownArea !== state.area || this.shownPhase !== state.phase) this.redraw();
    this.game.scale.refresh();
  }

  private erase(): void {
    for (const m of this.markers) m.destroy();
    this.markers = [];
    for (const t of this.markerPulses) t.stop();
    this.markerPulses = [];
    for (const p of this.party) p.destroy();
    this.party = [];
    if (this.enemy) this.enemy.destroy();
    this.enemy = undefined;
    for (const p of this.particles) p.destroy();
    this.particles = [];
    this.hero = undefined;
    this.destination = null;
  }

  private portrait(key: string, x: number, y: number, radius = 24): Phaser.GameObjects.Container {
    const ring = this.add.circle(0, 0, radius + 5, 0x071625, .87).setStrokeStyle(2, 0xade4e1, .8);
    const picture = this.add.image(0, 0, key).setDisplaySize(radius * 2, radius * 2.32);
    picture.setCrop(0, 0, 248, 248).setDisplaySize(radius * 2, radius * 2);
    const base = this.add.ellipse(0, radius + 10, radius * 2.1, 11, 0x08182a, .8);
    return this.add.container(x, y, [base, ring, picture]).setDepth(7);
  }

  private redraw(): void {
    const s = this.latest;
    if (!s || !this.scenery || !this.tint) return;
    this.erase();
    this.shownArea = s.area;
    this.shownPhase = s.phase;
    this.scenery.setTexture(`scene-${s.area}`);
    this.tint.setAlpha(s.phase === 'battle' || s.phase === 'defeat' ? .4 : .3);
    if (s.phase === 'battle' || s.phase === 'defeat') { this.drawBattle(s); return; }
    if (s.phase !== 'explore') return;

    this.hero = this.portrait('face-noel', 104, 301, 28);
    this.party.push(this.hero);
    if (s.flags.ritz) {
      this.party.push(this.portrait('face-sena', 67, 345, 18));
      this.party.push(this.portrait('face-ritz', 138, 345, 18));
    } else {
      this.party.push(this.portrait('face-sena', 75, 347, 19));
    }
    this.party.forEach((p, i) => { if (i > 0) p.alpha = .88; });

    for (const landmark of LANDMARKS[s.area]) {
      const circle = this.add.circle(0, 0, 29, 0x092039, .83).setStrokeStyle(1.5, 0xa8e1de, .85);
      const symbol = this.add.text(0, -3, landmark.symbol, { fontSize: '27px', color: '#e5d6ae', fontFamily: 'serif' }).setOrigin(.5);
      const label = this.add.text(0, 39, landmark.name, { color: '#f4f2e9', fontSize: '15px', stroke: '#061424', strokeThickness: 4, fontFamily: 'sans-serif' }).setOrigin(.5);
      const container = this.add.container(landmark.x, landmark.y, [circle, symbol, label]).setDepth(5);
      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.game.canvas.focus();
        this.walkTo(landmark.x - 46, landmark.y + 22, landmark.id);
      });
      this.markers.push(container);
      if (!this.reduceMotion) this.markerPulses.push(this.tweens.add({ targets: circle, scale: 1.08, duration: 900 + this.markers.length * 95, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    }
  }

  private drawBattle(state: GameView): void {
    const isBoss = state.battle?.kind === 'boss';
    const light = this.add.circle(0, 0, 113, isBoss ? 0xb6ded8 : 0xd6b17b, .16).setDepth(3);
    const halo = this.add.circle(0, 0, 123, 0x0a203a, .42).setStrokeStyle(3, isBoss ? 0xaff8ff : 0xf1c895, .65).setDepth(4);
    const enemy = this.add.image(0, -6, 'enemy-bell').setCrop(240, 90, 400, 480).setDisplaySize(184, 221);
    const label = this.add.text(0, 132, isBoss ? '忘鐘 / THE NAMELESS BELL' : '灰翼の機械兵 / WARDEN', {
      fontSize: '15px', color: '#f4e7d2', fontFamily: 'serif', stroke: '#081427', strokeThickness: 3,
    }).setOrigin(.5);
    this.enemy = this.add.container(300, 213, [light, halo, enemy, label]).setDepth(5);
    this.party.push(this.portrait('face-noel', 776, 252, 46), this.portrait('face-sena', 935, 224, 40));
    if (state.flags.ritz) this.party.push(this.portrait('face-ritz', 1060, 275, 44));
    this.party.forEach((p, i) => {
      p.setDepth(6);
      if (!this.reduceMotion) this.tweens.add({ targets: p, y: p.y - 5, duration: 950 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    if (!this.reduceMotion) this.tweens.add({ targets: halo, alpha: .42, duration: 1250, yoyo: true, repeat: -1 });
  }

  private walkTo(x: number, y: number, id: string | null): void {
    if (!this.hero || !this.latest || this.latest.phase !== 'explore') return;
    const px = Phaser.Math.Clamp(x, 75, WIDTH - 76);
    const py = Phaser.Math.Clamp(y, 180, 344);
    this.destination = id ? { x: px, y: py, id } : null;
    this.tweens.killTweensOf(this.hero);
    const lastX = this.hero.x;
    this.hero.scaleX = px < lastX ? -1 : 1;
    const distance = Phaser.Math.Distance.Between(lastX, this.hero.y, px, py);
    if (distance < 12) { if (id) this.interact(id); return; }
    this.onStep();
    this.tweens.add({
      targets: this.hero,
      x: px, y: py,
      duration: this.reduceMotion ? 40 : Phaser.Math.Clamp(distance * 3.1, 100, 1100),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (id && this.destination?.id === id) this.interact(id);
      },
    });
    // Followers trail the hero in the same map, but never mutate persisted state.
    for (let i = 1; i < this.party.length; i++) {
      const fellow = this.party[i];
      this.tweens.killTweensOf(fellow);
      this.tweens.add({ targets: fellow, x: px - 38 * i, y: py + 38, duration: this.reduceMotion ? 40 : Phaser.Math.Clamp(distance * 3.8 + i * 90, 180, 1400), ease: 'Sine.easeInOut' });
    }
  }

  private interact(id: string): void {
    this.destination = null;
    if (this.latest?.phase === 'explore' && LANDMARKS[this.latest.area].some(m => m.id === id)) this.onInteract(id);
  }

  playEffect(command: string, amount = 0): void {
    if (!this.sys.isActive() || !this.latest || this.latest.phase !== 'battle' || this.reduceMotion) return;
    const color = command === 'echo' ? 0x97f6ed : command === 'arts' ? 0x82bafa : command === 'guard' ? 0xebc994 : 0xf2ebdf;
    const isGuard = command === 'guard';
    const x = isGuard ? 775 : 325;
    const y = isGuard ? 248 : 217;
    const ring = this.add.circle(x, y, 17, color, .15).setStrokeStyle(3, color, .95).setDepth(15);
    const star = this.add.star(x, y, 7, 11, 55, color, .77).setDepth(15);
    this.tweens.add({ targets: ring, scale: 6.4, alpha: 0, duration: command === 'echo' ? 680 : 360, onComplete: () => ring.destroy() });
    this.tweens.add({ targets: star, scale: 1.7, alpha: 0, angle: 75, duration: 440, onComplete: () => star.destroy() });
    if (amount > 0) {
      const number = this.add.text(x + 72, y - 50, String(amount), { fontFamily: 'serif', fontSize: '29px', fontStyle: 'bold', color: '#e6f6ec', stroke: '#091a2b', strokeThickness: 5 }).setDepth(20);
      this.tweens.add({ targets: number, y: y - 110, alpha: 0, duration: 730, onComplete: () => number.destroy() });
    }
    if (command === 'arts' || command === 'echo') this.cameras.main.shake(110, .0016);
  }

  update(time: number, delta: number): void {
    if (!this.hero || this.latest?.phase !== 'explore' || !this.keys || !this.wasd) return;
    // Preserve original Arrow-key button navigation unless the map has keyboard focus.
    if (document.activeElement !== this.game.canvas || document.hidden) return;
    const left = this.keys.left.isDown || this.wasd['A']?.isDown;
    const right = this.keys.right.isDown || this.wasd['D']?.isDown;
    const up = this.keys.up.isDown || this.wasd['W']?.isDown;
    const down = this.keys.down.isDown || this.wasd['S']?.isDown;
    const dx = Number(!!right) - Number(!!left);
    const dy = Number(!!down) - Number(!!up);
    if (dx || dy) {
      this.destination = null;
      this.tweens.killTweensOf(this.hero);
      const velocity = Math.min(delta, 40) / 1000 * 165 / Math.sqrt(dx * dx + dy * dy);
      this.hero.setPosition(Phaser.Math.Clamp(this.hero.x + dx * velocity, 65, WIDTH - 68), Phaser.Math.Clamp(this.hero.y + dy * velocity, 175, 350));
      this.hero.scaleX = dx < 0 ? -1 : dx > 0 ? 1 : this.hero.scaleX;
      if (!this.reduceMotion) this.hero.setAngle(Math.sin(time / 65) * 2.1);
    } else this.hero.setAngle(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.space!)) {
      const closest = LANDMARKS[this.latest.area].reduce<Landmark | null>((best, v) => {
        const dist = Phaser.Math.Distance.Between(this.hero!.x, this.hero!.y, v.x, v.y);
        return dist < 86 && (!best || dist < Phaser.Math.Distance.Between(this.hero!.x, this.hero!.y, best.x, best.y)) ? v : best;
      }, null);
      if (closest) this.interact(closest.id);
    }
  }
}

/** Phaser render/input adapter. No save-schema or quest-state ownership. */
export class WorldStage {
  private scene: JourneyScene;
  private game: Phaser.Game;
  private latest: GameView | null = null;
  constructor(parent: HTMLElement, onInteract: (id: string) => void, onStep: () => void) {
    this.scene = new JourneyScene(onInteract, onStep);
    this.game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent,
      width: WIDTH, height: HEIGHT,
      transparent: true,
      backgroundColor: '#081a2d',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WIDTH, height: HEIGHT },
      scene: [this.scene],
      render: { antialias: true, pixelArt: false },
      input: { keyboard: true, mouse: true, touch: true },
    });
    this.game.events.once(Phaser.Core.Events.READY, () => {
      this.game.canvas?.setAttribute('tabindex', '0');
      this.game.canvas?.setAttribute('aria-label', '移動できる幻想世界マップ。クリック・タップで地点に移動、フォーカス後は矢印キー・WASDで歩く。');
      if (this.latest) this.scene.sync(this.latest, false);
    });
  }
  sync(state: GameView, reduced: boolean): void { this.latest = state; this.scene.sync(state, reduced); }
  effect(kind: string, amount: number): void { this.scene.playEffect(kind, amount); }
  destroy(): void { this.game.destroy(true); }
}
