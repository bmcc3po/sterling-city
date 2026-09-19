export type ControlSample = {
  steer: number;
  throttle: number;
  brake: number;
  handbrake: boolean;
  interact: boolean;
  interactEdge: boolean;
  escape: boolean;
  boost: boolean;
};

export class Input {
  steer = 0;
  throttle = 0;
  brake = 0;
  handbrake = false;
  interact = false;
  interactEdge = false;
  escape = false;
  boost = false;
  private keys = new Set<string>();
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private prevInteract = false;
  private prevEscape = false;
  private gasHeld = false;
  private brakeHeld = false;

  constructor(
    private stick: HTMLElement,
    private knob: HTMLElement,
    gas: HTMLElement,
    brake: HTMLElement,
  ) {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    const hold = (el: HTMLElement, on: (v: boolean) => void) => {
      const start = (e: Event) => {
        e.preventDefault();
        on(true);
        el.classList.add("held");
      };
      const end = () => {
        on(false);
        el.classList.remove("held");
      };
      el.addEventListener("pointerdown", start);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    };
    hold(gas, (v) => {
      this.gasHeld = v;
      this.throttle = v ? 1 : 0;
    });
    hold(brake, (v) => {
      this.brakeHeld = v;
      this.brake = v ? 1 : 0;
    });

    stick.addEventListener("pointerdown", (e) => {
      this.pointerId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect();
      this.origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      this.nudge(e.clientX, e.clientY);
    });
    stick.addEventListener("pointermove", (e) => {
      if (this.pointerId !== e.pointerId) return;
      this.nudge(e.clientX, e.clientY);
    });
    const clear = () => {
      this.pointerId = null;
      this.steer = 0;
      if (!this.gasHeld && !this.keys.has("KeyW") && !this.keys.has("ArrowUp")) this.throttle = 0;
      if (!this.brakeHeld && !this.keys.has("KeyS") && !this.keys.has("ArrowDown")) this.brake = 0;
      knob.style.transform = "translate(-50%, -50%)";
    };
    stick.addEventListener("pointerup", clear);
    stick.addEventListener("pointercancel", clear);
  }

  private nudge(x: number, y: number) {
    const dx = x - this.origin.x;
    const dy = y - this.origin.y;
    const max = 52;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, max);
    const nx = (dx / len) * clamped;
    const ny = (dy / len) * clamped;
    this.knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    this.steer = clamp(nx / max);
    if (ny < -8) this.throttle = Math.min(1, -ny / max);
    else if (!this.gasHeld && !this.keys.has("KeyW") && !this.keys.has("ArrowUp")) this.throttle = 0;
    if (ny > 10) this.brake = Math.min(1, ny / max);
    else if (!this.brakeHeld && !this.keys.has("KeyS") && !this.keys.has("ArrowDown")) this.brake = 0;
  }

  sample(): ControlSample {
    let steer = this.steer;
    let throttle = this.throttle;
    let brake = this.brake;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) throttle = 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) brake = 1;
    this.handbrake = this.keys.has("Space");
    this.boost = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const interactNow = this.keys.has("KeyE") || this.keys.has("Enter");
    this.interactEdge = interactNow && !this.prevInteract;
    this.prevInteract = interactNow;
    this.interact = interactNow;
    const escNow = this.keys.has("Escape") || this.keys.has("KeyP");
    this.escape = escNow && !this.prevEscape;
    this.prevEscape = escNow;
    return {
      steer: clamp(steer),
      throttle,
      brake,
      handbrake: this.handbrake,
      interact: this.interact,
      interactEdge: this.interactEdge,
      escape: this.escape,
      boost: this.boost,
    };
  }
}

function clamp(v: number) {
  return Math.max(-1, Math.min(1, v));
}
