import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Sfx } from "./audio";
import { buildCity, CITY_SPAN, makeBeacon, type AABB, type City, type MissionSpot } from "./city";
import { Input } from "./input";
import {
  bossProblem,
  courierProblem,
  garageProblem,
  getawayProblem,
  vaultProblem,
  type Problem,
} from "./mathBank";
import { createCoachCar, createHeroCar, createTrafficCar, type CarKit } from "./vehicles";

type Mode = "drive" | "gate" | "coach" | "boss";
type MissionId = "courier" | "vault" | "getaway" | "garage";

type SimCar = {
  kit: CarKit;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  steerVis: number;
  pitch: number;
  roll: number;
  wheelRot: number;
  wanted?: boolean;
};

const RADIO = [
  "FLASH FM · Night Circuit",
  "HARBOR BEAT · Wet Concrete",
  "COACH TALK · Keep Your Head",
  "STERLING WAVE · Gold Hour",
];

export class SterlingCity {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 420);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private moon: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private city!: City;
  private player!: SimCar;
  private headL: THREE.SpotLight;
  private headR: THREE.SpotLight;
  private traffic: SimCar[] = [];
  private coaches: SimCar[] = [];
  private input: Input;
  private sfx = new Sfx();
  private beacons = new Map<MissionId, THREE.Group>();
  private exhaust: THREE.Points;
  private smoke: THREE.Points;
  private rain: THREE.Points;
  private camPos = new THREE.Vector3(0, 8, 14);
  private camLook = new THREE.Vector3();
  private shake = 0;
  private cash = 0;
  private wanted = 0;
  private streak = 0;
  private mode: Mode = "drive";
  private mission: MissionId = "courier";
  private problem: Problem | null = null;
  private coachTimer = 0;
  private bossTimer = 0;
  private bossCash = 0;
  private getawayOn = false;
  private getawayCool = 0;
  private checkpoints = 0;
  private night = true;
  private clock = new THREE.Clock();
  private radioT = 0;
  private parts = { spoiler: false, tires: false, charger: false };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x050814);
    this.scene.fog = new THREE.FogExp2(0x070b16, 0.012);

    this.hemi = new THREE.HemisphereLight(0x6a7bff, 0x0b0508, 0.45);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xb7c8ff, 1.15);
    this.moon.position.set(40, 70, 18);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    this.moon.shadow.camera.near = 10;
    this.moon.shadow.camera.far = 160;
    this.moon.shadow.camera.left = -28;
    this.moon.shadow.camera.right = 28;
    this.moon.shadow.camera.top = 28;
    this.moon.shadow.camera.bottom = -28;
    this.scene.add(this.moon, this.moon.target);

    const moonBall = new THREE.Mesh(
      new THREE.SphereGeometry(6, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8f0ff, toneMapped: false }),
    );
    moonBall.position.set(-80, 70, -40);
    this.scene.add(moonBall);

    this.city = buildCity(this.renderer);
    this.scene.add(this.city.group);

    const hero = createHeroCar();
    this.player = {
      kit: hero,
      pos: this.city.spawn.clone(),
      vel: new THREE.Vector3(),
      yaw: 0,
      steerVis: 0,
      pitch: 0,
      roll: 0,
      wheelRot: 0,
    };
    this.scene.add(hero.group);

    this.headL = this.makeHeadlight(0.55);
    this.headR = this.makeHeadlight(-0.55);
    hero.group.add(this.headL, this.headR, this.headL.target, this.headR.target);

    const palette = [0x2a6dff, 0xff4d6d, 0x2ee6a6, 0xc07bff, 0xf2f2f2, 0x1c1c22];
    for (let i = 0; i < 10; i++) {
      const kit = createTrafficCar(palette[i % palette.length]!);
      const along = (i % 2 === 0);
      const t: SimCar = {
        kit,
        pos: new THREE.Vector3(along ? (i - 5) * 18 : 8, 0, along ? 8 : (i - 5) * 16),
        vel: new THREE.Vector3(),
        yaw: along ? 0 : Math.PI / 2,
        steerVis: 0,
        pitch: 0,
        roll: 0,
        wheelRot: 0,
      };
      this.traffic.push(t);
      this.scene.add(kit.group);
    }

    for (const spot of this.city.spots) {
      const color = spot.id === this.mission ? 0xffc44d : 0x3cf0ff;
      const b = makeBeacon(color);
      b.position.set(spot.x, 0, spot.z);
      this.beacons.set(spot.id, b);
      this.scene.add(b);
    }

    this.exhaust = this.makeParticles(80, 0xff9a3c, 0.08);
    this.smoke = this.makeParticles(50, 0x888888, 0.12);
    this.rain = this.makeParticles(400, 0xa8c4ff, 0.04);
    this.scene.add(this.exhaust, this.smoke, this.rain);
    this.seedRain();

    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.5, 0.72);
    const out = new OutputPass();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(out);

    this.input = new Input(
      document.getElementById("joystick")!,
      document.querySelector(".stick-knob") as HTMLElement,
      document.getElementById("gas")!,
      document.getElementById("brake")!,
    );

    document.getElementById("theme")!.onclick = () => this.toggleLights();
    document.getElementById("interact")!.onclick = () => this.tryStartMission();
    document.getElementById("answers")!.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "BUTTON") this.solve(t.textContent || "");
    });
    document.getElementById("boss-answers")!.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "BUTTON") this.solveBoss(t.textContent || "");
    });

    window.addEventListener("pointerdown", () => this.sfx.resume(), { once: true });
    window.addEventListener("keydown", () => this.sfx.resume(), { once: true });
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.applyShotParams();
    this.setObjective();
    this.loop();
    document.getElementById("boot")?.classList.add("hide");
    setTimeout(() => document.getElementById("title-card")?.classList.add("go"), 2200);
  }

  private makeHeadlight(x: number) {
    const s = new THREE.SpotLight(0xe8f4ff, 6, 38, Math.PI / 7, 0.45, 1.1);
    s.position.set(x, 0.55, 2.15);
    s.target.position.set(x * 1.4, 0.1, 12);
    s.castShadow = false;
    return s;
  }

  private makeParticles(count: number, color: number, size: number) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private seedRain() {
    const pos = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, (Math.random() - 0.5) * 80, Math.random() * 28, (Math.random() - 0.5) * 80);
    }
    pos.needsUpdate = true;
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  private applyShotParams() {
    const q = new URLSearchParams(location.search);
    const shot = q.get("shot");
    if (shot === "math") {
      this.player.pos.set(this.spot("courier").x, 0, this.spot("courier").z + 4);
      this.openGate(courierProblem());
    }
    if (shot === "chase") {
      this.wanted = 3;
      this.spawnCoaches();
      this.getawayOn = true;
    }
  }

  private spot(id: MissionId): MissionSpot {
    return this.city.spots.find((s) => s.id === id)!;
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.033, this.clock.getDelta());
    this.update(dt);
    this.composer.render();
    this.drawMinimap();
  };

  private update(dt: number) {
    const ctl = this.input.sample();
    if (this.mode === "drive" || this.mode === "boss") {
      this.stepCar(this.player, ctl.throttle, ctl.steer, ctl.brake, ctl.handbrake, dt, true);
    } else {
      this.stepCar(this.player, 0, 0, 1, false, dt, true);
    }
    this.collide(this.player);
    this.applyCarPose(this.player);

    for (const t of this.traffic) {
      const speed = 9;
      t.vel.set(Math.sin(t.yaw) * speed, 0, Math.cos(t.yaw) * speed);
      t.pos.addScaledVector(t.vel, dt);
      if (Math.abs(t.pos.x) > CITY_SPAN / 2 + 20) t.pos.x *= -0.9;
      if (Math.abs(t.pos.z) > CITY_SPAN / 2 + 20) t.pos.z *= -0.9;
      this.applyCarPose(t);
    }

    if (this.wanted > 0) {
      if (this.coaches.length === 0) this.spawnCoaches();
      this.chase(dt);
    } else if (this.coaches.length && this.mode === "drive") {
      this.despawnCoaches();
    }

    this.updateCamera(dt);
    this.updateLights();
    this.updateParticles(dt, ctl.throttle, ctl.handbrake);
    this.updateBeacons(dt);
    this.sfx.engineAt(this.player.vel.length(), ctl.throttle);
    this.sfx.setSiren(this.wanted > 0);

    this.radioT += dt;
    if (this.radioT > 18) {
      this.radioT = 0;
      const el = document.getElementById("radio")!;
      el.textContent = RADIO[Math.floor(Math.random() * RADIO.length)]!;
    }

    const mph = Math.round(this.player.vel.length() * 2.6);
    document.querySelector("#speed b")!.textContent = String(mph);
    document.getElementById("cash")!.textContent = `$${this.cash.toLocaleString()}`;
    this.renderWanted();

    if (this.mode === "drive") this.missionProximity(ctl.interact);
    if (this.mode === "coach") {
      this.coachTimer -= dt;
      if (this.coachTimer <= 0) {
        document.getElementById("coach")!.hidden = true;
        this.mode = "drive";
      }
    }
    if (this.mode === "boss") this.updateBoss(dt);
    if (this.getawayOn && this.mode === "drive") this.updateGetaway(dt);

    this.moon.position.set(this.player.pos.x + 30, 70, this.player.pos.z + 18);
    this.moon.target.position.copy(this.player.pos);
  }

  private stepCar(
    car: SimCar,
    throttle: number,
    steer: number,
    brake: number,
    handbrake: boolean,
    dt: number,
    player: boolean,
  ) {
    const forward = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const signed = car.vel.dot(forward);
    const max = (this.parts.charger ? 46 : 38) + (this.getawayOn && player ? 6 : 0);
    const accel = (this.parts.charger ? 36 : 30) * throttle * (signed < 0 ? 0.6 : 1);
    car.vel.addScaledVector(forward, accel * dt);
    if (brake) {
      if (signed > 0.6) car.vel.addScaledVector(forward, -48 * dt);
      else car.vel.addScaledVector(forward, -16 * dt);
    }
    const grip = (handbrake ? 2.2 : this.parts.tires ? 16 : 11) * (this.parts.tires ? 1.2 : 1);
    const lat = car.vel.dot(right);
    car.vel.addScaledVector(right, -lat * Math.min(1, grip * dt));
    car.vel.multiplyScalar(1 - (handbrake ? 0.35 : 0.55) * dt);
    if (car.vel.length() > max) car.vel.setLength(max);

    const speed = car.vel.length();
    const steerScale = THREE.MathUtils.clamp(Math.abs(signed) / 7, 0, 1) * (1 - Math.min(speed / 90, 0.35));
    car.yaw += steer * 2.15 * Math.sign(signed || throttle) * steerScale * dt * (handbrake ? 1.55 : 1);
    car.pos.addScaledVector(car.vel, dt);

    car.wheelRot += signed * dt / 0.34;
    car.steerVis = THREE.MathUtils.damp(car.steerVis, steer * 0.5, 10, dt);
    car.pitch = THREE.MathUtils.damp(car.pitch, -throttle * 0.09 + brake * 0.12, 8, dt);
    car.roll = THREE.MathUtils.damp(car.roll, -steer * 0.14 * Math.min(speed / 18, 1), 8, dt);
  }

  private collide(car: SimCar) {
    const r = 1.15;
    for (const b of this.city.colliders) {
      const cx = Math.max(b.minX, Math.min(car.pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(car.pos.z, b.maxZ));
      const dx = car.pos.x - cx;
      const dz = car.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = (r - d) + 0.02;
        car.pos.x += (dx / d) * push;
        car.pos.z += (dz / d) * push;
        car.vel.multiplyScalar(0.35);
        this.shake = Math.max(this.shake, 0.28);
      }
    }
    const lim = CITY_SPAN / 2 + 28;
    car.pos.x = THREE.MathUtils.clamp(car.pos.x, -lim, lim);
    car.pos.z = THREE.MathUtils.clamp(car.pos.z, -lim, lim);
  }

  private applyCarPose(car: SimCar) {
    car.kit.group.position.set(car.pos.x, 0, car.pos.z);
    car.kit.group.rotation.y = car.yaw;
    car.kit.body.rotation.x = car.pitch;
    car.kit.body.rotation.z = car.roll;
    for (const w of car.kit.wheels) w.rotation.x = car.wheelRot;
    for (const w of car.kit.frontWheels) w.rotation.y = car.steerVis;
  }

  private updateCamera(dt: number) {
    const back = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const desired = this.player.pos.clone().addScaledVector(back, 8.4).add(new THREE.Vector3(0, 4.1, 0));
    this.camPos.lerp(desired, 1 - Math.pow(0.001, dt));
    if (this.shake > 0) {
      this.camPos.x += (Math.random() - 0.5) * this.shake;
      this.camPos.y += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake *= 1 - 6 * dt;
    }
    this.camera.position.copy(this.camPos);
    const look = this.player.pos.clone().add(new THREE.Vector3(Math.sin(this.player.yaw) * 7, 1.1, Math.cos(this.player.yaw) * 7));
    this.camLook.lerp(look, 1 - Math.pow(0.0008, dt));
    this.camera.lookAt(this.camLook);
    const boost = this.getawayOn ? 6 : 0;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 58 + this.player.vel.length() * 0.12 + boost, 6, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateLights() {
    const nearest = [...this.city.lamps].sort(
      (a, b) => a.position.distanceToSquared(this.player.pos) - b.position.distanceToSquared(this.player.pos),
    );
    this.city.lamps.forEach((l) => {
      l.intensity = 0;
    });
    nearest.slice(0, 8).forEach((l, i) => {
      l.intensity = this.night ? 3.4 - i * 0.2 : 0.4;
    });
  }

  private updateParticles(dt: number, throttle: number, drift: boolean) {
    const ex = this.exhaust.geometry.getAttribute("position") as THREE.BufferAttribute;
    const back = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    for (let i = 0; i < ex.count; i++) {
      let x = ex.getX(i) + back.x * dt * 10 + (Math.random() - 0.5) * 0.05;
      let y = ex.getY(i) + dt * 1.2;
      let z = ex.getZ(i) + back.z * dt * 10;
      if (y > 2.4 || Math.random() < 0.08) {
        x = this.player.pos.x + back.x * 2.1 + (Math.random() - 0.5) * 0.3;
        y = 0.35;
        z = this.player.pos.z + back.z * 2.1;
      }
      ex.setXYZ(i, x, y, z);
    }
    ex.needsUpdate = true;
    (this.exhaust.material as THREE.PointsMaterial).opacity = 0.25 + throttle * 0.5;

    const sm = this.smoke.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < sm.count; i++) {
      let y = sm.getY(i) + dt * 0.6;
      let x = sm.getX(i) + (Math.random() - 0.5) * 0.2;
      let z = sm.getZ(i) + (Math.random() - 0.5) * 0.2;
      if (!drift || y > 1.8) {
        x = this.player.pos.x + (Math.random() - 0.5) * 1.4;
        y = 0.12;
        z = this.player.pos.z + (Math.random() - 0.5) * 1.4;
      }
      sm.setXYZ(i, x, y, z);
    }
    sm.needsUpdate = true;
    (this.smoke.material as THREE.PointsMaterial).opacity = drift ? 0.55 : 0.05;

    const rain = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < rain.count; i++) {
      let y = rain.getY(i) - dt * 28;
      let x = rain.getX(i);
      let z = rain.getZ(i);
      if (y < 0) {
        x = this.player.pos.x + (Math.random() - 0.5) * 70;
        y = 18 + Math.random() * 12;
        z = this.player.pos.z + (Math.random() - 0.5) * 70;
      }
      rain.setXYZ(i, x, y, z);
    }
    rain.needsUpdate = true;
  }

  private updateBeacons(dt: number) {
    for (const [id, g] of this.beacons) {
      const d = g.userData.diamond as THREE.Mesh;
      d.rotation.y += dt * 1.8;
      d.position.y = 4.2 + Math.sin(performance.now() / 400) * 0.25;
      const active = id === this.mission;
      g.visible = true;
      (d.material as THREE.MeshPhysicalMaterial).emissiveIntensity = active ? 4 : 1.2;
      g.scale.setScalar(active ? 1 : 0.72);
    }
  }

  private missionProximity(interact: boolean) {
    const s = this.spot(this.mission);
    const dist = Math.hypot(this.player.pos.x - s.x, this.player.pos.z - s.z);
    const btn = document.getElementById("interact") as HTMLButtonElement;
    if (dist < 9) {
      btn.hidden = false;
      btn.textContent = `START ${s.label}`;
      if (dist < 5.5 || interact) this.tryStartMission();
    } else btn.hidden = true;
  }

  private tryStartMission() {
    if (this.mode !== "drive") return;
    const dist = Math.hypot(this.player.pos.x - this.spot(this.mission).x, this.player.pos.z - this.spot(this.mission).z);
    if (dist > 10) return;
    document.getElementById("interact")!.hidden = true;
    if (this.mission === "courier") this.openGate(courierProblem());
    if (this.mission === "vault") this.openGate(vaultProblem());
    if (this.mission === "getaway") this.startGetaway();
    if (this.mission === "garage") this.openGate(garageProblem());
  }

  private openGate(p: Problem) {
    this.problem = p;
    this.mode = "gate";
    const gate = document.getElementById("math-gate")!;
    gate.hidden = false;
    document.getElementById("gate-kicker")!.textContent = p.kicker;
    document.getElementById("gate-title")!.textContent = p.title;
    document.getElementById("gate-prompt")!.textContent = p.prompt;
    const houses = document.getElementById("place-houses")!;
    const lanes = document.getElementById("fall-lanes")!;
    if (p.houses) {
      houses.hidden = false;
      houses.innerHTML = p.houses
        .map((h) => `<div class="house"><small>${h.label}</small><b>${h.value}</b></div>`)
        .join("");
      lanes.hidden = false;
      lanes.innerHTML = p.answers
        .slice(0, 3)
        .map((a, i) => `<div class="lane"><div class="chip" style="top:${12 + i * 8}px">${a}</div></div>`)
        .join("");
    } else {
      houses.hidden = true;
      lanes.hidden = true;
    }
    document.getElementById("answers")!.innerHTML = p.answers.map((a) => `<button type="button">${a}</button>`).join("");
  }

  private solve(answer: string) {
    if (!this.problem || this.mode !== "gate") return;
    const ok = answer === this.problem.correct;
    document.getElementById("math-gate")!.hidden = true;
    if (ok) {
      this.sfx.blip(true);
      this.streak += 1;
      this.wanted = Math.max(0, this.wanted - 1);
      const pay = this.problem.kind === "vault" ? 2400 : this.problem.kind === "garage" ? 0 : 850;
      if (pay) this.payout(pay);
      this.shake = 0.18;
      this.bloom.strength = 1.25;
      setTimeout(() => (this.bloom.strength = 0.85), 220);
      if (this.problem.kind === "garage") this.buyPart();
      else this.advance();
      this.mode = "drive";
      this.startBoss();
    } else {
      this.sfx.blip(false);
      this.streak = 0;
      this.wanted = Math.min(5, this.wanted + 1);
      this.showCoach(this.problem.coach);
    }
  }

  private buyPart() {
    if (!this.parts.charger) {
      this.parts.charger = true;
      this.toast("SUPERCHARGER ON");
    } else if (!this.parts.tires) {
      this.parts.tires = true;
      this.toast("SPORT TIRES");
    } else {
      this.parts.spoiler = true;
      this.toast("NIGHT SPOILER");
    }
    this.advance();
  }

  private advance() {
    const order: MissionId[] = ["courier", "vault", "getaway", "garage"];
    const i = order.indexOf(this.mission);
    this.mission = order[(i + 1) % order.length]!;
    this.getawayOn = false;
    this.setObjective();
  }

  private startGetaway() {
    this.getawayOn = true;
    this.checkpoints = 0;
    this.getawayCool = 0.8;
    this.mode = "drive";
    this.toast("HIT THE GOLD RINGS");
    this.setObjective("GETAWAY — NAIL MULTIPLY FACTS FOR NITRO. WRONG MATH CALLS COACH.");
  }

  private updateGetaway(dt: number) {
    this.getawayCool -= dt;
    const s = this.spot("getaway");
    // moving ring ahead of player
    const ahead = this.player.pos.clone().add(new THREE.Vector3(Math.sin(this.player.yaw) * 28, 0, Math.cos(this.player.yaw) * 28));
    const beacon = this.beacons.get("getaway")!;
    beacon.position.lerp(new THREE.Vector3(ahead.x, 0, ahead.z), 0.15);
    if (this.player.pos.distanceTo(beacon.position) < 5) {
      this.checkpoints += 1;
      this.payout(200);
      if (this.checkpoints >= 4) {
        this.getawayOn = false;
        beacon.position.set(s.x, 0, s.z);
        this.advance();
        this.startBoss();
      }
    }
    if (this.getawayCool <= 0 && this.mode === "drive") {
      this.getawayCool = 7;
      this.openGate(getawayProblem());
    }
  }

  private startBoss() {
    this.mode = "boss";
    this.bossTimer = 20;
    this.bossCash = 0;
    document.getElementById("boss")!.hidden = false;
    this.nextBoss();
  }

  private nextBoss() {
    const p = bossProblem();
    this.problem = p;
    document.getElementById("boss-prompt")!.textContent = p.prompt;
    document.getElementById("boss-answers")!.innerHTML = p.answers.map((a) => `<button type="button">${a}</button>`).join("");
  }

  private solveBoss(answer: string) {
    if (!this.problem) return;
    if (answer === this.problem.correct) {
      this.bossCash += 150;
      this.payout(150);
      this.sfx.blip(true);
    } else {
      this.wanted = Math.min(5, this.wanted + 1);
      this.sfx.blip(false);
    }
    this.nextBoss();
  }

  private updateBoss(dt: number) {
    this.bossTimer -= dt;
    document.getElementById("boss-time")!.textContent = Math.max(0, this.bossTimer).toFixed(1);
    document.getElementById("boss-cash")!.textContent = `$${this.bossCash}`;
    if (this.bossTimer <= 0) {
      document.getElementById("boss")!.hidden = true;
      this.mode = "drive";
      this.toast("BONUS BANKED");
    }
  }

  private showCoach(text: string) {
    this.mode = "coach";
    this.coachTimer = 2.8;
    const el = document.getElementById("coach")!;
    el.hidden = false;
    document.getElementById("coach-body")!.textContent = text;
    this.spawnCoaches();
  }

  private spawnCoaches() {
    const n = this.wanted >= 3 ? 2 : 1;
    while (this.coaches.length < n) {
      const kit = createCoachCar();
      const back = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
      const car: SimCar = {
        kit,
        pos: this.player.pos.clone().addScaledVector(back, 16 + this.coaches.length * 6).add(new THREE.Vector3(4, 0, 0)),
        vel: new THREE.Vector3(),
        yaw: this.player.yaw,
        steerVis: 0,
        pitch: 0,
        roll: 0,
        wheelRot: 0,
        wanted: true,
      };
      this.coaches.push(car);
      this.scene.add(kit.group);
    }
  }

  private despawnCoaches() {
    for (const c of this.coaches) this.scene.remove(c.kit.group);
    this.coaches = [];
  }

  private chase(dt: number) {
    for (const c of this.coaches) {
      const to = this.player.pos.clone().sub(c.pos);
      const wantYaw = Math.atan2(to.x, to.z);
      c.yaw = THREE.MathUtils.damp(c.yaw, wantYaw, 3.2, dt);
      const throttle = 0.92;
      this.stepCar(c, throttle, Math.max(-1, Math.min(1, (wantYaw - c.yaw) * 2)), 0, false, dt, false);
      this.collide(c);
      this.applyCarPose(c);
      if (c.kit.lightbar) {
        const m = c.kit.lightbar.material as THREE.MeshPhysicalMaterial;
        m.emissive = new THREE.Color(Math.sin(performance.now() / 80) > 0 ? 0xff2448 : 0x3cf0ff);
        m.emissiveIntensity = 5;
      }
    }
  }

  private payout(n: number) {
    this.cash += n;
    this.toast(`+$${n}`);
  }

  private toast(text: string) {
    const el = document.getElementById("toast")!;
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  private setObjective(text?: string) {
    const labels: Record<MissionId, string> = {
      courier: "DRIVE TO THE GOLD BLIP — COURIER DROP",
      vault: "HIT THE BANK VAULT — PLACE-VALUE CRACK",
      getaway: "GOLD RING GETAWAY — MULTIPLY FOR NITRO",
      garage: "GARAGE LIFT — STREAK PARTS WITH CASH",
    };
    document.getElementById("objective")!.textContent = text ?? labels[this.mission];
  }

  private renderWanted() {
    const el = document.getElementById("wanted")!;
    el.classList.toggle("hot", this.wanted > 0);
    [...el.children].forEach((s, i) => s.classList.toggle("on", i < this.wanted));
  }

  private toggleLights() {
    this.night = !this.night;
    document.getElementById("theme")!.textContent = this.night ? "NIGHT" : "DAWN";
    document.body.classList.toggle("light", !this.night);
    this.scene.background = new THREE.Color(this.night ? 0x050814 : 0x8aa3c7);
    this.scene.fog = new THREE.FogExp2(this.night ? 0x070b16 : 0x9bb4d4, this.night ? 0.012 : 0.008);
    this.hemi.intensity = this.night ? 0.45 : 0.9;
    this.moon.intensity = this.night ? 1.15 : 1.8;
    this.renderer.toneMappingExposure = this.night ? 1.05 : 1.2;
    this.bloom.strength = this.night ? 0.85 : 0.35;
    this.rain.visible = this.night;
  }

  private drawMinimap() {
    const c = document.getElementById("minimap") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const w = c.width;
    const h = c.height;
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-this.player.yaw);
    const scale = 1.35;
    ctx.fillStyle = "#1a2230";
    for (const b of this.city.colliders) {
      const x = (b.minX - this.player.pos.x) * scale;
      const z = (b.minZ - this.player.pos.z) * scale;
      ctx.fillRect(x, z, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    }
    const s = this.spot(this.mission);
    ctx.fillStyle = "#ffc44d";
    ctx.beginPath();
    ctx.arc((s.x - this.player.pos.x) * scale, (s.z - this.player.pos.z) * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    for (const cop of this.coaches) {
      ctx.fillStyle = "#3cf0ff";
      ctx.fillRect((cop.pos.x - this.player.pos.x) * scale - 2, (cop.pos.z - this.player.pos.z) * scale - 2, 4, 4);
    }
    ctx.restore();
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2 - 8);
    ctx.lineTo(w / 2 + 5, h / 2 + 7);
    ctx.lineTo(w / 2 - 5, h / 2 + 7);
    ctx.fill();
  }
}
