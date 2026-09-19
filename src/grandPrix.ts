import {
  htmlT3DrillStepBoard,
  kidVoiceHtml,
  makeProblem,
  opening118x13,
  sameAnswer,
  type Problem,
} from "./topic3";
import { sfxBoost, sfxCountdown, sfxGo, sfxStall, sfxWin, unlockAudio } from "./juice";

type Racer = { id: string; name: string; color: string; progress: number; you?: boolean };
type Phase = "start" | "countdown" | "race" | "finish";
type Speck = { x: number; y: number; vx: number; vy: number; color: string; life: number; r: number };

export type PrixHooks = {
  onExit: () => void;
  onWin: (cash: number) => void;
};

const CHECKPOINTS = 6;
const CPU_IDLE = 0.004;

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
  phase: Phase = "start";
  count = 3;
  countTimer = 0;
  specks: Speck[] = [];
  won = false;

  constructor(root: HTMLElement, hooks: PrixHooks) {
    this.root = root;
    this.hooks = hooks;
    this.root.addEventListener("click", (e) => this.onClick(e));
  }

  start() {
    unlockAudio();
    this.open = true;
    this.finished = false;
    this.won = false;
    this.step = 0;
    this.combo = 0;
    this.juice = "coast";
    this.locked = false;
    this.phase = "start";
    this.count = 3;
    this.specks = [];
    window.clearInterval(this.countTimer);
    this.racers = [
      { id: "you", name: "STERLING", color: "#ffb400", progress: 0.12, you: true },
      { id: "rio", name: "RIO", color: "#2f7dff", progress: 0.08 },
      { id: "nova", name: "NOVA", color: "#e23d7a", progress: 0.06 },
      { id: "jax", name: "JAX", color: "#1dbf6e", progress: 0.09 },
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
    window.clearInterval(this.countTimer);
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
    if (act === "go" && this.phase === "start") {
      this.beginCountdown();
      return;
    }
    if (act === "ans" && this.phase === "race" && !this.locked && this.problem && !this.finished) {
      this.answer(t.dataset.ans || "");
    }
  }

  private beginCountdown() {
    unlockAudio();
    this.phase = "countdown";
    this.count = 3;
    this.renderKeepCanvas();
    sfxCountdown();
    window.clearInterval(this.countTimer);
    this.countTimer = window.setInterval(() => {
      this.count -= 1;
      if (this.count <= 0) {
        window.clearInterval(this.countTimer);
        this.phase = "race";
        sfxGo();
        this.flash = 1;
        this.shake = 8;
        this.renderKeepCanvas();
        return;
      }
      sfxCountdown();
      this.renderKeepCanvas();
    }, 320);
  }

  private answer(guess: string) {
    if (!this.problem) return;
    this.locked = true;
    const ok = sameAnswer(guess, this.problem.correct);
    const you = this.you();
    if (ok) {
      this.combo += 1;
      this.juice = "boost";
      this.shake = 14;
      this.flash = 1;
      you.progress = Math.min(1, you.progress + 0.22 + this.combo * 0.02);
      this.racers.forEach((r) => {
        if (!r.you) r.progress = Math.min(0.96, r.progress + 0.03);
      });
      this.burst("#ffe14a", 18);
      sfxBoost();
    } else {
      this.combo = 0;
      this.juice = "stall";
      this.shake = 16;
      you.progress = Math.max(0, you.progress - 0.08);
      this.racers.forEach((r) => {
        if (!r.you) r.progress = Math.min(1, r.progress + 0.06);
      });
      this.burst("#fb7185", 10);
      sfxStall();
    }
    this.place = this.rank();
    this.renderKeepCanvas();
    if (you.progress >= 1 || this.step + 1 >= CHECKPOINTS) {
      window.setTimeout(() => this.finish(ok), 280);
      return;
    }
    window.setTimeout(() => {
      this.juice = "coast";
      this.nextProblem();
    }, 300);
  }

  private finish(lastOk: boolean) {
    this.finished = true;
    this.phase = "finish";
    this.place = this.rank();
    this.won = this.place === 1 || (lastOk && this.you().progress >= 0.92);
    if (this.won) {
      sfxWin();
      this.burst("#ffe14a", 48);
      this.burst("#ffffff", 24);
      this.hooks.onWin(900 + this.combo * 80);
    }
    this.renderKeepCanvas();
  }

  private burst(color: string, n: number) {
    const canvas = this.canvas;
    const w = canvas?.clientWidth || 640;
    const h = canvas?.clientHeight || 220;
    for (let i = 0; i < n; i++) {
      this.specks.push({
        x: w * (0.2 + Math.random() * 0.6),
        y: h * (0.25 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 12,
        vy: -2 - Math.random() * 8,
        color,
        life: 1,
        r: 3 + Math.random() * 5,
      });
    }
  }

  private tick(now: number) {
    if (!this.open) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const speed = this.phase !== "race" ? 90 : this.juice === "boost" ? 420 : this.juice === "stall" ? 40 : 170;
    this.road = (this.road + dt * speed) % 80;
    this.shake *= 0.86;
    this.flash *= 0.88;
    this.specks = this.specks.filter((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.28;
      s.life -= 0.02;
      return s.life > 0;
    });
    if (this.phase === "race" && !this.finished) {
      for (const r of this.racers) {
        if (r.you) continue;
        r.progress = Math.min(0.92, r.progress + CPU_IDLE * dt);
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
    const sky = this.juice === "boost" ? "#4ec6ff" : this.juice === "stall" ? "#f2c48a" : "#7ec8ff";
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#7bc85a";
    c.fillRect(0, 0, w, h * 0.2);
    c.fillRect(0, h * 0.8, w, h * 0.2);
    c.fillStyle = "#3d4a5c";
    c.fillRect(0, h * 0.2, w, h * 0.6);
    c.fillStyle = "#ffe14a";
    for (let x = -this.road; x < w; x += 40) c.fillRect(x, h * 0.49, 22, 6);
    if (this.juice === "boost") {
      c.strokeStyle = "rgba(255,255,255,.55)";
      c.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const y = h * 0.22 + ((i * 17 + this.road) % (h * 0.56));
        c.beginPath();
        c.moveTo(w * 0.15, y);
        c.lineTo(w * 0.15 + 40, y);
        c.stroke();
      }
    }
    if (this.juice === "stall") {
      c.fillStyle = "rgba(80,40,20,.18)";
      c.fillRect(0, h * 0.2, w, h * 0.6);
    }
    c.fillStyle = "#fff";
    c.fillRect(w - 18, h * 0.2, 10, h * 0.6);
    c.fillStyle = "#12203a";
    for (let y = h * 0.2; y < h * 0.8; y += 16) c.fillRect(w - 18, y, 10, 8);
    const lanes = [0.3, 0.42, 0.54, 0.66];
    this.racers.forEach((r, i) => {
      const y = h * (lanes[i] ?? 0.5);
      const x = 36 + r.progress * (w - 90);
      this.car(c, x, y, r.color, !!r.you, r.name);
    });
    for (const s of this.specks) {
      c.globalAlpha = Math.max(0, s.life);
      c.fillStyle = s.color;
      c.fillRect(s.x, s.y, s.r, s.r);
    }
    c.globalAlpha = 1;
    if (this.flash > 0.08) {
      c.fillStyle = `rgba(255,225,74,${this.flash * 0.35})`;
      c.fillRect(0, 0, w, h);
    }
    c.restore();
  }

  private car(c: CanvasRenderingContext2D, x: number, y: number, color: string, you: boolean, name: string) {
    c.save();
    c.translate(x, y);
    if (you && this.juice === "boost") {
      c.fillStyle = "#ff7a18";
      c.beginPath();
      c.moveTo(-28, 0);
      c.lineTo(-46, -8);
      c.lineTo(-46, 8);
      c.fill();
    }
    c.fillStyle = "#111";
    c.beginPath();
    c.ellipse(-12, 10, 8, 8, 0, 0, Math.PI * 2);
    c.ellipse(18, 10, 8, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(-22, -14, 58, 24, 8);
    c.fill();
    c.fillStyle = you ? "#fff6c8" : "#d9f0ff";
    c.fillRect(-4, -8, 22, 12);
    c.fillStyle = you ? "#12203a" : "#0b1224";
    c.font = "900 11px Nunito, sans-serif";
    c.fillText(you ? "YOU" : name, -18, -18);
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
    const start = this.root.querySelector<HTMLElement>("#gp-start");
    const count = this.root.querySelector<HTMLElement>("#gp-count");
    const slam = this.root.querySelector<HTMLElement>("#gp-slam");
    if (!board || !dock || !this.problem) {
      this.render();
      return;
    }
    board.innerHTML = this.phase === "race" || this.phase === "finish" ? this.boardHtml(this.problem) : "";
    dock.innerHTML = this.phase === "race" ? this.dockHtml(this.problem) : "";
    if (juice) {
      juice.textContent = this.juice === "boost" ? "BOOST!" : this.juice === "stall" ? "STALL" : "COAST";
      juice.className = `gp-juice ${this.juice}`;
    }
    if (start) {
      start.hidden = this.phase !== "start";
      if (this.phase === "start") start.innerHTML = this.startHtml();
    }
    if (count) {
      count.hidden = this.phase !== "countdown";
      count.textContent = this.count > 0 ? String(this.count) : "GO";
      count.className = `gp-count ${this.count <= 0 ? "go" : ""}`;
    }
    if (slam) {
      if (this.juice === "boost" && this.phase === "race") {
        slam.hidden = false;
        slam.className = "gp-slam boost";
        slam.textContent = this.combo > 1 ? `BOOST x${this.combo}` : "BOOST!";
      } else if (this.juice === "stall" && this.phase === "race") {
        slam.hidden = false;
        slam.className = "gp-slam stall";
        slam.textContent = "STALL";
      } else {
        slam.hidden = true;
      }
    }
    if (finish) {
      finish.hidden = !this.finished;
      if (this.finished) finish.innerHTML = this.finishHtml();
    }
    const combo = this.root.querySelector("#gp-combo");
    if (combo) combo.textContent = this.combo ? `COMBO x${this.combo}` : this.phase === "start" ? "LIGHTS" : "GATE 1";
  }

  private startHtml() {
    return `
      <div class="gp-start-card pop-in">
        <p class="gp-kicker">COOLMATH SNAP · KID-SAFE</p>
        <h2>TOPIC 3 GRAND PRIX</h2>
        <p class="gp-start-lead">Partial products race. Houses → × bottom → add → estimate.</p>
        <div class="gp-lights" aria-hidden="true"><i></i><i></i><i></i></div>
        <p class="gp-start-gate">First gate <b>118 × 13</b> · Ster kid-voice scaffold stays on screen</p>
        <button type="button" class="cta huge pulse" data-gp="go">LIGHTS OUT — RACE</button>
      </div>`;
  }

  private boardHtml(p: Problem) {
    return `
      <div class="gp-ask">
        <div class="gp-kicker">${p.kicker}</div>
        <h2>${p.title}</h2>
        <p class="gp-prompt"><span class="t3-prompt-ask">${esc(p.prompt)}</span>${kidVoiceHtml(p.prompt, p.factors)}</p>
      </div>
      ${htmlT3DrillStepBoard({ prompt: p.prompt, factors: p.factors, askTarget: p.askTarget }, "race")}
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
    const win = this.won;
    return `<div class="gp-finish-card pop-in ${win ? "win" : ""}">
      <div class="gp-confetti" aria-hidden="true"></div>
      <div class="gp-kicker">${win ? "CHECKERED FLAG" : "FINISH LINE"}</div>
      <h2>${win ? "YOU WIN THE GRAND PRIX!" : `P${this.place} · RACE AGAIN`}</h2>
      <p>${win ? "Partial products pulled you into 1st. Bank the cash and run it back." : "Wrong answers stall. Hit the houses and take 1st next heat."}</p>
      <div class="gp-finish-btns">
        <button type="button" class="cta huge pulse" data-gp="again">RACE AGAIN</button>
        <button type="button" class="ghost" data-gp="exit">BACK TO HUB</button>
      </div>
    </div>`;
  }

  private shell(p: Problem | null) {
    const racing = this.phase === "race" || this.phase === "finish";
    return `<div class="gp-full">
      <header class="gp-top">
        <div>
          <div class="gp-brand">TOPIC 3 GRAND PRIX</div>
          <p class="gp-sub">Correct steps = BOOST · Wrong = STALL · Kid-safe</p>
        </div>
        <div class="gp-stats">
          <b id="gp-place">${this.ordinal(this.place)}</b>
          <span id="gp-pct">${Math.round(this.you().progress * 100)}%</span>
          <span id="gp-juice" class="gp-juice ${this.juice}">${this.juice.toUpperCase()}</span>
          <span id="gp-combo" class="gp-combo">${this.combo ? `COMBO x${this.combo}` : "LIGHTS"}</span>
        </div>
        <button type="button" class="ghost compact" data-gp="exit">HUB</button>
      </header>
      <canvas id="gp-canvas" class="gp-canvas" aria-label="Race track"></canvas>
      <div id="gp-board" class="gp-board">${racing && p ? this.boardHtml(p) : ""}</div>
      <div id="gp-dock" class="gp-dock">${this.phase === "race" && p ? this.dockHtml(p) : ""}</div>
      <div id="gp-start" class="gp-start" ${this.phase === "start" ? "" : "hidden"}>${this.phase === "start" ? this.startHtml() : ""}</div>
      <div id="gp-count" class="gp-count" ${this.phase === "countdown" ? "" : "hidden"}>${this.count}</div>
      <div id="gp-slam" class="gp-slam" hidden></div>
      <div id="gp-finish" class="gp-finish" ${this.finished ? "" : "hidden"}>${this.finished ? this.finishHtml() : ""}</div>
    </div>`;
  }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
