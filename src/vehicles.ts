import * as THREE from "three";
import { isLiteGpu } from "./device";
import { sideDecal } from "./textures";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export type CarKit = {
  group: THREE.Group;
  wheels: THREE.Group[];
  frontWheels: THREE.Group[];
  body: THREE.Group;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  lightbar?: THREE.Mesh;
};

function wheel(): THREE.Group {
  const g = new THREE.Group();
  const tire = mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.22, 22),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92, metalness: 0.05 }),
  );
  tire.rotation.z = Math.PI / 2;
  const rim = mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.24, 18),
    new THREE.MeshPhysicalMaterial({ color: 0xc9d2e3, metalness: 0.95, roughness: 0.18, clearcoat: 0.6 }),
  );
  rim.rotation.z = Math.PI / 2;
  g.add(tire, rim);
  for (let i = 0; i < 5; i++) {
    const spoke = mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.32),
      new THREE.MeshPhysicalMaterial({ color: 0xeaeff8, metalness: 1, roughness: 0.2 }),
    );
    spoke.rotation.y = (i / 5) * Math.PI;
    g.add(spoke);
  }
  return g;
}

export function createHeroCar(): CarKit {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xffb43c,
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.4,
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x0c0e14,
    metalness: 0.6,
    roughness: 0.3,
    clearcoat: 0.4,
  });
  const glass = isLiteGpu
    ? new THREE.MeshStandardMaterial({ color: 0x4a6a88, metalness: 0.4, roughness: 0.2 })
    : new THREE.MeshPhysicalMaterial({
        color: 0x87c6ff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.45,
        transparent: true,
        opacity: 0.72,
        thickness: 0.4,
      });

  body.add(mesh(new THREE.BoxGeometry(1.86, 0.42, 4.35), paint, 0, 0.46, 0.05));
  body.add(mesh(new THREE.BoxGeometry(1.78, 0.22, 2.1), paint, 0, 0.72, -0.15)); // cabin lower
  body.add(mesh(new THREE.BoxGeometry(1.5, 0.38, 1.55), dark, 0, 0.98, -0.12)); // roof
  body.add(mesh(new THREE.BoxGeometry(1.46, 0.32, 0.08), glass, 0, 0.96, 0.66)); // windshield
  body.add(mesh(new THREE.BoxGeometry(1.46, 0.28, 0.08), glass, 0, 0.94, -0.9));
  body.add(mesh(new THREE.BoxGeometry(0.06, 0.28, 1.4), glass, 0.76, 0.94, -0.12));
  body.add(mesh(new THREE.BoxGeometry(0.06, 0.28, 1.4), glass, -0.76, 0.94, -0.12));
  body.add(mesh(new THREE.BoxGeometry(1.9, 0.18, 0.55), paint, 0, 0.42, 2.05)); // front bumper
  body.add(mesh(new THREE.BoxGeometry(1.9, 0.22, 0.42), paint, 0, 0.4, -2.12));
  body.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), paint, 0, 1.2, -1.05)); // spoiler stem
  body.add(mesh(new THREE.BoxGeometry(1.7, 0.06, 0.38), paint, 0, 1.26, -1.18));
  body.add(mesh(new THREE.BoxGeometry(0.18, 0.08, 2.6), dark, 0.94, 0.34, 0));
  body.add(mesh(new THREE.BoxGeometry(0.18, 0.08, 2.6), dark, -0.94, 0.34, 0));
  body.add(mesh(new THREE.BoxGeometry(0.28, 0.12, 0.55), dark, 0.55, 0.72, 1.55)); // mirror-ish hood vents
  body.add(mesh(new THREE.BoxGeometry(0.28, 0.12, 0.55), dark, -0.55, 0.72, 1.55));

  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8f6ff,
    emissive: 0xbfe9ff,
    emissiveIntensity: 4,
    roughness: 0.15,
    metalness: 0.2,
  });
  const tailMat = new THREE.MeshPhysicalMaterial({
    color: 0xff2448,
    emissive: 0xff1030,
    emissiveIntensity: 3.2,
    roughness: 0.25,
  });
  const headlights = [
    mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), headMat, 0.58, 0.48, 2.3),
    mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), headMat, -0.58, 0.48, 2.3),
  ];
  const taillights = [
    mesh(new THREE.BoxGeometry(0.7, 0.1, 0.06), tailMat, 0.5, 0.52, -2.32),
    mesh(new THREE.BoxGeometry(0.7, 0.1, 0.06), tailMat, -0.5, 0.52, -2.32),
  ];
  headlights.forEach((h) => body.add(h));
  taillights.forEach((h) => body.add(h));

  const glow = mesh(
    new THREE.BoxGeometry(1.7, 0.04, 4.1),
    new THREE.MeshBasicMaterial({ color: 0xff9a1f, transparent: true, opacity: 0.35 }),
    0,
    0.12,
    0,
  );
  glow.castShadow = false;
  body.add(glow);

  const wheels = [wheel(), wheel(), wheel(), wheel()];
  const pos: [number, number, number][] = [
    [0.82, 0.36, 1.35],
    [-0.82, 0.36, 1.35],
    [0.82, 0.36, -1.38],
    [-0.82, 0.36, -1.38],
  ];
  wheels.forEach((w, i) => {
    w.position.set(...pos[i]!);
    group.add(w);
  });
  group.add(body);
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      (o as THREE.Mesh).castShadow = true;
      (o as THREE.Mesh).receiveShadow = true;
    }
  });
  return { group, wheels, frontWheels: [wheels[0]!, wheels[1]!], body, headlights, taillights };
}

export function createCoachCar(): CarKit {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xf4f7ff,
    metalness: 0.55,
    roughness: 0.28,
    clearcoat: 0.7,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.3 });
  body.add(mesh(new THREE.BoxGeometry(1.95, 0.5, 4.7), paint, 0, 0.52, 0));
  body.add(mesh(new THREE.BoxGeometry(1.7, 0.55, 2.05), paint, 0, 1.02, -0.25));
  body.add(mesh(new THREE.BoxGeometry(1.96, 0.28, 0.7), black, 0, 0.62, 0.1));
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.28),
    new THREE.MeshBasicMaterial({ map: sideDecal("COACH", "#102038"), transparent: false }),
  );
  decal.position.set(0.99, 0.7, 0);
  decal.rotation.y = Math.PI / 2;
  body.add(decal);
  const decal2 = decal.clone();
  decal2.position.x = -0.99;
  decal2.rotation.y = -Math.PI / 2;
  body.add(decal2);

  const bar = mesh(
    new THREE.BoxGeometry(1.1, 0.16, 0.42),
    new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      emissive: 0x2244ff,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    }),
    0,
    1.38,
    -0.1,
  );
  body.add(bar);

  const headlights = [
    mesh(
      new THREE.BoxGeometry(0.34, 0.16, 0.08),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xddeeff, emissiveIntensity: 3.5 }),
      0.62,
      0.5,
      2.36,
    ),
    mesh(
      new THREE.BoxGeometry(0.34, 0.16, 0.08),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xddeeff, emissiveIntensity: 3.5 }),
      -0.62,
      0.5,
      2.36,
    ),
  ];
  const taillights = [
    mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.06),
      new THREE.MeshPhysicalMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 2.5 }),
      0.55,
      0.55,
      -2.36,
    ),
    mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.06),
      new THREE.MeshPhysicalMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 2.5 }),
      -0.55,
      0.55,
      -2.36,
    ),
  ];
  headlights.forEach((h) => body.add(h));
  taillights.forEach((h) => body.add(h));
  const wheels = [wheel(), wheel(), wheel(), wheel()];
  const pos: [number, number, number][] = [
    [0.86, 0.36, 1.45],
    [-0.86, 0.36, 1.45],
    [0.86, 0.36, -1.5],
    [-0.86, 0.36, -1.5],
  ];
  wheels.forEach((w, i) => {
    w.position.set(...pos[i]!);
    group.add(w);
  });
  group.add(body);
  return { group, wheels, frontWheels: [wheels[0]!, wheels[1]!], body, headlights, taillights, lightbar: bar };
}

export function createTrafficCar(color: number): CarKit {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.7,
    roughness: 0.3,
    clearcoat: 0.8,
  });
  body.add(mesh(new THREE.BoxGeometry(1.7, 0.4, 4.0), paint, 0, 0.48, 0));
  body.add(mesh(new THREE.BoxGeometry(1.45, 0.4, 1.7), paint, 0, 0.88, -0.15));
  const headlights = [
    mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.06),
      new THREE.MeshPhysicalMaterial({ emissive: 0xccffff, emissiveIntensity: 2, color: 0xffffff }),
      0.5,
      0.46,
      2.02,
    ),
    mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.06),
      new THREE.MeshPhysicalMaterial({ emissive: 0xccffff, emissiveIntensity: 2, color: 0xffffff }),
      -0.5,
      0.46,
      2.02,
    ),
  ];
  headlights.forEach((h) => body.add(h));
  const taillights = [
    mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.05),
      new THREE.MeshPhysicalMaterial({ emissive: 0xff2030, emissiveIntensity: 1.6, color: 0xff3040 }),
      0,
      0.5,
      -2.02,
    ),
  ];
  taillights.forEach((t) => body.add(t));
  const wheels = [wheel(), wheel(), wheel(), wheel()];
  [
    [0.78, 0.34, 1.2],
    [-0.78, 0.34, 1.2],
    [0.78, 0.34, -1.2],
    [-0.78, 0.34, -1.2],
  ].forEach((p, i) => {
    wheels[i]!.position.set(p[0]!, p[1]!, p[2]!);
    group.add(wheels[i]!);
  });
  group.add(body);
  return { group, wheels, frontWheels: [wheels[0]!, wheels[1]!], body, headlights, taillights };
}
