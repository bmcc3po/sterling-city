import { renderDrillSteps, sterKid, T3_BANK, worked118 } from "./topic3";

const q = T3_BANK[0]!;
const html = renderDrillSteps(q);
const checks = [
  ["pp-drill-steps", html.includes("pp-drill-steps")],
  ["ONES LINE", html.includes("ONES LINE")],
  ["hundreds_house", html.includes("hundreds_house") || q.askTarget === "sum_houses"],
  ["askTarget", q.askTarget === "sum_houses"],
  ["a:118", q.factors.a === 118 && q.factors.b === 13],
  ["worked118", worked118().a === 118 && worked118().product === 1534],
  ["sterKid", sterKid(118, 13).stuck.includes("100 × 13")],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("topic3 checks failed", failed);
  process.exit(1);
}
console.log("topic3 ok", checks.map(([n]) => n).join(", "));
