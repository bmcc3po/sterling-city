/** STER WORK school-feed integration hooks (Campus Parent + Canvas). */

export type PortalStatus = { status: string; via?: string; failCount?: number; note?: string };

export type SchoolFeed = {
  asOf: string;
  student: {
    name: string;
    gradeLevel: number;
    school?: string;
    district?: string;
    homeroom?: string;
  };
  portals: { canvas?: PortalStatus; campusParent?: PortalStatus };
  authError?: string | { code?: string; provider?: string; message?: string };
  courses: { name: string; percent: number; letter: string; trend: string; teacher?: string }[];
  missing: {
    id: string;
    title: string;
    subject?: string;
    action: string;
    notifyTeacher?: boolean;
    detail?: string;
  }[];
  homework: {
    id: string;
    title: string;
    subject: string;
    dueAt: string;
    notesRequired?: boolean;
    cashReward: number;
    video?: { title?: string | null; url?: string | null; canvasUrl?: string | null; urls?: string[] };
  }[];
  openTests: { id: string; title: string; window?: string; description?: string; status?: string }[];
  topics: { id: string; name: string; status: string; skills?: string[] }[];
};

export type SchoolProgress = {
  topicsCompleted: string[];
  topicQuestionCorrect: Record<string, string[]>;
  homeworkCompleted: string[];
  homeworkNotes: Record<string, string>;
  lessonsWatched: string[];
  missionCredits: number;
  noteSlots: Record<string, string[]>;
  cash: number;
  prixWins: number;
  speedBest: number;
};

export type TopicQuestion = {
  id: string;
  prompt: string;
  answers: string[];
  correct: string;
  explain: string;
  factors?: { a: number; b: number };
  askTarget?: string;
};

export type TopicPractice = {
  topicId: string;
  cashReward: number;
  cards: { id: string; title: string; body: string; tip?: string }[];
  questions: TopicQuestion[];
};

const CRED_KEY = "sterling-school-credentials-v1";
const PROG_KEY = "sterling-school-progress-v1";
const FEED_URL_KEY = "sterling-school-feed-url";

export const CAMPUS_PARENT_URL = "https://campus.ccsd.net/campus/portal/parents/clark.jsp";
export const STER_WORK_HANDOFF =
  "STER WORK handoff: please sign into Campus Parent on the STER WORK computer (not Dad’s phone/browser). Sterling City grades only refresh after that machine’s school pull reports campusParent.status=ok. Portal for reference: https://campus.ccsd.net/campus/portal/parents/clark.jsp";

export function mockFeed(): SchoolFeed {
  return {
    asOf: "2026-09-16T15:00:00-07:00",
    student: {
      name: "Sterling Martin Curry",
      gradeLevel: 5,
      school: "Walker International School ES",
      homeroom: "Mrs. Naylor",
      district: "CCSD",
    },
    portals: {
      canvas: { status: "ok", via: "Clever" },
      campusParent: {
        status: "AUTH_FAIL",
        failCount: 1,
        note: "Parent login wall — reconnect required",
      },
    },
    courses: [
      { name: "Art 5", percent: 95, letter: "E", trend: "flat" },
      { name: "PE 5", percent: 91, letter: "E", trend: "up" },
      { name: "Science 5", percent: 80.55, letter: "B", trend: "up" },
      { name: "Language 5", percent: 72.08, letter: "C", trend: "flat" },
      { name: "Reading 5", percent: 71.23, letter: "C", trend: "flat" },
      { name: "Writing 5", percent: 69.26, letter: "D", trend: "down" },
      { name: "Math 5", percent: 59.73, letter: "F", trend: "down" },
    ],
    missing: [
      { id: "qc-1.1", title: "Math Quick Check 1.1", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-1-2", title: "Math Quick Check 1-2", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-1-3", title: "Math Quick Check 1-3", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-1-4", title: "Math Quick Check 1-4", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-2-1", title: "Math Quick Check 2-1", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-2-3", title: "Math Quick Check 2-3", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-2-4", title: "Math Quick Check 2-4", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "qc-2-5", title: "Math Quick Check 2-5", subject: "math", action: "school_retake", notifyTeacher: true },
      { id: "sci-1.4", title: "Science Patterns 1.4", subject: "science", action: "school_makeup", notifyTeacher: false },
      { id: "sci-1.5", title: "Science Patterns 1.5", subject: "science", action: "school_makeup", notifyTeacher: false },
      { id: "sci-1.6", title: "Science Patterns 1.6", subject: "science", action: "school_makeup", notifyTeacher: false },
    ],
    homework: [
      {
        id: "t3-8-video",
        title: "Topic 3-8 class videos",
        subject: "math",
        dueAt: "2026-09-16T15:30:00-07:00",
        notesRequired: true,
        cashReward: 50,
        video: {
          title: "Mrs. Naylor Topic 3-8 lesson videos",
          url: "https://www.youtube.com/watch?v=0MqP7aeTszM",
          urls: [
            "https://www.youtube.com/watch?v=0MqP7aeTszM",
            "https://www.youtube.com/watch?v=x-1xfrgxhjI",
            "https://www.youtube.com/watch?v=WYJsQo7ZTC4",
            "https://www.youtube.com/watch?v=9dYXfZZsbzc",
          ],
          canvasUrl: "https://esccsd.instructure.com/courses/822733/modules/items/17190629",
        },
      },
      {
        id: "t3-assess",
        title: "Topic 3 Assessment Practice",
        dueAt: "2026-09-16T15:30:00-07:00",
        subject: "math",
        notesRequired: true,
        cashReward: 50,
        video: {
          title: "Assessment Practice (worksheet in Canvas)",
          url: null,
          canvasUrl: "https://esccsd.instructure.com/courses/822733/modules/items/17197527",
        },
      },
    ],
    openTests: [{ id: "mod2-wk2-quiz", title: "Reading Module 2 Week 2 Quiz", window: "due 2026-09-17" }],
    topics: [
      { id: "t1", name: "Topic 1 Decimals", status: "review", skills: ["place value", "line up dots"] },
      { id: "t2", name: "Topic 2 Decimals", status: "review", skills: ["add decimals", "subtract decimals"] },
      {
        id: "t3",
        name: "Topic 3 Multiply",
        status: "current",
        skills: ["partial products", "118×13", "place-value houses"],
      },
      { id: "t4", name: "Topic 4 Divide", status: "review", skills: ["division"] },
      { id: "t5", name: "Topic 5 Fractions", status: "review", skills: ["parts of whole"] },
      { id: "t6", name: "Topic 6 Volume", status: "review", skills: ["L×W×H"] },
      { id: "t7", name: "Topic 7 Convert", status: "review", skills: ["units"] },
      { id: "t8", name: "Topic 8 Graphs", status: "review", skills: ["line plots"] },
    ],
  };
}

export const T3_PRACTICE: TopicPractice = {
  topicId: "t3",
  cashReward: 2500,
  cards: [
    {
      id: "t3c1",
      title: "Partial products — place value",
      body: "Split the top number into place-value houses: hundreds / tens / ones. Multiply hundreds × bottom first (100 × 13), then tens (don't drop the zero — 10 × 13 = 130, not 13), then ones (8 × 13).",
      tip: "If a house makes 10 or more, rename into the next house.",
    },
    {
      id: "t3c2",
      title: "118 × 13 step-by-step",
      body: "Start with the hundreds house: what is 100 × 13? Then tens (10×13), then ones (8×13). Stack the three answers and add: 1,300 + 130 + 104 = 1,534.",
      tip: "Don't drop the zero when you multiply tens.",
    },
    {
      id: "t3c3",
      title: "Check with estimate",
      body: "Check: estimate (100×13≈1300) — is your answer close? 1,534 is near 1,300 (and 120×13=1,560).",
    },
  ],
  questions: [
    {
      id: "t3q1",
      prompt: "118 × 13 — add the houses (100×13, 10×13, 8×13)",
      answers: ["1,534", "1,300", "1,430", "1,318"],
      correct: "1,534",
      explain: "1300+130+104=1,534",
      factors: { a: 118, b: 13 },
      askTarget: "sum_houses",
    },
    {
      id: "t3q2",
      prompt: "246 × 12 — hundreds house (200×12)?",
      answers: ["2,400", "2,460", "246", "480"],
      correct: "2,400",
      explain: "200×12=2,400. Full: 2400+480+72=2,952",
      factors: { a: 246, b: 12 },
      askTarget: "hundreds_house",
    },
    {
      id: "t3q3",
      prompt: "305 × 14 = ? (partial products)",
      answers: ["4,270", "4,200", "3,050", "4,070"],
      correct: "4,270",
      explain: "300×14=4200, 0×14=0, 5×14=70 → 4,270",
      factors: { a: 305, b: 14 },
      askTarget: "product",
    },
  ],
};

function emptyProgress(): SchoolProgress {
  return {
    topicsCompleted: [],
    topicQuestionCorrect: {},
    homeworkCompleted: [],
    homeworkNotes: {},
    lessonsWatched: [],
    missionCredits: 0,
    noteSlots: {},
    cash: 0,
    prixWins: 0,
    speedBest: 0,
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function validFeed(i: unknown): i is SchoolFeed {
  if (!i || typeof i !== "object") return false;
  const t = i as SchoolFeed;
  return typeof t.asOf === "string" && t.student != null && Array.isArray(t.courses) && Array.isArray(t.missing);
}

async function fetchFeed(url: string): Promise<SchoolFeed | null> {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 1800);
    const t = await fetch(url, { cache: "no-store", signal: ac.signal });
    clearTimeout(timer);
    if (!t.ok) return null;
    const e = await t.json();
    return validFeed(e) ? e : null;
  } catch {
    return null;
  }
}

function feedOverride(): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get("schoolFeed");
    if (q) return q;
  } catch {}
  try {
    return localStorage.getItem(FEED_URL_KEY);
  } catch {
    return null;
  }
}

export class SchoolFeedClient {
  feed: SchoolFeed | null = null;
  sourceLabel = "mock";

  async load(): Promise<SchoolFeed> {
    const override = feedOverride();
    if (override) {
      const remote = await fetchFeed(override);
      if (remote) {
        this.feed = remote;
        this.sourceLabel = `remote · ${override}`;
        return remote;
      }
    }
    const live = await fetchFeed("/school/feed.json");
    if (live) {
      this.feed = live;
      this.sourceLabel = "/school/feed.json";
      return live;
    }
    const sample = await fetchFeed("/school/feed.sample.json");
    if (sample) {
      this.feed = sample;
      this.sourceLabel = "/school/feed.sample.json";
      return sample;
    }
    const mock = mockFeed();
    this.feed = mock;
    this.sourceLabel = "rich mock";
    return mock;
  }

  getProgress(): SchoolProgress {
    const t = readJson(PROG_KEY, emptyProgress());
    t.topicsCompleted ||= [];
    t.topicQuestionCorrect ||= {};
    t.homeworkCompleted ||= [];
    t.lessonsWatched ||= [];
    t.noteSlots ||= {};
    if (typeof t.cash !== "number") t.cash = 0;
    if (typeof t.prixWins !== "number") t.prixWins = 0;
    if (typeof t.speedBest !== "number") t.speedBest = 0;
    return t;
  }

  saveProgress(t: SchoolProgress) {
    try {
      localStorage.setItem(PROG_KEY, JSON.stringify(t));
    } catch {}
  }

  getTopicPractice(id: string): TopicPractice | null {
    if (id === "t3") {
      return {
        ...T3_PRACTICE,
        questions: T3_PRACTICE.questions.map((q) => ({ ...q, answers: [...q.answers] })),
      };
    }
    return null;
  }
}

export const schoolClient = new SchoolFeedClient();

export function authFail(feed: SchoolFeed | null) {
  if (!feed) return null;
  const t = feed.portals?.campusParent;
  if (t && String(t.status).toUpperCase() === "AUTH_FAIL") {
    return {
      code: "AUTH_FAIL",
      provider: "campus_parent",
      message: t.note || "Your Campus Parent login needs a refresh.",
    };
  }
  return null;
}

export function authFailCopy(i: { message?: string; code?: string }): string {
  const t = (i.message || "").trim();
  if (/login wall|reconnect required|re-auth|authentication failed/i.test(t) || !t || t === i.code) {
    return "Grades sync from STER WORK’s school pull. Banner clears after Parent is signed in on STER WORK’s computer.";
  }
  return t;
}

export function providerLabel(i: string): string {
  if (i === "campus_parent") return "Campus Parent";
  if (i === "canvas") return "Canvas";
  return i;
}

export function whenLabel(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}
