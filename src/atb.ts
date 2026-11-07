import {activeHero} from '../web/model.mjs';
import type {GameView} from './types';
/** Turn commands are immediately available; combat time never advances while choosing. */
export class AtbDirector {
 private state:GameView|null=null;
 get ready():boolean{return this.state?.phase==='battle';}
 sync(state:GameView|null):void{this.state=state;this.draw();}
 frame(_now:number):void{}
 setPaused(_paused:boolean):void{}
 private draw():void{
  const state=this.state;if(!state?.battle)return;
  const index=activeHero(state);const hero=index===null?null:state.party[index];
  const status=document.getElementById('atb-status');if(status)status.textContent='コマンド選択';
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-command]')){
   const action=button.dataset.command;
   button.disabled=!hero||(action==='echo'?(state.resonance<100||!state.battle.lastAction):action==='arts'?hero.mp<8:false);
  }
 }
}
