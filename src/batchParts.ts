import * as THREE from 'three';
/** Collapse rigid detail into a handful of draw calls, keeping named paint panels editable. */
export function batchParts(group:THREE.Object3D){
 const batches=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;items:{mesh:THREE.Mesh;matrix:THREE.Matrix4}[]}>();
 for(const child of [...group.children]){
  if(!(child instanceof THREE.Mesh)||child.name||child instanceof THREE.InstancedMesh)continue;
  const geo=child.geometry,mat=child.material as THREE.MeshStandardMaterial;if(!mat.color)continue;
  const scale=new THREE.Vector3();let base:THREE.BufferGeometry,type:string;
  if(geo instanceof THREE.BoxGeometry){const p=geo.parameters;scale.set(p.width,p.height,p.depth);type='box';base=new THREE.BoxGeometry(1,1,1);}
  else if(geo instanceof THREE.CylinderGeometry&&geo.parameters.radiusTop===geo.parameters.radiusBottom){const p=geo.parameters;scale.set(p.radiusTop,p.height,p.radiusTop);type='cylinder';base=new THREE.CylinderGeometry(1,1,1,p.radialSegments);}
  else continue;
  child.updateMatrix();const matrix=child.matrix.clone().multiply(new THREE.Matrix4().makeScale(scale.x,scale.y,scale.z));
  const key=type+mat.color.getHexString()+(mat.emissive?.getHexString()??'')+mat.metalness+mat.roughness;
  let batch=batches.get(key);if(!batch){batch={geometry:base,material:mat,items:[]};batches.set(key,batch);}else base.dispose();batch.items.push({mesh:child,matrix});
 }
 for(const batch of batches.values()){const instanced=new THREE.InstancedMesh(batch.geometry,batch.material,batch.items.length);batch.items.forEach(({mesh,matrix},i)=>{instanced.setMatrixAt(i,matrix);group.remove(mesh);mesh.geometry.dispose();});instanced.computeBoundingSphere();group.add(instanced);}
}
