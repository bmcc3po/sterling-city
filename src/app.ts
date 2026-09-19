import { SchoolHub } from "./hub";
import { GrandPrix } from "./grandPrix";
import { CityStub } from "./cityStub";
import { schoolClient } from "./schoolFeed";
import { PEDAGOGY_MARKERS } from "./topic3";

function stripCityDeepLink() {
  const url = new URL(window.location.href);
  const screen = url.searchParams.get("screen") || url.searchParams.get("mode");
  const hash = url.hash.replace(/^#/, "").toLowerCase();
  if (screen === "city" || hash === "city" || hash === "city-stub") {
    url.searchParams.delete("screen");
    url.searchParams.delete("mode");
    url.hash = "";
    history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
}

export function boot() {
  stripCityDeepLink();

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

  const openPrix = () => {
    hub.hide();
    city.closeQuiet();
    document.body.classList.remove("city-screen", "hub-screen");
    document.body.classList.add("prix-screen");
    prix.start();
  };

  const openHub = () => {
    document.body.classList.remove("prix-screen", "city-screen");
    void hub.open();
  };

  const hub = new SchoolHub(hubEl, {
    onPlayPrix: openPrix,
    onCash: (amount, reason) => showToast(amount, reason),
  });

  const prix = new GrandPrix(prixEl, {
    onExit: openHub,
    onWin: (cash) => {
      const p = schoolClient.getProgress();
      p.cash += cash;
      p.prixWins += 1;
      schoolClient.saveProgress(p);
      showToast(cash, "Grand Prix win");
    },
  });

  const city = new CityStub(cityEl, {
    onHub: openHub,
    onPrix: openPrix,
  });

  // School Hub is the only boot destination. Never start City Stub.
  void hub.open().finally(() => {
    bootEl?.classList.add("hide");
    window.setTimeout(() => bootEl?.setAttribute("hidden", ""), 180);
  });

  // Keep pedagogy identifiers reachable so minify cannot drop them.
  (window as Window & { __SC_PEDAGOGY?: typeof PEDAGOGY_MARKERS }).__SC_PEDAGOGY = PEDAGOGY_MARKERS;
}
