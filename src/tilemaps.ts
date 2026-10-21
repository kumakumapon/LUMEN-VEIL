import type { Area } from './types';
import { OBSTACLES } from './navigation.ts';
export const TILE_COLUMNS = 40;
export const TILE_ROWS = 20;
export const TILE_MIN_Y = .35;
export const TILE_MAX_Y = .82;
export type TileKind = 0 | 1 | 2 | 3 | 4 | 5;
export type Tile = { col:number; row:number; x:number; y:number; kind:TileKind; blocked:boolean };
const SEEDS:Record<Area,number>={harbor:11,corridor:19,vault:29,dock:37,market:43,observatory:59};
// Every scene uses a reproducible, data-driven grid. Tile boundaries align with
// the existing normalized navigation mesh, so legacy hotspots are unchanged.
export function createTiles(area:Area):Tile[] {
  const seed=SEEDS[area];
  return Array.from({length:TILE_COLUMNS*TILE_ROWS},(_,index)=>{
    const col=index%TILE_COLUMNS,row=Math.floor(index/TILE_COLUMNS);
    const x=.025+(col+.5)/TILE_COLUMNS*.95;
    const y=TILE_MIN_Y+(row+.5)/TILE_ROWS*(TILE_MAX_Y-TILE_MIN_Y);
    const obstacle=OBSTACLES[area].some(o=>x>=o.x-.01&&x<=o.x+o.w+.01&&y>=o.y-.01&&y<=o.y+o.h+.01);
    const value=(col*17+row*31+seed*7+(col*row)%11)%23;
    const kind:TileKind=obstacle?3:(row===0||row===TILE_ROWS-1)?4:
      area==='dock'&&value<5?5:area==='observatory'&&value<4?2:
      area==='market'&&value<6?1:value<3?2:value<7?1:0;
    return {col,row,x,y,kind,blocked:obstacle};
  });
}
export function tileAt(area:Area,x:number,y:number):Tile|null{
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<.025||x>.975||y<TILE_MIN_Y||y>TILE_MAX_Y)return null;
  const col=Math.min(TILE_COLUMNS-1,Math.floor((x-.025)/.95*TILE_COLUMNS));
  const row=Math.min(TILE_ROWS-1,Math.floor((y-TILE_MIN_Y)/(TILE_MAX_Y-TILE_MIN_Y)*TILE_ROWS));
  return createTiles(area)[row*TILE_COLUMNS+col];
}
