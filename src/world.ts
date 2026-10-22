import Phaser from 'phaser';
import { activeHero } from '../web/model.mjs';
import { battleArtLayout, fitArtwork } from './battle-art';
import type { Area, GameEvent, GameView, Command } from './types';
import { OBSTACLES, routeTo, walkable } from './navigation';

type Point = { x: number; y: number };
const SITES: Record<Area, Record<string, Point>> = {
  harbor: { sena: { x: .69, y: .57 }, sign: { x: .50, y: .46 }, letter: { x: .35, y: .70 }, 'to-corridor': { x: .88, y: .57 }, 'to-market': { x:.16,y:.56 }, 'to-observatory': { x:.77,y:.42 } },
  corridor: { ritz: { x: .75, y: .55 }, lamp: { x: .45, y: .46 }, badge: { x: .29, y: .66 }, key: { x: .56, y: .69 }, 'to-vault': { x: .90, y: .48 }, 'to-harbor': { x: .14, y: .60 } },
  vault: { boss: { x: .41, y: .47 }, 'to-dock': { x: .84, y: .61 }, 'to-corridor': { x: .13, y: .61 } },
  dock: { escape: { x: .80, y: .53 }, 'to-vault': { x: .17, y: .57 } },
  market: { merchant: { x: .69, y: .50 }, navigator: { x: .28, y: .48 }, 'market-cache': { x: .77, y: .73 }, 'to-harbor': { x: .13, y: .74 } },
  observatory: { scholar: { x: .67, y: .48 }, 'observatory-cache': { x: .34, y: .72 }, 'to-harbor': { x: .14, y: .64 } },
};
const ASSET_NAMES: Record<Area, string> = { harbor: 'scene-harbor', corridor: 'scene-corridor', vault: 'vault', dock: 'scene-dock', market: 'scene-harbor', observatory: 'scene-corridor' };
const LABELS: Record<string, string> = {
  sena: 'セナ', sign: '記憶灯', letter: '手紙', 'to-corridor': '整備区画',
  ritz: 'リッツ', lamp: '修復', badge: '名札', key: '鍵', 'to-vault': '保管庫',
  boss: '忘鐘', 'to-dock': '船着き場', 'to-harbor': '港', escape: '飛空艇',
  'to-market': '市場', 'to-observatory': '観測塔', merchant: '商人ユイ', navigator: '航路士', scholar: '星見のエル', 'market-cache': '装備箱', 'observatory-cache': '星図の箱',
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
  private npcActors: {sprite:Phaser.GameObjects.Sprite;tween:Phaser.Tweens.Tween}[] = [];
  private foe: Phaser.GameObjects.Container | null = null;
  private battleActors: { heroId: string; sprite: Phaser.GameObjects.Sprite; ring: Phaser.GameObjects.Ellipse }[] = [];
  private markerObjects: Phaser.GameObjects.GameObject[] = [];
  private sceneObjects: Phaser.GameObjects.GameObject[] = [];
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private isWalking = false;
  private reducesMotion = false;
  private lastFootstep = 0;
  private pointerCallback: (pointer: Phaser.Input.Pointer) => void;
  private renderCallback: (event: Event) => void;
  private walkCallback: (event: Event) => void;
  private combatCallback: (event: Event) => void;
  private settingsCallback: (event: Event) => void;
  private cancelCallback: () => void;
  private interactCallback: () => void;
  private proximityId: string | null = null;
  private walkGeneration = 0;
  private lastFieldPosition: { area: Area; x: number; y: number } | null = null;
  private drawnArea: Area | null = null;
  private drawnSize = { width: 960, height: 420 };
  private resetCallback: () => void;

  constructor() {
    super({ key: 'World' });
    this.pointerCallback = pointer => this.pointAndWalk(pointer);
    this.cancelCallback = () => {
      this.walkGeneration++;
      this.avatars.forEach(a=>this.tweens.killTweensOf(a));
      this.isWalking=false;
    };
    this.interactCallback = () => this.interactNearby();
    this.resetCallback = () => { this.lastFieldPosition=null;this.drawnArea=null;this.sceneKey='';this.draw(); };
    this.renderCallback = event => this.sync((event as CustomEvent<GameEvent>).detail.state);
    this.walkCallback = event => this.walkTo((event as CustomEvent<{ id: string; area: Area }>).detail,true);
    this.combatCallback = event => this.combatEffect((event as CustomEvent<{ command: Command; broke: boolean; won: boolean }>).detail);
    this.settingsCallback = event => { this.reducesMotion = !!(event as CustomEvent<{ reduceMotion: boolean }>).detail.reduceMotion; };
  }
  preload(): void {
    const path = import.meta.env.BASE_URL + 'assets/';
    for (const name of new Set(Object.values(ASSET_NAMES))) this.load.image(name, path + name + '.webp');
    for (const id of ['noel','sena','ritz']) this.load.image('face-'+id,path+'portrait-'+id+'.webp');
    for (const id of ['noel','sena','ritz','bell']) this.load.image('battle-'+id, path+'battle-'+id+'.webp');
    this.load.image('battle-arena',path+'battle-arena.webp');
    // Rendering always has procedural fallback textures when an image cannot be loaded.
    this.load.on('loaderror', (file: { key: string }) => console.warn('Artwork fallback:', file.key));
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#0b1b30');
    this.generateWalkFrames();
    this.generateFieldTextures();
    for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']) {
      const key = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes], false);
      if (key) this.keys.push(key);
    }
    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E, false) ?? null;
    this.input.on('pointerdown', this.pointerCallback);
    this.scale.on('resize', this.relayout, this);
    window.addEventListener('lv:render', this.renderCallback);
    window.addEventListener('lv:cancel-walk', this.cancelCallback);
    window.addEventListener('lv:interact-nearest', this.interactCallback);
    window.addEventListener('lv:reset-field', this.resetCallback);
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
      window.removeEventListener('lv:cancel-walk', this.cancelCallback);
      window.removeEventListener('lv:interact-nearest', this.interactCallback);
      window.removeEventListener('lv:reset-field', this.resetCallback);
      window.removeEventListener('lv:walk', this.walkCallback);
      window.removeEventListener('lv:combat', this.combatCallback);
      window.removeEventListener('lv:settings', this.settingsCallback);
      this.scale.off('resize', this.relayout, this);
    });
  }

  private generateFieldTextures():void {
    // The original battle illustrations include transparent poster margins.
    // Trim those margins for the field instead of rendering a tiny person.
    for(const id of ['noel','sena','ritz']){
      const sourceKey='battle-'+id,targetKey='field-'+id;
      if(!this.textures.exists(sourceKey)||this.textures.exists(targetKey))continue;
      const source=this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
      if(!source.width||!source.height)continue;
      const scan=document.createElement('canvas');
      scan.width=source.width;scan.height=source.height;
      const ctx=scan.getContext('2d',{willReadFrequently:true});
      if(!ctx)continue;
      ctx.drawImage(source,0,0);
      const rgba=ctx.getImageData(0,0,source.width,source.height).data;
      let left=source.width,top=source.height,right=-1,bottom=-1;
      for(let y=0;y<source.height;y+=2)for(let x=0;x<source.width;x+=2){
        if(rgba[(y*source.width+x)*4+3]<22)continue;
        if(x<left)left=x;if(x>right)right=x;
        if(y<top)top=y;if(y>bottom)bottom=y;
      }
      if(right<left||bottom<top)continue;
      const cropW=Math.min(source.width-left,right-left+3);
      const cropH=Math.min(source.height-top,bottom-top+3);
      const margin=Math.max(4,Math.round(cropW*.045));
      const scale=Math.min(1,400/(cropH+margin*2));
      const texture=this.textures.createCanvas(targetKey,
        Math.ceil((cropW+margin*2)*scale),Math.ceil((cropH+margin*2)*scale));
      if(!texture)continue;
      texture.context.drawImage(source,left,top,cropW,cropH,
        margin*scale,margin*scale,cropW*scale,cropH*scale);
      texture.refresh();
    }
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
      // High-detail face art from the existing original portraits; fall back to
      // vector eyes when the image is unavailable or failed to load.
      if (this.textures.exists('face-'+hero.id)) {
        const face=this.textures.get('face-'+hero.id).getSourceImage() as HTMLImageElement;
        if(face.width&&face.height){
          g.save();g.beginPath();g.arc(26,19,12,0,Math.PI*2);g.clip();
          const side=Math.min(face.width,face.height)*.65;
          g.drawImage(face,Math.max(0,(face.width-side)*.45),Math.max(0,face.height*.10),side,side,13,6,26,26);
          g.restore();g.strokeStyle='#ead3a4';g.lineWidth=1.8;g.beginPath();g.arc(26,19,12.5,0,Math.PI*2);g.stroke();
        }
      } else { g.fillStyle = '#172a40';g.fillRect(20,19,3,2);g.fillRect(30,19,3,2); }
      g.fillStyle='#f2e3bb';g.fillRect(18,43,16,2);
      g.fillStyle='#a3cbd2';g.fillRect(14+stride,49,4,5);g.fillRect(36-stride,49,4,5); g.fillRect(30, 19, 3, 2);
      g.strokeStyle = '#f3e2ad'; g.lineWidth = 1; g.strokeRect(10, 27, 32, 32);
      canvas.refresh();
    }
  }
  private relayout(): void {
    // RESIZE fires when HUD/layout height changes. Rebuild scenery but preserve
    // the player position in normalized map coordinates.
    if (this.state) this.draw();
  }
  private wipe(): void {
    this.walkGeneration++;
    for (const obj of [...this.sceneObjects, ...this.markerObjects]) obj.destroy();
    this.sceneObjects = []; this.markerObjects = []; this.avatars = []; this.npcActors=[]; this.battleActors=[]; this.bg = null; this.foe = null;
    this.tweens.killAll(); this.isWalking = false;
    this.proximityId=null;
    window.dispatchEvent(new CustomEvent('lv:proximity',{detail:{id:null,name:null}}));
    delete this.game.canvas.dataset.battleArt; delete this.game.canvas.dataset.enemyArt; delete this.game.canvas.dataset.battleBackground;
  }
  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T { this.sceneObjects.push(obj); return obj; }
  private cover(image: Phaser.GameObjects.Image, w: number, h: number): void {
    const tex = image.texture.getSourceImage() as HTMLImageElement;
    const scale = Math.max(w / (tex.width || w), h / (tex.height || h));
    image.setScale(scale);
    image.setPosition(w / 2, h / 2);
  }
  private draw(): void {
    const state = this.state;
    if(this.avatars[0] && this.drawnArea){
      this.lastFieldPosition={area:this.drawnArea,x:this.avatars[0].x/this.drawnSize.width,y:this.avatars[0].y/this.drawnSize.height};
    }
    this.wipe();
    if (!state || state.phase === 'ending') return;
    const w = this.scale.width, h = this.scale.height;
    this.drawnSize={width:Math.max(w,1),height:Math.max(h,1)};
    this.drawnArea=state.area;
    if(this.lastFieldPosition?.area!==state.area)this.lastFieldPosition=null;
    const inBattle=state.phase==='battle'||state.phase==='defeat';
    const key=inBattle&&this.textures.exists('battle-arena')?'battle-arena':ASSET_NAMES[state.area];
    if(inBattle)this.game.canvas.dataset.battleBackground=key;
    if (this.textures.exists(key)) {
      const bg = this.track(this.add.image(w / 2, h / 2, key).setDepth(0).setAlpha(.87));
      this.cover(bg, w, h); this.bg = bg;
    } else {
      this.track(this.add.rectangle(w / 2, h / 2, w, h, 0x142942).setDepth(0));
    }
    if(state.phase==='explore')this.drawTilemap(w,h,state.area);
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
  private drawTilemap(w:number,h:number,area:Area):void {
    // The original cinematic concept paintings show distant bridges and people
    // in midair. They are *backdrops*, not walkable maps. Build an opaque stone
    // courtyard over their lower section so avatars always have a visible floor.
    const grid=this.track(this.add.graphics().setDepth(1));
    const palettes:Record<Area,{base:number;light:number;dark:number;edge:number;accent:number}>={
      harbor:{base:0x455f6a,light:0x68818a,dark:0x314854,edge:0x9ab5b6,accent:0xd9bf8c},
      corridor:{base:0x394e56,light:0x556c70,dark:0x283b43,edge:0x8da9aa,accent:0xd5b88b},
      vault:{base:0x303e50,light:0x485e6e,dark:0x202e3f,edge:0x9caab8,accent:0xb9d8e5},
      dock:{base:0x466976,light:0x71939a,dark:0x31515f,edge:0x9bc4c9,accent:0xe1d1a5},
      market:{base:0x6b6258,light:0x908277,dark:0x504c47,edge:0xc3b49a,accent:0xf0d59b},
      observatory:{base:0x3e4b69,light:0x62728f,dark:0x2d3b56,edge:0xa9b8d5,accent:0xc4d7fa},
    };
    const p=palettes[area];
    const horizon=h*.32;
    // Full-bleed ground hides pre-drawn giant characters in the original art.
    grid.fillStyle(p.dark,1);grid.fillRect(0,horizon,w,h-horizon);
    grid.fillStyle(p.base,1);grid.fillRect(0,h*.36,w,h*.56);
    grid.fillStyle(p.dark,.94);grid.fillRect(0,h*.92,w,h*.08);
    // Parapet and pillars define the transition between skyline and walkable floor.
    grid.fillStyle(p.edge,.94);grid.fillRect(0,horizon,w,h*.014);
    grid.fillStyle(p.dark,1);grid.fillRect(0,horizon+h*.014,w,h*.02);
    grid.lineStyle(2,p.accent,.56);grid.lineBetween(0,horizon,w,horizon);
    // Large staggered paving stones read as a town square rather than a debug
    // collision grid. The logical 40x20 navigation mesh stays unchanged.
    const stoneRows=17,stoneCols=27,top=h*.36,bottom=h*.92;
    const stoneW=w/stoneCols,stoneH=(bottom-top)/stoneRows;
    for(let row=0;row<stoneRows;row++){
      const offset=row%2?.5:0;
      for(let col=-1;col<=stoneCols;col++){
        const x=(col+offset)*stoneW,y=top+row*stoneH;
        const variation=(col*13+row*7+(col*row)%5+41)%11;
        const color=variation<2?p.light:variation<4?p.dark:p.base;
        grid.fillStyle(color,.84);
        grid.fillRect(x+1,y+1,stoneW-2,stoneH-2);
        grid.lineStyle(1,p.edge,.14+row/stoneRows*.11);
        grid.strokeRect(x+1,y+1,stoneW-2,stoneH-2);
        if(variation===7){
          grid.lineStyle(1,p.accent,.16);
          grid.lineBetween(x+stoneW*.32,y+stoneH*.6,x+stoneW*.62,y+stoneH*.4);
        }
      }
    }
    // A faint central sunlit avenue gives depth and leads the eye into town.
    grid.fillStyle(p.light,.12);
    grid.fillTriangle(w*.42,h*.36,w*.58,h*.36,w*.95,h*.92);
    grid.fillTriangle(w*.42,h*.36,w*.05,h*.92,w*.95,h*.92);
    grid.lineStyle(1.2,p.accent,.19);
    for(let i=-5;i<=5;i++){
      grid.lineBetween(w*(.5+i*.018),h*.36,w*(.5+i*.10),h*.92);
    }
    // Physically blocked places are crates and stone structures, not debug boxes.
    for(const obstacle of OBSTACLES[area]){
      const x=obstacle.x*w,y=obstacle.y*h,bw=obstacle.w*w,bh=obstacle.h*h;
      grid.fillStyle(0x102b38,.46);grid.fillEllipse(x+bw*.52,y+bh*.94,bw*1.12,bh*.34);
      grid.fillStyle(p.dark,1);grid.fillRect(x,y,bw,bh*.78);
      grid.fillStyle(p.base,1);grid.fillRect(x+4,y+3,bw-8,bh*.78-6);
      grid.lineStyle(2,p.accent,.66);grid.strokeRect(x+3,y+3,bw-6,bh*.78-6);
      grid.lineStyle(1,p.edge,.5);
      grid.lineBetween(x+6,y+5,x+bw-6,y+bh*.78-5);
      grid.lineBetween(x+bw-6,y+5,x+6,y+bh*.78-5);
    }
    // Lamps mark the edge of the plaza, giving characters a grounded scale.
    for(let i=0;i<8;i++){
      const x=w*(.045+i*.13);
      grid.fillStyle(p.dark,1);grid.fillRect(x-3,horizon-24,6,30);
      grid.fillStyle(p.accent,.95);grid.fillCircle(x,horizon-24,4);
      grid.fillStyle(p.accent,.12);grid.fillCircle(x,horizon-24,12);
    }
  }
  private drawExplore(w: number, h: number): void {
    const s = this.state;
    if (!s) return;
    const last=this.lastFieldPosition?.area===s.area?this.lastFieldPosition:null;
    const start=last?[last.x,last.y]:[.19,.73];
    const positions = [start,[start[0]-.06,start[1]+.03],[start[0]+.06,start[1]+.04]];
    this.avatars = s.party.flatMap((hero, i) => {
      if (i === 2 && !s.flags.ritz) return [];
      const [px,py] = positions[i];
      const artKey=this.textures.exists('field-'+hero.id)?'field-'+hero.id:'battle-'+hero.id;
      const illustrated=this.textures.exists(artKey);
      const sprite = this.track(this.add.sprite(px*w,py*h,illustrated?artKey:`${hero.id}-step-0`).setDepth(7-i).setOrigin(.5,1));
      if(illustrated){
        const img=sprite.texture.getSourceImage() as HTMLImageElement;
        const maxW=w<550?55:82,maxH=w<550?96:138;
        sprite.setScale(Math.min(maxW/Math.max(img.width,1),maxH/Math.max(img.height,1)));
      }else sprite.setScale(Math.max(.8,Math.min(1.42,w/690)));
      return [sprite];
    });
    this.drawNpcPatrols(w,h,s.area);
    for (const obstacle of OBSTACLES[s.area]) {
      this.track(this.add.rectangle((obstacle.x + obstacle.w / 2) * w, (obstacle.y + obstacle.h / 2) * h, obstacle.w * w, obstacle.h * h, 0x11283c, .26).setStrokeStyle(1, 0xd5b982, .32).setDepth(3));
    }
    const storyGoal=!s.flags.sena?'sena':!s.flags.sign?'sign':!s.flags.ritz?'ritz':!s.flags.lamp?'lamp':!s.flags.key?'key':!s.flags.boss?'boss':'escape';
    const goalArea:Record<string,Area>={sena:'harbor',sign:'harbor',ritz:'corridor',lamp:'corridor',key:'corridor',boss:'vault',escape:'dock'};
    const highlighted=SITES[s.area][storyGoal]?storyGoal:
      s.area==='market'||s.area==='observatory'?'to-harbor':
      s.area==='harbor'?'to-corridor':
      s.area==='corridor'?(goalArea[storyGoal]==='harbor'?'to-harbor':'to-vault'):
      s.area==='vault'?(goalArea[storyGoal]==='dock'?'to-dock':'to-corridor'):'to-vault';
    for (const [id, coords] of Object.entries(SITES[s.area])) {
      const x = Math.min(w-26, Math.max(26, coords.x * w)), y = Math.min(h-35, Math.max(52, coords.y * h));
      const main=id===highlighted;
      const ring = this.add.circle(x, y, w < 500 ? 13 : 19, main?0xe9b96c:0x75cecd, main?.25:.06)
        .setStrokeStyle(main?2.6:1.1,main?0xffe0a5:0x9cc8c7,main?1:.48).setDepth(4);
      const dot = this.add.circle(x, y, main?5:3, main?0xffe0a5:0xa2d6d3, main?1:.55).setDepth(5);
      const name = this.add.text(x, y - 33, LABELS[id] || id, { fontFamily: 'Noto Sans JP, sans-serif', fontSize: w < 550 ? '10px' : '12px', color: main?'#fff2c7':'#d3e1e3', backgroundColor: '#061827c9', padding: {x:5,y:3} }).setOrigin(.5,.5).setDepth(6).setAlpha(main?1:.62);
      this.markerObjects.push(ring,dot,name);
      ring.setInteractive({ useHandCursor: true });
      ring.on('pointerdown', (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation(); this.walkTo({ id, area: s.area }, true);
      });
      if (!this.reducesMotion && main) this.tweens.add({targets: ring, scale: 1.19, alpha: .52, duration: 1150, yoyo:true, repeat:-1});
    }
  }
  private drawNpcPatrols(w:number,h:number,area:Area):void {
    const patterns:Record<Area,Array<{id:string;skin:string;color:number}>>={
      harbor:[{id:'sena',skin:'sena',color:0xc6e5ed}],
      corridor:[{id:'ritz',skin:'ritz',color:0xe8b48e}],
      vault:[],dock:[],
      market:[{id:'merchant',skin:'ritz',color:0xf6d49a},{id:'navigator',skin:'noel',color:0xb6d7ed}],
      observatory:[{id:'scholar',skin:'sena',color:0xc5b6f6}],
    };
    for(const [i,npc] of patterns[area].entries()){
      const pos=SITES[area][npc.id];if(!pos)continue;
      const illustration=(npc.id==='sena'||npc.id==='ritz')&&this.textures.exists('battle-'+npc.skin);
      const key=illustration?'battle-'+npc.skin:npc.skin+'-step-0';
      const sprite=this.track(this.add.sprite(pos.x*w,pos.y*h+20,key).setOrigin(.5,1).setDepth(6));
      if(illustration){
        const img=sprite.texture.getSourceImage() as HTMLImageElement;
        sprite.setScale(Math.min(66/Math.max(img.width,1),114/Math.max(img.height,1)));
      }else sprite.setScale(.64).setTint(npc.color);
      const targetX=Phaser.Math.Clamp(pos.x*w+(i%2?27:-26),25,w-25);
      const tween=this.tweens.add({targets:sprite,x:targetX,duration:2400+i*500,ease:'Sine.easeInOut',yoyo:true,repeat:-1,paused:this.reducesMotion});
      this.npcActors.push({sprite,tween});
    }
  }
  private drawBattle(w: number, h: number): void {
    const s=this.state;
    if(!s?.battle) return;
    const boss=s.battle.kind==='boss';
    const layout=battleArtLayout(w,h);
    const cx=layout.enemy.x, cy=h*.49;
    this.track(this.add.ellipse(cx,layout.enemy.y,boss?150:100,22,0x07111b,.5).setDepth(4));
    if(boss && this.textures.exists('battle-bell')) {
      const image=this.add.image(0,0,'battle-bell').setOrigin(.5,1);
      const source=image.texture.getSourceImage() as HTMLImageElement;
      const size=fitArtwork(source.width,source.height,layout.enemy.maxWidth,layout.enemy.maxHeight);
      image.setDisplaySize(size.width,size.height);
      this.foe=this.track(this.add.container(cx,layout.enemy.y,[image]).setDepth(6));
    } else {
      const ring=this.track(this.add.circle(cx,cy,boss?61:45,0x0d2034,.45).setStrokeStyle(boss?11:7,0xd6bc8e,.85).setDepth(6));
      const iris=this.track(this.add.circle(cx,cy,boss?24:18,0xbde5d9,.98).setStrokeStyle(5,0x765e4b).setDepth(7));
      if(!this.reducesMotion)this.tweens.add({targets:iris,alpha:.52,duration:950,yoyo:true,repeat:-1});
      void ring;
    }
    const halo=this.track(this.add.circle(cx,cy,boss?79:58,0x9de8e1,.03).setStrokeStyle(2,0x9de8e1,.75).setDepth(5));
    if(!this.reducesMotion)this.tweens.add({targets:halo,scale:1.14,alpha:.35,duration:1600,yoyo:true,repeat:-1});
    this.avatars=s.party.flatMap((hero,i)=>{
      if(i===2&&!s.flags.ritz)return[];
      const slot=layout.heroes[i];
      const illustrated=this.textures.exists('battle-'+hero.id);
      const texture=illustrated?'battle-'+hero.id:`${hero.id}-step-0`;
      const sprite=this.track(this.add.sprite(slot.x,slot.y,texture).setOrigin(.5,1).setDepth(8));
      if(illustrated){
        const source=sprite.texture.getSourceImage() as HTMLImageElement;
        const size=fitArtwork(source.width,source.height,slot.maxWidth,slot.maxHeight);
        sprite.setDisplaySize(size.width,size.height);
      }else sprite.setScale(Math.max(.8,Math.min(1.35,w/760)));
      this.track(this.add.ellipse(slot.x,slot.y-3,Math.min(65,w*.10),10,0x07111b,.35).setDepth(4));
      const ring=this.track(this.add.ellipse(slot.x,slot.y-4,Math.min(75,w*.12),13,0x80ead7,.08).setStrokeStyle(1.5,0x80ead7,.9).setDepth(5));
      this.battleActors.push({heroId:hero.id,sprite,ring});
      return[sprite];
    });
    this.game.canvas.dataset.battleArt=this.battleActors.every(a=>a.sprite.texture.key.startsWith('battle-'))?'illustrated':'fallback';
    this.game.canvas.dataset.enemyArt=boss&&this.textures.exists('battle-bell')?'illustrated':'procedural';
    this.syncBattleActors();
  }
  private syncBattleActors():void {
    const state=this.state;
    if(!state?.battle)return;
    const current=activeHero(state);
    for(const actor of this.battleActors){
      const index=state.party.findIndex(h=>h.id===actor.heroId);
      const alive=state.party[index]?.hp>0;
      actor.sprite.setAlpha(alive?1:.35);
      if(alive)actor.sprite.clearTint();else actor.sprite.setTint(0x718091);
      actor.ring.setVisible(alive && index===current);
    }
  }
  sync(state: GameView | null): void {
    const previous=this.state;
    this.state=state;
    const key=state && state.phase!=='ending' ? `${state.area}:${state.phase}`:'';
    if(key!==this.sceneKey){this.sceneKey=key;this.draw();return;}
    if(state?.phase==='battle' || state?.phase==='defeat')this.syncBattleActors();
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
    if (!this.state || this.state.phase!=='explore') return;
    const w=this.scale.width,h=this.scale.height, x=pointer.x,y=pointer.y;
    if(y>h*.84) return; // leave the bottom dialogue/scene copy unobstructed
    const best=Object.entries(SITES[this.state.area]).map(([id,p])=>({id,distance:Phaser.Math.Distance.Between(x,y,p.x*w,p.y*h)})).sort((a,b)=>a.distance-b.distance)[0];
    if(best && best.distance<(w<500?31:39)) this.walkTo({id:best.id,area:this.state.area},true);
    else this.animateWalk(Phaser.Math.Clamp(x,20,w-20),Phaser.Math.Clamp(y,h*.39,h*.82));
  }
  private setFieldFrame(sprite:Phaser.GameObjects.Sprite,id:string,time:number,moving:boolean):void {
    if(this.textures.exists('field-'+id)||this.textures.exists('battle-'+id)){
      sprite.setAngle(moving&&!this.reducesMotion?Math.sin(time/135)*2.5:0);
    }else{
      sprite.setTexture(`${id}-step-${moving&&!this.reducesMotion?Math.floor(time/110)%4:0}`);
    }
  }
  private animateWalk(x:number,y:number,onArrive?:()=>void):void {
    const lead=this.avatars[0];
    if(!lead||!this.state)return;
    const w=this.scale.width,h=this.scale.height;
    const area=this.state.area;
    const route=routeTo(area,{x:lead.x/w,y:lead.y/h},{x:x/w,y:y/h});
    if(!route.length && Math.hypot(x-lead.x,y-lead.y)<Math.max(12,w*.012)){
      onArrive?.();
      return;
    }
    if(!route.length){
      window.dispatchEvent(new CustomEvent('lv:navigation-feedback',{detail:{message:'そこには進めません。別の場所をタップしてください。'}}));
      return;
    }
    this.walkGeneration++;
    const generation=this.walkGeneration;
    this.tweens.killTweensOf(lead);
    this.isWalking=true;
    const move=(index:number):void=>{
      if(generation!==this.walkGeneration)return;
      if(!this.state||this.state.phase!=='explore'||this.state.area!==area){this.isWalking=false;return;}
      if(index>=route.length){this.isWalking=false;this.setFieldFrame(lead,'noel',this.time.now,false);onArrive?.();return;}
      const point=route[index], px=point.x*w,py=point.y*h;
      const distance=Phaser.Math.Distance.Between(lead.x,lead.y,px,py);
      const duration=this.reducesMotion?25:Math.max(30,distance*3.3);
      this.tweens.add({targets:lead,x:px,y:py,duration,ease:'Linear',onUpdate:()=>{
        this.setFieldFrame(lead,'noel',this.time.now,true);
        this.avatars.slice(1).forEach((sprite,i)=>{
          sprite.x=Phaser.Math.Linear(sprite.x,lead.x-45+i*78,.13);
          sprite.y=Phaser.Math.Linear(sprite.y,lead.y+11,.13);
        });
      },onComplete:()=>move(index+1)});
    };
    move(0);
  }
  private combatEffect({command,broke,won}:{command:Command;broke:boolean;won:boolean}):void {
    if(!this.state || (this.state.phase!=='battle'&&this.state.phase!=='explore'))return;
    const w=this.scale.width,h=this.scale.height;
    const index=this.state.battle?activeHero(this.state):null;
    const id=index===null?null:this.state.party[index]?.id;
    const from=this.battleActors.find(a=>a.heroId===id)?.sprite;
    const x=from?.x??w*.7,y=(from?.y??h*.7)-h*.15;
    const color=command==='arts'?0x92c8ff:command==='echo'?0xa7f6ef:command==='guard'?0xf0d59d:0xffd4a4;
    if(this.reducesMotion)return;
    if(command==='guard'){
      const ward=this.add.circle(x,y,28,0xf0d59d,.12).setStrokeStyle(2,0xf0d59d,.8).setDepth(20);
      this.tweens.add({targets:ward,scale:1.6,alpha:0,duration:450,onComplete:()=>ward.destroy()});
      return;
    }
    for(let i=0;i<9;i++){
      const spark=this.add.circle(x+(i-4)*7,y,3.5,color,.9).setDepth(20);
      this.tweens.add({targets:spark,x:w*.33+(i-4)*12,y:h*.43+(i%3-1)*18,alpha:0,scale:.25,duration:300+i*25,onComplete:()=>spark.destroy()});
    }
    if(broke||won)this.cameras.main.flash(150,190,235,220);
  }
  private nearestInteractable(): {id:string;name:string} | null {
    if(!this.state||this.state.phase!=='explore'||!this.avatars[0])return null;
    const lead=this.avatars[0],w=this.scale.width,h=this.scale.height;
    const nearest=Object.entries(SITES[this.state.area])
      .map(([id,p])=>({id,name:LABELS[id]||id,d:Math.hypot((p.x*w-lead.x)/w,(p.y*h-lead.y)/h)}))
      .sort((a,b)=>a.d-b.d)[0];
    return nearest&&nearest.d<.115?{id:nearest.id,name:nearest.name}:null;
  }
  private interactNearby():void {
    if(document.querySelector('dialog[open]')||this.isWalking)return;
    const nearest=this.nearestInteractable();
    if(nearest)window.dispatchEvent(new CustomEvent('lv:hotspot',{detail:{id:nearest.id}}));
  }
  private updateProximity():void {
    const nearest=this.nearestInteractable();
    const id=nearest?.id||null;
    if(id!==this.proximityId){
      this.proximityId=id;
      window.dispatchEvent(new CustomEvent('lv:proximity',{detail:{id,name:nearest?.name||null}}));
    }
  }
  update(time:number,delta:number):void {
    if(!this.state || this.state.phase!=='explore' || this.avatars.length===0) return;
    this.updateProximity();
    const lead=this.avatars[0];
    this.game.canvas.dataset.playerX=(lead.x/this.scale.width).toFixed(4);
    this.game.canvas.dataset.playerY=(lead.y/this.scale.height).toFixed(4);
    // Manual input always takes priority over an automatic click-to-walk route.
    if(this.isWalking && this.keys.some(key=>key.isDown))this.cancelCallback();
    if(this.isWalking)return;
    const pauseNpc=document.hidden||!!document.querySelector('dialog[open]')||this.reducesMotion;
    for(const npc of this.npcActors){if(pauseNpc)npc.tween.pause();else npc.tween.resume();}
    if(document.hidden || document.querySelector('dialog[open]'))return;
    const typing=document.activeElement;
    if(typing && (typing.tagName==='INPUT'||typing.tagName==='SELECT'||typing.tagName==='TEXTAREA'||(typing.tagName==='BUTTON' && !!typing.closest('#hotspots'))))return;
    let vx=0,vy=0;
    const pressed=(k:string)=>this.keys.some(key=>key.isDown&&key.keyCode===Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes]);
    if(pressed('LEFT')||pressed('A'))vx--;
    if(pressed('RIGHT')||pressed('D'))vx++;
    if(pressed('UP')||pressed('W'))vy--;
    if(pressed('DOWN')||pressed('S'))vy++;
    if(this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) { this.interactNearby();return; }
    if(vx||vy){
      const m=Math.hypot(vx,vy);const speed=.23*delta;
      const nx=Phaser.Math.Clamp(lead.x+vx/m*speed,18,this.scale.width-18);
      const ny=Phaser.Math.Clamp(lead.y+vy/m*speed,this.scale.height*.35,this.scale.height*.82);
      if(walkable(this.state.area,nx/this.scale.width,ny/this.scale.height)){lead.x=nx;lead.y=ny;}
      else if(walkable(this.state.area,nx/this.scale.width,lead.y/this.scale.height))lead.x=nx;
      else if(walkable(this.state.area,lead.x/this.scale.width,ny/this.scale.height))lead.y=ny;
      this.setFieldFrame(lead,'noel',time,true);
      for(const [i,s] of this.avatars.slice(1).entries()){
        s.x=Phaser.Math.Linear(s.x,lead.x-45+i*78,.07);
        s.y=Phaser.Math.Linear(s.y,lead.y+11,.07);
        this.setFieldFrame(s,i===0?'sena':'ritz',time,true);
      }
      if(time-this.lastFootstep>420){this.lastFootstep=time;window.dispatchEvent(new CustomEvent('lv:sfx',{detail:{name:'step'}}));}
    }else this.avatars.forEach((s,i)=>this.setFieldFrame(s,['noel','sena','ritz'][i],time,false));
  }
}

