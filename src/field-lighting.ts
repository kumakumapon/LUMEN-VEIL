import Phaser from 'phaser';
import type { Area } from './types';

/** Shared lighting language for the painted sky, stonework and character art.
 * Decorative only: movement collision and the saved game are untouched.
 */
export const AREA_LIGHT:Record<Area,{haze:number;warm:number;cool:number;tint:number}>={
  harbor:{haze:0xa6d8e3,warm:0xf7d6a0,cool:0x83c9d6,tint:0xfff5e7},
  corridor:{haze:0x96b6ce,warm:0xd7c5a8,cool:0x9cbbd5,tint:0xeaf3ff},
  vault:{haze:0x879fbe,warm:0xc7c0e3,cool:0x9bd5e2,tint:0xe5efff},
  dock:{haze:0xe6c5a3,warm:0xffdda8,cool:0x93d6dc,tint:0xffead8},
  market:{haze:0xe5c4a7,warm:0xf6cf96,cool:0xa2d6d4,tint:0xfff0dc},
  observatory:{haze:0xa4a9d7,warm:0xe6cfad,cool:0xa5d9e9,tint:0xececff},
};
export function tintFieldActor(sprite:Phaser.GameObjects.Sprite,area:Area):void{
  sprite.setTint(AREA_LIGHT[area].tint);
}
export function drawHorizonMist(g:Phaser.GameObjects.Graphics,area:Area,w:number,h:number):void{
  const p=AREA_LIGHT[area],top=h*.29;
  // Feather the abrupt painted-background / solid-ground boundary.
  g.fillGradientStyle(p.haze,p.haze,p.cool,p.cool,.08,.08,.22,.22);
  g.fillRect(0,top,w,h*.27);
  for(let i=0;i<9;i++){
    const y=h*(.31+i*.021);
    const alpha=.15*(1-i/9);
    g.fillStyle(i%2?p.warm:p.haze,alpha);
    g.fillRect(0,y,w,h*.018);
  }
  // Perspective reflections make the painted skyline feel part of the plaza.
  for(let i=0;i<15;i++){
    const x=w*(.055+i*.063),y=h*(.43+(i%5)*.087);
    g.fillStyle(i%3===0?p.warm:p.cool,.07+(i%4)*.015);
    g.fillEllipse(x,y,w*(.018+(i%3)*.009),h*.008);
  }
  g.fillStyle(p.warm,.10);
  g.fillEllipse(w*.73,h*.42,w*.26,h*.075);
  g.fillStyle(p.cool,.07);
  g.fillEllipse(w*.18,h*.49,w*.20,h*.085);
}
