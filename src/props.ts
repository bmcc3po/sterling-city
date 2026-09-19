import * as THREE from "three";

const _obj = new THREE.Object3D();

export type Pose = { x: number; y: number; z: number; ry?: number };

export function instancedMesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  poses: Pose[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, poses.length));
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  poses.forEach((p, i) => {
    _obj.position.set(p.x, p.y, p.z);
    _obj.rotation.set(0, p.ry ?? 0, 0);
    _obj.scale.set(1, 1, 1);
    _obj.updateMatrix();
    mesh.setMatrixAt(i, _obj.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = true;
  return mesh;
}

export function plaqueTexture(title: string, sub: string, bg = "#1a1408", fg = "#ffe14a") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 488, 232);
  ctx.fillStyle = fg;
  ctx.font = "800 56px Rajdhani, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 256, 100);
  ctx.font = "700 32px Rajdhani, sans-serif";
  ctx.fillStyle = "#f4f1ea";
  ctx.fillText(sub, 256, 168);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
