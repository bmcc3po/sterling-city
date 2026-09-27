import * as THREE from 'three';
import { batchParts } from './batchParts';
const material=(color:string,metalness=.2)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.38});
function box(g:THREE.Group,w:number,h:number,d:number,color:string,x:number,y:number,z:number){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);g.add(m);return m;}
function outline(g:THREE.Group,points:number[][],depth:number,y:number,color:string,bevel=.15){const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:12});geo.rotateX(Math.PI/2);const m=new THREE.Mesh(geo,material(color,.45));m.position.y=y;g.add(m);return m;}
function bar(g:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,r:number,color:string){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),10),material(color,.7));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());g.add(m);}
function wheel(g:THREE.Group,x:number,z:number,r=.78,width=.48){const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,width,24),material('#151b23',.05));tire.rotation.z=Math.PI/2;tire.position.set(x,r,z);g.add(tire);const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*.64,r*.64,width+.035,16),material('#b7c4cd',.85));rim.rotation.z=Math.PI/2;rim.position.copy(tire.position);g.add(rim);for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;bar(g,new THREE.Vector3(x+Math.sign(x)*width*.55,r,z),new THREE.Vector3(x+Math.sign(x)*width*.55,r+Math.sin(angle)*r*.57,z+Math.cos(angle)*r*.57),.06,'#26323e');}return tire;}
export function carModel(color:string,style:'sport'|'sedan'|'muscle'|'truck'='sport'){
 const g=new THREE.Group(),long=style==='truck'?4.4:3.6;
 const paint=outline(g,[[-1.4,-long],[-1.8,-long+.6],[-1.8,2.4],[-1.35,long],[1.35,long],[1.8,2.4],[1.8,-long+.6],[1.4,-long]],.85,1.45,color,.2);paint.name='paint';
 // Keep index 2 as the roof for legacy paint saves.
 const cabin=outline(g,[[-1.35,-1.5],[-1.5,.1],[-1.05,1.55],[1.05,1.55],[1.5,.1],[1.35,-1.5]],.65,2.1,'#172c3e',.12);cabin.name='glass';
 const roof=outline(g,[[-1.15,-1.35],[-1.13,.15],[1.13,.15],[1.15,-1.35]],.1,2.28,color,.12);roof.name='roof';
 for(const x of [-1.8,1.8])for(const z of [-2.35,2.25])wheel(g,x,z);
 for(const x of [-1.13,1.13]){const light=box(g,.75,.2,.15,'#d9faff',x,1.22,long+.32);(light.material as THREE.MeshStandardMaterial).emissive.set('#72cddd');box(g,.9,.2,.13,'#ff3c48',x,1.2,-long-.32);box(g,.23,.2,.65,'#141b24',x*1.54,1.87,.9);}
 for(const x of [-1.08,1.08]){box(g,.85,.16,.12,'#ff4c5a',x,1.35,-long-.34);bar(g,new THREE.Vector3(x,.5,-long-.2),new THREE.Vector3(x,.5,-long-.55),.13,'#c3cbd0');}
 box(g,.85,.3,.1,'#e4e9e5',0,.93,-long-.32);
 for(const side of [-1,1]){box(g,.08,.15,.45,'#bac5cc',side*1.97,1.42,-.55);box(g,.08,.3,1.3,'#1b2835',side*1.96,.93,-1.15);}
 box(g,2.25,.28,.14,'#17232b',0,.83,long+.2);box(g,2.5,.25,.16,'#1b2430',0,.68,-long-.15);
 for(const x of [-.48,.48])box(g,.3,.03,1.5,'#1a2934',x,1.68,2.6);
 for(const x of [-1.6,1.6])bar(g,new THREE.Vector3(x,.56,-2),new THREE.Vector3(x,.56,2),.12,'#263544');
 if(style==='sport'){box(g,3.75,.14,.7,'#1f2f40',0,2.02,-3.15);for(const x of [-1.15,1.15])box(g,.12,.55,.16,'#273a4d',x,1.8,-3.15);}
 if(style==='muscle'){box(g,.7,.35,1.1,'#283642',0,1.85,2.3);for(const x of [-.4,.4])box(g,.25,.025,6.5,'#242e3a',x,1.67,0);}
 if(style==='truck'){cabin.position.z=1;roof.position.z=1;box(g,3.05,.25,2.8,'#293842',0,1.55,-2.35);for(const x of [-1.58,1.58])box(g,.23,.6,3,color,x,1.9,-2.35);box(g,3.1,.6,.22,color,0,1.9,-3.8);}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.6,long*2+1),new THREE.MeshBasicMaterial({color:'#071019',transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.07;g.add(shadow);batchParts(g);return g;
}
export function watercraftModel(color:string,jetski:boolean){const g=new THREE.Group();const w=jetski?1:2.3,l=jetski?2.7:6;
 outline(g,[[0,l],[-w*.7,l*.7],[-w,l*.2],[-w,-l*.75],[-w*.7,-l],[w*.7,-l],[w,-l*.75],[w,l*.2],[w*.7,l*.7]],jetski?.55:1.2,.5,color,.18);
 outline(g,[[0,l*.93],[-w*.7,l*.45],[-w*.77,-l*.77],[w*.77,-l*.77],[w*.7,l*.45]],.12,.75,jetski?'#243546':'#e6ddd0',.1);
 if(jetski){outline(g,[[-.45,1],[-.58,-1.3],[.58,-1.3],[.45,1]],.35,1.15,'#1e2c38');bar(g,new THREE.Vector3(0,1,1),new THREE.Vector3(0,1.8,1.3),.1,'#748695');bar(g,new THREE.Vector3(-.8,1.8,1.3),new THREE.Vector3(.8,1.8,1.3),.11,'#172331');}
 else{const glass=box(g,3.2,1.1,.15,'#4f9ead',0,1.65,1);glass.rotation.x=-.35;for(const x of [-.85,.85]){box(g,.9,.55,1,'#f7ead6',x,1,-1);box(g,.9,.9,.25,'#e5d6bb',x,1.5,-1.6);}box(g,3,.6,1.1,'#e7d6bf',0,1,-3.8);for(const side of [-1,1]){bar(g,new THREE.Vector3(side*1.9,1.1,-3),new THREE.Vector3(side*1.7,1.1,3),.055,'#c8d6d9');for(const z of [-3,0,3])bar(g,new THREE.Vector3(side*1.9,.65,z),new THREE.Vector3(side*1.9,1.1,z),.04,'#b8c7ca');}box(g,.9,1.6,.85,'#253241',0,.4,-6);}
 batchParts(g);return g;
}
export function bikeModel(color:string,quad:boolean){const g=new THREE.Group();for(const z of [-1.5,1.5])for(const x of quad?[-1,1]:[0])wheel(g,x,z,.72,quad?.55:.35);
 const body=outline(g,[[-.45,-1.4],[-.6,.2],[-.35,1.3],[.35,1.3],[.6,.2],[.45,-1.4]],.55,1.4,color);body.name='paint';
 box(g,.65,.25,1.5,'#172432',0,1.62,-.5);for(const x of [-.35,.35]){bar(g,new THREE.Vector3(x,.7,-1.4),new THREE.Vector3(0,1.45,.2),.09,'#63717e');bar(g,new THREE.Vector3(x,.7,1.5),new THREE.Vector3(x,1.95,1.1),.09,'#b8c5cb');}bar(g,new THREE.Vector3(-.8,2,1.1),new THREE.Vector3(.8,2,1.1),.08,'#1b2834');box(g,.8,.25,.3,'#e7faff',0,1.8,1.4);box(g,.55,.35,.7,'#6b7580',0,.85,0);
 if(quad)for(const x of [-.9,.9])for(const z of [-1.4,1.4])box(g,.8,.17,1.2,color,x,1.47,z);batchParts(g);return g;
}
export function rampModel(){const g=new THREE.Group(),shape=new THREE.Shape();shape.moveTo(-14,0);shape.lineTo(14,0);shape.lineTo(14,8);shape.bezierCurveTo(0,7,-5,1,-14,0);const geo=new THREE.ExtrudeGeometry(shape,{depth:18,bevelEnabled:false,curveSegments:16});geo.rotateY(-Math.PI/2);geo.translate(9,0,0);g.add(new THREE.Mesh(geo,material('#506d7e')));for(const x of [-9.2,9.2])for(const z of [-6,4,13])bar(g,new THREE.Vector3(x,0,z),new THREE.Vector3(x,Math.max(1,(z+14)/3.4),z),.16,'#c1ac7c');batchParts(g);return g;}
