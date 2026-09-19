import {
  htmlT3DrillStepBoard,
  htmlT3LearnLesson,
  kidVoiceHtml,
  makeProblem,
  sameAnswer,
  topic3LearnBeats,
  type Problem,
} from "./topic3";
import {
  STER_WORK_HANDOFF,
  CAMPUS_PARENT_URL,
  authFail,
  authFailCopy,
  providerLabel,
  schoolClient,
  whenLabel,
  type SchoolFeed,
  type SchoolProgress,
} from "./schoolFeed";
import { sfxHit, sfxMiss, sfxTick, unlockAudio } from "./juice";

export type HubHooks = {
  onPlayPrix: () => void;
  onCash: (amount: number, reason: string) => void;
};

type Tab = "play" | "learn" | "school" | "connect";

export class SchoolHub {
  root: HTMLElement;
  hooks: HubHooks;
  tab: Tab = "play";
  feed: SchoolFeed | null = null;
  sourceLabel = "";
  progress: SchoolProgress;
  speed: Problem | null = null;
  speedEnds = 0;
  speedScore = 0;
  speedStreak = 0;
  speedTimer = 0;
  flash = "";
  learnStep = 0;

  constructor(root: HTMLElement, hooks: HubHooks) {
    this.root = root;
    this.hooks = hooks;
    this.progress = schoolClient.getProgress();
    this.root.addEventListener("click", (e) => this.onClick(e));
  }

  async open() {
    this.root.hidden = false;
    this.root.removeAttribute("hidden");
    document.body.classList.add("hub-screen");
    document.body.classList.remove("city-screen", "prix-screen");
    if (!this.feed) this.feed = await schoolClient.load().catch(() => schoolClient.feed);
    this.sourceLabel = schoolClient.sourceLabel;
    this.progress = schoolClient.getProgress();
    if (!this.speed) this.dealSpeed();
    this.render();
    this.armSpeedTimer();
  }

  hide() {
    document.body.classList.remove("hub-screen");
    this.root.hidden = true;
    window.clearInterval(this.speedTimer);
  }

  refreshCash() {
    this.progress = schoolClient.getProgress();
    const el = this.root.querySelector("#hub-cash");
    if (el) el.textContent = `$${this.progress.cash.toLocaleString()}`;
  }

  private dealSpeed() {
    this.speed = makeProblem(this.speedStreak, "hub", "HUB SPEED · TOPIC 3");
    this.speedEnds = performance.now() + 20000;
    this.flash = "";
  }

  private armSpeedTimer() {
    window.clearInterval(this.speedTimer);
    this.speedTimer = window.setInterval(() => {
      if (this.tab !== "play" || this.root.hidden) return;
      const left = Math.max(0, this.speedEnds - performance.now());
      const bar = this.root.querySelector<HTMLElement>("#speed-bar");
      const clock = this.root.querySelector("#speed-clock");
      if (bar) bar.style.width = `${(left / 20000) * 100}%`;
      if (clock) clock.textContent = `${Math.ceil(left / 1000)}s`;
      if (left <= 0) {
        this.progress.speedBest = Math.max(this.progress.speedBest, this.speedScore);
        schoolClient.saveProgress(this.progress);
        this.speedScore = 0;
        this.speedStreak = 0;
        this.dealSpeed();
        this.renderSpeedOnly();
      }
    }, 100);
  }

  private renderSpeedOnly() {
    const host = this.root.querySelector("#hub-speed");
    if (host) host.innerHTML = this.speedWidget();
  }

  private onClick(e: Event) {
    const t = (e.target as HTMLElement).closest("[data-hub]") as HTMLElement | null;
    if (!t) return;
    const act = t.dataset.hub;
    if (act === "tab") {
      this.tab = (t.dataset.tab as Tab) || "play";
      this.render();
      return;
    }
    if (act === "prix") {
      unlockAudio();
      this.hooks.onPlayPrix();
      return;
    }
    if (act === "learn-step") {
      unlockAudio();
      sfxTick();
      this.learnStep = Number(t.dataset.step || 0);
      this.renderLearnOnly();
      return;
    }
    if (act === "learn-next") {
      unlockAudio();
      sfxTick();
      this.learnStep = Math.min(topic3LearnBeats().length - 1, this.learnStep + 1);
      this.renderLearnOnly();
      return;
    }
    if (act === "learn-prev") {
      unlockAudio();
      sfxTick();
      this.learnStep = Math.max(0, this.learnStep - 1);
      this.renderLearnOnly();
      return;
    }
    if (act === "speed") {
      this.tab = "play";
      this.render();
      window.requestAnimationFrame(() => {
        this.root.querySelector("#hub-speed")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    if (act === "speed-ans" && this.speed) {
      unlockAudio();
      const ok = sameAnswer(t.dataset.ans || "", this.speed.correct);
      if (ok) {
        this.speedScore += 1;
        this.speedStreak += 1;
        this.flash = "hit";
        sfxHit();
        this.progress.cash += 40;
        this.progress.speedBest = Math.max(this.progress.speedBest, this.speedScore);
        schoolClient.saveProgress(this.progress);
        this.hooks.onCash(40, "Speed house");
      } else {
        this.speedStreak = 0;
        this.flash = "miss";
        sfxMiss();
      }
      window.setTimeout(() => {
        this.dealSpeed();
        this.renderSpeedOnly();
        this.refreshCash();
      }, 220);
      t.classList.add(ok ? "hit" : "miss");
      return;
    }
    if (act === "copy-naylor") {
      void this.copyNaylor();
      return;
    }
    if (act === "handoff") {
      void this.copyHandoff();
    }
  }

  private async copyNaylor() {
    const missing = this.feed?.missing.filter((s) => s.action === "school_retake") ?? [];
    const titles = missing.map((s) => s.title.replace(/^Quick Check\s+/i, "")).join(", ") || "the missing Quick Checks";
    const n = `Hi Mrs. Naylor. Can I please get the Math Quick Checks I missed? I need ${titles}. I know I have to make them up AT SCHOOL. Thank you!`;
    try {
      await navigator.clipboard.writeText(n);
      const s = this.root.querySelector("#sh-script-msg");
      if (s) s.textContent = "Script copied — practice with Dad, then ask at school.";
    } catch {
      const s = this.root.querySelector("#sh-script-msg");
      if (s) s.textContent = n;
    }
  }

  private async copyHandoff() {
    const e = this.root.querySelector("#sh-handoff-msg");
    try {
      await navigator.clipboard.writeText(STER_WORK_HANDOFF);
      if (e) e.textContent = "Handoff note copied — send it to STER WORK. Signing in here will not clear AUTH_FAIL.";
    } catch {
      if (e) e.textContent = STER_WORK_HANDOFF;
    }
  }

  render() {
    const t = this.feed;
    const e = t?.student;
    const a = authFail(t);
    const r = e
      ? `${e.name} · Grade ${e.gradeLevel} · ${e.school ?? "School"}${e.homeroom ? ` · ${e.homeroom}` : ""}`
      : "Loading…";
    this.root.innerHTML = `
      <div class="sh-shell">
        <header class="sh-header">
          <div class="sh-brand">
            <div class="sh-logo">SC</div>
            <div>
              <p class="sh-product">STERLING CITY · SCHOOL HUB</p>
              <p class="sh-sub">${esc(r)}</p>
            </div>
          </div>
          <div class="sh-header-right">
            <div id="hub-cash" class="sh-cash-pill">$${this.progress.cash.toLocaleString()}</div>
            <div class="sh-pill ${a ? "auth-fail" : "ok"}">${a ? "AUTH_FAIL" : esc(this.sourceLabel || "feed")}</div>
            <span class="sh-locked" title="City is a later reward">City later</span>
          </div>
        </header>
        ${
          a
            ? `<div class="sh-auth-banner" role="status"><strong>AUTH_FAIL</strong> · ${esc(providerLabel(a.provider))} — ${esc(authFailCopy(a))} <button type="button" class="text-link" data-hub="tab" data-tab="connect">Hand off to STER WORK</button></div>`
            : ""
        }
        <nav class="sh-tabs" role="tablist">
          ${this.tabBtn("play", "Game Hall")}
          ${this.tabBtn("learn", "Learn")}
          ${this.tabBtn("school", "School")}
          ${this.tabBtn("connect", "Connect")}
        </nav>
        <main class="sh-main">${this.tabBody()}</main>
      </div>`;
    if (this.tab === "play") this.armSpeedTimer();
  }

  private tabBtn(id: Tab, label: string) {
    return `<button type="button" role="tab" class="sh-tab ${this.tab === id ? "active" : ""}" data-hub="tab" data-tab="${id}">${label}</button>`;
  }

  private tabBody() {
    if (!this.feed) return `<p class="sh-muted">Loading school feed…</p>`;
    if (this.tab === "connect") return this.connect();
    if (this.tab === "school") return this.school();
    if (this.tab === "learn") return this.learn();
    return this.play();
  }

  private renderLearnOnly() {
    const host = this.root.querySelector("#hub-learn");
    if (host) host.innerHTML = this.learnBody();
  }

  private play() {
    const wins = this.progress.prixWins;
    return `
      <section class="hero-prix">
        <div class="hero-copy">
          <p class="eyebrow">THE GAME · NOT THE CITY</p>
          <h1>Topic 3 Grand Prix</h1>
          <p>Race with partial products. Houses → × bottom → add → estimate. Correct steps <b>BOOST</b>. Wrong answers <b>STALL</b>. First gate is 118 × 13.</p>
          <div class="hero-actions">
            <button type="button" class="cta huge pulse" data-hub="prix">PLAY GRAND PRIX</button>
            <button type="button" class="ghost" data-hub="tab" data-tab="learn">Learn 118 × 13</button>
            <span class="hero-meta">${wins} wins · kid-voice houses stay on screen</span>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="hero-lights"><i></i><i></i><i></i></div>
          <div class="hero-car">YOU</div>
          <div class="hero-road"></div>
        </div>
      </section>

      <section class="hub-mini-card">
        <div class="hub-mini-head">
          <div>
            <p class="eyebrow">PLAYABLE ON THIS SCREEN</p>
            <h2>Speed Houses</h2>
          </div>
          <div class="hub-mini-stats">
            <b>${this.speedScore}</b>
            <span>now</span>
            <b>${this.progress.speedBest}</b>
            <span>best</span>
          </div>
        </div>
        <div id="hub-speed">${this.speedWidget()}</div>
      </section>

      <section class="learn-peek">
        <div>
          <p class="eyebrow">FIRST-CLASS LEARN · NOT A POPUP</p>
          <h2>Need the dummy-proof map?</h2>
          <p>Split houses → × hundreds → × tens (keep the zero) → × ones → add → estimate. Stuck line is 118 × 13.</p>
        </div>
        <button type="button" class="ghost" data-hub="tab" data-tab="learn">Open Learn</button>
      </section>

      <section class="qc-strip">
        <p><strong>AT SCHOOL only</strong> — missing Quick Checks are classroom retakes, not games. ${this.feed!.missing.length} on the list.</p>
        <div class="qc-chips">
          ${this.feed!.missing
            .slice(0, 6)
            .map((m) => `<span class="qc-chip">AT SCHOOL · ${esc(m.title.replace("Math ", "").replace("Science ", ""))}</span>`)
            .join("")}
          ${this.feed!.missing.length > 6 ? `<span class="qc-chip more">+${this.feed!.missing.length - 6}</span>` : ""}
        </div>
        <button type="button" class="text-link" data-hub="tab" data-tab="school">School list</button>
      </section>
    `;
  }

  private speedWidget() {
    const p = this.speed;
    if (!p) return "";
    return `
      <div class="speed-arcade ${this.flash}">
        <div class="speed-meter"><i id="speed-bar"></i></div>
        <div class="speed-clock-row"><span id="speed-clock">20s</span><span class="streak">${this.speedStreak ? `STREAK x${this.speedStreak}` : "GO"}</span></div>
        <p class="speed-prompt"><span class="t3-prompt-ask">${esc(p.prompt)}</span>${kidVoiceHtml(p.prompt, p.factors)}</p>
        ${htmlT3DrillStepBoard({ prompt: p.prompt, factors: p.factors, askTarget: p.askTarget }, "mini")}
        <div class="speed-ans-grid">
          ${p.answers
            .map((a) => `<button type="button" data-hub="speed-ans" data-ans="${esc(a)}">${esc(a)}</button>`)
            .join("")}
        </div>
      </div>`;
  }

  private learn() {
    return `
      <section class="learn-hero">
        <div class="learn-hero-copy">
          <p class="eyebrow">LEARN · TOPIC 3 · BRIGHT KID SCREEN</p>
          <h1>Houses, then race</h1>
          <p>Dummy-proof map. Tap a step. Same Ster kid-voice that stays on Grand Prix and Speed Houses.</p>
          <div class="hero-actions">
            <button type="button" class="cta huge pulse" data-hub="prix">PLAY GRAND PRIX</button>
            <button type="button" class="ghost" data-hub="speed">Practice Speed Houses</button>
          </div>
        </div>
      </section>
      <div id="hub-learn">${this.learnBody()}</div>
    `;
  }

  private learnBody() {
    const last = topic3LearnBeats().length - 1;
    return `
      ${htmlT3LearnLesson(this.learnStep)}
      <div class="learn-nav">
        <button type="button" class="ghost" data-hub="learn-prev" ${this.learnStep <= 0 ? "disabled" : ""}>← Back</button>
        <span class="learn-nav-meta">Step ${this.learnStep + 1} of ${last + 1}</span>
        <button type="button" class="cta" data-hub="learn-next" ${this.learnStep >= last ? "disabled" : ""}>Next step →</button>
      </div>
      <div class="learn-ctas">
        <button type="button" class="cta huge pulse" data-hub="prix">PLAY GRAND PRIX</button>
        <button type="button" class="ghost" data-hub="speed">Speed Houses</button>
        <button type="button" class="text-link" data-hub="tab" data-tab="play">Back to Game Hall</button>
      </div>
    `;
  }

  private school() {
    const t = this.feed!;
    const math = t.courses.find((c) => /math/i.test(c.name));
    return `
      <div class="school-grid">
        <section class="panel">
          <h2>Sterling</h2>
          <p>Grade ${t.student.gradeLevel} · ${esc(t.student.homeroom || "")} · ${esc(t.student.school || "")}</p>
          <div class="grade-row">
            <div><b class="letter ${letterClass(math?.letter)}">${math?.letter ?? "—"}</b><span>Math</span></div>
            <div><b>${math ? math.percent.toFixed(1) : "—"}%</b><span>Avg</span></div>
            <div><b>${t.missing.length}</b><span>Missing</span></div>
          </div>
        </section>
        <section class="panel">
          <h2>Homework</h2>
          <ul class="plain">
            ${t.homework.map((h) => `<li><b>${esc(h.title)}</b><span>Due ${whenLabel(h.dueAt)}</span></li>`).join("")}
          </ul>
        </section>
        <section class="panel span-2">
          <div class="row-between">
            <h2>Missing Quick Checks</h2>
            <button type="button" class="ghost compact" data-hub="copy-naylor">Copy Mrs. Naylor script</button>
          </div>
          <p class="sh-lead">Make-ups are <strong>AT SCHOOL only</strong> — never in-game quizzes. Ask Mrs. Naylor.</p>
          <p id="sh-script-msg" class="sh-muted"></p>
          <div class="qc-chips tall">
            ${t.missing
              .map(
                (m) =>
                  `<span class="qc-chip ${m.action === "school_retake" ? "ask" : ""}">${
                    m.action === "school_retake" ? "ASK MRS. NAYLOR" : "AT SCHOOL"
                  } · ${esc(m.title)}</span>`,
              )
              .join("")}
          </div>
        </section>
        <section class="panel span-2">
          <h2>Grades</h2>
          <div class="grade-pills">
            ${t.courses
              .map(
                (c) =>
                  `<div class="grade-pill"><span class="letter ${letterClass(c.letter)}">${esc(c.letter)}</span><b>${esc(c.name)}</b><span>${c.percent.toFixed(1)}%</span></div>`,
              )
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  private connect() {
    const a = authFail(this.feed);
    return `
      <section class="panel connect">
        <h2>STER WORK handoff</h2>
        <p>Campus Parent lives on the <strong>STER WORK</strong> computer — not this phone or Dad’s browser. Signing in here will not clear AUTH_FAIL.</p>
        ${a ? `<p class="warn"><strong>${esc(a.code)}</strong> · ${esc(authFailCopy(a))}</p>` : `<p class="ok-line">Campus Parent looks connected on the last pull.</p>`}
        <ol class="handoff">
          <li>Ask STER WORK to open Campus Parent on that machine.</li>
          <li>Parent signs in there (not here).</li>
          <li>Next school pull reports <code>campusParent.status=ok</code>.</li>
        </ol>
        <div class="hero-actions">
          <button type="button" class="cta" data-hub="handoff">Copy handoff note</button>
          <a class="ghost" href="${CAMPUS_PARENT_URL}" target="_blank" rel="noopener noreferrer">Open portal for reference</a>
        </div>
        <p id="sh-handoff-msg" class="sh-muted"></p>
        <p class="sh-muted">Feed as of ${whenLabel(this.feed?.asOf)} · ${esc(this.sourceLabel)} · Clever → Canvas homework · Campus Parent grades</p>
      </section>
    `;
  }
}

function letterClass(l?: string) {
  const t = (l || "").toUpperCase();
  if (t === "A" || t === "E") return "lg-a";
  if (t === "B") return "lg-b";
  if (t === "C") return "lg-c";
  if (t === "D") return "lg-d";
  return "lg-f";
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
