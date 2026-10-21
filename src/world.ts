import Phaser from 'phaser';
import type { Area, GameEvent, GameView, Command } from './types';

type Point = { x: number; y: number };
const SITES: Record<Area, Record<string, Point>> = {
  harbor: { sena: { x: .69, y: .57 }, sign: { x: .50, y: .46 }, letter: { x: .35, y: .70 }, 'to-corridor': { x: .88, y: .57 } },
  corridor: { ritz: { x: .75, y: .55 }, lamp: { x: .45, y: .46 }, badge: { x: .29, y: .66 }, key: { x: .56, y: .69 }, 'to-vault': { x: .90, y: .48 }, 'to-harbor': { x: .14, y: .60 } },
  vault: { boss: { x: .41, y: .47 }, 'to-dock': { x: .84, y: .61 }, 'to-corridor': { x: .13, y: .61 } },
  dock: { escape: { x: .80, y: .53 }, 'to-vault': { x: .17, y: .57 } },
};
const ASSET_NAMES: Record<Area, string> = { harbor: 'scene-harbor', corridor: 'scene-corridor', vault: 'vault', dock: 'scene-dock' };
const LABELS: Record<string, string> = {
  sena: 'セナ', sign: '記憶灯', letter: '手紙', 'to-corridor': '整備区画',
  ritz: 'リッツ', lamp: '修復', badge: '名札', key: '鍵', 'to-vault': '保管庫',
  boss: '忘鐘', 'to-dock': '船着き場', 'to-harbor': '港', escape: '飛空艇',
};
const HEROES = [
  { id: 'noel', coat: '#e1d9ce', trim: '#344f6d', hair: '#283346' },
  { id: 'sena', coat: '#314b73', trim: '#a4dce2', hair: '#d5dce5' },
  { id: 'ritz', coat: '#277f7f', trim: '#b9a06f', hair: '#9a4f40' },
];

/** Canvas/animation belongs here. Quest and save state stay in the original v1 model. */
export class WorldScene extends Phaser.Scene {
  private state: GameView | null = null;
  private sceneKey = '';
  private bg: Phaser.GameObjects.Image | null = null;
  private avatars: Phaser.GameObjects.Sprite[] = [];
  private foe: Phaser.GameObjects.Container | null = null;
  private markerObjects: Phaser.GameObjects.GameObject[] = [];
  private sceneObjects: Phaser.GameObjects.GameObject[] = [];
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private isWalking = false;
  private reducesMotion = false;
  private lastFootstep = 0;
  private pointerCallback: (pointer: Phaser.Input.Pointer) => void;
  private renderCallback: (event: Event) => void;
  private walkCallback: (event: Event) => void;
  private combatCallback: (event: Event) => void;
  private settingsCallback: (event: Event) => void;

  constructor() {
    super({ key: 'World' });
    this.pointerCallback = pointer => this.pointAndWalk(pointer);
    this.renderCallback = event => this.sync((event as CustomEvent<GameEvent>).detail.state);
    this.walkCallback = event => this.walkTo((event as CustomEvent<{ id: string; area: Area }>).detail);
    this.combatCallback = event => this.combatEffect((event as CustomEvent<{ command: Command; broke: boolean; won: boolean }>).detail);
    this.settingsCallback = event => { this.reducesMotion = !!(event as CustomEvent<{ reduceMotion: boolean }>).detail.reduceMotion; };
  }
  preload(): void {
    const path = import.meta.env.BASE_URL + 'assets/';
    for (const name of new Set(Object.values(ASSET_NAMES))) this.load.image(name, path + name + '.webp');
    // Rendering always has procedural fallback textures when an image cannot be loaded.
    this.load.on('loaderror', (file: { key: string }) => console.warn('Artwork fallback:', file.key));
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#0b1b30');
    this.generateWalkFrames();
    for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']) {
      const key = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes], false);
      if (key) this.keys.push(key);
    }
    this.input.on('pointerdown', this.pointerCallback);
    this.scale.on('resize', this.relayout, this);
    window.addEventListener('lv:render', this.renderCallback);
    window.addEventListener('lv:walk', this.walkCallback);
    window.addEventListener('lv:combat', this.combatCallback);
    window.addEventListener('lv:settings', this.settingsCallback);
    const globals = window as Window & { __lvLatestState?: GameView | null; __lvSettings?: { reduceMotion: boolean } };
    this.reducesMotion = !!globals.__lvSettings?.reduceMotion;
    const last = globals.__lvLatestState;
    if (last) this.sync(last);
    window.dispatchEvent(new Event('lv:scene-ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('lv:render', this.renderCallback);
      window.removeEventListener('lv:walk', this.walkCallback);
      window.removeEventListener('lv:combat', this.combatCallback);
      window.removeEventListener('lv:settings', this.settingsCallback);
      this.scale.off('resize', this.relayout, this);
    });
  }

  private generateWalkFrames(): void {
    for (const hero of HEROES) for (let i = 0; i < 4; i++) {
      const key = `${hero.id}-step-${i}`;
      if (this.textures.exists(key)) continue;
      const canvas = this.textures.createCanvas(key, 52, 80);
      if (!canvas) continue;
      const g = canvas.context;
      const stride = [0, 4, 0, -4][i];
      g.fillStyle = '#08132177'; g.beginPath(); g.ellipse(26, 76, 18, 4, 0, 0, Math.PI * 2); g.fill();
      // Leather boots and slightly alternating legs form a four-frame walk cycle.
      g.fillStyle = '#172739'; g.fillRect(17 + stride, 54, 8, 18); g.fillRect(28 - stride, 54, 8, 18);
      g.fillStyle = '#161d2d'; g.fillRect(15 + stride, 69, 12, 5); g.fillRect(27 - stride, 69, 12, 5);
      g.fillStyle = hero.coat; g.beginPath(); g.moveTo(16, 26); g.lineTo(37, 26); g.lineTo(43, 58); g.lineTo(9, 58); g.closePath(); g.fill();
      g.fillStyle = hero.trim; g.fillRect(17, 38, 18, 5); g.fillRect(25, 27, 3, 29);
      g.fillStyle = hero.coat; g.fillRect(9 + stride, 30, 8, 25); g.fillRect(36 - stride, 30, 8, 25);
      g.fillStyle = '#e8c5a5'; g.beginPath(); g.arc(26, 18, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = hero.hair; g.beginPath(); g.arc(26, 15, 12, Math.PI * 1.02, Math.PI * 1.96); g.lineTo(37, 15); g.lineTo(29, 6); g.lineTo(16, 13); g.closePath(); g.fill();
      g.fillStyle = '#172a40'; g.fillRect(20, 19, 3, 2); g.fillRect(30, 19, 3, 2);
      g.strokeStyle = '#f3e2ad'; g.lineWidth = 1; g.strokeRect(10, 27, 32, 32);
      canvas.refresh();
    }
  }
  private relayout(): void { if (this.state) { this.sceneKey = ''; this.draw(); } }
  private wipe(): void {
    for (const obj of [...this.sceneObjects, ...this.markerObjects]) obj.destroy();
    this.sceneObjects = []; this.markerObjects = []; this.avatars = []; this.bg = null; this.foe = null;
    this.tweens.killAll(); this.isWalking = false;
  }
  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T { this.sceneObjects.push(obj); return obj; }
  private cover(image: Phaser.GameObjects.Image, w: number, h: number): void {
    const tex = image.texture.getSourceImage() as HTMLImageElement;
    const scale = Math.max(w / (tex.width || w), h / (tex.height || h));
    image.setScale(scale);
    image.setPosition(w / 2, h / 2);
  }
  private draw(): void {
    this.wipe();
    const state = this.state;
    if (!state || state.phase === 'ending') return;
    const w = this.scale.width, h = this.scale.height;
    const key = ASSET_NAMES[state.area];
    if (this.textures.exists(key)) {
      const bg = this.track(this.add.image(w / 2, h / 2, key).setDepth(0).setAlpha(.87));
      this.cover(bg, w, h); this.bg = bg;
    } else {
      this.track(this.add.rectangle(w / 2, h / 2, w, h, 0x142942).setDepth(0));
    }
    // Ambient cloud gradients, distant airship lights and a ground line add parallax depth.
    this.track(this.add.rectangle(w / 2, h * .84, w, h * .32, 0x061726, .23).setDepth(2));
    this.track(this.add.ellipse(w * .48, h * .77, w * .94, 18, 0xb3cad4, .24).setDepth(3));
    for (let i = 0; i < 10; i++) {
      const x = ((i * 131) % 940) / 940 * w;
      const speck = this.track(this.add.circle(x, h * (.17 + (i % 6) * .08), 1.3 + (i % 3), 0xe7e7bd, .35).setDepth(2));
      if (!this.reducesMotion) this.tweens.add({ targets: speck, alpha: .05, duration: 1300 + i * 130, yoyo: true, repeat: -1 });
    }
    if (state.phase === 'battle' || state.phase === 'defeat') {
      this.drawBattle(w, h);
    } else {
      this.drawExplore(w, h);
    }
  }
  private drawExplore(w: number, h: number): void {
    const s = this.state;
    if (!s) return;
    const positions = [ [.19,.73], [.13,.76], [.25,.77] ];
    this.avatars = s.party.flatMap((hero, i) => {
      if (i === 2 && !s.flags.ritz) return [];
      const [px,py] = positions[i];
      const sprite = this.track(this.add.sprite(px * w, py * h, `${hero.id}-step-0`).setDepth(7-i).setOrigin(.5, 1).setScale(Math.max(.8, Math.min(1.42, w / 690))));
      return [sprite];
    });
    for (const [id, coords] of Object.entries(SITES[s.area])) {
      const x = Math.min(w-26, Math.max(26, coords.x * w)), y = Math.min(h-35, Math.max(52, coords.y * h));
      const ring = this.add.circle(x, y, w < 500 ? 13 : 19, 0x75cecd, .14).setStrokeStyle(1.7, 0xece9c6, .85).setDepth(4);
      const dot = this.add.circle(x, y, 4, 0xf0deac, .95).setDepth(5);
      const name = this.add.text(x, y - 33, LABELS[id] || id, { fontFamily: 'Noto Sans JP, sans-serif', fontSize: w < 550 ? '10px' : '12px', color: '#f4f6ec', backgroundColor: '#061827c9', padding: {x:5,y:3} }).setOrigin(.5,.5).setDepth(6);
      this.markerObjects.push(ring,dot,name);
      ring.setInteractive({ useHandCursor: true });
      ring.on('pointerdown', (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation(); this.walkTo({ id, area: s.area }, true);
      });
      if (!this.reducesMotion) this.tweens.add({targets: ring, scale: 1.19, alpha: .32, duration: 1150, yoyo:true, repeat:-1});
    }
  }
  private drawBattle(w: number, h: number): void {
    const s=this.state;
    if(!s?.battle) return;
    const boss=s.battle.kind==='boss';
    const cx=w*.33, cy=h*.49;
    const shadow=this.track(this.add.ellipse(cx, h*.77, boss?150:100, 22,0x07111b,.65).setDepth(4));
    const ring=this.track(this.add.circle(cx,cy,boss?61:45,0x0d2034,.45).setStrokeStyle(boss?11:7,0xd6bc8e,.85).setDepth(6));
    const iris=this.track(this.add.circle(cx,cy,boss?24:18,0xbde5d9,.98).setStrokeStyle(5,0x765e4b).setDepth(7));
    const halo=this.track(this.add.circle(cx,cy,boss?79:58,0x9de8e1,.03).setStrokeStyle(2,0x9de8e1,.75).setDepth(5));
    if(!this.reducesMotion){this.tweens.add({targets:halo,scale:1.14,alpha:.35,duration:1600,yoyo:true,repeat:-1});this.tweens.add({targets:iris,alpha:.52,duration:950,yoyo:true,repeat:-1});}
    // Ring components are independently tracked; no duplicate destruction.
    const positions=[[.70,.78],[.82,.72],[.91,.82]];
    this.avatars=s.party.flatMap((hero,i)=>{
      if(i===2&&!s.flags.ritz)return[];
      const [px,py]=positions[i];
      const sprite=this.track(this.add.sprite(px*w,py*h,`${hero.id}-step-0`).setOrigin(.5,1).setScale(Math.max(.8,Math.min(1.35,w/760))).setDepth(8));
      if(hero.hp===0)sprite.setTint(0x718091);
      return[sprite];
    });
    void shadow; void ring; void iris; void halo;
  }
  sync(state: GameView | null): void {
    const previous=this.state;
    this.state=state;
    const key=state && state.phase!=='ending' ? `${state.area}:${state.phase}`:'';
    if(key!==this.sceneKey){this.sceneKey=key;this.draw();return;}
    if(state?.phase==='explore' && previous?.area===state.area && previous.flags.ritz!==state.flags.ritz)this.draw();
  }
  private walkTo({id,area}:{id:string;area:Area}, interact=false):void {
    if (!this.state || this.state.phase!=='explore' || this.state.area!==area) return;
    const target=SITES[area][id];
    if (!target || !this.avatars[0]) return;
    const w=this.scale.width,h=this.scale.height;
    const x=Phaser.Math.Clamp(target.x*w-19,22,w-22), y=Phaser.Math.Clamp(target.y*h+35,h*.35,h*.81);
    this.animateWalk(x,y,interact?()=>window.dispatchEvent(new CustomEvent('lv:hotspot',{detail:{id}})):undefined);
  }
  private pointAndWalk(pointer: Phaser.Input.Pointer):void {
    if (!this.state || this.state.phase!=='explore' || this.isWalking) return;
    const w=this.scale.width,h=this.scale.height, x=pointer.x,y=pointer.y;
    if(y>h*.84) return; // leave the bottom dialogue/scene copy unobstructed
    const best=Object.entries(SITES[this.state.area]).map(([id,p])=>({id,distance:Phaser.Math.Distance.Between(x,y,p.x*w,p.y*h)})).sort((a,b)=>a.distance-b.distance)[0];
    if(best && best.distance<(w<500?31:39)) this.walkTo({id:best.id,area:this.state.area},true);
    else this.animateWalk(Phaser.Math.Clamp(x,20,w-20),Phaser.Math.Clamp(y,h*.39,h*.82));
  }
  private animateWalk(x:number,y:number,onArrive?:()=>void):void {
    const lead=this.avatars[0];if(!lead)return;
    this.tweens.killTweensOf(lead);
    const duration=this.reducesMotion?50:Math.min(1050,Math.max(190,Phaser.Math.Distance.Between(lead.x,lead.y,x,y)*2.6));
    this.isWalking=true;
    this.tweens.add({targets:lead,x,y,duration,ease:'Sine.easeInOut',onComplete:()=>{this.isWalking=false;lead.setTexture('noel-step-0');onArrive?.();}});
    if(!this.reducesMotion){
      this.avatars.slice(1).forEach((sprite,i)=>{
        this.tweens.killTweensOf(sprite);
        this.tweens.add({targets:sprite,x:x-43+(i*82),y:y+15,duration:duration+100,delay:80+i*50,ease:'Sine.easeInOut'});
      });
    }
  }
  private combatEffect({command,broke,won}:{command:Command;broke:boolean;won:boolean}):void {
    if(!this.state || (this.state.phase!=='battle'&&this.state.phase!=='explore'))return;
    const w=this.scale.width,h=this.scale.height;
    const from=this.avatars[0];
    const x=from?.x||w*.7,y=from?.y-h*.1||h*.6;
    const color=command==='arts'?0x92c8ff:command==='echo'?0xa7f6ef:command==='guard'?0xf0d59d:0xffd4a4;
    if(this.reducesMotion)return;
    for(let i=0;i<9;i++){
      const spark=this.add.circle(x+(i-4)*7,y,3.5,color,.9).setDepth(20);
      this.tweens.add({targets:spark,x:w*.33+(i-4)*12,y:h*.43+(i%3-1)*18,alpha:0,scale:.25,duration:300+i*25,onComplete:()=>spark.destroy()});
    }
    if(broke||won)this.cameras.main.flash(150,190,235,220);
  }
  update(time:number,delta:number):void {
    if(!this.state || this.state.phase!=='explore' || this.isWalking || this.avatars.length===0) return;
    if(document.hidden || document.querySelector('dialog[open]'))return;
    const typing=document.activeElement;
    if(typing && (typing.tagName==='INPUT'||typing.tagName==='SELECT'||typing.tagName==='TEXTAREA'||(typing.tagName==='BUTTON' && !!typing.closest('#hotspots'))))return;
    let vx=0,vy=0;
    const pressed=(k:string)=>this.keys.some(key=>key.isDown&&key.keyCode===Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes]);
    if(pressed('LEFT')||pressed('A'))vx--;
    if(pressed('RIGHT')||pressed('D'))vx++;
    if(pressed('UP')||pressed('W'))vy--;
    if(pressed('DOWN')||pressed('S'))vy++;
    const lead=this.avatars[0];
    if(vx||vy){
      const m=Math.hypot(vx,vy);const speed=.23*delta;
      lead.x=Phaser.Math.Clamp(lead.x+vx/m*speed,18,this.scale.width-18);
      lead.y=Phaser.Math.Clamp(lead.y+vy/m*speed,this.scale.height*.35,this.scale.height*.82);
      lead.setTexture(`noel-step-${Math.floor(time/110)%4}`);
      for(const [i,s] of this.avatars.slice(1).entries()){
        s.x=Phaser.Math.Linear(s.x,lead.x-45+i*78,.07);
        s.y=Phaser.Math.Linear(s.y,lead.y+11,.07);
        s.setTexture(`${i===0?'sena':'ritz'}-step-${Math.floor(time/140)%4}`);
      }
      if(time-this.lastFootstep>420){this.lastFootstep=time;window.dispatchEvent(new CustomEvent('lv:sfx',{detail:{name:'step'}}));}
    }else this.avatars.forEach((s,i)=>s.setTexture(`${['noel','sena','ritz'][i]}-step-0`));
  }
}
