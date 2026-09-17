export type Problem = {
  kind: "courier" | "vault" | "getaway" | "garage" | "boss";
  kicker: string;
  title: string;
  prompt: string;
  answers: string[];
  correct: string;
  coach: string;
  houses?: { label: string; value: string }[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function courierProblem(): Problem {
  const bank: Problem[] = [
    {
      kind: "courier",
      kicker: "DROP LOCK · TOPIC 2",
      title: "EXACT CHANGE",
      prompt: "Pizza is $14.80. Sterling hands over $20.00. Change?",
      answers: ["$5.20", "$6.20", "$5.02", "$4.80"],
      correct: "$5.20",
      coach: "Line up the cents under cents: 20.00 − 14.80. The dots stay stacked. 20.00 − 14.80 = 5.20.",
    },
    {
      kind: "courier",
      kicker: "DROP LOCK · TOPIC 2",
      title: "LINE UP THE DOTS",
      prompt: "3.45 + 2.8  (line up the decimal points)",
      answers: ["6.25", "3.73", "5.25", "6.125"],
      correct: "6.25",
      coach: "2.8 is 2.80. Stack the dots: 3.45 + 2.80 = 6.25. Never line digits up from the left.",
    },
    {
      kind: "courier",
      kicker: "TOLL BOOTH · TOPIC 1",
      title: "PLACE VALUE",
      prompt: "The toll reads 0.73. What is 10 times as much?",
      answers: ["7.3", "0.073", "73", "0.703"],
      correct: "7.3",
      coach: "Times 10 slides every digit one place left. 0.73 becomes 7.3 — the 7 moves from tenths to ones.",
    },
    {
      kind: "courier",
      kicker: "DROP LOCK · TOPIC 2",
      title: "ADD THE MONEY",
      prompt: "$8.50 + $6.75",
      answers: ["$15.25", "$14.25", "$15.125", "$13.25"],
      correct: "$15.25",
      coach: "Cents under cents: 50¢ + 75¢ = $1.25, then 8 + 6 + 1 = 15, so $15.25.",
    },
  ];
  const p = bank[Math.floor(Math.random() * bank.length)]!;
  return { ...p, answers: shuffle(p.answers) };
}

export function vaultProblem(): Problem {
  const bank: Problem[] = [
    {
      kind: "vault",
      kicker: "VAULT DIALS · TOPIC 3",
      title: "PLACE-VALUE HOUSES",
      prompt: "Crack 118 × 13. Add the three houses.",
      houses: [
        { label: "HUNDREDS", value: "100 × 13 = 1,300" },
        { label: "TENS", value: "10 × 13 = 130" },
        { label: "ONES", value: "8 × 13 = 104" },
      ],
      answers: ["1,534", "1,300", "131", "1,430"],
      correct: "1,534",
      coach: "Don't stop at the hundreds house. 1,300 + 130 + 104 = 1,534. Adding 118+13=131 is a different operation.",
    },
    {
      kind: "vault",
      kicker: "VAULT DIALS · TOPIC 3",
      title: "PLACE-VALUE HOUSES",
      prompt: "Crack 205 × 14.",
      houses: [
        { label: "HUNDREDS", value: "200 × 14 = 2,800" },
        { label: "TENS", value: "0 × 14 = 0" },
        { label: "ONES", value: "5 × 14 = 70" },
      ],
      answers: ["2,870", "2,800", "219", "2,070"],
      correct: "2,870",
      coach: "Keep every house. 2,800 + 0 + 70 = 2,870. Stopping at 2,800 leaves the ones on the floor.",
    },
    {
      kind: "vault",
      kicker: "VAULT DIALS · TOPIC 3",
      title: "FACT STRIKE",
      prompt: "36 × 12",
      houses: [
        { label: "TENS", value: "30 × 12 = 360" },
        { label: "ONES", value: "6 × 12 = 72" },
        { label: "SUM", value: "360 + 72 = ?" },
      ],
      answers: ["432", "360", "48", "372"],
      correct: "432",
      coach: "Break it: 30×12=360 and 6×12=72. Add those products — don't add 36+12.",
    },
  ];
  const p = bank[Math.floor(Math.random() * bank.length)]!;
  return { ...p, answers: shuffle(p.answers) };
}

export function getawayProblem(): Problem {
  const facts = [
    ["7 × 8", "56", "15", "48", "63"],
    ["9 × 6", "54", "15", "56", "45"],
    ["12 × 8", "96", "20", "88", "108"],
    ["11 × 12", "132", "23", "121", "144"],
    ["15 × 6", "90", "21", "80", "96"],
  ];
  const f = facts[Math.floor(Math.random() * facts.length)]!;
  return {
    kind: "getaway",
    kicker: "NITRO GATE · TOPIC 3",
    title: "HIT THE BOOST",
    prompt: `${f[0]}  for a speed burst`,
    answers: shuffle([f[1]!, f[2]!, f[3]!, f[4]!]),
    correct: f[1]!,
    coach: `${f[0]} is ${f[1]}. ${f[2]} is what you get if you add instead of multiply.`,
  };
}

export function garageProblem(): Problem {
  return {
    kind: "garage",
    kicker: "SHOP TERMINAL · STREAK",
    title: "UNLOCK PART",
    prompt: "4.07 + 3.9  (stack the dots)",
    answers: shuffle(["7.97", "4.46", "7.097", "8.07"]),
    correct: "7.97",
    coach: "3.9 is 3.90. Ones under ones: 4.07 + 3.90 = 7.97. Left-aligning the digits makes a fake 4.46.",
  };
}

export function bossProblem(): Problem {
  const bank = [
    ["8 × 7", "56", "15", "63"],
    ["0.4 + 0.35", "0.75", "0.39", "0.075"],
    ["9 × 12", "108", "21", "99"],
    ["6.1 + 2.45", "8.55", "8.46", "3.06"],
    ["14 × 5", "70", "19", "60"],
  ];
  const f = bank[Math.floor(Math.random() * bank.length)]!;
  return {
    kind: "boss",
    kicker: "20s VAULT RAIN",
    title: "CATCH THE REAL ONE",
    prompt: f[0]!,
    answers: shuffle([f[1]!, f[2]!, f[3]!]),
    correct: f[1]!,
    coach: "Near-miss decoy. Check if you added instead of multiplied, or lined decimals from the left.",
  };
}
