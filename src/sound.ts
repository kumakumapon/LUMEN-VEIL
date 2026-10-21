import type { GameView, Settings } from './types';

type Mood = 'harbor' | 'corridor' | 'vault' | 'dock' | 'battle' | 'ending' | 'title' | 'market' | 'observatory';
const MELODIES: Record<Mood, number[]> = {
  title:    [64, 67, 71, 74, 71, 67, 64, 59, 62, 66, 69, 71, 69, 66, 62, 59],
  harbor:   [64, 67, 71, 69, 67, 64, 62, 59, 64, 66, 69, 71, 69, 66, 64, 62],
  corridor: [57, 60, 64, 62, 60, 57, 55, 52, 57, 60, 62, 64, 62, 59, 57, 55],
  vault:    [53, 56, 60, 58, 56, 53, 51, 48, 53, 55, 58, 60, 58, 55, 53, 48],
  dock:     [69, 72, 76, 74, 72, 69, 67, 64, 69, 71, 74, 76, 74, 71, 69, 67],
  market:   [62, 66, 69, 74, 71, 69, 66, 62, 64, 67, 71, 74, 69, 67, 64, 62],
  observatory: [64, 71, 76, 74, 71, 67, 64, 60, 64, 69, 74, 76, 71, 69, 67, 64],
  battle:   [57, 64, 60, 67, 57, 65, 60, 69, 59, 66, 62, 69, 59, 67, 62, 71],
  ending:   [64, 69, 71, 76, 74, 71, 69, 67, 64, 67, 71, 74, 76, 74, 69, 64],
};
const MIDI=(n:number):number=>440*Math.pow(2,(n-69)/12);

/** Procedural, original short melodic themes. No network streams or copyrighted recordings. */
export class OriginalScore {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private started = false;
  private volume = .28;
  private mood: Mood = 'title';
  private step = 0;
  private next = 0;
  private ticker: number | null = null;
  private isHidden = document.hidden;

  constructor() {
    document.addEventListener('pointerdown', () => { void this.unlock(); }, { capture: true });
    document.addEventListener('keydown', () => { void this.unlock(); }, { capture: true });
    document.addEventListener('visibilitychange', () => { this.isHidden = document.hidden; void this.updateSuspend(); });
    window.addEventListener('pagehide', () => { void this.context?.suspend(); });
  }
  private async unlock():Promise<void>{
    if(this.volume<=0 || this.isHidden)return;
    if(!this.context){
      const Context=window.AudioContext;
      if(!Context)return;
      this.context=new Context();
      this.master=this.context.createGain();
      this.master.connect(this.context.destination);
      this.master.gain.setValueAtTime(Math.max(0,this.volume*.22),this.context.currentTime);
    }
    try { if(this.context.state==='suspended') await this.context.resume(); } catch { return; }
    if(!this.started){
      this.started=true;this.next=this.context.currentTime+.07;
      this.ticker=window.setInterval(()=>this.schedule(),120);
    }
  }
  private async updateSuspend():Promise<void>{
    if(!this.context)return;
    try{
      if(this.isHidden || this.volume<=0){ if(this.context.state==='running')await this.context.suspend(); }
      else if(this.started && this.context.state==='suspended'){ await this.context.resume(); this.next=this.context.currentTime+.05; }
    }catch{ /* restricted audio policy: silently keep playing the game */ }
  }
  setSettings(settings: Pick<Settings,'volume'>):void{
    this.volume=Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.28;
    if(this.master&&this.context){this.master.gain.setTargetAtTime(this.volume*.22,this.context.currentTime,.07);}
    void this.updateSuspend();
  }
  setGame(state:GameView|null):void{
    const newMood: Mood=!state?'title':state.phase==='battle'?'battle':state.phase==='ending'?'ending':state.area;
    if(this.mood!==newMood){this.mood=newMood;this.step=0;if(this.context)this.next=this.context.currentTime+.08;}
  }
  private play(freq:number,time:number,duration:number,amount:number,type:OscillatorType='sine'):void{
    if(!this.context||!this.master||this.volume<=0)return;
    const osc=this.context.createOscillator(),env=this.context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,time);
    env.gain.setValueAtTime(.0001,time);
    env.gain.exponentialRampToValueAtTime(Math.max(.0001,amount),time+.012);
    env.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(env).connect(this.master);
    osc.start(time);osc.stop(time+duration+.025);
  }
  private schedule():void{
    if(!this.context||this.context.state!=='running'||this.isHidden)return;
    const beat=this.mood==='battle'?.22:.38;
    // Keep only a short lookahead. Paused tabs do not accumulate queued notes.
    if(this.next<this.context.currentTime) this.next=this.context.currentTime+.03;
    let safety=0;
    while(this.next<this.context.currentTime+.26 && safety++<4){
      const n=MELODIES[this.mood][this.step%16];
      this.play(MIDI(n),this.next,beat*.86,this.mood==='battle'?.24:.19,'triangle');
      if(this.step%4===0)this.play(MIDI(n-24),this.next,beat*3.6,.13,'sine');
      if(this.step%2===1)this.play(MIDI(n+12),this.next+.01,beat*.4,.045,'sine');
      this.next+=beat;this.step++;
    }
  }
  effect(name:string):void{
    if(!this.context||this.context.state!=='running'||this.volume<=0||this.isHidden)return;
    const now=this.context.currentTime+.005;
    const patterns:Record<string,number[]>={
      select:[75],confirm:[71,79],attack:[57,67],arts:[64,71,83],echo:[59,66,74,86],guard:[48,60],
      break:[48,64,79],victory:[64,69,76,81],step:[47],pickup:[71,76,83],fail:[51,48],
    };
    const notes=patterns[name]||patterns.select;
    notes.forEach((pitch,i)=>this.play(MIDI(pitch),now+i*.045,name==='step'?.045:.12,name==='step'?.04:.17,name==='guard'?'sine':'triangle'));
  }
}
