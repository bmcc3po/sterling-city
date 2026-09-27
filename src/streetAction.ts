import * as THREE from 'three';
import { batchParts } from './batchParts';
export type Obstacle = {x:number;z:number;w:number;d:number;h:number};
// Swept-circle contact prevents even a boosted vehicle skipping over another car.
export function sweptContact(from:THREE.Vector3,to:THREE.Vector3,center:THREE.Vector3,radius:number):number|null {
  const dx=to.x-from.x,dz=to.z-from.z,ox=from.x-center.x,oz=from.z-center.z;
  const c=ox*ox+oz*oz-radius*radius,b=ox*dx+oz*dz,a=dx*dx+dz*dz;
  if(c<=0)return b>=0?null:0;
  if(a<1e-10||b>=0)return null;
  const disc=b*b-a*c;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/a;return t>=0&&t<=1?t:null;
}
export class StreetAction {
  obstacles:Obstacle[]=[];
  course=-1; checkpoint=0; elapsed=0;
  health=100; fighting=false; punchTimer=0;
  fighters:{mesh:THREE.Group;hp:number;cooldown:number;bar:THREE.Mesh}[]=[];
  rings:THREE.Mesh[][]=[[],[]];
  constructor(private scene:THREE.Scene,private notify:(s:string)=>void,private win:(id:string,label:string,count:number,rate:number)=>void){this.build();}
  private box(w:number,h:number,d:number,color:string,x:number,y:number,z:number){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);this.scene.add(m);return m;}
  private build(){
    for(let lane=0;lane<2;lane++){
      const x=lane===0?-60:60;
      this.box(28,.15,155,lane===0?'#74947b':'#8a7a65',x,.2,355);
      for(let i=0;i<5;i++){
        const z=305+i*25,h=lane===0?(i%2?1.4:1.1):[1,2,3,2,1][i],d=lane===0?(i%2?8:1.5):10;
        this.obstacles.push({x,z,w:10,d,h});
        if(lane===0&&d<2){for(const side of [-1,1]){this.box(.35,h,.35,'#647c89',x+side*4.7,h/2,z);this.box(1.8,.18,2,'#334e60',x+side*4.7,.09,z);}this.box(10,.3,.4,'#e9bf6b',x,h-.15,z);}
        else {this.box(10,h,d,lane===0?'#b79b6a':'#607e91',x,h/2,z);for(let rib=-4;rib<=4;rib+=1)this.box(.1,h,.15,'#879fab',x+rib,h/2,z+d/2+.03);this.box(10,.12,.2,'#30485c',x,.15,z+d/2+.05);}
        this.box(10,.12,.4,'#ffdd78',x,h+.06,z-d/2);
        const ring=new THREE.Mesh(new THREE.BoxGeometry(5,.3,.3),new THREE.MeshStandardMaterial({color:'#ffe182',emissive:'#806000'}));ring.name='checkpoint';ring.position.set(x,h+3,z);this.scene.add(ring);for(const side of [-1,1])this.box(.14,h+3,.14,'#d6c392',x+side*5.6,(h+3)/2,z);
        if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#142c3b';ctx.fillRect(0,0,64,64);ctx.fillStyle='#ffe39e';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),32,48);const number=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas)}));number.scale.set(2,2,1);number.position.y=1.3;ring.add(number);}this.rings[lane].push(ring);
      }
      for(const side of [-1,1])for(let z=285;z<430;z+=18)this.box(.3,1.1,.3,'#e1d7bd',x+side*13,.55,z);
    }
    this.box(72,.18,70,'#7a6863',180,.2,350);
    this.box(42,.2,42,'#ac9274',180,.35,350);
    for(let i=0;i<3;i++){
      const mesh=new THREE.Group();const part=(w:number,h:number,d:number,color:string,x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);mesh.add(m);return m;};
      part(1.2,1.3,.65,['#b54f49','#6876b2','#736551'][i],0,1.7,0);part(.7,.7,.7,'#c69d77',0,2.7,0);
      for(const x of [-.3,.3])part(.4,1,.45,'#243445',x,.5,0);
      part(.3,1,.4,'#c69d77',-.8,1.8,0);part(.3,1,.4,'#c69d77',.8,1.8,0);
      const bar=part(2,.15,.15,'#92e6af',0,3.5,0);mesh.position.set(168+i*12,0,355);this.scene.add(mesh);this.fighters.push({mesh,hp:3,cooldown:i*.4,bar});
    }
    // Fill the former empty outer blocks with a promenade, seating and small market courts.
    for(const x of [-280,280])for(let z=-240;z<=240;z+=60){
      this.box(36,.12,44,'#8c997a',x,.22,z+28);
      this.box(1,5,1,'#7a644b',x,2.5,z+25);const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(5,1),new THREE.MeshStandardMaterial({color:'#4f8060'}));tree.position.set(x,8,z+25);this.scene.add(tree);
      this.box(7,.5,2,'#b89c6c',x+10,1,z+24);this.box(7,1.5,.4,'#b89c6c',x+10,1.5,z+25);
    }
    for(const x of [-190,-145,130,185]){this.box(20,5,13,'#b8a58e',x,2.5,280);this.box(24,.5,18,'#5e9b9b',x,5.2,280);this.obstacles.push({x,z:280,w:20,d:13,h:5});}
    for(let x=-420;x<440;x+=32){this.box(3,.16,12,'#c7b492',x,.35,440);}
    batchParts(this.scene);
  }
  surface(x:number,z:number,maxHeight:number){return this.obstacles.filter(o=>Math.abs(x-o.x)<o.w/2+.55&&Math.abs(z-o.z)<o.d/2+.55&&o.h<=maxHeight+.12).reduce((h,o)=>Math.max(h,o.h),0);}
  blocks(x:number,z:number,y:number){return this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.6&&Math.abs(z-o.z)<o.d/2+.6&&y<o.h-.1);}
  startCourse(lane:number){this.fighting=false;this.course=lane;this.checkpoint=0;this.elapsed=0;this.rings[lane].forEach(r=>{r.visible=true;(r.material as THREE.MeshStandardMaterial).color.set('#ffe182');});this.notify('Sprint with Shift. Space jumps. Clear the five numbered checkpoints in order!');}
  startFight(){this.course=-1;this.fighting=true;this.health=100;this.fighters.forEach((f,i)=>{f.hp=3;f.mesh.position.set(168+i*12,0,355);f.mesh.rotation.set(0,0,0);f.cooldown=1+i*.4;f.bar.scale.x=1;});this.notify('Street sparring! J punches · hold Q to block · jump or move to dodge.');}
  punch(p:THREE.Vector3,yaw:number){if(!this.fighting||this.punchTimer>0)return;this.punchTimer=.35;
    const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    const f=this.fighters.filter(f=>f.hp>0).find(f=>{const v=f.mesh.position.clone().sub(p);v.y=0;return v.length()<4.8&&forward.dot(v.normalize())>-.1;});
    if(!f){this.notify('Swing! Get closer and face your opponent.');return;}
    f.hp--;f.bar.scale.x=f.hp/3;f.mesh.position.addScaledVector(forward,2);f.mesh.rotation.z=f.hp?-.25:Math.PI/2;
    this.notify(f.hp?'Hit! Keep moving.':'Opponent down!');
    if(this.fighters.every(f=>f.hp<=0)){this.fighting=false;this.win('brawl','STREET SPARRING',3,75);}
  }
  tick(dt:number,p:THREE.Vector3,onFoot:boolean,blocking:boolean){this.punchTimer=Math.max(0,this.punchTimer-dt);
    if(this.course>=0){this.elapsed+=dt;if(!onFoot||this.elapsed>75){this.course=-1;this.notify('Course ended. Return to the start for another run.');}else{
      const ring=this.rings[this.course][this.checkpoint],base=this.obstacles[this.course*5+this.checkpoint];
      if(Math.abs(p.x-ring.position.x)<3&&Math.abs(p.z-ring.position.z)<3&&p.y>=base.h-.15){ring.visible=false;this.checkpoint++;this.notify(`Checkpoint ${this.checkpoint}/5!`);if(this.checkpoint===5){const lane=this.course;this.course=-1;this.win('course-'+lane,lane===0?'BOARDWALK HURDLES':'CONTAINER CLIMB',5,50);}}
    }}
    if(!this.fighting)return;
    if(!onFoot||Math.hypot(p.x-180,p.z-350)>55){this.fighting=false;this.notify('Left the sparring area. Come back to retry.');return;}
    for(const f of this.fighters){if(f.hp<=0)continue;f.cooldown-=dt;f.mesh.rotation.z*=Math.exp(-8*dt);const v=p.clone().sub(f.mesh.position);v.y=0;const distance=v.length();f.mesh.rotation.y=Math.atan2(v.x,v.z);if(distance>2.5)f.mesh.position.addScaledVector(v.normalize(),Math.min(distance-2.5,dt*4.5));
      for(const other of this.fighters){if(other===f||other.hp<=0)continue;const away=f.mesh.position.clone().sub(other.mesh.position);away.y=0;const gap=away.length();if(gap>0&&gap<1.8)f.mesh.position.addScaledVector(away.normalize(),(1.8-gap)*.5);}
      f.mesh.children[5].rotation.x=distance<4&&f.cooldown>1?-1.3:0;
      if(distance<3.5&&f.cooldown<=0){f.cooldown=1.3;if(p.y<1.2)this.health=Math.max(0,this.health-(blocking?3:14));}
    }
    if(this.health===0){this.fighting=false;this.notify('Knocked down. No cash lost. Press E at the sparring sign to try again.');}
  }
  get status(){return this.fighting?`SPARRING · ${this.health} HEALTH · ${this.fighters.filter(f=>f.hp>0).length} RIVALS`:this.course>=0?`COURSE · ${this.checkpoint}/5 · ${Math.max(0,75-this.elapsed).toFixed(0)}s`:'';}
}
