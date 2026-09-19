/** City is not the product. Short unlock card that routes back — no WASD box world. */

export type CityHooks = {
  onHub: () => void;
  onPrix: () => void;
};

export class CityStub {
  root: HTMLElement;
  hooks: CityHooks;
  timer = 0;
  open = false;

  constructor(root: HTMLElement, hooks: CityHooks) {
    this.root = root;
    this.hooks = hooks;
    this.root.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-city]") as HTMLElement | null;
      if (!t) return;
      if (t.dataset.city === "hub") this.go("hub");
      if (t.dataset.city === "prix") this.go("prix");
    });
  }

  start() {
    this.open = true;
    this.root.hidden = false;
    this.root.removeAttribute("hidden");
    this.root.innerHTML = `
      <div class="city-unlock" role="dialog" aria-labelledby="city-unlock-title">
        <div class="city-unlock-card pop-in">
          <p class="eyebrow">NOT THE GAME</p>
          <h1 id="city-unlock-title">City unlocks after Grand Prix</h1>
          <p>No empty box world. The open city is a later reward. Topic 3 Grand Prix is the loop — houses, boost, stall, win.</p>
          <div class="city-unlock-actions">
            <button type="button" class="cta huge" data-city="prix">PLAY GRAND PRIX</button>
            <button type="button" class="ghost" data-city="hub">Back to School Hub</button>
          </div>
          <p class="city-unlock-tick">Snapping back to Hub…</p>
        </div>
      </div>`;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.go("hub"), 2200);
  }

  close() {
    this.go("hub");
  }

  closeQuiet() {
    this.open = false;
    window.clearTimeout(this.timer);
    this.root.hidden = true;
  }

  private go(to: "hub" | "prix") {
    if (!this.open) return;
    this.open = false;
    window.clearTimeout(this.timer);
    this.root.hidden = true;
    if (to === "prix") this.hooks.onPrix();
    else this.hooks.onHub();
  }
}
