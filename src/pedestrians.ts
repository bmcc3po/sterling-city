import * as THREE from "three";

export type PedKit = {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
};

const skinTones = [0xc68642, 0x8d5524, 0xffdbac, 0xe0ac69, 0xf1c27d];
const shirts = [0x1f3a68, 0x8b1e3f, 0x2d6a4f, 0xc9a227, 0x3d3d3d, 0x6b2d5c, 0x1b4965];
const pants = [0x1a1a22, 0x2c3e50, 0x3e2723, 0x37474f];

export function createPedestrian(seed = Math.random()): PedKit {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: skinTones[Math.floor(seed * skinTones.length)]!,
    roughness: 0.75,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: shirts[Math.floor(seed * 17) % shirts.length]!,
    roughness: 0.7,
  });
  const pant = new THREE.MeshStandardMaterial({
    color: pants[Math.floor(seed * 11) % pants.length]!,
    roughness: 0.8,
  });
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), shirt);
  torso.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.26), skin);
  head.position.y = 1.48;
  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.28), hair);
  hairMesh.position.y = 1.64;
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), pant);
  leftLeg.position.set(-0.12, 0.4, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), pant);
  rightLeg.position.set(0.12, 0.4, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.12), shirt);
  leftArm.position.set(-0.3, 1.02, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.12), shirt);
  rightArm.position.set(0.3, 1.02, 0);
  group.add(torso, head, hairMesh, leftLeg, rightLeg, leftArm, rightArm);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function createHeroPed(): PedKit {
  const kit = createPedestrian(0.22);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffb43c, roughness: 0.4, metalness: 0.35 });
  (kit.group.children[0] as THREE.Mesh).material = gold;
  return kit;
}

export function swingWalk(kit: PedKit, phase: number, amp = 0.7) {
  kit.leftLeg.rotation.x = Math.sin(phase) * amp;
  kit.rightLeg.rotation.x = Math.sin(phase + Math.PI) * amp;
  kit.leftArm.rotation.x = Math.sin(phase + Math.PI) * amp * 0.7;
  kit.rightArm.rotation.x = Math.sin(phase) * amp * 0.7;
}

export function idleWalk(kit: PedKit) {
  kit.leftLeg.rotation.x = 0;
  kit.rightLeg.rotation.x = 0;
  kit.leftArm.rotation.x = 0;
  kit.rightArm.rotation.x = 0;
}

export type PedSim = {
  kit: PedKit;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
  path: { x: number; z: number }[];
  i: number;
};

export function stepPed(p: PedSim, dt: number) {
  const dest = p.path[p.i]!;
  const dx = dest.x - p.x;
  const dz = dest.z - p.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.6) {
    p.i = (p.i + 1) % p.path.length;
  } else {
    p.yaw = Math.atan2(dx, dz);
    p.x += (dx / dist) * p.speed * dt;
    p.z += (dz / dist) * p.speed * dt;
  }
  p.phase += dt * 10;
  p.kit.group.position.set(p.x, 0, p.z);
  p.kit.group.rotation.y = p.yaw;
  swingWalk(p.kit, p.phase, 0.55);
}

export function sidewalkLoop(cx: number, cz: number, half: number): { x: number; z: number }[] {
  const h = half;
  return [
    { x: cx - h, z: cz - h },
    { x: cx + h, z: cz - h },
    { x: cx + h, z: cz + h },
    { x: cx - h, z: cz + h },
  ];
}
