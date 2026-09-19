/** Tiny WebAudio juice — no assets, no lag. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08, slide?: number) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export function unlockAudio() {
  audio();
}

export function sfxBoost() {
  beep(220, 0.18, "sawtooth", 0.05, 880);
  beep(440, 0.22, "square", 0.03, 990);
}

export function sfxStall() {
  beep(180, 0.28, "triangle", 0.06, 70);
}

export function sfxHit() {
  beep(660, 0.08, "square", 0.05);
}

export function sfxMiss() {
  beep(140, 0.14, "sine", 0.06);
}

export function sfxWin() {
  beep(523, 0.1, "square", 0.05);
  setTimeout(() => beep(659, 0.1, "square", 0.05), 80);
  setTimeout(() => beep(784, 0.12, "square", 0.06), 160);
  setTimeout(() => beep(1046, 0.22, "square", 0.05), 260);
}

export function sfxTick() {
  beep(880, 0.04, "square", 0.03);
}

export function sfxCountdown() {
  beep(392, 0.1, "square", 0.05);
}

export function sfxGo() {
  beep(523, 0.08, "square", 0.06, 784);
  beep(784, 0.16, "sawtooth", 0.04);
}
