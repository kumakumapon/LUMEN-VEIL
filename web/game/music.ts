/** Small original synthesized soundtrack. No external audio files, autoplay or APIs. */
export type Cue = 'title' | 'harbor' | 'corridor' | 'vault' | 'dock' | 'battle' | 'ending';
export type Sound = 'select' | 'move' | 'attack' | 'arts' | 'echo' | 'guard' | 'damage' | 'break' | 'victory' | 'error';

const motifs: Record<Cue, { bpm: number; lead: number[]; bass: number[] }> = {
  title: { bpm: 82, lead: [69, 72, 76, 74, 72, 69, 67, 64, 69, 71, 72, 76, 74, 72, 69, 0], bass: [45, 45, 41, 41, 43, 43, 40, 40] },
  harbor: { bpm: 92, lead: [69, 72, 76, 72, 71, 69, 67, 0, 64, 69, 72, 74, 76, 74, 72, 0], bass: [45, 45, 41, 41, 43, 43, 40, 40] },
  corridor: { bpm: 106, lead: [64, 67, 69, 64, 62, 65, 67, 0, 64, 69, 70, 67, 65, 64, 62, 0], bass: [40, 40, 38, 38, 36, 36, 43, 43] },
  vault: { bpm: 76, lead: [69, 70, 73, 69, 68, 70, 73, 0, 66, 68, 69, 73, 70, 68, 66, 0], bass: [45, 45, 44, 44, 42, 42, 40, 40] },
  dock: { bpm: 96, lead: [72, 76, 79, 76, 74, 72, 69, 0, 71, 74, 76, 79, 81, 79, 76, 0], bass: [48, 48, 45, 45, 43, 43, 41, 41] },
  battle: { bpm: 144, lead: [69, 69, 72, 76, 74, 72, 70, 69, 69, 72, 76, 77, 76, 74, 72, 0], bass: [45, 45, 43, 43, 42, 42, 40, 40] },
  ending: { bpm: 74, lead: [72, 76, 79, 81, 79, 76, 74, 72, 69, 72, 76, 74, 72, 0, 0, 0], bass: [48, 48, 45, 45, 41, 41, 43, 43] },
};

const pitch = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export class LumenAudio {
  private context: AudioContext | null = null;
  private mixer: GainNode | null = null;
  private cue: Cue = 'title';
  private volume = .28;
  private timer: number | undefined;
  private next = 0;
  private step = 0;
  private unlocked = false;

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.mixer && this.context) this.mixer.gain.setTargetAtTime(this.volume * .21, this.context.currentTime, .04);
  }

  unlock(): void {
    try {
      this.context ??= new AudioContext();
      if (!this.mixer) {
        this.mixer = this.context.createGain();
        this.mixer.gain.value = this.volume * .21;
        this.mixer.connect(this.context.destination);
      }
      this.unlocked = true;
      void this.context.resume().catch(() => {});
      if (!this.timer) this.timer = window.setInterval(() => this.schedule(), 90);
      this.schedule();
    } catch { /* Audio not available: gameplay is unaffected. */ }
  }

  setCue(cue: Cue): void {
    if (this.cue === cue) return;
    this.cue = cue;
    this.step = 0;
    this.next = this.context?.currentTime ?? 0;
  }

  visibility(hidden: boolean): void {
    if (!this.context || !this.unlocked) return;
    if (hidden) void this.context.suspend().catch(() => {});
    else {
      this.next = this.context.currentTime;
      void this.context.resume().catch(() => {});
    }
  }

  sound(type: Sound): void {
    if (!this.context || !this.mixer || this.context.state !== 'running' || this.volume <= 0) return;
    const ctx = this.context;
    const notes: Record<Sound, [number, number, OscillatorType]> = {
      select: [659, .07, 'sine'], move: [440, .08, 'triangle'], attack: [330, .19, 'sawtooth'],
      arts: [880, .24, 'sine'], echo: [587, .31, 'triangle'], guard: [262, .14, 'triangle'],
      damage: [186, .28, 'sawtooth'], break: [1047, .28, 'triangle'], victory: [784, .45, 'sine'],
      error: [176, .12, 'sawtooth'],
    };
    const [hz, len, kind] = notes[type];
    this.note(hz, ctx.currentTime, len, kind, .18, type === 'attack' ? hz / 2 : undefined);
  }

  private note(hz: number, time: number, length: number, kind: OscillatorType, level: number, endHz?: number): void {
    if (!this.context || !this.mixer || !hz || this.volume === 0) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = kind;
    oscillator.frequency.setValueAtTime(hz, time);
    if (endHz) oscillator.frequency.exponentialRampToValueAtTime(endHz, time + length);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, level), time + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(gain).connect(this.mixer);
    oscillator.start(time);
    oscillator.stop(time + length + .02);
  }

  private schedule(): void {
    if (!this.context || this.context.state !== 'running' || !this.mixer || document.hidden) return;
    const composition = motifs[this.cue];
    if (this.next < this.context.currentTime) this.next = this.context.currentTime + .035;
    const beat = 60 / composition.bpm / 2;
    while (this.next < this.context.currentTime + .22) {
      const pos = this.step % composition.lead.length;
      const lead = composition.lead[pos];
      if (lead) this.note(pitch(lead), this.next, beat * .78, 'triangle', .11);
      if (pos % 2 === 0) this.note(pitch(composition.bass[(pos >> 1) % composition.bass.length]), this.next, beat * 1.6, 'sine', .12);
      if (this.cue === 'battle' && pos % 4 === 2) this.note(pitch(85), this.next, beat * .26, 'sine', .045);
      this.next += beat;
      this.step++;
    }
  }
}
