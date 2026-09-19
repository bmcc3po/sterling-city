/** Topic 3 multiply engine — keep pp-drill-steps / ONES LINE / hundreds_house / askTarget / {a:118}. */

export type AskTarget =
  | "ones_line"
  | "tens_line"
  | "hundreds_house"
  | "tens_house"
  | "ones_house"
  | "sum_houses"
  | "product";

export type Hardness = "guided" | "blanks" | "full";

export type AlgoStep = {
  id: string;
  kind: string;
  label: string;
  detail: string;
  show: string;
  ask?: boolean;
};

export type HouseCard = {
  label: string;
  value: string;
  ask?: boolean;
};

export type Worked = {
  a: number;
  b: number;
  product: number;
  hardness: Hardness;
  algo: AlgoStep[];
  houses: HouseCard[];
  crumbs: string[];
  notepad: string;
  coach: string;
};

export type Topic3Question = {
  id: string;
  prompt: string;
  answers: string[];
  correct: string;
  explain: string;
  factors: { a: number; b: number };
  askTarget: AskTarget;
  cash?: number;
};

function re(n: number) {
  return n.toLocaleString("en-US");
}

export function sterKid(a: number, b: number) {
  const hundreds = Math.floor(a / 100) * 100;
  const tens = Math.floor((a % 100) / 10) * 10;
  const ones = a % 10;
  const stuck =
    a === 118 && b === 13
      ? "Start with the hundreds house: what is 100 × 13? Then tens (10×13), then ones (8×13). Add them."
      : `Start with the hundreds house: what is ${hundreds} × ${b}? Then tens (${tens}×${b}), then ones (${ones}×${b}). Add them.`;
  return {
    split: `Split the top number into place-value houses: hundreds ${hundreds} / tens ${tens} / ones ${ones}.`,
    hundreds: `Multiply hundreds × bottom number first (${hundreds} × ${b}).`,
    tens:
      tens >= 10
        ? `Don't drop the zero when you multiply tens (${tens} × ${b} = ${tens * b}, not ${(tens / 10) * b}).`
        : `Don't drop the zero when you multiply tens.`,
    ones: `Multiply ones × bottom (${ones} × ${b}).`,
    add: "Stack the three answers and add.",
    check: `Check: estimate (${hundreds}×${b}≈${hundreds * b}) — is your answer close?`,
    carry: "If a house makes 10 or more, rename into the next house.",
    stuck,
    line: stuck,
  };
}

function onesWork(a: number, onesDigit: number) {
  const e = Math.floor(a / 100);
  const n = Math.floor((a % 100) / 10);
  const s = a % 10;
  const o = s * onesDigit;
  const writeOnes = o % 10;
  const carry1 = Math.floor(o / 10);
  const tens = n * onesDigit + carry1;
  const writeTens = tens % 10;
  const carry2 = Math.floor(tens / 10);
  const hun = e * onesDigit + carry2;
  const line = a * onesDigit;
  const work = `${s}×${onesDigit}=${o} write ${writeOnes}${carry1 ? ` carry ${carry1}` : ""} · ${n}×${onesDigit}${
    carry1 ? `+${carry1}` : ""
  }=${tens} write ${writeTens}${carry2 ? ` carry ${carry2}` : ""} · ${e}×${onesDigit}${
    carry2 ? `+${carry2}` : ""
  }=${hun}`;
  return { line, work };
}

export function buildWorked(a: number, b: number, hardness: Hardness = "guided", ask: AskTarget = "product"): Worked {
  const product = a * b;
  const onesDigit = b % 10;
  const tensDigit = Math.floor(b / 10);
  const ones = onesWork(a, onesDigit);
  const tensBare = a * tensDigit;
  const tensLine = tensBare * 10;
  const hunPlace = Math.floor(a / 100) * 100;
  const tenPlace = Math.floor((a % 100) / 10) * 10;
  const onePlace = a % 10;
  const hunProd = hunPlace * b;
  const tenProd = tenPlace * b;
  const oneProd = onePlace * b;
  const crumbs = ["① ONES×carry", "② TENS+0", "③ ADD partials", "④ CHECK"];
  const hide = (shown: string, blank: boolean) => (blank ? "?" : shown);
  const askOnes = ask === "ones_line";
  const askTens = ask === "tens_line";
  const askProduct = ask === "product" || ask === "sum_houses";
  const kid = sterKid(a, b);

  const algo: AlgoStep[] = [
    {
      id: "setup",
      kind: "setup",
      label: "SETUP",
      detail: `Stack ${a} over × ${b}. Ones under ones. ${kid.split}`,
      show: `${a} × ${b}`,
    },
    {
      id: "ones",
      kind: "ones",
      label: "ONES LINE",
      detail: `Multiply by the ONES digit (${onesDigit}). One digit at a time — carry leftovers. ${kid.ones} ${kid.carry}`,
      show: hide(re(ones.line), hardness !== "guided" && askOnes),
      ask: askOnes,
    },
    {
      id: "zero",
      kind: "zero",
      label: "WRITE ZERO",
      detail: `Start the TENS line with a 0 in the ones place (you're really doing ×${tensDigit}0). Don't drop the zero when you multiply tens.`,
      show: "0 _ _ _",
    },
    {
      id: "tens",
      kind: "tens",
      label: "TENS LINE",
      detail: `Multiply by the TENS digit (${tensDigit}), write beside the zero → ${re(tensLine)}. ${kid.tens}`,
      show: hide(re(tensLine), hardness !== "guided" && askTens),
      ask: askTens,
    },
    {
      id: "add",
      kind: "add",
      label: "ADD PARTIALS",
      detail: `${re(ones.line)} + ${re(tensLine)} = ${re(product)}. ${kid.add}`,
      show: hide(re(product), hardness === "full" || (hardness === "blanks" && askProduct)),
      ask: askProduct && ask === "product",
    },
    {
      id: "check",
      kind: "check",
      label: "CHECK",
      detail: `Estimate: ~${Math.round(a / 10) * 10} × ${b} ≈ ${re(Math.round(a / 10) * 10 * b)}. Exact ${re(product)} nearby? ${kid.check}`,
      show: re(product),
    },
  ];
  if (hardness === "guided") algo[1]!.detail += ` — ${ones.work}`;

  const askH = ask === "hundreds_house";
  const askT = ask === "tens_house";
  const askO = ask === "ones_house";
  const houses: HouseCard[] = [
    {
      label: "HUNDREDS",
      value: hardness === "full" || askH ? `${re(hunPlace)} × ${b} = ?` : `${re(hunPlace)} × ${b} = ${re(hunProd)}`,
      ask: askH,
    },
    {
      label: "TENS",
      value: hardness === "full" || askT ? `${re(tenPlace)} × ${b} = ?` : `${re(tenPlace)} × ${b} = ${re(tenProd)}`,
      ask: askT,
    },
    {
      label: "ONES",
      value: hardness === "full" || askO ? `${onePlace} × ${b} = ?` : `${onePlace} × ${b} = ${re(oneProd)}`,
      ask: askO,
    },
  ];

  const notepad =
    hardness === "full"
      ? `${a}\n× ${b}\n————\n?\n(ones line)\n+ ?0  ← write zero!\n————\n?`
      : `${a}\n× ${b}\n————\n${re(ones.line)}  ← ×${onesDigit}\n${re(tensLine)}  ← ×${tensDigit}0\n————\n${hardness === "guided" ? re(product) : "?"}`;

  return {
    a,
    b,
    product,
    hardness,
    algo,
    houses,
    crumbs,
    notepad,
    coach: `Ones: ${a}×${onesDigit}=${re(ones.line)}. Write 0, then ${a}×${tensDigit}=${re(tensBare)} → ${re(tensLine)}. Add = ${re(product)}. Houses: ${re(hunProd)}+${re(tenProd)}+${re(oneProd)}.`,
  };
}

export function worked118(): Worked {
  return buildWorked(118, 13, "guided", "product");
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderT3Board(w: Worked, compact = false): string {
  const askKind = w.algo.find((s) => s.ask)?.kind;
  const crumbOn = askKind === "ones" ? 0 : askKind === "zero" || askKind === "tens" ? 1 : askKind === "add" ? 2 : 3;
  const crumbs = w.crumbs
    .map((c, i) => `<span class="t3-crumb${i === crumbOn ? " on" : ""}">${c}</span>`)
    .join('<span class="t3-crumb-arrow">→</span>');
  const steps = w.algo
    .map(
      (s) => `<div class="t3-step ${s.kind}${s.ask ? " ask" : ""}" data-step="${s.id}">
      <div class="t3-step-label">${s.label}</div>
      <div class="t3-step-detail">${s.detail}</div>
      <div class="t3-step-show">${s.show}</div>
    </div>`,
    )
    .join("");
  const houses = w.houses
    .map((h) => `<div class="house${h.ask ? " ask" : ""}" data-house="${h.label.toLowerCase()}_house"><small>${h.label}</small><b>${h.value}</b></div>`)
    .join("");
  const kid = sterKid(w.a, w.b);
  return `<div class="t3-board${compact ? " compact" : ""}" data-hardness="${w.hardness}" data-a="${w.a}" data-b="${w.b}">
    <p class="t3-kid">${kid.line}</p>
    <div class="t3-crumbs">${crumbs}</div>
    <div class="t3-algo">${steps}</div>
    <div class="t3-houses place-houses" id="place-houses">${houses}</div>
    <pre class="t3-notepad">${w.notepad}</pre>
  </div>`;
}

export function inferAskTarget(prompt: string): AskTarget {
  const t = prompt.toLowerCase();
  if (t.includes("hundreds house")) return "hundreds_house";
  if (t.includes("tens house")) return "tens_house";
  if (t.includes("ones house")) return "ones_house";
  if (t.includes("ones line")) return "ones_line";
  if (t.includes("tens line")) return "tens_line";
  if (t.includes("add the houses") || t.includes("sum the houses")) return "sum_houses";
  return "product";
}

export function parseFactors(text: string): { a: number; b: number } | null {
  const m = text.match(/(\d{2,3})\s*[×xX*]\s*(\d{1,2})/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

export function hardnessForAsk(ask: AskTarget): Hardness {
  return ask === "hundreds_house" || ask === "tens_house" || ask === "ones_house" || ask === "ones_line" || ask === "tens_line"
    ? "blanks"
    : "guided";
}

export function renderDrillSteps(q: Topic3Question): string {
  const factors = q.factors ?? parseFactors(q.prompt) ?? { a: 118, b: 13 };
  const ask = q.askTarget ?? inferAskTarget(q.prompt);
  const w = buildWorked(factors.a, factors.b, hardnessForAsk(ask), ask);
  return `<div class="pp-drill-steps">
      ${renderT3Board(w, false)}
    </div>`;
}

export function sterStripHtml(): string {
  const k = sterKid(118, 13);
  return `<div class="t3-ster-strip">
    <b>Kid path (every problem):</b>
    <ol>
      <li>Split the top number into place-value houses: hundreds / tens / ones</li>
      <li>Multiply hundreds × bottom number first (e.g. 100 × 13)</li>
      <li>Multiply tens × bottom (watch the zero — 10 × 13 = 130, not 13)</li>
      <li>Multiply ones × bottom</li>
      <li>Add the three partial products</li>
      <li>Check: estimate (100×13≈1300) — is your answer close?</li>
    </ol>
    <p>${k.stuck}</p>
  </div>`;
}

export const T3_BANK: Topic3Question[] = [
  {
    id: "t3q1",
    prompt: "118 × 13 — add the houses (100×13, 10×13, 8×13)",
    answers: ["1,534", "1,300", "1,430", "1,318"],
    correct: "1,534",
    explain: "1300+130+104=1,534",
    factors: { a: 118, b: 13 },
    askTarget: "sum_houses",
    cash: 850,
  },
  {
    id: "t3q2",
    prompt: "246 × 12 — hundreds house (200×12)?",
    answers: ["2,400", "2,460", "246", "480"],
    correct: "2,400",
    explain: "200×12=2,400. Full: 2400+480+72=2,952",
    factors: { a: 246, b: 12 },
    askTarget: "hundreds_house",
    cash: 700,
  },
  {
    id: "t3q3",
    prompt: "305 × 14 = ? (partial products)",
    answers: ["4,270", "4,200", "3,050", "4,070"],
    correct: "4,270",
    explain: "300×14=4200, 0×14=0, 5×14=70 → 4,270",
    factors: { a: 305, b: 14 },
    askTarget: "product",
    cash: 900,
  },
  {
    id: "t3q4",
    prompt: "172 × 23 — sum the houses",
    answers: ["3,956", "3,440", "1,720", "3,856"],
    correct: "3,956",
    explain: "100×23=2300, 70×23=1610, 2×23=46 → 3,956",
    factors: { a: 172, b: 23 },
    askTarget: "sum_houses",
    cash: 950,
  },
  {
    id: "t3q5",
    prompt: "409 × 15 = ?",
    answers: ["6,135", "6,000", "4,090", "5,135"],
    correct: "6,135",
    explain: "400×15=6000, 0, 9×15=135 → 6,135",
    factors: { a: 409, b: 15 },
    askTarget: "product",
    cash: 900,
  },
  {
    id: "t3q6",
    prompt: "118 × 13 — ONES LINE (118 × 3)?",
    answers: ["354", "384", "318", "1,180"],
    correct: "354",
    explain: "118×3=354. Then write 0 and do 118×1 → 1,180. Add 354+1,180=1,534.",
    factors: { a: 118, b: 13 },
    askTarget: "ones_line",
    cash: 650,
  },
  {
    id: "t3q7",
    prompt: "205 × 14 — ones house (5×14)?",
    answers: ["70", "28", "205", "2,800"],
    correct: "70",
    explain: "Ones house: 5×14=70. Hundreds 200×14=2,800. Sum 2,870.",
    factors: { a: 205, b: 14 },
    askTarget: "ones_house",
    cash: 600,
  },
];

export function pickQuestion(exceptId?: string): Topic3Question {
  const pool = exceptId ? T3_BANK.filter((q) => q.id !== exceptId) : T3_BANK;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
