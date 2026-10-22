/** Hand-authored HD-2D-inspired field figures, not recolored hero portraits.
 *  Four facings × four gait phases for every named actor.
 *  The cinematic portraits remain separate in battle and dialogue.
 */
export type Facing = 'down'|'up'|'left'|'right';
export const FACINGS:Facing[]=['down','up','left','right'];
export const FIELD_ACTORS=['noel','sena','ritz','merchant','navigator','scholar'] as const;
export type FieldActor=typeof FIELD_ACTORS[number];
type Look={coat:string;shadow:string;accent:string;hair:string;skin:string;hat:'none'|'cap'|'goggles'|'beret'|'hood'|'crown';cape:boolean;skirt:boolean;tool:'sword'|'staff'|'wrench'|'satchel'|'chart'|'book'};
const looks:Record<FieldActor,Look>={
 noel:{coat:'#2c435a',shadow:'#14263b',accent:'#d9bd81',hair:'#192335',skin:'#e6b99b',hat:'none',cape:true,skirt:false,tool:'sword'},
 sena:{coat:'#e4e8ee',shadow:'#65758f',accent:'#7dbbd0',hair:'#d9d4e9',skin:'#f3cdb9',hat:'crown',cape:true,skirt:true,tool:'staff'},
 ritz:{coat:'#ac7851',shadow:'#4c5b61',accent:'#e7c788',hair:'#b97c52',skin:'#efc3a0',hat:'goggles',cape:false,skirt:false,tool:'wrench'},
 merchant:{coat:'#9c4b54',shadow:'#553c4d',accent:'#e6be7b',hair:'#50322f',skin:'#edc09c',hat:'beret',cape:false,skirt:true,tool:'satchel'},
 navigator:{coat:'#527789',shadow:'#243d58',accent:'#f0d49a',hair:'#c9b9a2',skin:'#dbb495',hat:'cap',cape:true,skirt:false,tool:'chart'},
 scholar:{coat:'#755f96',shadow:'#393e67',accent:'#d9c7f0',hair:'#9babbf',skin:'#efc6aa',hat:'hood',cape:true,skirt:true,tool:'book'},
};
export function facingFromDelta(dx:number,dy:number,last:Facing='down'):Facing {
 if(Math.abs(dx)<.001&&Math.abs(dy)<.001)return last;
 return Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
export function fieldTextureKey(id:FieldActor,dir:Facing,frame:number):string{
 return `walk-${id}-${dir}-${Math.max(0,Math.min(3,Math.floor(frame)))}`;
}
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}
function poly(c:CanvasRenderingContext2D,points:number[][],fill:string,stroke?:string){
 c.beginPath();c.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))c.lineTo(p[0],p[1]);c.closePath();
 c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.stroke();}
}
function line(c:CanvasRenderingContext2D,x:number,y:number,xx:number,yy:number,color:string,width:number){
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();
}
export function drawFieldFigure(c:CanvasRenderingContext2D,id:FieldActor,dir:Facing,frame:number):void{
 const v=looks[id],gait=[0,1,0,-1][frame],walk=frame!==0;
 c.clearRect(0,0,80,112);c.save();
 c.translate(40,3);
 // A fine outer silhouette and soft key light keep sprites legible on dark maps.
 c.shadowColor='#0b1c2b';c.shadowBlur=3;
 const side=dir==='left'||dir==='right',back=dir==='up';
 if(dir==='left')c.scale(-1,1);
 // Capes and coats are animated independently of the legs.
 if(v.cape)poly(c,[[-18,41],[-24-gait,85],[-8,88],[14,85],[22+gait,41]],v.shadow,'#c8d8d5');
 // Boots and legs.
 for(const [x,sign] of [[-9,1],[9,-1]] as const){
   const stride=gait*sign*4;
   line(c,x,73,x+stride,95,'#233344',9);
   line(c,x+stride,95,x+stride+(side?4:1),98,'#121e2c',10);
   line(c,x+stride,87,x+stride,92,v.accent,1.5);
 }
 // Tunic/skirt with a distinct garment silhouette.
 if(v.skirt)poly(c,[[-18,51],[17,51],[24,81],[-23,81]],v.coat,v.accent);
 else poly(c,[[-17,45],[17,45],[20,78],[4,82],[-20,78]],v.coat,v.accent);
 poly(c,[[-17,44],[-12,33],[10,33],[18,45],[16,63],[-16,63]],v.coat,v.accent);
 // Fabric folds and side lighting add material depth without changing silhouettes.
 c.save();
 c.globalAlpha=.35;
 for(let n=0;n<3;n++){
   const px=-10+n*10;
   line(c,px,55,px+(n-1)*3,76,n===1?'#f8e6c4':v.shadow,n===1?1.3:2);
 }
 c.restore();
 if(v.cape){
   line(c,-19,48,-21-gait,81,v.accent,1.2);
   line(c,17,46,18+gait,78,v.accent,1.2);
 }
 if(v.skirt){
   line(c,-17,79,20,79,v.accent,2);
 }
 // Sleeves: a walk cycle, not a static rotating picture.
 const arm=gait*5;
 line(c,-16,43,-19-arm,68,v.shadow,9);
 line(c,16,43,19+arm,67,v.shadow,9);
 ellipse(c,-19-arm,68,4,5,v.skin);ellipse(c,19+arm,67,4,5,v.skin);
 line(c,-11,57,12,57,v.accent,3);
 line(c,0,40,0,58,v.accent,2);
 if(id==='ritz'){ellipse(c,11,36,6,4,'#adadad');line(c,10,36,17,44,'#dcc591',2);}
 if(id==='sena'){ellipse(c,0,48,4,5,'#a6e7f1');}
 if(id==='merchant'){line(c,-13,52,16,60,'#dfb47e',4);ellipse(c,18,64,9,11,'#7b3f34');}
 // Neck, face, ears, hair and headgear.
 c.shadowBlur=0;line(c,0,34,0,39,v.skin,8);
 ellipse(c,0,22,15,17,v.skin);
 if(side){ellipse(c,11,25,3,5,v.skin);ellipse(c,6,24,2.5,3,'#344457');}
 else if(!back){ellipse(c,-6,24,2.3,3,'#2d4051');ellipse(c,6,24,2.3,3,'#2d4051');line(c,-3,32,3,32,'#b06d6d',1);}
 poly(c,[[-15,23],[-17,12],[-9,4],[5,3],[15,10],[17,22],[11,16],[4,13],[-4,17],[-11,14]],v.hair);
 if(back)poly(c,[[-15,14],[-12,7],[0,4],[12,8],[15,17],[13,31],[-13,31]],v.hair);
 if(v.hat==='goggles'){line(c,-14,13,14,13,'#433e38',5);ellipse(c,-7,12,6,4,'#e5c788');ellipse(c,7,12,6,4,'#e5c788');}
 if(v.hat==='beret'){ellipse(c,-3,9,20,7,'#743a44');line(c,-15,14,14,14,'#d9b37a',2);}
 if(v.hat==='cap'){ellipse(c,0,11,17,8,'#2c4c5e');line(c,0,14,18,14,'#edc783',4);}
 if(v.hat==='hood'){poly(c,[[-17,22],[-15,5],[0,-1],[16,5],[18,22],[14,16],[0,5],[-14,17]],v.shadow,v.accent);}
 if(v.hat==='crown'){line(c,-11,11,12,11,'#86d4e7',3);ellipse(c,0,6,4,5,'#b4ebf3');}
 // Small embroidered seams, jewelry and reflected light echo the painterly
 // portraits while retaining the readable proportions of an HD-2D sprite.
 c.save();c.globalAlpha=.65;
 line(c,-13,41,-9,38,'#fff1d6',1.4);
 line(c,12,42,8,39,v.accent,1.6);
 if(id==='merchant')ellipse(c,-11,46,2.6,2.6,'#e7bf88');
 if(id==='navigator')line(c,-9,20,9,20,'#e3c990',1.6);
 if(id==='scholar')ellipse(c,0,46,3.5,3.5,'#ddd1f5');
 c.restore();
 // Distinct profession accessories.
 if(v.tool==='sword'){line(c,19,49,26,83,'#d3dce1',3);line(c,18,53,29,52,v.accent,4);}
 if(v.tool==='staff'){line(c,22,42,27,94,'#dfcfb2',3);ellipse(c,21,37,7,8,'#8bd7ec');}
 if(v.tool==='wrench'){line(c,24,52,26,84,'#c4cdd0',4);ellipse(c,24,50,5,7,'#a3bac1');}
 if(v.tool==='chart'){poly(c,[[16,58],[31,60],[29,78],[14,74]],'#e9ddbc','#aa936d');}
 if(v.tool==='book'){poly(c,[[14,54],[28,54],[29,72],[14,72]],'#c2b0df','#e9d8b4');}
 // Feet contact and an extremely subtle fabric glint.
 line(c,-16,42,-7,40,'#f6edce',1);
 if(walk)line(c,-7,78,8,78,v.accent,1);
 c.restore();
}
