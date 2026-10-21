/** Presentation/command readiness. WAIT freezes the gauge at 100% until the player acts. */
export class ActiveTimeGauge {
  private meter: HTMLProgressElement;
  private label: HTMLElement;
  private onFrame: (ready: boolean) => void;
  private active = false;
  private progress = 0;
  private duration = 420;
  private lastTime: number | undefined;
  private paused = false;
  private frame = 0;

  constructor(meter: HTMLProgressElement, label: HTMLElement, onFrame: (ready: boolean) => void) {
    this.meter = meter;
    this.label = label;
    this.onFrame = onFrame;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  charge(actorId: number): void {
    this.duration = [430, 365, 520][actorId] ?? 430;
    this.progress = 0;
    this.lastTime = undefined;
    this.active = true;
    this.render();
  }

  stop(): void { this.active = false; this.progress = 0; this.lastTime = undefined; this.render(); }
  setPaused(paused: boolean): void { this.paused = paused; this.lastTime = undefined; }
  get ready(): boolean { return this.active && this.progress >= 100; }

  private render(): void {
    this.meter.value = Math.min(100, this.progress);
    this.label.textContent = !this.active ? 'STANDBY' : this.progress >= 100 ? 'WAIT · READY' : `ATB ${Math.floor(this.progress)}%`;
    this.onFrame(this.ready);
  }

  private tick(now: number): void {
    // Browser tab, settings overlay, and actual user-chosen WAIT all stop the clock.
    const paused = this.paused || document.hidden;
    if (this.active && !paused && this.progress < 100) {
      if (this.lastTime !== undefined) {
        this.progress = Math.min(100, this.progress + (Math.min(60, now - this.lastTime) / this.duration) * 100);
      }
      this.render();
    }
    this.lastTime = paused ? undefined : now;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  destroy(): void { cancelAnimationFrame(this.frame); }
}
