import { isLiteGpu } from "./device";
import "./style.css";
import { SterlingCity } from "./game";
import { practiceProblem } from "./mathBank";

document.documentElement.classList.toggle("lite-gpu", isLiteGpu);
document.body.classList.toggle("lite-gpu", isLiteGpu);

const canvas = document.getElementById("gl") as HTMLCanvasElement;

function showMathFallback(reason: string) {
  document.getElementById("boot")?.classList.add("hide");
  const gate = document.getElementById("math-gate");
  if (!gate) return;
  const p = practiceProblem();
  gate.hidden = false;
  const kicker = document.getElementById("gate-kicker");
  const title = document.getElementById("gate-title");
  const prompt = document.getElementById("gate-prompt");
  const steps = document.getElementById("pp-drill-steps");
  const answers = document.getElementById("answers");
  if (kicker) kicker.textContent = p.kicker;
  if (title) title.textContent = p.title;
  if (prompt) prompt.textContent = `${p.prompt}  ·  ${reason}`;
  if (steps) {
    steps.hidden = false;
    steps.innerHTML = p.stepsHtml ?? "";
  }
  if (answers) answers.innerHTML = p.answers.map((a) => `<button type="button">${a}</button>`).join("");
}

try {
  new SterlingCity(canvas);
} catch (err) {
  console.error(err);
  showMathFallback("City GPU context failed — Topic 3 still open");
}
