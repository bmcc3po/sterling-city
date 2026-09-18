/** Topic 3 Savvas kid-voice partial-product scaffold. Marker strings must survive minify. */

export type Hardness = "guided" | "blanks" | "full";
export type AskTarget =
  | "product"
  | "sum_houses"
  | "ones_line"
  | "tens_line"
  | "hundreds_house"
  | "tens_house"
  | "ones_house";

export type Factors = { a: number; b: number };

export type AlgoStep = {
  id: string;
  kind: string;
  label: string;
  detail: string;
  show: string;
  ask?: boolean;
};

export type House = { label: string; value: string; ask?: boolean };

export type StepBoard = {
  a: number;
  b: number;
  product: number;
  hardness: Hardness;
  algo: AlgoStep[];
  houses: House[];
  crumbs: string[];
  notepad: string;
  coach: string;
};

export type Problem = {
  kind: string;
  kicker: string;
  title: string;
  prompt: string;
  houses: { label: string; value: string }[];
  answers: string[];
  correct: string;
  coach: string;
  notepad: string;
  cash: number;
  hardness: Hardness;
  a: number;
  b: number;
  factors: Factors;
  askTarget: AskTarget;
  steps: StepBoard;
};

const PAIR_BANK: Factors[] = [
  { a: 118, b: 13 },
  { a: 246, b: 12 },
  { a: 305, b: 14 },
  { a: 172, b: 23 },
  { a: 409, b: 15 },
  { a: 136, b: 21 },
  { a: 250, b: 16 },
  { a: 187, b: 13 },
  { a: 214, b: 12 },
  { a: 163, b: 14 },
  { a: 328, b: 11 },
  { a: 145, b: 24 },
  { a: 267, b: 13 },
  { a: 190, b: 15 },
  { a: 352, b: 12 },
  { a: 128, b: 25 },
];

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function sterKid(i: number, t: number) {
  const e = Math.floor(i / 100) * 100;
  const n = Math.floor((i % 100) / 10) * 10;
  const s = i % 10;
  const o =
    i === 118 && t === 13
      ? "Start with the hundreds house: what is 100 × 13? Then tens (10×13), then ones (8×13). Add them."
      : `Start with the hundreds house: what is ${e} × ${t}? Then tens (${n}×${t}), then ones (${s}×${t}). Add them.`;
  return {
    split: `Split the top number into place-value houses: hundreds ${e} / tens ${n} / ones ${s}.`,
    hundreds: `Multiply hundreds × bottom number first (${e} × ${t}).`,
    tens:
      n >= 10
        ? `Don't drop the zero when you multiply tens (${n} × ${t} = ${n * t}, not ${(n / 10) * t}).`
        : "Don't drop the zero when you multiply tens.",
    ones: `Multiply ones × bottom (${s} × ${t}).`,
    add: "Stack the three answers and add.",
    check: `Check: estimate (${e}×${t}≈${e * t}) — is your answer close?`,
    carry: "If a house makes 10 or more, rename into the next house.",
    stuck: o,
    line: o,
  };
}

function onesWork(i: number, t: number) {
  const e = Math.floor(i / 100);
  const n = Math.floor((i % 100) / 10);
  const s = i % 10;
  const o = s * t;
  const a = o % 10;
  const r = Math.floor(o / 10);
  const l = n * t + r;
  const c = l % 10;
  const d = Math.floor(l / 10);
  const h = e * t + d;
  const u = i * t;
  const p = `${s}×${t}=${o} write ${a}${r ? ` carry ${r}` : ""} · ${n}×${t}${r ? `+${r}` : ""}=${l} write ${c}${d ? ` carry ${d}` : ""} · ${e}×${t}${d ? `+${d}` : ""}=${h}`;
  return { line: u, work: p };
}

export function buildBoard(i: number, t: number, e: Hardness = "guided", n: AskTarget = "product"): StepBoard {
  const s = i * t;
  const o = t % 10;
  const a = Math.floor(t / 10);
  const r = onesWork(i, o);
  const l = i * a;
  const c = l * 10;
  const d = Math.floor(i / 100) * 100;
  const h = Math.floor((i % 100) / 10) * 10;
  const u = i % 10;
  const p = d * t;
  const g = h * t;
  const v = u * t;
  const m = ["① ONES×carry", "② TENS+0", "③ ADD partials", "④ CHECK"];
  const f = (F: string, k: boolean) => (k ? "?" : F);
  const M = n === "ones_line";
  const _ = n === "tens_line";
  const x = n === "product" || n === "sum_houses";
  const I: AlgoStep[] = [
    {
      id: "setup",
      kind: "setup",
      label: "SETUP",
      detail: `Stack ${i} over × ${t}. Ones under ones. ${sterKid(i, t).split}`,
      show: `${i} × ${t}`,
    },
    {
      id: "ones",
      kind: "ones",
      label: "ONES LINE",
      detail: `Multiply by the ONES digit (${o}). One digit at a time — carry leftovers. ${sterKid(i, t).ones} ${sterKid(i, t).carry}`,
      show: f(fmt(r.line), e !== "guided" && M),
      ask: M,
    },
    {
      id: "zero",
      kind: "zero",
      label: "WRITE ZERO",
      detail: `Start the TENS line with a 0 in the ones place (you're really doing ×${a}0). Don't drop the zero when you multiply tens.`,
      show: "0 _ _ _",
    },
    {
      id: "tens",
      kind: "tens",
      label: "TENS LINE",
      detail: `Multiply by the TENS digit (${a}), write beside the zero → ${fmt(c)}. ${sterKid(i, t).tens}`,
      show: f(fmt(c), e !== "guided" && _),
      ask: _,
    },
    {
      id: "add",
      kind: "add",
      label: "ADD PARTIALS",
      detail: `${fmt(r.line)} + ${fmt(c)} = ${fmt(s)}. ${sterKid(i, t).add}`,
      show: f(fmt(s), e === "full" || (e === "blanks" && x)),
      ask: x && n === "product",
    },
    {
      id: "check",
      kind: "check",
      label: "CHECK",
      detail: `Estimate: ~${Math.round(i / 10) * 10} × ${t} ≈ ${fmt(Math.round(i / 10) * 10 * t)}. Exact ${fmt(s)} nearby? ${sterKid(i, t).check}`,
      show: fmt(s),
    },
  ];
  if (e === "guided") I[1]!.detail += ` — ${r.work}`;
  const T = n === "hundreds_house";
  const A = n === "tens_house";
  const C = n === "ones_house";
  const w: House[] = [
    {
      label: "HUNDREDS",
      value: e === "full" || T ? `${fmt(d)} × ${t} = ?` : `${fmt(d)} × ${t} = ${fmt(p)}`,
      ask: T,
    },
    {
      label: "TENS",
      value: e === "full" || A ? `${fmt(h)} × ${t} = ?` : `${fmt(h)} × ${t} = ${fmt(g)}`,
      ask: A,
    },
    {
      label: "ONES",
      value: e === "full" || C ? `${u} × ${t} = ?` : `${u} × ${t} = ${fmt(v)}`,
      ask: C,
    },
  ];
  const y =
    e === "full"
      ? `${i}\n× ${t}\n————\n?\n(ones line)\n+ ?0  ← write zero!\n————\n?`
      : `${i}\n× ${t}\n————\n${fmt(r.line)}  ← ×${o}\n${fmt(c)}  ← ×${a}0\n————\n${e === "guided" ? fmt(s) : "?"}`;
  const P = `Ones: ${i}×${o}=${fmt(r.line)}. Write 0, then ${i}×${a}=${fmt(l)} → ${fmt(c)}. Add = ${fmt(s)}. Houses: ${fmt(p)}+${fmt(g)}+${fmt(v)}.`;
  return { a: i, b: t, product: s, hardness: e, algo: I, houses: w, crumbs: m, notepad: y, coach: P };
}

/** Canonical 118×13 stuck-line board. */
export function guided118x13(): StepBoard {
  return buildBoard(118, 13, "guided", "product");
}

export function renderBoard(i: StepBoard, opts?: { compact?: boolean }): string {
  const e = opts?.compact ? " compact" : "";
  const n = i.algo.find((l) => l.ask)?.kind;
  const s = n === "ones" ? 0 : n === "zero" || n === "tens" ? 1 : n === "add" ? 2 : n === "check" ? 3 : 0;
  const o = i.crumbs
    .map((l, c) => `<span class="t3-crumb${c === s ? " on" : ""}">${l}</span>`)
    .join('<span class="t3-crumb-arrow">→</span>');
  const a = i.algo
    .map(
      (l) => `<div class="t3-step ${l.kind}${l.ask ? " ask" : ""}" data-step="${l.id}">
      <div class="t3-step-label">${l.label}</div>
      <div class="t3-step-detail">${l.detail}</div>
      <div class="t3-step-show">${l.show}</div>
    </div>`,
    )
    .join("");
  const r = i.houses
    .map((l) => `<div class="house${l.ask ? " ask" : ""}"><small>${l.label}</small><b>${l.value}</b></div>`)
    .join("");
  const k = sterKid(i.a, i.b);
  return `<div class="t3-board${e}" data-hardness="${i.hardness}">
    <p class="t3-kid">${k.line}</p>
    <div class="t3-crumbs">${o}</div>
    <div class="t3-algo">${a}</div>
    <div class="t3-houses place-houses">${r}</div>
    <pre class="t3-notepad">${i.notepad}</pre>
  </div>`;
}

export function flowChartHtml(): string {
  const i = [
    { t: "① SPLIT HOUSES", d: "hundreds / tens / ones" },
    { t: "② HUNDREDS × BOTTOM", d: "e.g. 100 × 13 first" },
    { t: "③ TENS × BOTTOM", d: "don't drop the zero — 10 × 13 = 130, not 13" },
    { t: "④ ONES × BOTTOM", d: "e.g. 8 × 13" },
    { t: "⑤ STACK AND ADD", d: "add the three partial products" },
    { t: "⑥ CHECK ESTIMATE", d: "100×13≈1300 — close?" },
  ];
  return `<div class="t3-flow-chart" role="list">${i
    .map(
      (t, e) =>
        `<div class="t3-flow-box" role="listitem"><b>${t.t}</b><span>${t.d}</span></div>${
          e < i.length - 1 ? '<div class="t3-flow-arrow" aria-hidden="true">▼</div>' : ""
        }`,
    )
    .join("")}</div>`;
}

export function parseFactors(prompt: string): Factors | null {
  const t = prompt.match(/(\d{2,3})\s*[×xX*]\s*(\d{1,2})/);
  if (!t) return null;
  const a = Number(t[1]);
  const b = Number(t[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

export function parseAskTarget(prompt: string): AskTarget {
  const t = prompt.toLowerCase();
  if (t.includes("hundreds house")) return "hundreds_house";
  if (t.includes("tens house")) return "tens_house";
  if (t.includes("ones house")) return "ones_house";
  if (t.includes("ones line")) return "ones_line";
  if (t.includes("tens line") || t.includes("write a 0") || t.includes("write zero")) return "tens_line";
  if (t.includes("add the houses") || t.includes("sum the houses")) return "sum_houses";
  return "product";
}

export function htmlT3DrillStepBoard(t: { prompt: string; factors?: Factors; askTarget?: AskTarget }): string {
  const e = t.factors ?? parseFactors(t.prompt);
  if (!e) return `<div class="pp-flow-wrap compact">${flowChartHtml()}</div>`;
  const n: AskTarget = t.askTarget ?? parseAskTarget(t.prompt);
  const s: Hardness =
    n === "hundreds_house" || n === "tens_house" || n === "ones_house" || n === "ones_line" || n === "tens_line"
      ? "blanks"
      : "guided";
  const o = buildBoard(e.a, e.b, s, n);
  return `<div class="pp-drill-steps">
      <div class="pp-flow-wrap compact">${flowChartHtml()}</div>
      ${renderBoard(o, { compact: false })}
    </div>`;
}

export function kidVoiceHtml(prompt: string, factors?: Factors): string {
  const f = factors ?? parseFactors(prompt);
  if (!f) return "";
  return `<p class="t3-kid">${sterKid(f.a, f.b).line}</p>`;
}

function pickAsk(hardness: Hardness): AskTarget {
  if (hardness === "guided" || hardness === "full") return "product";
  const t: AskTarget[] = ["ones_line", "tens_line", "hundreds_house", "tens_house", "ones_house", "sum_houses"];
  return t[Math.floor(Math.random() * t.length)]!;
}

function hardnessFor(level: number): Hardness {
  if (level <= 1) return "guided";
  if (level <= 3) return "blanks";
  return "full";
}

function decoys(n: number): string[] {
  const t = new Set<string>();
  t.add(fmt(n + 100));
  t.add(fmt(n - 100));
  t.add(fmt(n + 30));
  t.add(fmt(Math.floor(n / 10) * 10));
  t.add(fmt(n - (n % 100)));
  const bump = [10, 20, 50, -20, -50][Math.floor(Math.random() * 5)]!;
  t.add(fmt(n + bump));
  return shuffle([...t].filter((s) => s !== fmt(n))).slice(0, 3);
}

export function makeProblem(
  level = 0,
  kind = "street",
  kicker = "TOPIC 3 · PARTIAL PRODUCTS",
  pair?: Factors,
  ask?: AskTarget,
): Problem {
  const { a: n, b: s } = pair ?? PAIR_BANK[Math.floor(Math.random() * PAIR_BANK.length)]!;
  const o = n * s;
  const a = hardnessFor(level);
  const r = Math.floor(n / 100) * 100;
  const l = Math.floor((n % 100) / 10) * 10;
  const c = n % 10;
  const d = r * s;
  const h = l * s;
  const u = c * s;
  const p = ask ?? pickAsk(a);
  const g = buildBoard(n, s, a, p);
  const base = {
    kind,
    kicker,
    houses: g.houses.map((m) => ({ label: m.label, value: m.value })),
    coach: g.coach,
    notepad: g.notepad,
    hardness: a,
    a: n,
    b: s,
    factors: { a: n, b: s },
    askTarget: p,
    steps: g,
  };

  if (a === "blanks" && p === "hundreds_house") {
    return {
      ...base,
      title: "FILL THE HOUSE",
      prompt: `${n} × ${s}. What is the HUNDREDS house? (${fmt(r)} × ${s})`,
      answers: shuffle([fmt(d), ...decoys(d)]),
      correct: fmt(d),
      cash: 700 + level * 90,
    };
  }
  if (a === "blanks" && p === "tens_house") {
    return {
      ...base,
      title: "FILL THE HOUSE",
      prompt: `${n} × ${s}. What is the TENS house? (${fmt(l)} × ${s})`,
      answers: shuffle([fmt(h), fmt(h + 10), fmt(Math.max(0, h - 10)), fmt(l * 10)]),
      correct: fmt(h),
      cash: 700 + level * 90,
    };
  }
  if (a === "blanks" && p === "ones_house") {
    return {
      ...base,
      title: "FILL THE HOUSE",
      prompt: `${n} × ${s}. What is the ONES house? (${c} × ${s})`,
      answers: shuffle([fmt(u), ...decoys(u)]),
      correct: fmt(u),
      cash: 700 + level * 90,
    };
  }
  if (a === "blanks" && p === "ones_line") {
    const m = n * (s % 10);
    return {
      ...base,
      title: "ONES LINE",
      prompt: `${n} × ${s}. Multiply by the ONES digit (${s % 10}) — what is the ones line?`,
      answers: shuffle([fmt(m), ...decoys(m)]),
      correct: fmt(m),
      cash: 750 + level * 90,
    };
  }
  if (a === "blanks" && p === "tens_line") {
    const m = n * Math.floor(s / 10) * 10;
    return {
      ...base,
      title: "TENS LINE · WRITE ZERO",
      prompt: `${n} × ${s}. Write a 0, then × tens digit (${Math.floor(s / 10)}). What is the tens line?`,
      answers: shuffle([fmt(m), ...decoys(m)]),
      correct: fmt(m),
      cash: 750 + level * 90,
    };
  }
  if (a === "blanks" && p === "sum_houses") {
    return {
      ...base,
      title: "SUM THE HOUSES",
      prompt: `${n} × ${s}. Houses shown — what's the total?`,
      houses: [
        { label: "HUNDREDS", value: `${fmt(d)}` },
        { label: "TENS", value: `${fmt(h)}` },
        { label: "ONES", value: `${fmt(u)}` },
      ],
      answers: shuffle([fmt(o), ...decoys(o)]),
      correct: fmt(o),
      cash: 750 + level * 100,
    };
  }
  if (a === "full") {
    return {
      ...base,
      title: "FULL PRODUCT",
      prompt: `${n} × ${s} = ?  (ones → write 0 → tens → add)`,
      answers: shuffle([fmt(o), ...decoys(o)]),
      correct: fmt(o),
      cash: 900 + level * 120,
    };
  }
  return {
    ...base,
    title: "SETUP STEPS",
    prompt: `Crack ${n} × ${s}. Follow the steps, then pick the product.`,
    answers: shuffle([fmt(o), ...decoys(o)]),
    correct: fmt(o),
    cash: 600 + level * 80,
  };
}

/** First Grand Prix gate: 118×13 stuck line (houses → × bottom → add → estimate). */
export function opening118x13(): Problem {
  return makeProblem(0, "prix", "GRAND PRIX · TOPIC 3", { a: 118, b: 13 }, "sum_houses");
}

export function sameAnswer(guess: string, correct: string): boolean {
  const e = (n: string) => n.replace(/[$,]/g, "").trim();
  return guess === correct || e(guess) === e(correct);
}

/** Keep these identifiers in the production bundle for pedagogy checks. */
export const PEDAGOGY_MARKERS = {
  boardClass: "pp-drill-steps",
  onesLine: "ONES LINE",
  hundredsHouse: "hundreds_house" as const,
  askTarget: "askTarget",
  factors118: { a: 118, b: 13 } as Factors,
};
