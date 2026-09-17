import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mulberry32, pick } from "./rng";
import { asphaltTexture, neonSign, windowTexture } from "./textures";

export const BLOCK = 30;
export const ROAD = 16;
export const CELLS = 7;
export const STRIDE = BLOCK + ROAD;
export const CITY_SPAN = (CELLS - 1) * STRIDE;

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };
export type MissionSpot = { id: "courier" | "vault" | "getaway" | "garage"; x: number; z: number; label: string };

export type City = {
  group: THREE.Group;
  colliders: AABB[];
  lamps: THREE.PointLight[];
  spots: MissionSpot[];
  spawn: THREE.Vector3;
  reflector: Reflector;
};

function blockCenter(i: number, j: number) {
  const origin = -CITY_SPAN / 2;
  return { x: origin + i * STRIDE, z: origin + j * STRIDE };
}

export function buildCity(renderer: THREE.WebGLRenderer): City {
  const rng = mulberry32(2026);
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const lamps: THREE.PointLight[] = [];

  const night = renderer.getPixelRatio() > 1.25 ? 384 : 256;
  const reflector = new Reflector(new THREE.PlaneGeometry(CITY_SPAN + 80, CITY_SPAN + 80), {
    clipBias: 0.003,
    textureWidth: night,
    textureHeight: night,
    color: 0x4a5570,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0.001;
  group.add(reflector);

  const asphalt = asphaltTexture();
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(28, 28);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SPAN + 80, CITY_SPAN + 80),
    new THREE.MeshPhysicalMaterial({
      map: asphalt,
      color: 0xb8c2d8,
      roughness: 0.32,
      metalness: 0.18,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 1.1,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  group.add(road);

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x4a5160, roughness: 0.7, metalness: 0.1 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x5a5366, roughness: 0.55, metalness: 0.22, emissive: 0x1a1220, emissiveIntensity: 0.15 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a4c68,
    metalness: 0.85,
    roughness: 0.16,
    emissive: 0x243656,
    emissiveIntensity: 0.55,
  });
  const brick = new THREE.MeshStandardMaterial({ color: 0x6a3a44, roughness: 0.62, metalness: 0.1, emissive: 0x220810, emissiveIntensity: 0.12 });
  const windowMaps = [
    windowTexture(3, "#ffd38a"),
    windowTexture(9, "#9be7ff"),
    windowTexture(21, "#ffb0de"),
    windowTexture(27, "#d7ff9b"),
  ];

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe8eefc });

  for (let i = 0; i < CELLS; i++) {
    for (let j = 0; j < CELLS; j++) {
      const { x, z } = blockCenter(i, j);
      const walk = new THREE.Mesh(new THREE.BoxGeometry(BLOCK + 3.2, 0.22, BLOCK + 3.2), sidewalkMat);
      walk.position.set(x, 0.12, z);
      walk.receiveShadow = true;
      group.add(walk);

      const nBuildings = 1 + Math.floor(rng() * 2);
      for (let b = 0; b < nBuildings; b++) {
        const w = 8 + rng() * (BLOCK / nBuildings - 6);
        const d = 8 + rng() * 12;
        const h = 8 + rng() * 28 + (i === 3 && j === 3 ? 18 : 0);
        const ox = (b - (nBuildings - 1) / 2) * (BLOCK / nBuildings);
        const oz = (rng() - 0.5) * 6;
        const bx = x + ox;
        const bz = z + oz;
        const isGlass = rng() > 0.62;
        const mat = isGlass ? glassMat : rng() > 0.5 ? concrete : brick;
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(bx, h / 2, bz);
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);

        const winMap = pick(rng, windowMaps);
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.06, h * 0.9, d + 0.06),
          new THREE.MeshStandardMaterial({
            map: winMap,
            emissiveMap: winMap,
            emissive: 0xffffff,
            emissiveIntensity: 2.4,
            roughness: 0.45,
            metalness: 0.15,
          }),
        );
        win.position.set(bx, h / 2 + 0.15, bz);
        group.add(win);

        const shopColor = pick(rng, [0xff3d8a, 0x3cf0ff, 0xffc44d, 0x7cff6b, 0xff6a3c]);
        const shop = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.92, 2.4, 0.12),
          new THREE.MeshBasicMaterial({ color: shopColor, toneMapped: false }),
        );
        shop.position.set(bx, 1.4, bz + d / 2 + 0.12);
        group.add(shop);

        if (rng() > 0.28) {
          const colors = ["#ff3d8a", "#3cf0ff", "#ffc44d", "#7cff6b"];
          const words = ["PIZZA", "ARCADE", "24H", "RADIO", "NOON", "GRID"];
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.min(w, 10), 3.2),
            new THREE.MeshBasicMaterial({
              map: neonSign(pick(rng, words), pick(rng, colors)),
              transparent: true,
              toneMapped: false,
            }),
          );
          sign.position.set(bx, 5.1, bz + d / 2 + 0.22);
          group.add(sign);
        }

        if (rng() > 0.4) {
          const ac = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.1, 2.2),
            new THREE.MeshStandardMaterial({ color: 0x2c3344, roughness: 0.5, metalness: 0.4 }),
          );
          ac.position.set(bx + 1.2, h + 0.6, bz);
          ac.castShadow = true;
          group.add(ac);
        }

        colliders.push({
          minX: bx - w / 2 - 0.2,
          maxX: bx + w / 2 + 0.2,
          minZ: bz - d / 2 - 0.2,
          maxZ: bz + d / 2 + 0.2,
        });
      }
    }
  }

  // Lane markings on the driving lanes only
  for (let i = 0; i < CELLS - 1; i++) {
    const { x } = blockCenter(i, 0);
    const roadX = x + BLOCK / 2 + ROAD / 2;
    for (let s = -CITY_SPAN / 2; s < CITY_SPAN / 2; s += 8) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 1.6), dashMat);
      dash.position.set(roadX, 0.04, s);
      group.add(dash);
    }
    const yel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, CITY_SPAN + 20), lineMat);
    yel.position.set(roadX - 0.35, 0.035, 0);
    group.add(yel);
  }

  // Street lamps along roads
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x1b1e28, metalness: 0.7, roughness: 0.35 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
  for (let i = 0; i < CELLS; i++) {
    for (let j = 0; j < CELLS; j++) {
      if ((i + j) % 2) continue;
      const { x, z } = blockCenter(i, j);
      const lx = x + BLOCK / 2 + 1.2;
      const lz = z + BLOCK / 2 + 1.2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8), lampMat);
      post.position.set(lx, 2.6, lz);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), bulbMat);
      bulb.position.set(lx, 5.2, lz);
      group.add(post, bulb);
      const light = new THREE.PointLight(0xffd19a, 0, 36, 1.6);
      light.position.set(lx, 5.1, lz);
      group.add(light);
      lamps.push(light);
    }
  }

  // Traffic lights at a few intersections
  for (let i = 1; i < CELLS; i += 2) {
    for (let j = 1; j < CELLS; j += 2) {
      const { x, z } = blockCenter(i, j);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8), lampMat);
      pole.position.set(x + BLOCK / 2 + 2, 2.25, z + BLOCK / 2 + 2);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.9, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      head.position.set(pole.position.x, 4.5, pole.position.z);
      const red = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2448 }),
      );
      red.position.set(head.position.x, 4.72, head.position.z + 0.14);
      group.add(pole, head, red);
    }
  }

  // Harbor water strip
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SPAN + 120, 36),
    new THREE.MeshPhysicalMaterial({
      color: 0x12304a,
      roughness: 0.08,
      metalness: 0.6,
      transparent: true,
      opacity: 0.9,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.01, CITY_SPAN / 2 + 38);
  group.add(water);

  const spots: MissionSpot[] = [
    { id: "courier", x: BLOCK / 2 + ROAD / 2, z: 42, label: "COURIER DROP" },
    { id: "vault", ...offset(5, 4, 0, 8), label: "VAULT" },
    { id: "getaway", ...offset(1, 5, -8, 0), label: "GETAWAY GATE" },
    { id: "garage", ...offset(4, 2, 0, -8), label: "GARAGE" },
  ];

  return {
    group,
    colliders,
    lamps,
    spots,
    spawn: new THREE.Vector3(BLOCK / 2 + ROAD / 2, 0, -22),
    reflector,
  };
}

function offset(i: number, j: number, dx: number, dz: number) {
  const c = blockCenter(i, j);
  return { x: c.x + dx, z: c.z + dz };
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
  const light = new THREE.PointLight(color, 4, 24, 2);
  light.position.y = 4;
  g.add(ring, shaft, diamond, light);
  g.userData.diamond = diamond;
  g.userData.ring = ring;
  return g;
}
