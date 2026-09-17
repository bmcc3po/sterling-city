export class Sfx {
  private ctx: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private sirenOn = false;
  private siren: OscillatorNode | null = null;

  resume() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 240;
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.04;
      this.engine = this.ctx.createOscillator();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 55;
      this.engine.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.engine.start();
    }
    void this.ctx.resume();
  }

  engineAt(speed: number, throttle: number) {
    if (!this.engine || !this.filter || !this.gain) return;
    this.engine.frequency.value = 48 + speed * 1.6 + throttle * 18;
    this.filter.frequency.value = 180 + speed * 8 + throttle * 90;
    this.gain.gain.value = 0.02 + Math.min(0.06, speed / 400);
  }

  setSiren(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.sirenOn) {
      this.sirenOn = true;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 620;
      g.gain.value = 0.03;
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      this.siren = osc;
      let up = true;
      const tick = () => {
        if (!this.sirenOn || !this.siren) return;
        up = !up;
        this.siren.frequency.setTargetAtTime(up ? 880 : 540, this.ctx!.currentTime, 0.05);
        setTimeout(tick, 280);
      };
      tick();
    }
    if (!on && this.sirenOn) {
      this.sirenOn = false;
      this.siren?.stop();
      this.siren = null;
    }
  }

  blip(ok: boolean) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = ok ? 880 : 180;
    o.type = "square";
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);
    o.stop(this.ctx.currentTime + 0.2);
  }
}
