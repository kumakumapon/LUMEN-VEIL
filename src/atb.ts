import type { GameView } from './types';

/** A deterministic presentation-time ATB gate. No v1 save fields are changed. */
export class AtbDirector {
  private state: GameView | null = null;
  private signature = '';
  private fraction = 0;
  private clock = 0;
  private paused = false;
  private readonly chargeMs = 440;

  sync(state: GameView | null): void {
    this.state = state;
    if (state?.phase !== 'battle' || !state.battle) {
      this.signature = ''; this.fraction = 0; this.draw(); return;
    }
    const signature = `${state.area}/${state.battle.kind}/${state.battle.count}`;
    if (signature !== this.signature) {
      this.signature = signature;
      this.fraction = .08;
      this.clock = performance.now();
    }
    this.draw();
  }
  get ready(): boolean { return this.state?.phase === 'battle' && this.fraction >= 1; }
  frame(now: number): void {
    if (this.state?.phase !== 'battle' || !this.state.battle) return;
    const delta = Math.min(100, Math.max(0, now - (this.clock || now)));
    this.clock = now;
    const wasReady = this.ready;
    const modal = document.getElementById('overlay') as HTMLDialogElement | null;
    if (!wasReady && !document.hidden && !modal?.open && !this.paused) {
      this.fraction = Math.min(1, this.fraction + delta / this.chargeMs);
    }
    if (!wasReady || !this.ready) this.draw();
  }
  setPaused(paused: boolean): void { this.paused = paused; this.clock = performance.now(); }
  private draw(): void {
    const state=this.state;
    const bar=document.getElementById('atb-fill') as HTMLProgressElement | null;
    const status=document.getElementById('atb-status');
    const name=document.getElementById('atb-name');
    if(bar)bar.value=Math.round(this.fraction*100);
    if(status)status.textContent=this.ready?'WAIT / READY':'CHARGING';
    if(name && state?.battle){
      const actor=state.party[state.battle.actorIndex]?.name;
      name.textContent=actor||'WAIT';
    }
    const panel=document.getElementById('battle-panel');
    panel?.classList.toggle('atb-ready',this.ready);
    if (state?.phase !== 'battle') return;
    for(const button of document.querySelectorAll<HTMLButtonElement>('[data-command]')){
      const action=button.dataset.command;
      const hero=state.party[state.battle!.actorIndex];
      const enough=action==='echo'?state.resonance>=100&&!!state.battle!.lastAction:
        action==='arts'?!!hero&&hero.mp>=8:true;
      button.disabled=!this.ready||!enough;
    }
  }
}
