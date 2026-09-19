import {
  type AskTarget,
  type Topic3Question,
  pickQuestion,
  renderDrillSteps,
  shuffle,
  sterKid,
  sterStripHtml,
} from "./topic3";

export type Problem = {
  kind: "courier" | "vault" | "getaway" | "garage" | "boss" | "practice" | "gp";
  kicker: string;
  title: string;
  prompt: string;
  answers: string[];
  correct: string;
  coach: string;
  houses?: { label: string; value: string }[];
  factors?: { a: number; b: number };
  askTarget?: AskTarget;
  stepsHtml?: string;
  cash?: number;
};

function fromT3(q: Topic3Question, kind: Problem["kind"], kicker: string, title: string): Problem {
  const kid = sterKid(q.factors.a, q.factors.b);
  return {
    kind,
    kicker,
    title,
    prompt: q.prompt,
    answers: shuffle(q.answers),
    correct: q.correct,
    coach: `${q.explain} ${kid.stuck}`,
    factors: q.factors,
    askTarget: q.askTarget,
    stepsHtml: renderDrillSteps(q),
    cash: q.cash,
  };
}

export function courierProblem(): Problem {
  return fromT3(pickQuestion(), "courier", "STREET BOOTH · TOPIC 3", "ONES LINE GATE");
}

export function vaultProblem(): Problem {
  const q = pickQuestion();
  const forced: Topic3Question =
    q.askTarget === "hundreds_house" || q.askTarget === "sum_houses"
      ? q
      : {
          id: "vault-118",
          prompt: "118 × 13 — add the houses (100×13, 10×13, 8×13)",
          answers: ["1,534", "1,300", "1,430", "1,318"],
          correct: "1,534",
          explain: "1300+130+104=1,534",
          factors: { a: 118, b: 13 },
          askTarget: "sum_houses",
          cash: 2400,
        };
  return fromT3(forced, "vault", "VAULT DIALS · TOPIC 3", "PLACE-VALUE HOUSES");
}

export function getawayProblem(): Problem {
  const facts: Topic3Question[] = [
    {
      id: "g1",
      prompt: "118 × 13 — ONES LINE (118 × 3)?",
      answers: ["354", "384", "318", "1,180"],
      correct: "354",
      explain: "118×3=354",
      factors: { a: 118, b: 13 },
      askTarget: "ones_line",
      cash: 200,
    },
    {
      id: "g2",
      prompt: "36 × 12 — sum the houses",
      answers: ["432", "360", "48", "372"],
      correct: "432",
      explain: "30×12=360 and 6×12=72. Add those products.",
      factors: { a: 36, b: 12 },
      askTarget: "sum_houses",
      cash: 200,
    },
    {
      id: "g3",
      prompt: "15 × 6 = ?",
      answers: ["90", "21", "80", "96"],
      correct: "90",
      explain: "15×6=90. Adding would be 21.",
      factors: { a: 15, b: 6 },
      askTarget: "product",
      cash: 200,
    },
  ];
  return fromT3(facts[Math.floor(Math.random() * facts.length)]!, "getaway", "NITRO GATE · TOPIC 3", "HIT THE BOOST");
}

export function garageProblem(): Problem {
  return fromT3(pickQuestion("t3q1"), "garage", "SHOP TERMINAL · TOPIC 3", "UNLOCK PART");
}

export function bossProblem(): Problem {
  return fromT3(pickQuestion(), "boss", "20s VAULT RAIN", "CATCH THE REAL ONE");
}

export function practiceProblem(): Problem {
  const p = fromT3(pickQuestion(), "practice", "PAUSE · PRACTICE", "TOPIC 3 DRILL");
  p.stepsHtml = `${sterStripHtml()}${p.stepsHtml ?? ""}`;
  return p;
}

export function gpProblem(): Problem {
  return fromT3(pickQuestion(), "gp", "GRAND PRIX · OPTIONAL", "TOPIC 3 SETUP");
}
