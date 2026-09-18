/** Tiny 2D city stub — reward door, not the product. No Three.js / bloom. */

export class CityStub {
  root: HTMLElement;
  onHub: () => void;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  raf = 0;
  x = 180;
  y = 160;
  vx = 0;
  vy = 0;
  keys = new Set<string>();
  open = false;

  constructor(root: HTMLElement, onHub: () => void) {
    this.root = root;
    this.onHub = onHub;
    this.root.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-city]");
      if (t instanceof HTMLElement && t.dataset.city === "hub") this.close();
    });
    window.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
  }

  start() {
    this.open = true;
    this.root.hidden = false;
    this.root.innerHTML = `
      <div class="city-full">
        <header class="city-bar">
          <div>
            <strong>CITY STUB</strong>
            <p>Reward door only — Hub + Grand Prix is the game. WASD / arrows.</p>
          </div>
          <button type="button" class="cta" data-city="hub">BACK TO HUB</button>
        </header>
        <canvas id="city-canvas" class="city-canvas"></canvas>
      </div>`;
    this.canvas = this.root.querySelector("#city-canvas");
    this.ctx = this.canvas?.getContext("2d") ?? null;
    this.fit();
    window.addEventListener("resize", () => this.fit(), { passive: true });
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  close() {
    this.open = false;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.onHub();
  }

  private fit() {
    if (!this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 480;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private tick(_t: number) {
    if (!this.open) return;
    const acc = 0.55;
    const max = 5.2;
    if (this.keys.has("a") || this.keys.has("arrowleft")) this.vx -= acc;
    if (this.keys.has("d") || this.keys.has("arrowright")) this.vx += acc;
    if (this.keys.has("w") || this.keys.has("arrowup")) this.vy -= acc;
    if (this.keys.has("s") || this.keys.has("arrowdown")) this.vy += acc;
    this.vx *= 0.86;
    this.vy *= 0.86;
    this.vx = Math.max(-max, Math.min(max, this.vx));
    this.vy = Math.max(-max, Math.min(max, this.vy));
    const w = this.canvas?.clientWidth || 800;
    const h = this.canvas?.clientHeight || 480;
    this.x = Math.max(20, Math.min(w - 20, this.x + this.vx));
    this.y = Math.max(20, Math.min(h - 20, this.y + this.vy));
    this.draw(w, h);
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private draw(w: number, h: number) {
    const c = this.ctx;
    if (!c) return;
    c.fillStyle = "#cfefff";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#7ed36a";
    c.fillRect(0, h * 0.72, w, h * 0.28);
    const blocks = [
      [40, 40, 90, 110, "#ff8a5b"],
      [160, 30, 70, 90, "#7aa6ff"],
      [280, 50, 100, 80, "#ffd24a"],
      [420, 24, 80, 120, "#c084fc"],
      [540, 40, 110, 70, "#4fd1c5"],
      [80, 180, 120, 70, "#f687b3"],
      [260, 170, 80, 90, "#63b3ed"],
      [400, 190, 140, 60, "#f6ad55"],
    ];
    for (const [x, y, bw, bh, col] of blocks) {
      c.fillStyle = String(col);
      c.fillRect(Number(x), Number(y), Number(bw), Number(bh));
      c.fillStyle = "rgba(255,255,255,.35)";
      c.fillRect(Number(x) + 8, Number(y) + 10, 14, 14);
    }
    c.fillStyle = "#ffb400";
    c.beginPath();
    c.roundRect(this.x - 18, this.y - 10, 40, 20, 6);
    c.fill();
    c.fillStyle = "#12203a";
    c.fillRect(this.x - 6, this.y - 6, 16, 8);
    c.fillStyle = "#12203a";
    c.font = "800 14px Nunito, sans-serif";
    c.fillText("Gold GT · city later", 16, h - 18);
  }
}
