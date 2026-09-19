import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { isLiteGpu } from "./device";
import { sidewalkLoop } from "./pedestrians";
import { instancedMesh, plaqueTexture, type Pose } from "./props";
import { mulberry32, pick } from "./rng";
import { asphaltTexture, neonSign, stopSign, streetSign, windowTexture } from "./textures";

export const BLOCK = 26;
export const ROAD = 16;
export const CELLS = 9;
export const STRIDE = BLOCK + ROAD;
export const CITY_SPAN = (CELLS - 1) * STRIDE;

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };
export type MissionId = "courier" | "vault" | "getaway" | "garage";
export type MissionSpot = { id: MissionId; x: number; z: number; label: string };
export type Lane = { x: number; z: number; yaw: number; axis: "x" | "z"; dir: 1 | -1 };
export type PauseVenue = { id: "hub" | "gp"; x: number; z: number; label: string };

export type City = {
  group: THREE.Group;
  colliders: AABB[];
  lamps: THREE.PointLight[];
  spots: MissionSpot[];
  spawn: THREE.Vector3;
  reflector: Reflector | null;
  lanes: Lane[];
  pedPaths: { x: number; z: number }[][];
  venues: PauseVenue[];
  gates: THREE.Group[];
};

export function blockCenter(i: number, j: number) {
  const origin = -CITY_SPAN / 2;
  return { x: origin + i * STRIDE, z: origin + j * STRIDE };
}

export function roadX(i: number) {
  const { x } = blockCenter(i, 0);
  return x + BLOCK / 2 + ROAD / 2;
}

export function roadZ(j: number) {
  const { z } = blockCenter(0, j);
  return z + BLOCK / 2 + ROAD / 2;
}

function district(i: number, j: number): "harbor" | "industry" | "neon" | "homes" | "downtown" {
  if (j >= CELLS - 2) return "harbor";
  if (i <= 1) return "industry";
  if (i >= CELLS - 2) return "neon";
  if (j <= 1) return "homes";
  return "downtown";
}

export function buildCity(renderer: THREE.WebGLRenderer, lite = isLiteGpu): City {
  const rng = mulberry32(2026);
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const lamps: THREE.PointLight[] = [];
  const lanes: Lane[] = [];
  const pedPaths: { x: number; z: number }[][] = [];
  const gates: THREE.Group[] = [];

  let reflector: Reflector | null = null;
  if (!lite) {
    const night = renderer.getPixelRatio() > 1.25 ? 256 : 192;
    reflector = new Reflector(new THREE.PlaneGeometry(CITY_SPAN + 90, CITY_SPAN + 90), {
      clipBias: 0.003,
      textureWidth: night,
      textureHeight: night,
      color: 0x3a4254,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.001;
    group.add(reflector);
  }

  const asphalt = asphaltTexture();
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(36, 36);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SPAN + 90, CITY_SPAN + 90),
    new THREE.MeshStandardMaterial({
      map: asphalt,
      color: lite ? 0x4a5160 : 0x6a7388,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = !lite;
  group.add(road);

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.82, metalness: 0.05 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.7 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x5a5860, roughness: 0.62, metalness: 0.18 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2a3548,
    metalness: 0.55,
    roughness: 0.28,
    emissive: 0x1a2434,
    emissiveIntensity: lite ? 0.25 : 0.45,
  });
  const brick = new THREE.MeshStandardMaterial({ color: 0x5a3036, roughness: 0.7, metalness: 0.06 });
  const warehouse = new THREE.MeshStandardMaterial({ color: 0x4a4e42, roughness: 0.75, metalness: 0.12 });
  const homeMat = new THREE.MeshStandardMaterial({ color: 0x6a5344, roughness: 0.68, metalness: 0.05 });
  const neonBrick = new THREE.MeshStandardMaterial({ color: 0x3a2040, roughness: 0.55, metalness: 0.2, emissive: 0x220818, emissiveIntensity: 0.2 });
  const windowMaps = [
    windowTexture(3, "#d4b06a"),
    windowTexture(9, "#7aa8c4"),
    windowTexture(21, "#c48aa0"),
    windowTexture(27, "#8aaa6a"),
  ];
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xc8c4b0 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xc9a227 });
  const walkGeo = new THREE.BoxGeometry(BLOCK + 3.4, 0.22, BLOCK + 3.4);
  const dashGeo = new THREE.BoxGeometry(0.12, 0.03, 1.5);
  const crossGeo = new THREE.BoxGeometry(0.45, 0.02, 2.4);

  for (let i = 0; i < CELLS; i++) {
    for (let j = 0; j < CELLS; j++) {
      const { x, z } = blockCenter(i, j);
      const walk = new THREE.Mesh(walkGeo, sidewalkMat);
      walk.position.set(x, 0.11, z);
      walk.receiveShadow = !lite;
      group.add(walk);
      pedPaths.push(sidewalkLoop(x, z, BLOCK / 2 - 1.4));

      const kind = district(i, j);
      const nBuildings = kind === "downtown" ? (lite ? 2 : 3) : kind === "homes" ? 2 : lite ? 2 : 2 + Math.floor(rng() * 2);
      for (let b = 0; b < nBuildings; b++) {
        const cols = nBuildings > 2 ? 2 : nBuildings;
        const rows = Math.ceil(nBuildings / cols);
        const col = b % cols;
        const row = Math.floor(b / cols);
        const w = 7 + rng() * (BLOCK / cols - 8);
        const d = 7 + rng() * (BLOCK / rows - 8);
        const hBase =
          kind === "downtown" ? 18 + rng() * 28 : kind === "harbor" ? 8 + rng() * 10 : kind === "homes" ? 6 + rng() * 6 : 10 + rng() * 16;
        const h = hBase + (i === 4 && j === 4 ? 22 : 0);
        const ox = (col - (cols - 1) / 2) * (BLOCK / cols);
        const oz = (row - (rows - 1) / 2) * (BLOCK / rows);
        const bx = x + ox;
        const bz = z + oz;
        const mat =
          kind === "downtown"
            ? rng() > 0.45
              ? glassMat
              : concrete
            : kind === "harbor"
              ? warehouse
              : kind === "homes"
                ? homeMat
                : kind === "neon"
                  ? neonBrick
                  : rng() > 0.5
                    ? brick
                    : concrete;
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(bx, h / 2, bz);
        building.castShadow = !lite;
        building.receiveShadow = !lite;
        group.add(building);

        if (!lite || rng() > 0.35) {
          const winMap = pick(rng, windowMaps);
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.05, h * 0.88, d + 0.05),
            new THREE.MeshStandardMaterial({
              map: winMap,
              emissiveMap: winMap,
              emissive: 0xffffff,
              emissiveIntensity: lite ? 1.1 : 1.8,
              roughness: 0.5,
              metalness: 0.1,
            }),
          );
          win.position.set(bx, h / 2 + 0.1, bz);
          group.add(win);
        }

        const shopColor = pick(rng, [0xb71c3a, 0xc9a227, 0x1b6b8a, 0x2e7d32, 0x6a1b9a]);
        const words =
          kind === "harbor"
            ? ["DOCKS", "CRANE", "STEEL", "FISH"]
            : kind === "neon"
              ? ["ARCADE", "RADIO", "NOON", "GRID"]
              : kind === "homes"
                ? ["BAKERY", "MAIL", "PARK", "RENT"]
                : ["PIZZA", "BANK", "24H", "PARTS", "COACH"];
        const colors = ["#c9a227", "#d4d0c4", "#8ecae6", "#e07a5f"];
        const word = pick(rng, words);
        const tint = pick(rng, colors);
        addStorefront(group, bx, bz, w, d, 1, 0, shopColor, word, tint, rng() > 0.28);
        addStorefront(group, bx, bz, w, d, 0, 1, shopColor, word, tint, rng() > 0.45);
        if (rng() > 0.55) addStorefront(group, bx, bz, w, d, -1, 0, shopColor, word, tint, false);

        if (!lite && rng() > 0.55) {
          const ac = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1, 2),
            new THREE.MeshStandardMaterial({ color: 0x2c3344, roughness: 0.55, metalness: 0.35 }),
          );
          ac.position.set(bx + 1.1, h + 0.55, bz);
          group.add(ac);
        }
        if (h > 14 && rng() > 0.4) {
          const cornice = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.4, 0.28, d + 0.4),
            new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.65 }),
          );
          cornice.position.set(bx, h + 0.1, bz);
          group.add(cornice);
        }
        if (h > 12 && rng() > 0.5) {
          const rail = new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.45, roughness: 0.4 });
          for (let f = 0; f < 3; f++) {
            const land = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.6), rail);
            land.position.set(bx + w / 2 + 0.4, 3.2 + f * 2.6, bz);
            group.add(land);
          }
        }

        colliders.push({
          minX: bx - w / 2 - 0.15,
          maxX: bx + w / 2 + 0.15,
          minZ: bz - d / 2 - 0.15,
          maxZ: bz + d / 2 + 0.15,
        });
      }
    }
  }

  // Lane markings both axes
  for (let i = 0; i < CELLS - 1; i++) {
    const rx = roadX(i);
    const rz = roadZ(i);
    for (let s = -CITY_SPAN / 2; s < CITY_SPAN / 2; s += 7) {
      const dashV = new THREE.Mesh(dashGeo, dashMat);
      dashV.position.set(rx, 0.04, s);
      group.add(dashV);
      const dashH = new THREE.Mesh(dashGeo, dashMat);
      dashH.rotation.y = Math.PI / 2;
      dashH.position.set(s, 0.04, rz);
      group.add(dashH);
    }
    const yelV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, CITY_SPAN + 16), lineMat);
    yelV.position.set(rx - 0.32, 0.035, 0);
    group.add(yelV);
    const yelH = new THREE.Mesh(new THREE.BoxGeometry(CITY_SPAN + 16, 0.03, 0.1), lineMat);
    yelH.position.set(0, 0.035, rz - 0.32);
    group.add(yelH);
    lanes.push({ x: rx + 3.1, z: 0, yaw: 0, axis: "z", dir: 1 });
    lanes.push({ x: rx - 3.1, z: 0, yaw: Math.PI, axis: "z", dir: -1 });
    lanes.push({ x: 0, z: rz + 3.1, yaw: Math.PI / 2, axis: "x", dir: 1 });
    lanes.push({ x: 0, z: rz - 3.1, yaw: -Math.PI / 2, axis: "x", dir: -1 });
  }

  // Crosswalks + STOP + street names
  const stopTex = stopSign();
  const names = [
    ["GOLD AVE", "HARBOR ST"],
    ["COACH BLVD", "VAULT WAY"],
    ["RADIO PK", "NEON ROW"],
    ["STEEL ST", "SCHOOL LN"],
  ];
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x1b1e28, metalness: 0.65, roughness: 0.4 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xe8d090 });
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 5.1, 6);
  const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);

  for (let i = 0; i < CELLS - 1; i++) {
    for (let j = 0; j < CELLS - 1; j++) {
      const x = roadX(i);
      const z = roadZ(j);
      if ((i + j) % 2 === 0) {
        for (let k = -2; k <= 2; k++) {
          const c1 = new THREE.Mesh(crossGeo, dashMat);
          c1.position.set(x + k * 0.7, 0.035, z + ROAD / 2 - 1.2);
          group.add(c1);
        }
      }
      if (!lite || (i + j) % 2 === 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), lampMat);
        pole.position.set(x + ROAD / 2 - 1.2, 1.3, z + ROAD / 2 - 1.2);
        const hex = new THREE.Mesh(
          new THREE.PlaneGeometry(1.15, 1.15),
          new THREE.MeshBasicMaterial({ map: stopTex, transparent: true, toneMapped: false }),
        );
        hex.position.set(pole.position.x, 2.55, pole.position.z);
        group.add(pole, hex);
      }
      if ((i + j) % 3 === 0) {
        const nm = names[(i + j) % names.length]!;
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 0.7),
          new THREE.MeshBasicMaterial({ map: streetSign(nm[i % 2]!), toneMapped: false }),
        );
        blade.position.set(x - 4, 3.4, z + 4);
        group.add(blade);
      }
    }
  }

  // Street lamps at block corners
  for (let i = 0; i < CELLS; i++) {
    for (let j = 0; j < CELLS; j++) {
      if ((i + j) % (lite ? 3 : 2)) continue;
      const { x, z } = blockCenter(i, j);
      const lx = x + BLOCK / 2 + 1.15;
      const lz = z + BLOCK / 2 + 1.15;
      const post = new THREE.Mesh(postGeo, lampMat);
      post.position.set(lx, 2.55, lz);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(lx, 5.1, lz);
      group.add(post, bulb);
      const light = new THREE.PointLight(0xe8c878, 0, lite ? 22 : 32, 1.8);
      light.position.set(lx, 5.0, lz);
      group.add(light);
      lamps.push(light);
    }
  }

  // Traffic heads
  for (let i = 1; i < CELLS - 1; i += 2) {
    for (let j = 1; j < CELLS - 1; j += 2) {
      const x = roadX(i);
      const z = roadZ(j);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6), lampMat);
      pole.position.set(x + 5.2, 2.2, z + 5.2);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.22), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      head.position.set(pole.position.x, 4.4, pole.position.z);
      const red = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xc62828 }));
      red.position.set(head.position.x, 4.62, head.position.z + 0.13);
      group.add(pole, head, red);
    }
  }

  // Harbor water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SPAN + 140, 40),
    new THREE.MeshStandardMaterial({ color: 0x123044, roughness: 0.18, metalness: 0.45 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.01, CITY_SPAN / 2 + 42);
  group.add(water);

  const curb = new THREE.Mesh(new THREE.BoxGeometry(CITY_SPAN + 80, 0.4, 1.2), curbMat);
  curb.position.set(0, 0.2, CITY_SPAN / 2 + 20);
  group.add(curb);

  // Instanced curb dressing — density without a draw-call storm.
  const parkGeo = new THREE.BoxGeometry(1.55, 0.7, 3.4);
  const parkMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.5, metalness: 0.3 });
  const lampPoses: Pose[] = [];
  const bulbPoses: Pose[] = [];
  const parkPoses: Pose[] = [];
  const step = lite ? 32 : 20;
  for (let i = 0; i < CELLS - 1; i++) {
    const rx = roadX(i);
    const rz = roadZ(i);
    for (let s = -CITY_SPAN / 2 + 10; s < CITY_SPAN / 2; s += step) {
      lampPoses.push({ x: rx + ROAD / 2 - 1.4, y: 2.55, z: s });
      bulbPoses.push({ x: rx + ROAD / 2 - 1.4, y: 5.1, z: s });
      const side = Math.floor(s + i * 7) % 48 > 24 ? 6.2 : -6.2;
      parkPoses.push({ x: rx + side, y: 0.4, z: s + 3, ry: side > 0 ? 0 : Math.PI });
      if (i % 2 === 0) {
        lampPoses.push({ x: s, y: 2.55, z: rz + ROAD / 2 - 1.4 });
        bulbPoses.push({ x: s, y: 5.1, z: rz + ROAD / 2 - 1.4 });
      }
    }
    // Crossing pedestrians use the road as a short two-point path.
    if (i === 4 || i === 3) {
      for (let k = 0; k < (lite ? 2 : 4); k++) {
        const z = -40 + k * 28 + i;
        pedPaths.push([
          { x: rx - 8, z },
          { x: rx + 8, z },
        ]);
      }
    }
  }
  if (lampPoses.length) group.add(instancedMesh(postGeo, lampMat, lampPoses));
  if (bulbPoses.length) group.add(instancedMesh(bulbGeo, bulbMat, bulbPoses));
  if (parkPoses.length) group.add(instancedMesh(parkGeo, parkMat, parkPoses));

  const pedagogy = [
    { title: "ONES LINE", sub: "118 × 3 first", z: -8 },
    { title: "WRITE ZERO", sub: "tens line placeholder", z: 6 },
    { title: "HUNDREDS", sub: "100 × 13 = 1,300", z: 22 },
    { title: "ADD HOUSES", sub: "1,300 + 130 + 104", z: 36 },
  ];
  const rxSpawn = roadX(4);
  for (const p of pedagogy) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.7),
      new THREE.MeshBasicMaterial({ map: plaqueTexture(p.title, p.sub), toneMapped: false }),
    );
    plate.position.set(rxSpawn - 7.4, 2.1, p.z);
    plate.rotation.y = Math.PI / 2;
    group.add(plate);
  }

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshBasicMaterial({
      map: plaqueTexture("118 × 13", "ONES LINE → WRITE 0 → TENS → ADD", "#141018", "#ffe14a"),
      toneMapped: false,
    }),
  );
  board.position.set(rxSpawn + 8.5, 7.5, 12);
  board.rotation.y = -Math.PI / 2;
  group.add(board);

  const spots: MissionSpot[] = [
    { id: "courier", x: roadX(4), z: roadZ(4) - 2, label: "ONES LINE BOOTH" },
    { id: "vault", ...offset(6, 4, 0, 10), label: "VAULT HOUSES" },
    { id: "getaway", x: roadX(1), z: roadZ(6), label: "NITRO GATE" },
    { id: "garage", ...offset(3, 1, 0, -9), label: "GARAGE LIFT" },
  ];

  const venues: PauseVenue[] = [
    { id: "hub", ...offset(4, 4, 10, 10), label: "SCHOOL PAUSE" },
    { id: "gp", ...offset(2, 6, -8, 0), label: "GRAND PRIX PAD" },
  ];

  for (const s of spots) {
    const g = makeWorldGate(s.id);
    g.position.set(s.x, 0, s.z);
    group.add(g);
    gates.push(g);
  }

  return {
    group,
    colliders,
    lamps,
    spots,
    spawn: new THREE.Vector3(roadX(4), 0, roadZ(3) + 6),
    reflector,
    lanes,
    pedPaths,
    venues,
    gates,
  };
}

function offset(i: number, j: number, dx: number, dz: number) {
  const c = blockCenter(i, j);
  return { x: c.x + dx, z: c.z + dz };
}

function addStorefront(
  group: THREE.Group,
  bx: number,
  bz: number,
  w: number,
  d: number,
  nx: number,
  nz: number,
  shopColor: number,
  word: string,
  tint: string,
  withSign: boolean,
) {
  const px = bx + nx * (w / 2 + 0.12);
  const pz = bz + nz * (d / 2 + 0.12);
  const yaw = Math.atan2(nx, nz);
  const stripW = nx !== 0 ? d * 0.9 : w * 0.9;
  const shop = new THREE.Mesh(
    new THREE.BoxGeometry(nx !== 0 ? 0.1 : stripW, 2.1, nx !== 0 ? stripW : 0.1),
    new THREE.MeshBasicMaterial({ color: shopColor, toneMapped: false }),
  );
  shop.position.set(px, 1.2, pz);
  const awn = new THREE.Mesh(
    new THREE.BoxGeometry(nx !== 0 ? 1.1 : stripW, 0.08, nx !== 0 ? stripW : 1.1),
    new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.7 }),
  );
  awn.position.set(bx + nx * (w / 2 + 0.55), 2.45, bz + nz * (d / 2 + 0.55));
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(nx !== 0 ? 0.08 : 1.1, 2.0, nx !== 0 ? 1.1 : 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.6 }),
  );
  door.position.set(px + nx * 0.04, 1.05, pz + nz * 0.04);
  group.add(shop, awn, door);
  if (withSign) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(stripW, 9), 2.4),
      new THREE.MeshBasicMaterial({ map: neonSign(word, tint), transparent: true, toneMapped: false }),
    );
    sign.position.set(px + nx * 0.08, 4.5, pz + nz * 0.08);
    sign.rotation.y = yaw;
    group.add(sign);
  }
}

export function makeWorldGate(id: MissionId) {
  const g = new THREE.Group();
  g.name = `gate-${id}`;
  if (id === "courier") {
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.6 }),
    );
    booth.position.y = 1.7;
    const awn = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.16, 2.6),
      new THREE.MeshBasicMaterial({ color: 0xc9a227, toneMapped: false }),
    );
    awn.position.y = 3.5;
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.7),
      new THREE.MeshBasicMaterial({ map: streetSign("ONES LINE", "#3a2208", "#ffd36a"), toneMapped: false }),
    );
    label.position.set(0, 2.6, 1.2);
    g.add(booth, awn, label);
  } else if (id === "vault") {
    const colors = [0x8d6b1f, 0x4a6a8a, 0x6a3a44];
    const labels = ["HUNDREDS", "TENS", "ONES"];
    labels.forEach((lab, i) => {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 3.8, 1.6),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.45, metalness: 0.25 }),
      );
      col.position.set((i - 1) * 2.1, 1.9, 0);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.4),
        new THREE.MeshBasicMaterial({ map: streetSign(lab, "#111318", "#e8d48a"), toneMapped: false }),
      );
      plate.position.set(col.position.x, 3.6, 0.85);
      g.add(col, plate);
    });
    const door = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.35, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a7a3a, metalness: 0.7, roughness: 0.25 }),
    );
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 1.2, -2.1);
    g.add(door);
  } else if (id === "getaway") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.16, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xc9a227, toneMapped: false }),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.y = 2.2;
    g.add(ring);
  } else {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.5, metalness: 0.3 }),
    );
    pad.position.y = 0.15;
    const lift = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2.8, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 }),
    );
    lift.position.set(-2.4, 1.5, 0);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.8),
      new THREE.MeshBasicMaterial({ map: streetSign("GARAGE", "#1a1c20", "#c9a227"), toneMapped: false }),
    );
    sign.position.set(0, 3.2, 0);
    g.add(pad, lift, sign);
  }
  return g;
}

export function makeBeacon(color: number) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color, toneMapped: false }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 1.3, 18, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shaft.position.y = 9;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55),
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 3,
      metalness: 0.4,
      roughness: 0.2,
    }),
  );
  diamond.position.y = 4.2;
  const light = new THREE.PointLight(color, 3.2, 20, 2);
  light.position.y = 4;
  g.add(ring, shaft, diamond, light);
  g.userData.diamond = diamond;
  g.userData.ring = ring;
  return g;
}

export function spawnPedPaths(city: City) {
  return city.pedPaths;
}
