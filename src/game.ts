import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Sfx } from "./audio";
import { buildCity, CITY_SPAN, makeBeacon, type City, type MissionId, type MissionSpot } from "./city";
import { isLiteGpu } from "./device";
import { Input, type ControlSample } from "./input";
import {
  bossProblem,
  courierProblem,
  garageProblem,
  getawayProblem,
  gpProblem,
  practiceProblem,
  vaultProblem,
  type Problem,
} from "./mathBank";
import { createHeroPed, createPedestrian, idleWalk, sidewalkLoop, stepPed, swingWalk, type PedSim } from "./pedestrians";
import { createCoachCar, createHeroCar, createTrafficCar, type CarKit } from "./vehicles";

type Mode = "drive" | "onfoot" | "gate" | "coach" | "boss" | "pause";

type SimCar = {
  kit: CarKit;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  steerVis: number;
  pitch: number;
  roll: number;
  wheelRot: number;
  lane?: { axis: "x" | "z"; dir: 1 | -1; offset: number };
};

const RADIO = [
  "FLASH FM · Night Circuit",
  "HARBOR BEAT · Wet Concrete",
  "COACH TALK · Keep Your Head",
  "STERLING WAVE · Gold Hour",
];

const WALK_SPEED = 26.8;
const WALK_RUN = 43.4;

export class SterlingCity {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 520);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private moon: THREE.DirectionalLight;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private skyMesh: THREE.Mesh;
  private city!: City;
  private player!: SimCar;
  private heroPed;
  private headL: THREE.SpotLight | null = null;
  private headR: THREE.SpotLight | null = null;
  private traffic: SimCar[] = [];
  private coaches: SimCar[] = [];
  private peds: PedSim[] = [];
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
  private onFoot = false;
  private parkedPos = new THREE.Vector3();
  private parkedYaw = 0;
  private footYaw = 0;
  private footWalkPhase = 0;
  private interactLock = 0;
  private stuckT = 0;
  private lastSafePos = new THREE.Vector3();
  private lampTick = 0;
  private lite = isLiteGpu;
  private paused = false;
  private fovKick = 0;

  constructor(canvas: HTMLCanvasElement) {
    const makeGL = (lite: boolean) =>
      new THREE.WebGLRenderer({
        canvas,
        antialias: !lite,
        powerPreference: lite ? "low-power" : "high-performance",
        alpha: false,
        failIfMajorPerformanceCaveat: false,
      });
    try {
      this.renderer = makeGL(this.lite);
    } catch {
      this.lite = true;
      document.documentElement.classList.add("lite-gpu");
      document.body.classList.add("lite-gpu");
      this.renderer = makeGL(true);
    }
    this.renderer.setPixelRatio(this.lite ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.lite;
    if (!this.lite) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x10182e);
    this.scene.fog = new THREE.Fog(0x121a32, 70, 280);
    this.skyMesh = makeSky();
    this.scene.add(this.skyMesh);
    this.ambient = new THREE.AmbientLight(0x4a5a88, 0.55);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(0x9ab0ff, 0x4a2038, 0.95);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xd6e4ff, 1.35);
    this.moon.position.set(40, 70, 18);
    this.moon.castShadow = false;
    this.scene.add(this.moon, this.moon.target);
    this.sun = new THREE.DirectionalLight(0xfff1c8, 0.2);
    this.sun.position.set(-30, 80, -20);
    this.sun.castShadow = false;
    this.scene.add(this.sun);

    const moonBall = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xe8f0ff, toneMapped: false }),
    );
    moonBall.position.set(-80, 70, -40);
    moonBall.name = "moonBall";
    this.scene.add(moonBall);

    this.city = buildCity(this.renderer, this.lite);
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
    this.parkedPos.copy(this.player.pos);
    this.lastSafePos.copy(this.player.pos);
    this.scene.add(hero.group);
    this.heroPed = createHeroPed();
    this.heroPed.group.visible = false;
    this.scene.add(this.heroPed.group);
    this.camPos.set(this.player.pos.x, 5.2, this.player.pos.z - 14);
    this.camLook.copy(this.player.pos).add(new THREE.Vector3(0, 1.1, 8));

    if (!this.lite) {
      this.headL = this.makeHeadlight(0.55);
      this.headR = this.makeHeadlight(-0.55);
      hero.group.add(this.headL, this.headR, this.headL.target, this.headR.target);
    }

    const palette = [0x1f4aa8, 0xb4233a, 0x1f8a62, 0x6a3d9a, 0xd8d4c8, 0x1c1c22, 0x8a6a1e];
    const trafficN = this.lite ? 16 : 28;
    const lanes = this.city.lanes.length ? this.city.lanes : [];
    for (let i = 0; i < trafficN; i++) {
      const kit = createTrafficCar(palette[i % palette.length]!);
      const lane = lanes[i % Math.max(1, lanes.length)];
      const axis = lane?.axis ?? (i % 2 === 0 ? "z" : "x");
      const dir = (lane?.dir ?? (i % 4 < 2 ? 1 : -1)) as 1 | -1;
      const offset = axis === "z" ? (lane?.x ?? 3.1) : (lane?.z ?? 3.1);
      const spread = ((i * 37) % 280) - 140;
      const t: SimCar = {
        kit,
        pos: new THREE.Vector3(axis === "z" ? offset : spread, 0, axis === "z" ? spread : offset),
        vel: new THREE.Vector3(),
        yaw: axis === "z" ? (dir === 1 ? 0 : Math.PI) : dir === 1 ? Math.PI / 2 : -Math.PI / 2,
        steerVis: 0,
        pitch: 0,
        roll: 0,
        wheelRot: 0,
        lane: { axis, dir, offset },
      };
      this.traffic.push(t);
      this.scene.add(kit.group);
    }

    const pedN = this.lite ? 16 : 32;
    for (let i = 0; i < pedN; i++) {
      const path = this.city.pedPaths[i % this.city.pedPaths.length] ?? sidewalkLoop(0, 0, 10);
      const start = path[i % path.length]!;
      const kit = createPedestrian((i * 17 + 3) / 97);
      kit.group.position.set(start.x, 0, start.z);
      this.scene.add(kit.group);
      this.peds.push({
        kit,
        x: start.x,
        z: start.z,
        yaw: 0,
        speed: 2.4 + (i % 5) * 0.35,
        phase: i,
        path,
        i: i % path.length,
      });
    }

    for (const spot of this.city.spots) {
      const color = spot.id === this.mission ? 0xc9a227 : 0x3aa8c4;
      const b = makeBeacon(color);
      b.position.set(spot.x, 0, spot.z);
      this.beacons.set(spot.id, b);
      this.scene.add(b);
    }

    this.exhaust = this.makeParticles(this.lite ? 24 : 60, 0xff9a3c, 0.08);
    this.smoke = this.makeParticles(this.lite ? 12 : 36, 0x888888, 0.12);
    this.rain = this.makeParticles(this.lite ? 80 : 220, 0xa8c4ff, 0.04);
    this.scene.add(this.exhaust, this.smoke, this.rain);
    this.seedRain();

    if (!this.lite) {
      const renderPass = new RenderPass(this.scene, this.camera);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.35);
      const out = new OutputPass();
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(renderPass);
      this.composer.addPass(this.bloom);
      this.composer.addPass(out);
    }

    this.input = new Input(
      document.getElementById("joystick")!,
      document.querySelector(".stick-knob") as HTMLElement,
      document.getElementById("gas")!,
      document.getElementById("brake")!,
    );

    document.getElementById("theme")!.onclick = () => this.toggleLights();
    document.getElementById("interact")!.onclick = () => this.tryStartMission();
    document.getElementById("exit-vehicle")!.onclick = () => this.toggleVehicle();
    document.getElementById("pause-btn")!.onclick = () => this.togglePause();
    document.getElementById("more-btn")?.addEventListener("click", () => this.togglePause());
    document.getElementById("answers")!.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "BUTTON") this.solve(t.textContent || "");
    });
    document.getElementById("boss-answers")!.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "BUTTON") this.solveBoss(t.textContent || "");
    });
    document.getElementById("pause-sheet")!.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const act = t.dataset.pause;
      if (act === "resume") this.togglePause(false);
      if (act === "practice") this.openPauseVenue("hub");
      if (act === "gp") this.openPauseVenue("gp");
    });

    window.addEventListener("pointerdown", () => this.sfx.resume(), { once: true });
    window.addEventListener("keydown", () => this.sfx.resume(), { once: true });
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.applyShotParams();
    this.applyLights();
    this.setObjective();
    this.setModeHud();
    this.loop();
    document.getElementById("boot")?.classList.add("hide");
    setTimeout(() => document.getElementById("title-card")?.classList.add("go"), 1800);
  }

  private makeHeadlight(x: number) {
    const s = new THREE.SpotLight(0xe8f4ff, 16, 42, Math.PI / 5.5, 0.38, 1.0);
    s.position.set(x, 0.55, 2.15);
    s.target.position.set(x * 1.4, 0.05, 16);
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
    this.composer?.setSize(w, h);
    this.bloom?.setSize(w, h);
  }

  private applyShotParams() {
    const q = new URLSearchParams(location.search);
    const shot = q.get("shot");
    if (shot === "math") {
      this.player.pos.set(this.spot("courier").x, 0, this.spot("courier").z + 4);
      this.openGate(courierProblem());
    }
    if (shot === "walk") {
      this.exitVehicle();
    }
    if (shot === "chase") {
      this.wanted = 3;
      this.spawnCoaches();
      this.getawayOn = true;
      this.getawayCool = 14;
    }
  }

  private spot(id: MissionId): MissionSpot {
    return this.city.spots.find((s) => s.id === id)!;
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.033, this.clock.getDelta());
    this.update(dt);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.drawMinimap();
  };

  private update(dt: number) {
    const ctl = this.input.sample();
    if (ctl.escape && this.mode !== "gate" && this.mode !== "boss") this.togglePause();
    if (this.paused) return;

    this.interactLock = Math.max(0, this.interactLock - dt);

    if (this.mode === "onfoot") {
      this.stepOnFoot(ctl, dt);
    } else if (this.mode === "drive" || this.mode === "boss") {
      this.stepCar(this.player, ctl.throttle, ctl.steer, ctl.brake, ctl.handbrake, dt, true);
      this.collide(this.player, dt);
      this.applyCarPose(this.player);
      if (ctl.interactEdge && this.interactLock <= 0 && !this.nearMission()) this.exitVehicle();
    } else if (this.mode === "gate" || this.mode === "coach") {
      this.stepCar(this.player, 0, 0, 1, false, dt, true);
      this.applyCarPose(this.player);
    }

    this.stepTraffic(dt);
    for (const p of this.peds) stepPed(p, dt);

    if (this.wanted > 0) {
      if (this.coaches.length === 0) this.spawnCoaches();
      this.chase(dt);
    } else if (this.coaches.length && this.mode === "drive") {
      this.despawnCoaches();
    }

    this.updateCamera(dt);
    this.lampTick += dt;
    if (this.lampTick > 0.28) {
      this.lampTick = 0;
      this.updateLights();
    }
    this.updateParticles(dt, ctl.throttle, ctl.handbrake);
    this.updateBeacons(dt);
    this.sfx.engineAt(this.onFoot ? 0 : this.player.vel.length(), this.onFoot ? 0 : ctl.throttle);
    this.sfx.setSiren(this.wanted > 0);

    this.radioT += dt;
    if (this.radioT > 18) {
      this.radioT = 0;
      document.getElementById("radio")!.textContent = RADIO[Math.floor(Math.random() * RADIO.length)]!;
    }

    const mph = this.onFoot ? Math.round(this.player.vel.length() * 1.1) : Math.round(this.player.vel.length() * 2.6);
    document.querySelector("#speed b")!.textContent = String(mph);
    document.getElementById("cash")!.textContent = `$${this.cash.toLocaleString()}`;
    this.renderWanted();
    this.refreshExitBtn();

    if (this.mode === "drive" || this.mode === "onfoot") this.missionProximity(ctl);
    if (this.mode === "coach") {
      this.coachTimer -= dt;
      if (this.coachTimer <= 0) {
        document.getElementById("coach")!.hidden = true;
        this.mode = this.onFoot ? "onfoot" : "drive";
      }
    }
    if (this.mode === "boss") this.updateBoss(dt);
    if (this.getawayOn && (this.mode === "drive" || this.mode === "onfoot")) this.updateGetaway(dt);

    this.moon.target.position.copy(this.player.pos);
    this.moon.position.set(this.player.pos.x + 30, 70, this.player.pos.z + 18);
  }

  private stepOnFoot(ctl: ControlSample, dt: number) {
    let forward = ctl.throttle - ctl.brake;
    if (Math.abs(forward) > 0.08) forward = Math.sign(forward);
    if (Math.abs(ctl.steer) > 0.08) this.footYaw += ctl.steer * 4.4 * dt;
    const run = WALK_SPEED * (ctl.handbrake || ctl.boost ? WALK_RUN / WALK_SPEED : 1);
    const vx = Math.sin(this.footYaw) * forward * run;
    const vz = Math.cos(this.footYaw) * forward * run;
    this.player.pos.x += vx * dt;
    this.player.pos.z += vz * dt;
    this.player.yaw = this.footYaw;
    this.player.vel.set(vx, 0, vz);
    this.collide(this.player, dt);
    this.heroPed.group.position.set(this.player.pos.x, 0, this.player.pos.z);
    this.heroPed.group.rotation.y = this.footYaw;
    if (Math.abs(forward) > 0.05) {
      this.footWalkPhase += dt * 22.5;
      swingWalk(this.heroPed, this.footWalkPhase, 1.05);
      this.heroPed.group.position.y = Math.abs(Math.sin(this.footWalkPhase * 2)) * 0.1;
    } else {
      idleWalk(this.heroPed);
      this.heroPed.group.position.y = 0;
    }
    this.player.kit.group.position.set(this.parkedPos.x, 0, this.parkedPos.z);
    this.player.kit.group.rotation.y = this.parkedYaw;
    const nearCar = Math.hypot(this.player.pos.x - this.parkedPos.x, this.player.pos.z - this.parkedPos.z) < 6;
    if (ctl.interactEdge && this.interactLock <= 0 && nearCar && !this.nearMission()) this.enterVehicle();
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

  private collide(car: SimCar, dt: number) {
    const r = this.onFoot && car === this.player ? 0.45 : 1.15;
    let hit = false;
    for (const b of this.city.colliders) {
      const cx = Math.max(b.minX, Math.min(car.pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(car.pos.z, b.maxZ));
      const dx = car.pos.x - cx;
      const dz = car.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.0001;
        const nx = dx / d;
        const nz = dz / d;
        const push = r - d + 0.04;
        car.pos.x += nx * push;
        car.pos.z += nz * push;
        const vn = car.vel.x * nx + car.vel.z * nz;
        if (vn < 0) {
          car.vel.x -= vn * nx;
          car.vel.z -= vn * nz;
        }
        this.shake = Math.max(this.shake, 0.18);
        hit = true;
      }
    }
    const lim = CITY_SPAN / 2 + 28;
    car.pos.x = THREE.MathUtils.clamp(car.pos.x, -lim, lim);
    car.pos.z = THREE.MathUtils.clamp(car.pos.z, -lim, lim);

    if (car !== this.player) return;
    if (!hit && car.vel.length() < 32) {
      this.lastSafePos.copy(car.pos);
      this.stuckT = 0;
    } else if (hit) {
      this.stuckT += dt;
      if (car.vel.length() < 1.8) this.stuckT += dt * 2.2;
      if (this.stuckT > 0.28) {
        car.pos.copy(this.lastSafePos);
        car.vel.set(0, 0, 0);
        this.stuckT = 0;
        const bx = -Math.sin(car.yaw);
        const bz = -Math.cos(car.yaw);
        this.camPos.set(car.pos.x + bx * 12.4, 5.1, car.pos.z + bz * 12.4);
        this.toast("UNSTUCK — back on the road");
      }
    }
  }

  private applyCarPose(car: SimCar) {
    car.kit.group.position.set(car.pos.x, 0, car.pos.z);
    car.kit.group.rotation.y = car.yaw;
    car.kit.body.rotation.x = car.pitch;
    car.kit.body.rotation.z = car.roll;
    for (const w of car.kit.wheels) w.rotation.x = car.wheelRot;
    for (const w of car.kit.frontWheels) w.rotation.y = car.steerVis;
  }

  private stepTraffic(dt: number) {
    const lim = CITY_SPAN / 2 + 18;
    for (const t of this.traffic) {
      const speed = 10.5;
      if (t.lane) {
        if (t.lane.axis === "z") {
          t.yaw = t.lane.dir === 1 ? 0 : Math.PI;
          t.pos.x = THREE.MathUtils.damp(t.pos.x, t.lane.offset, 2.2, dt);
          t.pos.z += t.lane.dir * speed * dt;
          if (t.pos.z > lim) t.pos.z = -lim;
          if (t.pos.z < -lim) t.pos.z = lim;
        } else {
          t.yaw = t.lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
          t.pos.z = THREE.MathUtils.damp(t.pos.z, t.lane.offset, 2.2, dt);
          t.pos.x += t.lane.dir * speed * dt;
          if (t.pos.x > lim) t.pos.x = -lim;
          if (t.pos.x < -lim) t.pos.x = lim;
        }
        t.vel.set(Math.sin(t.yaw) * speed, 0, Math.cos(t.yaw) * speed);
      }
      t.wheelRot += speed * dt / 0.34;
      this.applyCarPose(t);
    }
  }

  private updateCamera(dt: number) {
    const back = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const fwd = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    const side = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
    const spd = this.player.vel.length();
    const idlePull = !this.onFoot ? THREE.MathUtils.clamp((8.6 - spd) / 8.6, 0, 1) : 0;
    const backDist = this.onFoot ? 4.8 : 8.4 + idlePull * 5.2 + Math.min(2.2, spd * 0.04) - (spd > 16 ? 0.9 : 0);
    const height = this.onFoot ? 2.85 : 3.15 + idlePull * 1.55;
    const desired = this.player.pos.clone().addScaledVector(back, backDist).addScaledVector(side, this.player.steerVis * 0.8).add(new THREE.Vector3(0, height, 0));
    this.keepCamOutOfWalls(desired);
    this.ensureCamClearOfHull(desired);
    const snap = 1 - Math.exp(-(this.onFoot ? 16 : idlePull > 0.35 ? 9.2 : spd > 16 ? 22 : 15.5) * dt);
    const distCam = Math.hypot(this.camPos.x - this.player.pos.x, this.camPos.z - this.player.pos.z);
    if (!this.onFoot && distCam < 8.6) this.camPos.copy(desired);
    else this.camPos.lerp(desired, snap);
    if (this.shake > 0) {
      this.camPos.x += (Math.random() - 0.5) * this.shake;
      this.camPos.y += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake *= 1 - 8 * dt;
    }
    this.keepCamOutOfWalls(this.camPos);
    this.ensureCamClearOfHull(this.camPos);
    this.camera.position.copy(this.camPos);
    const lookDist = this.onFoot ? 6.5 : 6.2 + idlePull * 2.4 + Math.min(8, spd * 0.148);
    const look = this.player.pos.clone().addScaledVector(fwd, lookDist).add(new THREE.Vector3(0, this.onFoot ? 1.1 : 1.05 + idlePull * 0.55, 0));
    this.camLook.lerp(look, 1 - Math.exp(-15 * dt));
    this.camera.lookAt(this.camLook);
    const targetFov = (this.onFoot ? 54 : 56) + Math.min(10, spd * 0.12) + this.fovKick;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
    this.fovKick = Math.max(0, this.fovKick - dt * 12);
    this.camera.updateProjectionMatrix();
  }

  private keepCamOutOfWalls(t: THREE.Vector3) {
    const e = 1.85;
    for (const n of this.city.colliders) {
      if (t.x > n.minX - e && t.x < n.maxX + e && t.z > n.minZ - e && t.z < n.maxZ + e) {
        t.y = Math.max(t.y, 6.35);
        const s = t.x - (n.minX - e);
        const o = n.maxX + e - t.x;
        const a = t.z - (n.minZ - e);
        const r = n.maxZ + e - t.z;
        const l = Math.min(s, o, a, r);
        if (l === s) t.x = n.minX - e;
        else if (l === o) t.x = n.maxX + e;
        else if (l === a) t.z = n.minZ - e;
        else t.z = n.maxZ + e;
      }
    }
  }

  private ensureCamClearOfHull(t: THREE.Vector3) {
    if (this.onFoot) return;
    const backX = -Math.sin(this.player.yaw);
    const backZ = -Math.cos(this.player.yaw);
    const px = this.player.pos.x;
    const pz = this.player.pos.z;
    const spd = this.player.vel.length();
    const minDist = spd < 8.6 ? 12.8 : spd < 16 ? 10.4 : 9.2;
    const dx = t.x - px;
    const dz = t.z - pz;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const behind = dx * backX + dz * backZ;
    if (dist < minDist || behind < 3.4) {
      t.x = px + backX * minDist;
      t.z = pz + backZ * minDist;
      t.y = Math.max(t.y, spd < 8.6 ? 5.15 : 4.45);
    }
    this.keepCamOutOfWalls(t);
    if (Math.hypot(t.x - px, t.z - pz) < 6.5) {
      t.x = px + backX * 10.6;
      t.z = pz + backZ * 10.6;
      t.y = Math.max(t.y, 6.9);
      this.keepCamOutOfWalls(t);
    }
  }

  private updateLights() {
    const px = this.player.pos.x;
    const pz = this.player.pos.z;
    const scored = this.city.lamps
      .map((l, i) => ({ i, d: (l.position.x - px) ** 2 + (l.position.z - pz) ** 2, l }))
      .sort((a, b) => a.d - b.d);
    for (const l of this.city.lamps) l.intensity = 0;
    const n = this.night ? (this.lite ? 4 : 8) : this.lite ? 1 : 2;
    scored.slice(0, n).forEach((s, i) => {
      s.l.intensity = this.night ? 6.4 - i * 0.4 : 0.25;
    });
  }

  private updateParticles(dt: number, throttle: number, drift: boolean) {
    if (this.onFoot) {
      (this.exhaust.material as THREE.PointsMaterial).opacity = 0;
      (this.smoke.material as THREE.PointsMaterial).opacity = 0;
    }
    const ex = this.exhaust.geometry.getAttribute("position") as THREE.BufferAttribute;
    const back = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const origin = this.onFoot ? this.parkedPos : this.player.pos;
    for (let i = 0; i < ex.count; i++) {
      let x = ex.getX(i) + back.x * dt * 10 + (Math.random() - 0.5) * 0.05;
      let y = ex.getY(i) + dt * 1.2;
      let z = ex.getZ(i) + back.z * dt * 10;
      if (y > 2.4 || Math.random() < 0.08) {
        x = origin.x + back.x * 2.1 + (Math.random() - 0.5) * 0.3;
        y = 0.35;
        z = origin.z + back.z * 2.1;
      }
      ex.setXYZ(i, x, y, z);
    }
    ex.needsUpdate = true;
    (this.exhaust.material as THREE.PointsMaterial).opacity = this.onFoot ? 0 : 0.25 + throttle * 0.5;

    const sm = this.smoke.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < sm.count; i++) {
      let y = sm.getY(i) + dt * 0.6;
      let x = sm.getX(i) + (Math.random() - 0.5) * 0.2;
      let z = sm.getZ(i) + (Math.random() - 0.5) * 0.2;
      if (!drift || y > 1.8) {
        x = origin.x + (Math.random() - 0.5) * 1.4;
        y = 0.12;
        z = origin.z + (Math.random() - 0.5) * 1.4;
      }
      sm.setXYZ(i, x, y, z);
    }
    sm.needsUpdate = true;
    (this.smoke.material as THREE.PointsMaterial).opacity = this.onFoot ? 0 : drift ? 0.55 : 0.05;

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
      (d.material as THREE.MeshPhysicalMaterial).emissiveIntensity = active ? 3.2 : 1.0;
      g.scale.setScalar(active ? 1 : 0.72);
    }
  }

  private nearMission() {
    const s = this.spot(this.mission);
    return Math.hypot(this.player.pos.x - s.x, this.player.pos.z - s.z) < 7;
  }

  private missionProximity(ctl: ControlSample) {
    const s = this.spot(this.mission);
    const dist = Math.hypot(this.player.pos.x - s.x, this.player.pos.z - s.z);
    const btn = document.getElementById("interact") as HTMLButtonElement;
    const venue = this.city.venues.find((v) => Math.hypot(this.player.pos.x - v.x, this.player.pos.z - v.z) < 6);
    if (dist < 9) {
      btn.hidden = false;
      btn.textContent = `ENTER ${s.label}`;
      if (dist < 5.2 || ctl.interactEdge) this.tryStartMission();
    } else if (venue) {
      btn.hidden = false;
      btn.textContent = `PAUSE · ${venue.label}`;
      if (ctl.interactEdge) this.openPauseVenue(venue.id);
    } else {
      btn.hidden = true;
    }
  }

  private tryStartMission() {
    if (this.mode !== "drive" && this.mode !== "onfoot") return;
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
    const steps = document.getElementById("pp-drill-steps")!;
    if (p.stepsHtml) {
      steps.hidden = false;
      steps.innerHTML = p.stepsHtml;
    } else {
      steps.hidden = true;
      steps.innerHTML = "";
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
      const pay = this.problem.cash ?? (this.problem.kind === "vault" ? 2400 : this.problem.kind === "garage" ? 0 : 850);
      if (pay) this.payout(pay);
      this.shake = 0.18;
      if (this.bloom) {
        this.bloom.strength = 0.9;
        setTimeout(() => {
          if (this.bloom) this.bloom.strength = this.night ? 0.55 : 0.12;
        }, 220);
      }
      if (this.problem.kind === "garage") this.buyPart();
      else if (this.problem.kind === "practice" || this.problem.kind === "gp") {
        this.mode = this.onFoot ? "onfoot" : "drive";
        this.toast(this.problem.kind === "gp" ? "GP HEAT BANKED" : "DRILL HIT");
      } else {
        this.advance();
        this.mode = this.onFoot ? "onfoot" : "drive";
        this.startBoss();
      }
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
    this.mode = this.onFoot ? "onfoot" : "drive";
    this.toast("HIT THE GOLD RINGS");
    this.setObjective("GETAWAY — Topic 3 ONES LINE for nitro. Wrong math calls Coach.");
  }

  private updateGetaway(dt: number) {
    this.getawayCool -= dt;
    const s = this.spot("getaway");
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
    if (this.getawayCool <= 0 && (this.mode === "drive" || this.mode === "onfoot")) {
      this.getawayCool = 8;
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
      this.mode = this.onFoot ? "onfoot" : "drive";
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
      const fwd = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const kit = createCoachCar();
      const side = this.coaches.length ? -1 : 1;
      const car: SimCar = {
        kit,
        pos: this.player.pos.clone().addScaledVector(fwd, 12).addScaledVector(right, side * 5.2),
        vel: new THREE.Vector3(),
        yaw: this.player.yaw,
        steerVis: 0,
        pitch: 0,
        roll: 0,
        wheelRot: 0,
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
      this.stepCar(c, 0.92, Math.max(-1, Math.min(1, (wantYaw - c.yaw) * 2)), 0, false, dt, false);
      this.collide(c, dt);
      this.applyCarPose(c);
      if (c.kit.lightbar) {
        const m = c.kit.lightbar.material as THREE.MeshPhysicalMaterial;
        m.emissive = new THREE.Color(Math.sin(performance.now() / 80) > 0 ? 0xff2448 : 0x3cf0ff);
        m.emissiveIntensity = 5;
      }
    }
  }

  private toggleVehicle() {
    if (this.onFoot) this.enterVehicle();
    else this.exitVehicle();
  }

  private exitVehicle() {
    if (this.onFoot || this.mode === "gate") return;
    this.interactLock = 0.28;
    this.onFoot = true;
    this.mode = "onfoot";
    this.parkedPos.copy(this.player.pos);
    this.parkedYaw = this.player.yaw;
    this.player.vel.set(0, 0, 0);
    this.footYaw = this.player.yaw;
    this.player.pos.add(new THREE.Vector3(Math.cos(this.footYaw), 0, -Math.sin(this.footYaw)).multiplyScalar(2.4));
    this.heroPed.group.visible = true;
    this.heroPed.group.position.set(this.player.pos.x, 0, this.player.pos.z);
    this.setModeHud();
    this.fovKick = 6;
    this.toast("ON FOOT — walk the sidewalks · E to enter car");
  }

  private enterVehicle() {
    if (!this.onFoot) return;
    if (Math.hypot(this.player.pos.x - this.parkedPos.x, this.player.pos.z - this.parkedPos.z) > 6.5) {
      this.toast("Walk back to your ride");
      return;
    }
    this.interactLock = 0.28;
    this.onFoot = false;
    this.mode = "drive";
    this.player.pos.copy(this.parkedPos);
    this.player.yaw = this.parkedYaw;
    this.heroPed.group.visible = false;
    this.setModeHud();
    this.fovKick = 8;
    this.toast("DRIVE — gold GT is yours");
  }

  private refreshExitBtn() {
    const el = document.getElementById("exit-vehicle") as HTMLButtonElement;
    if (!el) return;
    if (this.mode === "gate" || this.mode === "boss" || this.paused) {
      el.hidden = true;
      return;
    }
    if (this.onFoot) {
      const near = Math.hypot(this.player.pos.x - this.parkedPos.x, this.player.pos.z - this.parkedPos.z) < 6;
      el.hidden = !near;
      el.textContent = "ENTER CAR (E)";
    } else {
      el.hidden = false;
      el.textContent = "EXIT CAR (E)";
    }
  }

  private setModeHud() {
    document.body.classList.toggle("onfoot", this.onFoot);
    const badge = document.getElementById("mode-badge");
    if (badge) badge.textContent = this.onFoot ? "ON FOOT" : "DRIVE";
  }

  private togglePause(force?: boolean) {
    this.paused = force ?? !this.paused;
    const sheet = document.getElementById("pause-sheet")!;
    sheet.hidden = !this.paused;
    if (this.paused) this.mode = "pause";
    else this.mode = this.onFoot ? "onfoot" : "drive";
  }

  private openPauseVenue(id: "hub" | "gp") {
    this.togglePause(false);
    if (id === "hub") this.openGate(practiceProblem());
    else {
      this.toast("GRAND PRIX — optional heat. City stays home.");
      this.openGate(gpProblem());
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
      courier: "GOLD BLIP — ONES LINE booth · Topic 3",
      vault: "VAULT HOUSES — hundreds_house then add",
      getaway: "NITRO RINGS — multiply for boost",
      garage: "GARAGE LIFT — Topic 3 unlocks parts",
    };
    const line = text ?? labels[this.mission];
    document.getElementById("objective")!.textContent = line;
    const panel = document.getElementById("mission-panel");
    if (panel) panel.textContent = `NOW: ${this.spot(this.mission).label}`;
  }

  private renderWanted() {
    const el = document.getElementById("wanted")!;
    el.classList.toggle("hot", this.wanted > 0);
    [...el.children].forEach((s, i) => s.classList.toggle("on", i < this.wanted));
  }

  private toggleLights() {
    this.night = !this.night;
    this.applyLights();
  }

  private applyLights() {
    const t = document.getElementById("theme");
    if (t) t.textContent = this.night ? "NIGHT" : "DAY";
    document.body.classList.toggle("light", !this.night);
    document.body.classList.toggle("day-mode", !this.night);
    const bg = this.scene.background as THREE.Color;
    bg.setHex(this.night ? 0x10182e : 0x1f7fd4);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.setHex(this.night ? 0x121a32 : 0x3a6a9a);
    fog.near = this.night ? 70 : 110;
    fog.far = this.night ? 280 : 360;
    this.hemi.color.set(this.night ? 0x9ab0ff : 0xf0e8c8);
    this.hemi.groundColor.set(this.night ? 0x4a2038 : 0x245018);
    this.hemi.intensity = this.night ? 0.95 : this.lite ? 0.55 : 0.35;
    this.ambient.color.set(this.night ? 0x4a5a88 : 0xffe8b0);
    this.ambient.intensity = this.night ? 0.55 : this.lite ? 0.28 : 0.12;
    this.moon.intensity = this.night ? 1.35 : 0.08;
    this.sun.intensity = this.night ? 0.18 : this.lite ? 2.8 : 4.6;
    this.renderer.toneMappingExposure = this.night ? 1.12 : this.lite ? 0.95 : 0.88;
    if (this.bloom) this.bloom.strength = this.lite ? 0 : this.night ? 0.55 : 0.08;
    this.rain.visible = this.night;
    const moonBall = this.scene.getObjectByName("moonBall");
    if (moonBall) moonBall.visible = this.night;
    const mat = this.skyMesh.material as THREE.ShaderMaterial;
    if (this.night) {
      mat.uniforms.top.value.set(0x152048);
      mat.uniforms.mid.value.set(0x2a1040);
      mat.uniforms.bot.value.set(0x3a1830);
    } else {
      mat.uniforms.top.value.set(0x1870c8);
      mat.uniforms.mid.value.set(0x52a0e8);
      mat.uniforms.bot.value.set(0xc8d8e8);
    }
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
    const scale = 0.85;
    ctx.fillStyle = "#1a2230";
    for (const b of this.city.colliders) {
      const x = (b.minX - this.player.pos.x) * scale;
      const z = (b.minZ - this.player.pos.z) * scale;
      ctx.fillRect(x, z, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    }
    ctx.fillStyle = "#7a8899";
    for (const p of this.peds) {
      ctx.fillRect((p.x - this.player.pos.x) * scale - 1, (p.z - this.player.pos.z) * scale - 1, 2, 2);
    }
    ctx.fillStyle = "#4aa3c8";
    for (const t of this.traffic) {
      ctx.fillRect((t.pos.x - this.player.pos.x) * scale - 2, (t.pos.z - this.player.pos.z) * scale - 2, 3, 5);
    }
    const s = this.spot(this.mission);
    ctx.fillStyle = "#c9a227";
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

function makeSky() {
  const geo = new THREE.SphereGeometry(380, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x152048) },
      mid: { value: new THREE.Color(0x2a1040) },
      bot: { value: new THREE.Color(0x3a1830) },
    },
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vP;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 bot;
      void main() {
        float h = normalize(vP).y;
        vec3 col = mix(bot, mid, smoothstep(-0.2, 0.15, h));
        col = mix(col, top, smoothstep(0.15, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}
