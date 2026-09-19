import "./style.css";
import "./mobile.css";
import "./math-stage.css";
import "./screens.css";
import "./gta3-hud.css";
import "./device";
import "./game.recovered.js";

const more = document.getElementById("more-btn");
const sheet = document.getElementById("pause-sheet");
more?.addEventListener("click", () => {
  if (!sheet) return;
  sheet.hidden = !sheet.hidden;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheet && !sheet.hidden) sheet.hidden = true;
});
sheet?.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.id === "practice-btn" || t.id === "school-btn" || t.id === "shop-btn") {
    sheet.hidden = true;
  }
});
