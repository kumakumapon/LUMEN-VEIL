import type Phaser from 'phaser';
import type { Area } from './types';

/** Foreground architecture keeps the existing painted skyline but gives each
 * area its own recognizable objects and a common gold/teal material language.
 * Decorations do not change the collision grid or legacy save data.
 */
export function drawAreaDressing(g:Phaser.GameObjects.Graphics,area:Area,w:number,h:number):void{
 const y=h*.35;
 const gold=0xe7c994,stone=0x526d75,ink=0x20394a,teal=0x8bd6cf;
 function lantern(x:number,height:number){
   g.fillStyle(ink,1);g.fillRect(x-3,y-height,6,height+3);
   g.fillStyle(gold,.22);g.fillCircle(x,y-height,18);
   g.fillStyle(gold,.95);g.fillRoundedRect(x-7,y-height-11,14,17,3);
   g.lineStyle(2,ink,.8);g.strokeRoundedRect(x-7,y-height-11,14,17,3);
 }
 function flowerBed(x:number,width:number){
   g.fillStyle(ink,1);g.fillRoundedRect(x,y-5,width,12,3);
   g.fillStyle(stone,1);g.fillRoundedRect(x+3,y-11,width-6,8,3);
   for(let i=0;i<Math.floor(width/11);i++){
     const cx=x+7+i*11;
     g.fillStyle(i%3===0?gold:i%3===1?0xa3d7bf:0xf1aeb4,.85);
     g.fillCircle(cx,y-14-(i%2)*4,2.5);
   }
 }
 if(area==='market'){
   // Two independent stalls: canvas canopy, crates and brass signage.
   for(const [x,scale,shade] of [[w*.04,.85,0xa95d62],[w*.77,.76,0x4c8794]] as const){
     const width=w*.23*scale,roofY=y-h*.13;
     g.fillStyle(ink,.95);g.fillRect(x+width*.08,roofY,width*.84,h*.12);
     g.fillStyle(stone,1);g.fillRect(x+5,roofY+h*.1,width-10,h*.025);
     g.fillStyle(shade,1);g.fillTriangle(x,roofY+14,x+width*.5,roofY-22,x+width,roofY+14);
     for(let i=0;i<7;i++){
       g.fillStyle(i%2===0?0xf4d9ac:shade,.95);
       g.fillTriangle(x+width*i/7,roofY+13,x+width*(i+.5)/7,roofY-4,x+width*(i+1)/7,roofY+13);
     }
     g.lineStyle(2,gold,.8);g.lineBetween(x+4,roofY+16,x+width-4,roofY+16);
     for(let i=0;i<3;i++){
       g.fillStyle(0x986d48,1);g.fillRoundedRect(x+12+i*width*.25,roofY+h*.085,14,10,2);
       g.fillStyle(gold,.65);g.fillCircle(x+19+i*width*.25,roofY+h*.085,4);
     }
   }
   flowerBed(w*.37,w*.22);lantern(w*.7,h*.13);
 }else if(area==='observatory'){
   // The star observatory is immediately recognizable without text labels.
   const cx=w*.77,cy=y-h*.08,r=Math.min(w*.095,h*.17);
   g.fillStyle(ink,.95);g.fillRect(cx-8,cy+5,16,h*.12);
   g.fillStyle(stone,1);g.fillRoundedRect(cx-45,cy+h*.105,90,12,3);
   g.lineStyle(5,gold,.95);g.strokeCircle(cx,cy,r);
   g.lineStyle(3,teal,.9);g.strokeEllipse(cx,cy,r*1.45,r*.55);
   g.lineStyle(2,gold,.9);g.lineBetween(cx-r,cy,cx+r,cy);
   g.lineBetween(cx,cy-r,cx,cy+r);
   g.fillStyle(0xa7e7ef,.9);g.fillCircle(cx,cy,8);
   for(let i=0;i<6;i++){
     const angle=i*Math.PI/3;
     g.fillStyle(gold,.8);g.fillCircle(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r,2.5);
   }
   flowerBed(w*.12,w*.22);lantern(w*.51,h*.12);
 }else if(area==='harbor'||area==='dock'){
   lantern(w*.09,h*.13);lantern(w*.92,h*.13);
   flowerBed(w*.35,w*.18);
 }else if(area==='corridor'||area==='vault'){
   g.fillStyle(stone,.95);g.fillRoundedRect(w*.05,y-h*.075,w*.13,h*.075,4);
   g.lineStyle(3,gold,.65);g.strokeCircle(w*.12,y-h*.035,h*.035);
   lantern(w*.88,h*.12);
 }
}
