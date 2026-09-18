import {
  htmlT3DrillStepBoard,
  kidVoiceHtml,
  makeProblem,
  opening118x13,
  sameAnswer,
  type Problem,
} from "./topic3";
import { sfxBoost, sfxStall, sfxWin, unlockAudio } from "./juice";

type Racer = { id: string; name: string; color: string; progress: number; you?: boolean };

export type PrixHooks = {
  onExit: () => void;
  onWin: (cash: number) => void;
};

const CHECKPOINTS = 6;
const CPU_RATE = 0.042;

export class GrandPrix {
  root: HTMLElement;
  hooks: PrixHooks;
  open = false;
  racers: Racer[] = [];
  problem: Problem | null = null;
  step = 0;
  juice: "coast" | "boost" | "stall" = "coast";
  locked = false;
  combo = 0;
  raf = 0;
  last = 0;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  shake = 0;
  flash = 0;
  road = 0;
  finished = false;
  place = 4;

  constructor(root: HTMLElement, hooks: PrixHooks) {
    this.root = root;
    this.hooks = hooks;
    this.root.addEventListener("click", (e) => this.onClick(e));
  }

  start() {
    unlockAudio();
    this.open = true;
    this.finished = false;
    this.step = 0;
    this.combo = 0;
    this.juice = "coast";
    this.locked = false;
    this.racers = [
      { id: "you", name: "STERLING", color: "#ffb400", progress: 0.02, you: true },
      { id: "rio", name: "RIO", color: "#2f7dff", progress: 0.04 },
      { id: "nova", name: "NOVA", color: "#e23d7a", progress: 0.01 },
      { id: "jax", name: "JAX", color: "#1dbf6e", progress: 0.03 },
    ];
    this.problem = opening118x13();
    this.root.hidden = false;
    this.root.removeAttribute("hidden");
    this.render();
    this.bindCanvas();
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  close() {
    this.open = false;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.hooks.onExit();
  }

  private you() {
    return this.racers.find((r) => r.you)!;
  }

  private rank(): number {
    const sorted = [...this.racers].sort((a, b) => b.progress - a.progress);
    return sorted.findIndex((r) => r.you) + 1;
  }

  private ordinal(n: number) {
    return n === 1 ? "1ST" : n === 2 ? "2ND" : n === 3 ? "3RD" : `${n}TH`;
  }

  private nextProblem() {
    this.step += 1;
    this.problem = makeProblem(this.step, "prix", "GRAND PRIX · TOPIC 3");
    this.locked = false;
    this.renderKeepCanvas();
  }

  private onClick(e: Event) {
    const t = (e.target as HTMLElement).closest("[data-gp]") as HTMLElement | null;
    if (!t) return;
    const act = t.dataset.gp;
    if (act === "exit") {
      this.close();
      return;
    }
    if (act === "again") {
      this.start();
      return;
    }
    if (act === "ans" && !this.locked && this.problem && !this.finished) {
      this.answer(t.dataset.ans || "");
    }
  }

  private answer(guess: string) {
    if (!this.problem) return;
    this.locked = true;
    const ok = sameAnswer(guess, this.problem.correct);
    const you = this.you();
    if (ok) {
      this.combo += 1;
      this.juice = "boost";
      this.shake = 10;
      this.flash = 1;
      you.progress = Math.min(1, you.progress + 0.18 + this.combo * 0.012);
      sfxBoost();
    } else {
      this.combo = 0;
      this.juice = "stall";
      this.shake = 14;
      you.progress = Math.max(0, you.progress - 0.08);
      this.racers.forEach((r) => {
        if (!r.you) r.progress = Math.min(1, r.progress + 0.06);
      });
      sfxStall();
    }
    this.place = this.rank();
    this.renderKeepCanvas();
    if (you.progress >= 1 || this.step + 1 >= CHECKPOINTS) {
      window.setTimeout(() => this.finish(ok), 420);
      return;
    }
    window.setTimeout(() => {
      this.juice = "coast";
      this.nextProblem();
    }, 520);
  }

  private finish(lastOk: boolean) {
    this.finished = true;
    this.place = this.rank();
    const win = this.place === 1 || (lastOk && this.you().progress >= 0.92);
    if (win) {
      sfxWin();
      this.hooks.onWin(900 + this.combo * 80);
    }
    this.renderKeepCanvas();
  }

  private tick(now: number) {
    if (!this.open) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.road = (this.road + dt * (this.juice === "boost" ? 380 : this.juice === "stall" ? 70 : 160)) % 80;
    this.shake *= 0.86;
    this.flash *= 0.88;
    if (!this.finished) {
      for (const r of this.racers) {
        if (r.you) continue;
        r.progress = Math.min(0.98, r.progress + CPU_RATE * dt * (0.7 + Math.random() * 0.6));
      }
      this.place = this.rank();
    }
    this.draw();
    const placeEl = this.root.querySelector("#gp-place");
    const pctEl = this.root.querySelector("#gp-pct");
    if (placeEl) placeEl.textContent = this.ordinal(this.place);
    if (pctEl) pctEl.textContent = `${Math.round(this.you().progress * 100)}%`;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private bindCanvas() {
    this.canvas = this.root.querySelector("#gp-canvas");
    this.ctx = this.canvas?.getContext("2d") ?? null;
    this.fitCanvas();
    window.addEventListener("resize", () => this.fitCanvas(), { passive: true });
  }

  private fitCanvas() {
    if (!this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 640;
    const h = this.canvas.clientHeight || 220;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private draw() {
    const c = this.ctx;
    const canvas = this.canvas;
    if (!c || !canvas) return;
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 220;
    c.save();
    c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    c.fillStyle = this.juice === "boost" ? "#6ad0ff" : this.juice === "stall" ? "#f2c48a" : "#89d4ff";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#7bc85a";
    c.fillRect(0, 0, w, h * 0.22);
    c.fillRect(0, h * 0.78, w, h * 0.22);
    c.fillStyle = "#4a5568";
    c.fillRect(0, h * 0.22, w, h * 0.56);
    c.fillStyle = "#ffe14a";
    for (let x = -this.road; x < w; x += 40) {
      c.fillRect(x, h * 0.49, 22, 6);
    }
    const lanes = [0.3, 0.42, 0.54, 0.66];
    this.racers.forEach((r, i) => {
      const y = h * (lanes[i] ?? 0.5);
      const x = 36 + r.progress * (w - 90);
      this.car(c, x, y, r.color, !!r.you);
    });
    if (this.flash > 0.08) {
      c.fillStyle = `rgba(255,225,74,${this.flash * 0.35})`;
      c.fillRect(0, 0, w, h);
    }
    c.restore();
  }

  private car(c: CanvasRenderingContext2D, x: number, y: number, color: string, you: boolean) {
    c.save();
    c.translate(x, y);
    c.fillStyle = "#1a1a1a";
    c.fillRect(-10, 6, 8, 6);
    c.fillRect(14, 6, 8, 6);
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(-16, -8, 44, 16, 6);
    c.fill();
    c.fillStyle = you ? "#fff6c8" : "#d9f0ff";
    c.fillRect(-2, -5, 16, 8);
    if (you) {
      c.fillStyle = "#12203a";
      c.font = "800 10px Nunito, sans-serif";
      c.fillText("YOU", -8, -12);
    }
    c.restore();
  }

  private render() {
    const p = this.problem;
    this.root.innerHTML = this.shell(p);
    this.bindCanvas();
  }

  private renderKeepCanvas() {
    const board = this.root.querySelector("#gp-board");
    const dock = this.root.querySelector("#gp-dock");
    const juice = this.root.querySelector("#gp-juice");
    const finish = this.root.querySelector<HTMLElement>("#gp-finish");
    if (!board || !dock || !this.problem) {
      this.render();
      return;
    }
    board.innerHTML = this.boardHtml(this.problem);
    dock.innerHTML = this.dockHtml(this.problem);
    if (juice) {
      juice.textContent = this.juice === "boost" ? "BOOST!" : this.juice === "stall" ? "STALL" : "COAST";
      juice.className = `gp-juice ${this.juice}`;
    }
    if (finish) finish.hidden = !this.finished;
    if (this.finished && finish) finish.innerHTML = this.finishHtml();
  }

  private boardHtml(p: Problem) {
    return `
      <div class="gp-ask">
        <div class="gp-kicker">${p.kicker}</div>
        <h2>${p.title}</h2>
        <p class="gp-prompt"><span class="t3-prompt-ask">${esc(p.prompt)}</span>${kidVoiceHtml(p.prompt, p.factors)}</p>
      </div>
      ${htmlT3DrillStepBoard({ prompt: p.prompt, factors: p.factors, askTarget: p.askTarget })}
    `;
  }

  private dockHtml(p: Problem) {
    if (this.finished) return "";
    return `<div class="gp-answers" id="gp-answers">${p.answers
      .map((a) => `<button type="button" data-gp="ans" data-ans="${esc(a)}">${esc(a)}</button>`)
      .join("")}</div>
      <p class="gp-hint">Correct = BOOST ahead · Wrong = STALL · Partial-product houses stay on screen</p>`;
  }

  private finishHtml() {
    const win = this.place === 1;
    return `<div class="gp-finish-card">
      <div class="gp-kicker">${win ? "CHECKERED FLAG" : "FINISH LINE"}</div>
      <h2>${win ? "YOU WIN THE GRAND PRIX!" : `P${this.place} · RACE AGAIN`}</h2>
      <p>${win ? "Partial products pulled you into 1st. Bank the cash and run it back." : "Wrong answers stall. Hit the houses and take 1st next heat."}</p>
      <div class="gp-finish-btns">
        <button type="button" class="cta" data-gp="again">RACE AGAIN</button>
        <button type="button" class="ghost" data-gp="exit">BACK TO HUB</button>
      </div>
    </div>`;
  }

  private shell(p: Problem | null) {
    return `<div class="gp-full">
      <header class="gp-top">
        <div>
          <div class="gp-brand">TOPIC 3 GRAND PRIX</div>
          <p class="gp-sub">Correct steps = pull ahead · Wrong = stall · Kid-safe</p>
        </div>
        <div class="gp-stats">
          <b id="gp-place">${this.ordinal(this.place)}</b>
          <span id="gp-pct">${Math.round(this.you().progress * 100)}%</span>
          <span id="gp-juice" class="gp-juice ${this.juice}">${this.juice.toUpperCase()}</span>
          <span class="gp-combo">${this.combo ? `COMBO x${this.combo}` : "GATE 1"}</span>
        </div>
        <button type="button" class="ghost compact" data-gp="exit">HUB</button>
      </header>
      <canvas id="gp-canvas" class="gp-canvas" aria-label="Race track"></canvas>
      <div id="gp-board" class="gp-board">${p ? this.boardHtml(p) : ""}</div>
      <div id="gp-dock" class="gp-dock">${p ? this.dockHtml(p) : ""}</div>
      <div id="gp-finish" class="gp-finish" ${this.finished ? "" : "hidden"}>${this.finished ? this.finishHtml() : ""}</div>
    </div>`;
  }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
