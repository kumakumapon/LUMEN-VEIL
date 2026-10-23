import type Phaser from 'phaser';
import type { Area } from './types';

/** Shared painterly light direction for all six existing scene paintings.
 *  Purely visual: does not alter collision tiles, quest flags, or save data.
 */
const LIGHT:Record<Area,{sky:number;shadow:number;glow:number;warmth:number}>={
  harbor:{sky:0x90c9e6,shadow:0x102f48,glow:0xf3d39a,warmth:.17},
  market:{sky:0xaed2df,shadow:0x243f50,glow:0xf6c98a,warmth:.24},
  corridor:{sky:0x8fb8d2,shadow:0x132b46,glow:0xa5e0ea,warmth:.12},
  observatory:{sky:0x9caed7,shadow:0x1b2c51,glow:0xd7c6ff,warmth:.15},
  vault:{sky:0x739ab8,shadow:0x102039,glow:0xa7d5e5,warmth:.10},
  dock:{sky:0x9fc7e5,shadow:0x163449,glow:0xf3c995,warmth:.22}
};
export function scenePalette(area:Area){return LIGHT[area];}
export function drawSceneAtmosphere(g:Phaser.GameObjects.Graphics,area:Area,w:number,h:number):void{
  const p=LIGHT[area];
  // Light rays remain in the skyline; the tilemap owns the ground below y=.32.
  g.fillGradientStyle(p.sky,p.sky,p.shadow,p.shadow,.13,.09,.19,.22);
  g.fillRect(0,0,w,h*.34);
  const glowX=(area==='observatory'||area==='corridor')?w*.74:w*.82;
  const glowY=h*.12;
  for(let i=4;i>=1;i--){
    g.fillStyle(p.glow,(.009+p.warmth*.018)/i);
    g.fillEllipse(glowX,glowY,w*(.12+i*.095),h*(.11+i*.09));
  }
  g.lineStyle(1.2,p.glow,.24);
  g.lineBetween(0,h*.325,w,h*.325);
  // Warm reflected rim light on the horizon ties the sky painting to the floor.
  g.fillGradientStyle(p.glow,p.glow,p.shadow,p.shadow,.13,.13,0,0);
  g.fillRect(0,h*.32,w,h*.035);
}
