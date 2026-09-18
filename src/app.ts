import { SchoolHub } from "./hub";
import { GrandPrix } from "./grandPrix";
import { CityStub } from "./cityStub";
import { schoolClient } from "./schoolFeed";
import { PEDAGOGY_MARKERS } from "./topic3";

export function boot() {
  const hubEl = document.getElementById("school-hub")!;
  const prixEl = document.getElementById("grand-prix")!;
  const cityEl = document.getElementById("city-stub")!;
  const bootEl = document.getElementById("boot");
  const toast = document.getElementById("school-cash-toast");

  const showToast = (amount: number, reason: string) => {
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = `+$${amount} · ${reason}`;
    toast.classList.add("show");
    window.setTimeout(() => {
      toast.classList.remove("show");
      toast.hidden = true;
    }, 1200);
  };

  const hub = new SchoolHub(hubEl, {
    onPlayPrix: () => {
      hub.hide();
      document.body.classList.add("prix-screen");
      prix.start();
    },
    onEnterCity: () => {
      hub.hide();
      document.body.classList.add("city-screen");
      city.start();
    },
    onCash: (amount, reason) => showToast(amount, reason),
  });

  const prix = new GrandPrix(prixEl, {
    onExit: () => {
      document.body.classList.remove("prix-screen");
      void hub.open();
    },
    onWin: (cash) => {
      const p = schoolClient.getProgress();
      p.cash += cash;
      p.prixWins += 1;
      schoolClient.saveProgress(p);
      showToast(cash, "Grand Prix win");
    },
  });

  const city = new CityStub(cityEl, () => {
    document.body.classList.remove("city-screen");
    void hub.open();
  });

  void hub.open().finally(() => {
    bootEl?.classList.add("hide");
    window.setTimeout(() => bootEl?.setAttribute("hidden", ""), 180);
  });

  // Keep pedagogy identifiers reachable so minify cannot drop them.
  (window as Window & { __SC_PEDAGOGY?: typeof PEDAGOGY_MARKERS }).__SC_PEDAGOGY = PEDAGOGY_MARKERS;
}
