import Phaser from 'phaser';
import type { Area } from './types';
import { scenePalette } from './scene-atmosphere';

/** The same lighting source drives the sky painting, foreground and actors.
 * Decorative only: navigation geometry and save data are never modified.
 */
const ACTOR_TINT:Record<Area,number>={
  harbor:0xfff5e7,corridor:0xeaf3ff,vault:0xe5efff,
  dock:0xffead8,market:0xfff0dc,observatory:0xececff
};
export function tintFieldActor(sprite:Phaser.GameObjects.Sprite,area:Area):void{
  sprite.setTint(ACTOR_TINT[area]);
}
export function drawHorizonMist(g:Phaser.GameObjects.Graphics,area:Area,w:number,h:number):void{
  const p=scenePalette(area),top=h*.29;
  // Feather the painted skyline into the solid navigable paving.
  g.fillGradientStyle(p.sky,p.sky,p.shadow,p.shadow,.08,.08,.20,.20);
  g.fillRect(0,top,w,h*.27);
  for(let i=0;i<9;i++){
    const y=h*(.31+i*.021);
    const alpha=.15*(1-i/9);
    g.fillStyle(i%2?p.glow:p.sky,alpha);
    g.fillRect(0,y,w,h*.018);
  }
  // Repeated reflected colors connect the foreground to the original painting.
  for(let i=0;i<15;i++){
    const x=w*(.055+i*.063),y=h*(.43+(i%5)*.087);
    g.fillStyle(i%3===0?p.glow:p.sky,.07+(i%4)*.015);
    g.fillEllipse(x,y,w*(.018+(i%3)*.009),h*.008);
  }
  g.fillStyle(p.glow,.10);
  g.fillEllipse(w*.73,h*.42,w*.26,h*.075);
  g.fillStyle(p.sky,.07);
  g.fillEllipse(w*.18,h*.49,w*.20,h*.085);
}
