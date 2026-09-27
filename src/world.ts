import * as THREE from 'three';
import { schoolClient } from './schoolFeed';
import { sfxBoost, sfxHit, sfxMiss, sfxWin, unlockAudio } from './juice';
import './world.css';
import { StreetAction, sweptContact } from './streetAction';
import { carModel, watercraftModel, bikeModel, rampModel } from './vehicleModels';

type Stage = 'brief' | 'pickup' | 'manifest' | 'escape' | 'paid';
type RecordEntry = { date: string; skill: string; question: string; answer: number; correct: boolean };
type Ride = { mesh: THREE.Group; name: string; max: number; acceleration: number; kind: 'car' | 'truck' | 'bike' | 'quad' | 'boat' | 'jetski' };
type Challenge = { answer: number; question: string; hint: string; skill: string; done: () => void };
const SAVE = 'sterling-world-v1';
const ROADS = [-240, -120, 0, 120, 240];
const DEPOT = new THREE.Vector3(120, 0, -120);
const HOME = new THREE.Vector3(-120, 0, 120);

export class StreetWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, .5, 1400);
  private car = new THREE.Group();
  private wheels: THREE.Mesh[] = [];
  private rivals: THREE.Group[] = [];
  private blocks: { x: number; z: number; w: number; d: number }[] = [];
  private keys = new Set<string>();
  private touches = new Map<number, string>();
  private speed = 0;
  private yaw = 0;
  private stage: Stage = 'brief';
  private target = DEPOT;
  private beacon = new THREE.Group();
  private clock = new THREE.Clock();
  private active = true;
  private overlay = false;
  private mission = 0;
  private wins = 0;
  private boost = 100;
  private upgraded = false;
  private records: RecordEntry[] = [];
  private toastUntil = 0;
  private question = { a: 12, b: 14 };
  private heat = 0;
  private map: HTMLCanvasElement;
  private lastSafe = new THREE.Vector3(0, 0, 55);
  private hudTime = 0;
  private storageFailed = false;
  private loot: { mesh: THREE.Group; claimed: boolean }[] = [];
  private recovered: number[] = [];
  private avatar = new THREE.Group();
  private legs: THREE.Mesh[] = [];
  private onFoot = false;
  private rides: Ride[] = [];
  private currentRide: Ride | null = null;
  private challenge: Challenge | null = null;
  private ripples = new THREE.Group();
  private water!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private ammo = 0;
  private armed = false;
  private parkPass = false;
  private verticalSpeed = 0;
  private jumpCooldown = 0;
  private targets: THREE.Group[] = [];
  private hits = 0;
  private rangeScore = 0;
  private streak = 0;
  private lastHit = 0;
  private landedRamps: number[] = [];
  private paidRamps: number[] = [];
  private airborneRamp = -1;
  private fireCooldown = 0;
  private gunModel!: THREE.Mesh;
  private ramps = [{ x: 350, z: 235 }, { x: 405, z: 315 }, { x: 350, z: 385 }];
  private house = false;
  private pool = false;
  private garage = false;
  private spaces = 0;
  private dock = false;
  private workshop = false;
  private landscaping = false;
  private quoted = false;
  private estate = new THREE.Group();
  private owned: string[] = ['Gold GT'];
  private upgrades: Record<string, { engine?: boolean; nitro?: boolean; tires?: boolean; handling?: boolean; paint?: string; kit?: boolean }> = {};
  private actions?: StreetAction;
  private footVelocity = 0;
  private crashUntil = 0;
  private streetRewards: string[] = [];
  private navigation: { name: string; point: THREE.Vector3 } | null = null;

  constructor(private root: HTMLElement, private onSchool: () => void) {
    root.innerHTML = `<canvas class="world-canvas" aria-label="Sterling City driving world"></canvas>
      <div class="world-top"><div class="brand"><span class="brand-icon">S/C</span><div>STERLING CITY<small>AFTER HOURS</small></div></div><div class="world-menu"><button data-action="map">Explore</button><button data-action="marina-guide">Marina & island</button><button data-action="school">School hub</button><button data-action="parent">Parent review</button><button data-action="pause" aria-label="Pause">Ⅱ</button></div></div>
      <div class="world-job"><span class="eyebrow">THE DOCKS / CHAPTER 01</span><h2 id="world-objective"></h2><p id="world-detail"></p><div class="job-line"><span id="world-distance"></span><span id="world-heat"></span></div></div>
      <div class="world-wallet"><small>BANKROLL</small><strong id="world-cash"></strong><span id="world-rep"></span></div>
      <div class="world-bottom"><div class="world-radar"><canvas width="180" height="180"></canvas><span>STERLING / LIVE GPS</span></div><div class="world-help"><b>OWN THE STREETS.</b><span>WASD · Shift run/boost · Space jump · F vehicle · E interact</span><button data-action="reset">Back to road</button></div><div class="world-speed"><strong id="world-speed">0</strong><small>MPH</small><div class="boost-track"><i id="world-boost"></i></div><span>NITRO</span></div></div>
      <div class="world-extra"><button data-action="vehicle">F · EXIT CAR</button><button data-action="jump" hidden>SPACE · JUMP</button><button data-action="punch" data-drive="punch" hidden>J · PUNCH</button><button data-drive="block" hidden>HOLD Q · BLOCK</button><button data-action="fire" hidden>R · FIRE</button><span class="world-action-status"></span><span class="world-kit"></span></div>
      <button class="world-interact" data-action="interact" hidden></button><div class="world-toast" role="status"></div>
      <div class="world-touch"><div><button data-drive="left" aria-label="Steer left">◀</button><button data-drive="right" aria-label="Steer right">▶</button></div><div><button data-drive="boost">N₂O</button><button data-drive="brake">REV</button><button data-drive="gas">GAS</button></div></div>
      <div class="world-modal" hidden></div>`;
    this.map = root.querySelector('.world-radar canvas')!;
    this.renderer = new THREE.WebGLRenderer({ canvas: root.querySelector('.world-canvas')!, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene.background = new THREE.Color('#aaa4bf');
    this.scene.fog = new THREE.Fog('#aaa4bf', 280, 780);
    this.scene.add(new THREE.HemisphereLight('#c9dcff', '#624440', 2.7));
    const sun = new THREE.DirectionalLight('#ffd0a0', 3.8); sun.position.set(-160, 230, 100); this.scene.add(sun);
    this.makeCity();
    this.car = this.makeCar('#ffb52e', true); this.car.position.copy(this.lastSafe); this.scene.add(this.car);
    for (let i = 0; i < 3; i++) { const r = this.makeCar('#202c46'); this.rivals.push(r); this.scene.add(r); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8, .3, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffc13c' })); ring.rotation.x = Math.PI / 2;
    this.beacon.add(ring); this.beacon.add(this.box(1, 22, 1, '#ffc13c', 0, 11, 0)); this.scene.add(this.beacon);
    this.restore(); this.makeExpansion(); this.makeIsland(); this.actions=new StreetAction(this.scene,s=>this.notify(s),(id,label,count,rate)=>this.streetPrize(id,label,count,rate));this.sign('BOARDWALK HURDLES · E TO START','#ffdc85',-60,10,280,30);this.sign('CONTAINER CLIMB · E TO START','#abdcff',60,10,280,30);this.sign('STREET SPARRING · E TO START','#f7ba98',180,10,315,30); this.makeLoot(); this.bind(); this.resize();
    this.camera.position.set(0, 28, 18);
    if(this.stage==='paid'){this.target=HOME;}else{this.brief();} this.renderer.setAnimationLoop(() => this.tick());
  }

  private box(w: number, h: number, d: number, color: string, x: number, y: number, z: number) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .78 })); m.position.set(x, y, z); return m;
  }
  private sign(text: string, color: string, x: number, y: number, z: number, scale = 15) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#111e2c'; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = color; ctx.font = 'bold 45px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 80);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })); sprite.position.set(x, y, z); sprite.scale.set(scale, scale / 4, 1); this.scene.add(sprite);
  }
  private makeCity() {
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800, 90, 90), new THREE.MeshStandardMaterial({ color: '#197fa0', metalness: .45, roughness: .24 }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = -2; this.scene.add(this.water);
    const foamMaterial=new THREE.MeshBasicMaterial({color:'#a5e5e9',transparent:true,opacity:.38});
    const foam=new THREE.InstancedMesh(new THREE.BoxGeometry(10,.05,.5),foamMaterial,1800);const matrix=new THREE.Matrix4();let count=0;
    for(let x=-1000;x<1200;x+=44)for(let z=-850;z<850;z+=55){if((Math.abs(x)<490&&Math.abs(z)<490)||(x>610&&x<910&&Math.abs(z)<210))continue;matrix.makeTranslation(x+Math.sin(z)*10,-.7,z);foam.setMatrixAt(count++,matrix);}
    foam.count=count;foam.computeBoundingSphere();this.ripples.add(foam);this.scene.add(this.ripples);
    this.scene.add(this.box(940, 5, 940, '#a9a692', 0, -2.6, 0));
    this.scene.add(this.box(924, .3, 924, '#6b7976', 0, -.12, 0));
    this.scene.add(this.box(620, .2, 620, '#555e63', 0, .01, 0));
    for (const r of ROADS) {
      this.scene.add(this.box(26, .12, 900, '#242c38', r, .15, 0));
      this.scene.add(this.box(900, .12, 26, '#242c38', 0, .16, r));
      for (let t = -440; t < 450; t += 20) {
        if (ROADS.some(v => Math.abs(v - t) < 18)) continue;
        this.scene.add(this.box(.3, .1, 7, '#e5ba67', r, .24, t), this.box(7, .1, .3, '#e5ba67', t, .24, r));
      }
    }
    const colors = ['#9c8c87', '#728996', '#b29f87', '#7b818e', '#a5a7a1'];
    for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 4; iz++) {
      const cx = -180 + ix * 120, cz = -180 + iz * 120;
      this.scene.add(this.box(90, .5, 90, '#a7a39b', cx, .25, cz));
      for (let j = 0; j < 4; j++) {
        const x = cx + (j % 2 ? 23 : -23), z = cz + (j > 1 ? 23 : -23);
        const h = 16 + ((ix * 13 + iz * 7 + j * 3) % 7) * 6;
        this.blocks.push({ x, z, w: 38, d: 38 });
        this.scene.add(this.box(38, h, 38, colors[(ix + iz + j) % colors.length], x, h / 2 + .5, z));
        this.scene.add(this.box(40, 1.2, 40, '#414d5c', x, h + 1, z));
        this.scene.add(this.box(9, 3, 8, '#697480', x + 8, h + 2.5, z));
        for (let floor = 5; floor < h - 2; floor += 7) for (let k = -12; k <= 12; k += 8) {
          const color = (floor + k + j) % 3 ? '#e6c990' : '#384956';
          this.scene.add(this.box(3.7, 3.2, .15, color, x + k, floor, z + 19.1));
          this.scene.add(this.box(.15, 3.2, 3.7, color, x + 19.1, floor, z + k));
          this.scene.add(this.box(3.7, 3.2, .15, color, x + k, floor, z - 19.1));
          this.scene.add(this.box(.15, 3.2, 3.7, color, x - 19.1, floor, z + k));
        }
      }
      for (let k = -1; k <= 1; k += 2) {
        this.scene.add(this.box(.5, 9, .5, '#35414b', cx + 43, 4.5, cz + k * 43));
        this.scene.add(this.box(3, .5, 1.8, '#ffdda0', cx + 42, 9, cz + k * 43));
        const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), new THREE.MeshStandardMaterial({ color: '#547a63' })); tree.position.set(cx - 43, 6, cz + k * 43); this.scene.add(tree);
        this.scene.add(this.box(1, 4, 1, '#6c5945', cx - 43, 2, cz + k * 43));
      }
    }
    this.sign('BLACKLINE IMPORTS', '#ffc13c', 147, 14, -120, 28);
    this.sign('THE HIDEOUT', '#a7f6d3', -145, 14, 120, 24);
    this.sign('MIDNIGHT RECORDS', '#faa3bd', -60, 34, -20, 30);
    this.sign('STERLING CITY', '#f7dec1', 60, 62, 145, 42);
    for (let i = 0; i < 18; i++) { const x = -330 + i * 40, h = 20 + (i % 5) * 22; this.scene.add(this.box(22, h, 26, '#758494', x, h / 2, -315)); this.blocks.push({x,z:-315,w:22,d:26}); }
    // Batch the static architecture so thousands of windows cost only a few draw calls.
    const batches = new Map<string, THREE.Mesh[]>();
    for (const object of [...this.scene.children]) {
      if (!(object instanceof THREE.Mesh) || !(object.geometry instanceof THREE.BoxGeometry)) continue;
      const color = (object.material as THREE.MeshStandardMaterial).color.getHexString();
      const batch = batches.get(color) ?? []; batch.push(object); batches.set(color, batch);
    }
    for (const batch of batches.values()) {
      const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), batch[0].material, batch.length);
      batch.forEach((mesh, i) => { const p = (mesh.geometry as THREE.BoxGeometry).parameters; mesh.scale.set(p.width, p.height, p.depth); mesh.updateMatrix(); instanced.setMatrixAt(i, mesh.matrix); this.scene.remove(mesh); mesh.geometry.dispose(); });
      instanced.computeBoundingSphere(); this.scene.add(instanced);
    }
  }
  private makeCar(color: string, hero = false) {
    const g=carModel(color);if(hero)g.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry instanceof THREE.CylinderGeometry)this.wheels.push(o);});return g;
  }
  private makeLoot() {
    const points = [[-120, -65], [65, 0], [240, 55], [-55, 120], [0, -200], [-240, -55], [180, 240], [-175, -120]];
    points.forEach(([x, z], i) => {
      const mesh = new THREE.Group(); mesh.position.set(x, 0, z);
      mesh.add(this.box(2.8, 2.2, 2.8, '#bf8f44', 0, 1.1, 0), this.box(3, .3, 3, '#fff1b0', 0, 2.2, 0));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(3, .12, 6, 24), new THREE.MeshBasicMaterial({ color: '#a7f6d3' })); halo.rotation.x = Math.PI / 2; halo.position.y = .3; mesh.add(halo);
      const claimed = this.recovered.includes(i); mesh.visible = !claimed; this.scene.add(mesh); this.loot.push({ mesh, claimed });
    });
  }
  private get actor() { return this.onFoot ? this.avatar : this.car; }
  private makeExpansion() {
    this.currentRide = { mesh: this.car, name: 'Gold GT', max: 55, acceleration: 32, kind: 'car' }; this.rides.push(this.currentRide);
    const specs: [string, string, Ride['kind'], number, number, number, number][] = [
      ['Vortex RS', '#e86457', 'car', 85, 43, 9, 85], ['Old Town Sedan', '#96acb9', 'car', 42, 24, -9, 10],
      ['Hauler', '#ddd2b0', 'truck', 37, 18, 130, -65], ['Night Runner', '#a185d4', 'car', 73, 38, -130, -25],
      ['Trail 250', '#f2a53f', 'bike', 67, 46, 290, 180], ['Ridge Quad', '#a1c874', 'quad', 51, 37, 290, 195],
      ['Trail 450', '#ec695c', 'bike', 80, 50, 380, 190], ['Cargo Van', '#d2d9dd', 'truck', 40, 21, -9, -150],
      ['Beach Buggy', '#78c4bc', 'quad', 58, 40, -350, 120], ['Dock Pickup', '#6276a3', 'truck', 46, 23, 120, 350],
    ];
    for (const [name, color, kind, max, acceleration, x, z] of specs) {
      const mesh=kind==='bike'||kind==='quad'?bikeModel(color,kind==='quad'):carModel(color,kind==='truck'?'truck':name==='Night Runner'?'muscle':name==='Old Town Sedan'?'sedan':'sport');
      mesh.position.set(x, 0, z); this.scene.add(mesh); this.rides.push({ mesh, name, max, acceleration, kind });
    }
    this.avatar.add(this.box(.95, 1.2, .55, '#d79b35', 0, 1.65, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 12, 10), new THREE.MeshStandardMaterial({ color: '#b57d58' })); head.position.y = 2.6; this.avatar.add(head);
    this.avatar.add(this.box(.8, .2, .75, '#273647', 0, 2.9, .1));
    for (const x of [-.26, .26]) { const leg = this.box(.35, .95, .4, '#27374b', x, .55, 0); this.legs.push(leg); this.avatar.add(leg); }
    this.avatar.add(this.box(.25, .95, .3, '#d79b35', -.65, 1.6, 0), this.box(.25, .95, .3, '#d79b35', .65, 1.6, 0));
    this.gunModel = this.box(.2, .25, .7, '#263039', .66, 1.3, .5); this.avatar.add(this.gunModel); this.avatar.visible = false; this.scene.add(this.avatar);
    this.scene.add(this.box(23, .14, 900, '#242c38', 360, .13, 0));
    this.scene.add(this.box(23, .14, 900, '#242c38', -360, .13, 0));
    this.scene.add(this.box(900, .14, 23, '#242c38', 0, .13, -360));
    this.scene.add(this.box(900, .14, 23, '#242c38', 0, .13, 440));
    this.scene.add(this.box(150, .15, 125, '#a29175', 370, .25, -45));
    this.scene.add(this.box(150, 14, 3, '#4a5359', 370, 7, -106)); this.blocks.push({ x: 370, z: -106, w: 150, d: 3 });
    this.sign('IRON SIGHTS / RANGE', '#ffdc98', 350, 13, 0, 35);
    this.scene.add(this.box(6, 2, 3, '#b9976c', 345, 1, 0));
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Group(); t.position.set(318 + i * 25, 0, -78 - (i % 2) * 10);
      t.add(this.box(.4, 5, .4, '#555b5e', 0, 2.5, 0));
      for (const [radius, color, z] of [[3, '#f1e5c9', 0], [2, '#c8614f', .06], [1, '#eee5d2', .12], [.4, '#293849', .18]] as [number, string, number][]) {
        const disk = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })); disk.position.set(0, 5, z); t.add(disk);
      }
      this.targets.push(t); this.scene.add(t);
    }
    this.scene.add(this.box(140, .2, 260, '#b49770', 380, .15, 310));
    this.sign('AIRTIME / STUNT PARK', '#abf0d0', 313, 14, 180, 38);
    for (const ramp of this.ramps) {
      const mesh=rampModel();mesh.position.set(ramp.x,0,ramp.z);this.scene.add(mesh);
      this.scene.add(this.box(19, .2, 2, '#ffd16a', ramp.x, 7.7, ramp.z + 13));
      for(const side of [-1,1]){this.scene.add(this.box(.35,18,.35,'#e3d9b8',ramp.x+side*12,9,ramp.z+40));const flag=this.box(5,3,.2,side<0?'#df7957':'#f3d07c',ramp.x+side*10,16,ramp.z+40);this.scene.add(flag);}

    }
    for (let t = -430; t <= 430; t += 18) {
      for (const edge of [-465, 465]) { this.scene.add(this.box(.5, 2, .5, '#e5e4cb', edge, 1, t), this.box(.5, 2, .5, '#e5e4cb', t, 1, edge)); }
    }
    for (let i = 0; i < 6; i++) { const z = -220 + i * 65; this.scene.add(this.box(26,9,22,'#c6b697',-410,4.5,z),this.box(29,1,25,'#6e6561',-410,9.5,z)); this.blocks.push({x:-410,z,w:26,d:22}); }
    this.sign('BOARDWALK', '#d5f4ed', -360, 10, 370, 24);
  }
  private jump(){
    if(!this.onFoot||this.overlay)return;
    const floor=this.actions?.surface(this.avatar.position.x,this.avatar.position.z,this.avatar.position.y)??0;
    if(this.avatar.position.y>floor+.15||Math.abs(this.footVelocity)>.1)return;
    this.footVelocity=11.5;sfxBoost();
  }
  private punch(){if(!this.onFoot||this.overlay)return;this.actions?.punch(this.avatar.position,this.yaw);}
  private vehicleContacts(old:THREE.Vector3){
    const mover=this.actor;if(mover.position.y>3)return;
    const radius=this.onFoot?.65:this.currentRide?.kind==='truck'?5:3.8;
    const traffic=[...(this.rides??[]).filter(r=>r.mesh!==mover).map(r=>({mesh:r.mesh,radius:r.kind==='truck'?5:r.kind==='bike'?2:3.8})),...this.rivals.filter(r=>r.visible&&this.stage==='escape').map(mesh=>({mesh,radius:3.8}))];
    let contact:{mesh:THREE.Group;radius:number;t:number}|undefined;
    for(const other of traffic){if(Math.abs(other.mesh.position.y-mover.position.y)>3)continue;const t=sweptContact(old,mover.position,other.mesh.position,radius+other.radius);if(t!==null&&(!contact||t<contact.t))contact={...other,t};}
    if(!contact)return;
    const impact=Math.abs(this.speed);mover.position.lerpVectors(old,mover.position,Math.max(0,contact.t-.02));
    if(this.onFoot){this.speed=0;return;}
    this.speed*=-.32;
    if(impact>8){const push=contact.mesh.position.clone().sub(mover.position);push.y=0;push.normalize().multiplyScalar(Math.min(impact*.06,3));const candidate=contact.mesh.position.clone().add(push);
      if(this.land(candidate.x,candidate.z)&&!this.blocks.some(b=>Math.abs(candidate.x-b.x)<b.w/2+contact!.radius&&Math.abs(candidate.z-b.z)<b.d/2+contact!.radius)&&!traffic.some(t=>t.mesh!==contact!.mesh&&t.mesh.position.distanceTo(candidate)<t.radius+contact!.radius)){contact.mesh.position.copy(candidate);contact.mesh.rotation.y+=.15*Math.sign(this.speed);}
      if(performance.now()>(this.crashUntil??0)){this.crashUntil=performance.now()+650;this.boost=Math.max(0,this.boost-10);sfxMiss();this.notify('CRASH! Impact slowed you down. Reverse and steer clear.');this.root.classList?.add('world-crash');if(typeof window!=='undefined')window.setTimeout(()=>this.root.classList?.remove('world-crash'),220);}
    }
  }
  private streetPrize(id:string,label:string,count:number,rate:number){
    if(this.streetRewards.includes(id)){this.notify(label+' cleared again! First-clear sponsor reward already collected.');return;}
    this.speed=0;this.ask(label+' / SPONSOR','CLAIM YOUR BONUS.',`${count} completed challenges earn $${rate} each. What is your total bonus?`,count*rate,`${count} × ${rate}`,'Multiply the completed challenges by the sponsor rate.','Multiplication / street activities',()=>{if(this.streetRewards.includes(id))return;this.streetRewards.push(id);const p=schoolClient.getProgress();p.cash+=count*rate;schoolClient.saveProgress(p);this.save();this.notify(`Sponsor paid $${count*rate}. Challenge complete!`);});
  }
  private shuttle(x:number,z:number,name:string){
    if(this.stage==='escape'){this.notify('Finish the getaway before taking a shuttle.');return;}
    if(this.actions){this.actions.course=-1;this.actions.fighting=false;}
    this.closeModal();this.onFoot=true;this.avatar.position.set(x,0,z);this.avatar.visible=true;this.yaw=name==='Marina dock'?Math.PI/2:0;this.speed=0;this.footVelocity=0;this.verticalSpeed=0;this.navigation=null;this.camera.position.set(x-Math.sin(this.yaw)*14,9,z-Math.cos(this.yaw)*14);this.camera.lookAt(x+Math.sin(this.yaw)*8,2,z+Math.cos(this.yaw)*8);this.notify(name==='Marina dock'?'Boats are beside this dock. F to hotwire. Cross east to the island; F at its dock to get off.':`${name}: press E at the sign to start.`);
  }
  private marinaGuide(){
    this.modal(`<span class="eyebrow">THE WATERFRONT / EAST SIDE</span><h1>THE ISLAND<br><em>IS OUT THERE.</em></h1><div class="waterfront-diagram"><span>CITY</span><b>WOODEN DOCK<br>BOAT + JET SKI</b><i>→ WATER →</i><b>ISLAND DOCK<br>HOUSE + GARAGE</b></div><p>Follow the road east past the Hideout to the wooden marina dock. Leave your car with F, then walk beside the orange jet ski or white speedboat and press F. Drive east across the channel; pull alongside the island dock and press F to disembark.</p><button class="world-primary" data-action="shuttle-marina">TAKE THE MARINA SHUTTLE →</button><button data-action="nav-6">DRIVE THERE · SET GPS</button><button data-action="resume">BACK TO THE CITY</button>`);
  }

  private vehicle() {
    if (this.overlay) return;
    if (!this.onFoot) {
      if (this.isWaterRide()) {
        const docks=[new THREE.Vector3(630,0,120),new THREE.Vector3(490,0,120),...(this.dock?[new THREE.Vector3(835,0,185)]:[])];const dock=docks.sort((a,b)=>a.distanceTo(this.car.position)-b.distanceTo(this.car.position))[0];
        if (this.car.position.distanceTo(dock) > 38) { this.notify('Pull up to a wooden dock to get off safely.'); return; }
        this.avatar.position.copy(dock); this.avatar.visible = true; this.onFoot = true; this.speed = 0; this.notify('Back on foot. E at the island sign opens the builder.'); return;
      }
      const offset = new THREE.Vector3(Math.cos(this.yaw) * 5, 0, -Math.sin(this.yaw) * 5);
      if (this.car.position.y > 1) { this.notify('Land before getting out.'); return; }
      const pos = [offset, offset.clone().negate(), new THREE.Vector3(0,0,-7), new THREE.Vector3(0,0,7)].map(v => this.car.position.clone().add(v)).find(p => this.land(p.x,p.z) && !this.blocks.some(b => Math.abs(p.x-b.x)<b.w/2+1 && Math.abs(p.z-b.z)<b.d/2+1));
      if (!pos) { this.notify('Move into an open area to get out.'); return; }
      pos.y = 0; this.avatar.position.copy(pos); this.avatar.rotation.y = this.yaw; this.avatar.visible = true; this.onFoot = true; this.speed = 0; this.verticalSpeed = 0; this.car.position.y = 0;
      this.notify('On foot · WASD to move · Shift to sprint · F near a vehicle to hotwire'); return;
    }
    const ride = this.nearRide(); if (!ride) { this.notify('Get closer to a vehicle, then press F.'); return; }
    const enter = () => { this.car = ride.mesh; this.currentRide = ride; this.yaw = ride.mesh.rotation.y; this.onFoot = false; this.avatar.visible = false; this.speed = 0; ride.mesh.userData.unlocked = true; this.save(); this.notify(`${ride.name} · top speed ${Math.round(ride.max * 1.4)} mph`); };
    if (ride === this.currentRide || this.owned.includes(ride.name) || ride.mesh.userData.unlocked) { enter(); return; }
    const a = ride.max >= 70 ? 14 : ride.max >= 50 ? 8 : 4, b = ride.max >= 70 ? 12 : 6;
    this.ask(`HOTWIRE / ${ride.name.toUpperCase()}`, 'BRIDGE THE CIRCUIT.', `The ignition has ${a} banks of ${b} volts. Set the bypass to the total voltage.`, a * b, `${a} × ${b}`, `Add ${b} volts ${a} times, or split ${a} into smaller groups.`, 'Multiplication / hotwiring', enter);
  }
  private nearRide() { return this.rides.filter(r => r.mesh.position.distanceTo(this.avatar.position) < 22).sort((a, b) => a.mesh.position.distanceTo(this.avatar.position) - b.mesh.position.distanceTo(this.avatar.position))[0]; }
  private isWaterRide() { return !this.onFoot && ['boat', 'jetski'].includes(this.currentRide?.kind ?? ''); }
  private land(x: number, z: number) { return (Math.abs(x) < 461 && Math.abs(z) < 461) || (x > 640 && x < 880 && Math.abs(z) < 145) || (x > 438 && x < 513 && Math.abs(z - 120) < 10) || (x > 615 && x < 690 && Math.abs(z - 120) < 10) || (this.dock && Math.abs(x-835)<9 && z>130 && z<200); }
  private makeIsland() {
    this.scene.add(this.box(250, 6, 310, '#d8c599', 760, -3.2, 0), this.box(235, .2, 290, '#829875', 760, 0, 0));
    for (const x of [475, 650]) { this.scene.add(this.box(75, .8, 18, '#9a7c56', x, .1, 120)); for (let z = 114; z < 130; z += 10) for (let dx = -30; dx <= 30; dx += 30) this.scene.add(this.box(1, 6, 1, '#726044', x + dx, -1, z)); }
    this.sign('ISLAND FERRY / TAKE A RIDE', '#b6ece6', 435, 12, 120, 37);
    this.sign('YOUR ISLAND / BUILDER', '#ffdfa1', 675, 13, 105, 36);
    this.sign('REDLINE / TUNE SHOP', '#ffa57b', -398, 17, 0, 28);
    this.sign('CHROMA / BODY SHOP', '#c9a6ff', -398, 17, -120, 28);
    this.scene.add(this.box(28, 12, 25, '#655a50', -400, 6, 0), this.box(28, 12, 25, '#67637b', -400, 6, -120));
    this.blocks.push({ x: -400, z: 0, w: 28, d: 25 }, { x: -400, z: -120, w: 28, d: 25 });
    for (const [name, kind, x, z, color] of [['Wave Runner', 'jetski', 505, 134, '#e96143'], ['Harbor V8', 'boat', 505, 144, '#eee0c1']] as const) {
      const mesh = watercraftModel(color,kind==='jetski');
      mesh.rotation.y = Math.PI / 2; mesh.position.set(x, 0, z); this.scene.add(mesh); this.rides.push({ mesh, name, kind, max: kind === 'boat' ? 63 : 76, acceleration: kind === 'boat' ? 25 : 40 });
    }
    for (const ride of this.rides) this.applyRideUpgrades(ride);
    this.scene.add(this.estate); this.buildEstate();
  }
  private buildEstate() {
    for(const child of this.estate.children){if(child.userData.display)continue;child.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
    this.estate.clear();
    if (this.house) {
      this.estate.add(this.box(44, 13, 32, '#e5d9bd', 760, 6.5, 0), this.box(49, 1.5, 37, '#394e57', 760, 14, 0));
      this.estate.add(this.box(24, 7, .3, '#477d8c', 760, 6.5, 16.2), this.box(8, .3, 16, '#d4c4a4', 760, .1, 24));
      if (!this.blocks.some(b => b.x === 760 && b.z === 0)) this.blocks.push({ x: 760, z: 0, w: 44, d: 32 });
    } else { this.estate.add(this.box(48, .3, 36, '#bbb198', 760, .1, 0)); if (this.quoted) for (const x of [738,782]) for(const z of [-16,16]) this.estate.add(this.box(1,10,1,'#bd9a67',x,5,z)); }
    if (this.dock) this.estate.add(this.box(18,1,75,'#9a7c56',835,0,165));
    if(this.workshop&&!this.blocks.some(b=>b.x===830&&b.z===75))this.blocks.push({x:830,z:75,w:25,d:22});
    if (this.workshop) this.estate.add(this.box(25,10,22,'#bda88c',830,5,75),this.box(28,1,25,'#425961',830,10.5,75));
    if (this.landscaping) for (const x of [690,855]) for (const z of [-110,-40,40,110]) { const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(5,1),new THREE.MeshStandardMaterial({color:'#4f8560'})); tree.position.set(x,7,z); this.estate.add(tree,this.box(1,5,1,'#806346',x,2.5,z)); }
    if (this.pool) { this.estate.add(this.box(30, .5, 20, '#e9deca', 812, .2, -18), this.box(26, .2, 16, '#279abc', 812, .55, -18)); }
    if (this.garage) {
      const width = 18 + this.spaces * 10;
      this.estate.add(this.box(width, .5, 27, '#747d7a', 732, .2, -72), this.box(width, .8, 27, '#4c6570', 732, 11, -72), this.box(width, 11, 1, '#b7b5a6', 732, 5.5, -85));
      for (const x of [732 - width / 2, 732 + width / 2]) this.estate.add(this.box(1, 11, 27, '#b7b5a6', x, 5.5, -72));
      for (let i = 0; i < this.spaces; i++) { const x = 732 - width / 2 + 8 + i * 10; this.estate.add(this.box(.25, .1, 20, '#ffe1a0', x - 4, .55, -72)); const ownedRide = this.rides.find(r => r.name === this.owned[i] && !['boat', 'jetski'].includes(r.kind)); if (ownedRide) { const display = ownedRide.mesh.clone(); display.userData.display=true; display.position.set(x, .5, -72); display.rotation.y = 0; this.estate.add(display); } }
    }
  }
  private builder() {
    const cash = schoolClient.getProgress().cash;
    this.modal(`<span class="eyebrow">ISLAND ESTATE / BUILDER</span><h1>BUILD YOUR<br><em>OWN PLACE.</em></h1><p>Bankroll: $${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Earn cash on city jobs, then negotiate each upgrade.</p><div class="shop-grid"><button data-action="build-house" ${this.house ? 'disabled' : ''}>${this.house ? 'HOUSE BUILT' : this.quoted ? 'BUILD HOUSE · $5,405.40' : 'NEGOTIATE HOUSE · BRICK QUOTE'}</button><button data-action="build-pool" ${!this.house || this.pool ? 'disabled' : ''}>${this.pool ? 'POOL BUILT' : 'POOL · $1,200'}</button><button data-action="build-garage" ${!this.house || this.garage ? 'disabled' : ''}>${this.garage ? 'GARAGE BUILT' : 'GARAGE · $1,500'}</button><button data-action="build-space" ${!this.garage || this.spaces >= 5 ? 'disabled' : ''}>GARAGE SPACE ${this.spaces + 1} · $500</button><button data-action="build-dock" ${!this.house || this.dock ? 'disabled' : ''}>PRIVATE DOCK · $900</button><button data-action="build-workshop" ${!this.house || this.workshop ? 'disabled' : ''}>WORKSHOP · $1,800</button><button data-action="build-landscaping" ${!this.house || this.landscaping ? 'disabled' : ''}>LANDSCAPING · $600</button></div><p>The garage includes one bay. Expand to five bays and register vehicles at the city tune shop.</p><button data-action="collection">OPEN GARAGE COLLECTION</button><button class="world-primary" data-action="resume">BACK TO THE ISLAND →</button>`);
  }
  private buyBuild(type: string) {
    if (type === 'house' && !this.house) {
      if (!this.quoted) {
        this.ask('BUILDER / BRICK QUOTE', 'CHECK HIS PRICE.', 'The builder wants $14 per brick. You need 429 bricks. What is the full charge?', 6006, '429 × 14', '429 × 10 = 4,290. 429 × 4 = 1,716. Add both amounts.', 'Multiplication / construction', () => {
          this.ask('BUILDER / NEGOTIATION', 'CUT A BETTER DEAL.', 'The quote is $6,006. You negotiate 10% off. How many dollars will you save?', 600.6, '6006 × 0.10', 'Ten percent is one tenth. Divide $6,006 by 10.', 'Percentages / discounts', () => { this.quoted = true; this.save(); this.buildEstate(); this.builder(); });
        }); return;
      }
      if (this.spend(5405.4)) { this.house = true; this.save(); this.buildEstate(); this.builder(); } return;
    }
    const offers: Record<string, { cost: number; question: string; answer: number; text: string; hint: string; done: () => void }> = {
      dock: { cost:900,question:'18 × 50',answer:900,text:'18 dock planks at $50 each. What is the total?',hint:'Double 9 × 50.',done:()=>{this.dock=true;} },
      workshop: { cost:1800,question:'24 × 75',answer:1800,text:'24 workshop panels at $75 each. What is the total?',hint:'20 × 75 plus 4 × 75.',done:()=>{this.workshop=true;} },
      landscaping: { cost:600,question:'8 × 75',answer:600,text:'Eight mature trees cost $75 each. What is the total?',hint:'Four trees cost $300. Double it.',done:()=>{this.landscaping=true;} },
      pool: { cost: 1200, question: '12 × 100', answer: 1200, text: 'The pool needs 12 sections of tile at $100 each. What is the total?', hint: 'Multiply 12 by 100.', done: () => { this.pool = true; } },
      garage: { cost: 1500, question: '30 × 50', answer: 1500, text: 'The garage needs 30 panels at $50 per panel. What is the bill?', hint: '3 × 5 is 15. Now account for both tens.', done: () => { this.garage = true; this.spaces = Math.max(1,this.spaces); } },
      space: { cost: 500, question: '125 × 4', answer: 500, text: 'One marked parking space needs 4 floor sections at $125 each. What will it cost?', hint: 'Two sections are $250. Double that.', done: () => { this.spaces++; } },
    };
    const offer = offers[type]; if (!offer || !this.house || (type === 'dock' && this.dock) || (type === 'workshop' && this.workshop) || (type === 'landscaping' && this.landscaping) || (type === 'pool' && this.pool) || (type === 'garage' && this.garage) || (type === 'space' && (!this.garage || this.spaces >= 5))) return;
    this.ask('BUILDER / UPGRADE', 'PRICE THE ADDITION.', offer.text, offer.answer, offer.question, offer.hint, 'Multiplication / home upgrades', () => { if (this.spend(offer.cost)) { offer.done(); this.save(); this.buildEstate(); } this.builder(); });
  }
  private spend(amount: number) { const p = schoolClient.getProgress(); if (p.cash + .001 < amount) { this.notify(`Need $${(amount - p.cash).toFixed(2)} more. Complete city jobs and come back.`); return false; } p.cash = Math.round((p.cash - amount) * 100) / 100; schoolClient.saveProgress(p); sfxWin(); return true; }
  private ridePrice(ride: Ride) { return Math.round(ride.max * 30 / 100) * 100; }
  private collection() {
    const rides=this.rides.filter(r=>this.owned.includes(r.name));
    this.modal(`<span class="eyebrow">YOUR GARAGE / COLLECTION</span><h1>KEEP THE KEYS.</h1><p>${this.garage ? this.spaces : 1} bays · ${rides.length} registered vehicles. Collect at the tune shop or island builder. Registration survives reloads.</p><div class="shop-grid">${rides.map(r=>`<button data-action="retrieve-${this.rides.indexOf(r)}">COLLECT ${r.name}</button>`).join('')}</div><button data-action="resume">BACK TO THE CITY</button>`);
  }
  private registerRide() {
    const ride=this.currentRide;if(!ride || this.owned.includes(ride.name))return;
    if(this.owned.length >= (this.garage ? this.spaces : 1)){this.notify('Garage full. Build or expand your island garage first.');return;}
    const cost=this.ridePrice(ride);
    this.ask('GARAGE / VEHICLE TITLE','KEEP THIS RIDE.',`Buy and register ${ride.name}: four payments of $${cost/4}. What is the full price?`,cost,`4 × ${cost/4}`,'Multiply one payment by four.','Multiplication / vehicle ownership',()=>{if(this.owned.includes(ride.name))return;if(this.spend(cost)){this.owned.push(ride.name);this.save();this.buildEstate();this.notify(ride.name+' registered in your garage.');}});
  }
  private retrieveRide(index:number) {
    const ride=this.rides[index];if(!ride || !this.owned.includes(ride.name))return;
    const island=this.actor.position.x>600;
    if(!island && Math.hypot(this.actor.position.x+360,this.actor.position.z)>35 && Math.hypot(this.actor.position.x+360,this.actor.position.z+120)>35){this.notify('Visit a shop or the island builder to collect a vehicle.');return;}
    ride.mesh.position.set(island?700:-350,0,island?95:35);ride.mesh.rotation.set(0,0,0);this.car=ride.mesh;this.currentRide=ride;this.onFoot=false;this.avatar.visible=false;this.speed=0;this.yaw=0;this.closeModal();this.notify(ride.name+' delivered.');
  }
  private shop(body: boolean) {
    if (!this.currentRide || ['boat', 'jetski'].includes(this.currentRide.kind)) { this.notify('Bring a street vehicle to the shop.'); return; }
    if (this.onFoot || this.car.position.distanceTo(this.actor.position)>20) { this.notify('Drive the vehicle into the shop to upgrade it.'); return; }
    const u = this.upgrades[this.currentRide.name] ?? {};
    this.modal(`<span class="eyebrow">${body ? 'CHROMA / BODY SHOP' : 'REDLINE / TUNE SHOP'}</span><h1>${body ? 'MAKE IT YOURS.' : 'MORE HORSEPOWER.'}</h1><p>${this.currentRide.name} · $${schoolClient.getProgress().cash.toLocaleString()} available</p><div class="shop-grid">${body ? `<button data-action="mod-paint">ELECTRIC BLUE · $200</button><button data-action="mod-red">HOT RED · $200</button><button data-action="mod-kit" ${u.kit ? 'disabled' : ''}>${u.kit ? 'BODY KIT INSTALLED' : 'BODY KIT · $600'}</button>` : `<button data-action="mod-engine" ${u.engine ? 'disabled' : ''}>${u.engine ? 'ENGINE INSTALLED' : 'ENGINE UPGRADE · $800'}</button><button data-action="mod-nitro" ${u.nitro ? 'disabled' : ''}>${u.nitro ? 'NITRO INSTALLED' : 'NITRO UPGRADE · $450'}</button><button data-action="mod-tires" ${u.tires ? 'disabled' : ''}>GRIP TIRES · $400</button><button data-action="mod-handling" ${u.handling ? 'disabled' : ''}>HANDLING KIT · $350</button>`}</div><button data-action="register" ${this.owned.includes(this.currentRide.name) ? 'disabled' : ''}>${this.owned.includes(this.currentRide.name) ? 'OWNED VEHICLE' : 'BUY & REGISTER · $' + this.ridePrice(this.currentRide)}</button><button data-action="collection">GARAGE COLLECTION</button><button class="world-primary" data-action="resume">BACK TO THE STREET →</button>`);
  }
  private buyMod(type: string) {
    const ride = this.currentRide; if (!ride) return; const u = this.upgrades[ride.name] ?? {};
    if ((type==='paint'&&u.paint==='#35a6eb')||(type==='red'&&u.paint==='#e94c43'))return;
    if ((type === 'engine' && u.engine) || (type === 'nitro' && u.nitro) || (type === 'kit' && u.kit) || (type === 'tires' && u.tires) || (type === 'handling' && u.handling)) return;
    const specs: Record<string, [number, number, number, string]> = { tires:[400,4,100,'Four grip tires at $100 each'], handling:[350,7,50,'Seven steering parts at $50 each'], engine: [800, 8, 100, 'Eight engine parts at $100 each'], nitro: [450, 9, 50, 'Nine nitro components at $50 each'], kit: [600, 6, 100, 'Six body panels at $100 each'], paint: [200, 4, 50, 'Four cans of blue paint at $50 each'], red: [200, 4, 50, 'Four cans of red paint at $50 each'] };
    const item = specs[type]; if (!item) return;
    this.ask('WORKSHOP / PARTS QUOTE', 'CHECK THE INVOICE.', `${item[3]}. What is the total price?`, item[0], `${item[1]} × ${item[2]}`, `Multiply ${item[1]} by ${item[2]}.`, 'Multiplication / vehicle upgrades', () => {
      if (!this.spend(item[0])) return;
      if (type === 'tires') u.tires=true; if(type === 'handling') u.handling=true; if (type === 'engine') u.engine = true; if (type === 'nitro') u.nitro = true; if (type === 'kit') u.kit = true; if (type === 'paint' || type === 'red') u.paint = type === 'paint' ? '#35a6eb' : '#e94c43';
      this.upgrades[ride.name] = u; this.applyRideUpgrades(ride); this.save(); this.notify(`${ride.name}: upgrade installed.`);
    });
  }
  private applyRideUpgrades(ride: Ride) {
    const u = this.upgrades[ride.name]; if (!u) return;
    if (u.paint) { const body = (ride.mesh.getObjectByName('paint')??ride.mesh.children[0]) as THREE.Mesh; (body.material as THREE.MeshStandardMaterial).color.set(u.paint); if(ride.kind==='car'||ride.kind==='truck'){const roof=ride.mesh.children[2] as THREE.Mesh;(roof.material as THREE.MeshStandardMaterial).color.set(u.paint);} }
    if (u.kit && !ride.mesh.getObjectByName('bodykit')) { const kit = new THREE.Group(); kit.name = 'bodykit'; kit.add(this.box(4, .25, 1, '#253443', 0, 2.5, -3), this.box(4, .25, 1, '#253443', 0, .5, 3.5)); ride.mesh.add(kit); }
  }
  private ask(kicker: string, title: string, text: string, answer: number, question: string, hint: string, skill: string, done: () => void) {
    this.challenge = { answer, question, hint, skill, done };
    this.modal(`<span class="eyebrow">${kicker}</span><h1>${title}</h1><p class="world-dialogue">${text}</p><form><label for="activity-answer">YOUR ANSWER</label><div class="cargo-input"><input id="activity-answer" type="number" step="any" inputmode="decimal" required autocomplete="off"><button class="world-primary">UNLOCK →</button></div></form><p id="activity-coach" role="status">Take your time. You can retry.</p><button data-action="resume">Not now</button>`);
  }
  private range() {
    if (!this.onFoot) { this.notify('Park here and press F to walk up to the range counter.'); return; }
    if (!this.armed) { this.armed = true; this.save(); this.notify('Range pistol collected. Solve the supply check to get ammunition.'); }
    const boxes = 3 + this.hits % 5;
    this.ask('IRON SIGHTS / AMMO COUNTER', 'STOCK UP.', `The range has ${boxes} boxes with 6 rounds each. How many rounds should the attendant issue?`, boxes * 6, `${boxes} × 6`, `Count in sixes ${boxes} times.`, 'Multiplication / ammunition', () => { this.ammo += boxes * 6; this.save(); this.notify(`+${boxes * 6} rounds. Walk toward the targets, face them, and press R or FIRE.`); });
  }
  private fire() {
    if (!this.onFoot || this.overlay || !this.armed || performance.now() < this.fireCooldown) return;
    if (this.ammo <= 0) { this.notify('Out of ammo. Return to the range counter for a supply check.'); return; }
    if (this.avatar.position.x < 290 || this.avatar.position.x > 450 || this.avatar.position.z > 35 || this.avatar.position.z < -105) { this.notify('Head to Iron Sights to use the shooting range.'); return; }
    this.ammo--; this.fireCooldown = performance.now() + 250; sfxMiss();
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const target = this.targets.filter(t => t.visible).map(t => ({ t, v: t.position.clone().sub(this.avatar.position) })).filter(({ v }) => v.length() < 125 && forward.dot(v.clone().normalize()) > .97).sort((a, b) => a.v.length() - b.v.length())[0];
    if (!target) this.streak=0;
    if (target) { this.streak=performance.now()-this.lastHit<5000?Math.min(5,this.streak+1):1;this.lastHit=performance.now();this.rangeScore+=100*this.streak;target.t.visible = false; this.hits++; sfxHit(); this.notify(`Target down · ${this.rangeScore} points · ×${this.streak} combo`); window.setTimeout(() => { target.t.visible = true; }, 2400); }
    const end = target ? target.t.position.clone().add(new THREE.Vector3(0, 5, 0)) : this.avatar.position.clone().add(forward.multiplyScalar(110)).add(new THREE.Vector3(0, 1.5, 0));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([this.avatar.position.clone().add(new THREE.Vector3(0, 1.5, 0)), end]), new THREE.LineBasicMaterial({ color: '#ffe5a3' })); this.scene.add(line); window.setTimeout(() => { this.scene.remove(line); line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, 90); this.save();
  }
  private bind() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', e => {
      if (!this.active || (e.target as HTMLElement).matches('input,textarea')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat && e.code === 'Escape') this.pause();
      if (!e.repeat && e.code === 'KeyE') this.interact();
      if (!e.repeat && e.code === 'KeyF') this.vehicle();
      if (!e.repeat && e.code === 'Space' && this.onFoot) this.jump();
      if (!e.repeat && e.code === 'KeyJ') this.punch();
      if (!e.repeat && e.code === 'KeyR') this.fire();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    const clear = () => { this.keys.clear(); this.touches.clear(); };
    window.addEventListener('blur', () => { clear(); if (this.active && !this.overlay) this.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clear(); if (this.active && !this.overlay) this.pause(); } });
    this.root.addEventListener('pointerdown', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-drive]'); if (!b) return;
      e.preventDefault(); b.setPointerCapture(e.pointerId); this.touches.set(e.pointerId, b.dataset.drive!); unlockAudio();
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.root.addEventListener(event, e => this.touches.delete((e as PointerEvent).pointerId));
    this.root.addEventListener('click', e => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (!action) return; unlockAudio();
      if (action === 'start') { this.stage = 'pickup'; this.target = DEPOT; this.closeModal(); }
      if (action === 'interact') this.interact();
      if (action === 'resume') { this.challenge = null; this.closeModal(); }
      if (action === 'vehicle') this.vehicle();
      if (action === 'fire') this.fire();
      if (action==='jump')this.jump();if(action==='punch')this.punch();
      if(action==='marina-guide')this.marinaGuide();
      if(action==='shuttle-marina')this.shuttle(490,120,'Marina dock');
      if(action==='shuttle-course')this.shuttle(-60,280,'Boardwalk hurdles');
      if(action==='shuttle-fight')this.shuttle(180,315,'Street sparring');
      if (action === 'map') this.mapMenu();
      if (action.startsWith('nav-')) { const place = this.destinations()[Number(action.slice(4))]; if (place) { this.navigation = { name: place[0], point: new THREE.Vector3(place[1], 0, place[2]) }; this.closeModal(); this.notify(`GPS set: ${place[0]}`); } }
      if (action.startsWith('build-')) this.buyBuild(action.slice(6));
      if (action === 'collection') this.collection();
      if (action === 'register') this.registerRide();
      if (action.startsWith('retrieve-')) this.retrieveRide(Number(action.slice(9)));
      if (action.startsWith('mod-')) this.buyMod(action.slice(4));
      if (action === 'pause') this.pause();
      if (action === 'parent') this.parent();
      if (action === 'school') { this.hide(); this.onSchool(); }
      if (action === 'reset') { this.footVelocity=0; if (this.isWaterRide()) { this.car.position.set(510,0,140); } else { this.actor.position.copy(this.lastSafe); } this.verticalSpeed = 0; this.speed = 0; this.notify('Back on the street.'); }
      if (action === 'next') { if(this.stage==='paid') this.mission++; this.stage='brief';this.save(); this.brief(); }
      if (action === 'upgrade') this.upgrade();
    });
    this.root.addEventListener('submit', e => { e.preventDefault(); this.answer(); });
  }
  private resize() { this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  private down(...codes: string[]) { return codes.some(c => this.keys.has(c) || [...this.touches.values()].includes(c)); }
  private tick() {
    const dt = Math.min(this.clock.getDelta(), .04); if (!this.active) return;
    const waterPoints = this.water.geometry.attributes.position;
    const time = performance.now() / 1000;
    for (let i = 0; i < waterPoints.count; i++) waterPoints.setZ(i, Math.sin(waterPoints.getX(i) * .025 + time * .7) * .7 + Math.cos(waterPoints.getY(i) * .03 + time) * .5);
    waterPoints.needsUpdate = true; this.water.geometry.computeVertexNormals();
    this.ripples.position.x=Math.sin(time*.35)*3;this.ripples.position.y=Math.sin(time)*.15;
    this.gunModel.visible = this.armed && this.onFoot;
    const seated=!this.onFoot&&['bike','quad','jetski','boat'].includes(this.currentRide?.kind??'');
    this.avatar.visible=this.onFoot||seated;if(seated){this.avatar.position.copy(this.car.position);this.avatar.position.y+=.8;this.avatar.rotation.y=this.yaw;this.legs.forEach(l=>l.rotation.x=-.8);}
    if (!this.overlay) this.drive(dt);
    this.beacon.position.copy(this.navigation?.point ?? this.target); this.beacon.position.y = .4 + Math.sin(performance.now() / 350) * .3;
    const behind = new THREE.Vector3(-Math.sin(this.yaw) * (this.onFoot ? 14 : 21), this.onFoot ? 9 : 12, -Math.cos(this.yaw) * (this.onFoot ? 14 : 21)).add(this.actor.position);
    this.camera.position.lerp(behind, 1 - Math.exp(-4 * dt));
    this.camera.lookAt(this.actor.position.x + Math.sin(this.yaw) * 8, this.actor.position.y + 2, this.actor.position.z + Math.cos(this.yaw) * 8);
    for(const object of this.scene.children)if(object instanceof THREE.Sprite)object.visible=object.position.distanceTo(this.camera.position)>30;
    this.renderer.render(this.scene, this.camera);
    this.hudTime += dt; if (this.hudTime > .08) { this.hudTime = 0; this.hud(); }
  }
  private drive(dt: number) {
    const mover = this.actor;
    const gas = this.down('KeyW', 'ArrowUp', 'gas'), brake = this.down('KeyS', 'ArrowDown', 'brake');
    const drifting = !this.onFoot && this.down('Space');
    const sprint = this.down('ShiftLeft', 'ShiftRight', 'boost');
    const nitro = !this.onFoot && sprint && gas && this.boost > 0;
    const tune = this.upgrades[this.currentRide?.name ?? ''] ?? {};
    this.speed += ((gas ? (this.onFoot ? 45 : (this.currentRide?.acceleration ?? 32) + (tune.engine ? 12 : 0)) : 0) - (brake ? 42 : 0)) * dt;
    this.speed *= Math.exp(-(gas || brake ? .22 : this.onFoot ? 9 : 1.1) * dt);
    if (drifting) this.speed *= Math.exp(-(tune.tires ? .8 : 1.4) * dt);
    const roadMax = (this.currentRide?.max ?? 55) + (this.upgraded ? 10 : 0) + (tune.engine ? 20 : 0);
    const max = this.onFoot ? (sprint ? 16 : 9) : nitro ? roadMax + (tune.nitro ? 45 : 25) : roadMax;
    this.speed = THREE.MathUtils.clamp(this.speed, this.onFoot ? -6 : -20, max);
    if (nitro) { this.speed = Math.min(max, this.speed + 40 * dt); this.boost = Math.max(0, this.boost - (tune.nitro ? 18 : 30) * dt); } else this.boost = Math.min(100, this.boost + 9 * dt);
    const turn = Number(this.down('KeyA', 'ArrowLeft', 'left')) - Number(this.down('KeyD', 'ArrowRight', 'right'));
    this.yaw += turn * (this.onFoot ? 2.5 : Math.sign(this.speed) * Math.min(Math.abs(this.speed) / 12, 1) * (drifting ? 2.5 : this.currentRide?.kind === 'truck' ? 1.05 : this.currentRide?.kind === 'bike' ? 2.05 : this.currentRide?.kind === 'boat' ? .95 : 1.55) * (tune.handling ? 1.3 : 1) * (tune.tires ? 1.12 : 1)) * dt;
    const old = mover.position.clone();
    if(this.onFoot){this.footVelocity-=22*dt;mover.position.y+=this.footVelocity*dt;const floor=this.actions?.surface(mover.position.x,mover.position.z,old.y)??0;if(mover.position.y<=floor&&this.footVelocity<=0){mover.position.y=floor;this.footVelocity=0;}} 
    mover.position.x += Math.sin(this.yaw) * this.speed * dt; mover.position.z += Math.cos(this.yaw) * this.speed * dt;
    const clearance = this.onFoot ? .7 : 2.5;
    const waterRide = this.isWaterRide();
    const docks = (this.dock&&Math.abs(mover.position.x-835)<20&&mover.position.z>155&&mover.position.z<215) || (mover.position.x > 480 && mover.position.x < 530 || mover.position.x > 600 && mover.position.x < 650) && Math.abs(mover.position.z - 120) < 40;
    const invalidSurface = waterRide ? (this.land(mover.position.x, mover.position.z) && !docks) || Math.abs(mover.position.x) > 1150 || Math.abs(mover.position.z) > 1000 : !this.land(mover.position.x, mover.position.z);
    if (invalidSurface || this.actions?.blocks(mover.position.x,mover.position.z,this.onFoot?mover.position.y:0) || this.blocks.some(b => Math.abs(mover.position.x - b.x) < b.w / 2 + clearance && Math.abs(mover.position.z - b.z) < b.d / 2 + clearance)) {
      if(this.onFoot){mover.position.x=old.x;mover.position.z=old.z;}else mover.position.copy(old); this.speed *= this.onFoot ? 0 : -.25;
    }
    this.vehicleContacts(old);
    if (!this.parkPass && mover.position.x > 310 && mover.position.x < 452 && mover.position.z > 165 && mover.position.z < 440) { mover.position.copy(old); this.speed = 0; this.notify('Stunt park admission: stop at the gold gate near the bikes and press E.'); }
    if (!waterRide && this.land(mover.position.x, mover.position.z) && ROADS.some(r => Math.abs(mover.position.x - r) < 8 || Math.abs(mover.position.z - r) < 8)) this.lastSafe.copy(mover.position);
    mover.rotation.y = this.yaw; mover.rotation.z = THREE.MathUtils.lerp(mover.rotation.z, -turn * Math.abs(this.speed) * .0009, .1);
    if (this.onFoot) this.legs.forEach((leg, i) => leg.rotation.x = Math.sin(performance.now() / 90 + i * Math.PI) * Math.min(Math.abs(this.speed) / 15, .65));
    this.jumpCooldown -= dt;
    if (!this.onFoot && this.parkPass && this.jumpCooldown <= 0 && this.speed > 16 && this.ramps.some(r => Math.abs(mover.position.x - r.x) < 10 && Math.abs(mover.position.z - r.z) < 14)) { this.airborneRamp=this.ramps.findIndex(r=>Math.abs(mover.position.x-r.x)<10&&Math.abs(mover.position.z-r.z)<14); this.verticalSpeed = 21; this.jumpCooldown = 3; sfxBoost(); this.notify('AIRTIME!'); }
    if (!this.onFoot && (this.verticalSpeed !== 0 || mover.position.y > 0)) { mover.position.y += this.verticalSpeed * dt; this.verticalSpeed -= 21 * dt; if (mover.position.y <= 0) { mover.position.y = 0; this.verticalSpeed = 0; if(this.airborneRamp>=0&&!this.landedRamps.includes(this.airborneRamp)){this.landedRamps.push(this.airborneRamp);this.save();this.notify('Clean landing! Return to the park gate for your sponsor payout.');}this.airborneRamp=-1; } }
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i]; r.visible = this.stage === 'escape'; if (!r.visible) continue;
      // Chase through intersections: never drive rival cars through buildings.
      const p = r.position, nearest = (v: number) => ROADS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
      const nx = nearest(p.x), nz = nearest(p.z); const atCross = Math.abs(p.x - nx) < 2 && Math.abs(p.z - nz) < 2;
      let dx = 0, dz = 0;
      if (atCross) { if (Math.abs(mover.position.x - p.x) > Math.abs(mover.position.z - p.z)) dx = Math.sign(mover.position.x - p.x); else dz = Math.sign(mover.position.z - p.z); r.userData.dx = dx; r.userData.dz = dz; }
      dx = r.userData.dx ?? 0; dz = r.userData.dz ?? 1;
      if (Math.abs(p.x) > 275 || Math.abs(p.z) > 275) { dx *= -1; dz *= -1; r.userData.dx = dx; r.userData.dz = dz; }
      const previous=p.clone();
      p.x += dx * (23 + i * 2) * dt; p.z += dz * (23 + i * 2) * dt; r.rotation.y = Math.atan2(dx, dz);
      const traffic=this.rides.map(r=>r.mesh).concat(this.rivals.filter(other=>other!==r&&other.visible));
      if(traffic.some(other=>Math.abs(other.position.y-p.y)<3&&sweptContact(previous,p,other.position,7)!==null)){p.copy(previous);r.userData.dx=-dx;r.userData.dz=-dz;}
      if (p.distanceTo(mover.position) < 7) { this.heat = Math.min(100, this.heat + 30 * dt); this.speed *= .98; }
    }
    if(this.onFoot&&this.down('KeyJ','punch'))this.punch();
    this.actions?.tick(dt,this.actor.position,this.onFoot,this.down('KeyQ','block'));
    const arm=this.avatar.children[6];if(arm)arm.rotation.x=this.actions&&this.actions.punchTimer>0?-1.4:this.down('KeyQ','block')?-1:0;const leftArm=this.avatar.children[5];if(leftArm)leftArm.rotation.x=this.onFoot&&this.down('KeyQ','block')?-1:0;
    this.loot.forEach((item, i) => {
      if (item.claimed) return;
      item.mesh.rotation.y += dt * .5;
      if (item.mesh.position.distanceTo(mover.position) < 5) {
        item.claimed = true; item.mesh.visible = false; this.recovered.push(i);
        const p = schoolClient.getProgress(); p.cash += 75; schoolClient.saveProgress(p); this.boost = 100; this.save(); sfxHit();
        this.notify(`Rival stash recovered · +$75 · nitro refilled · ${this.recovered.length}/8 found`);
      }
    });
    if (this.stage === 'escape') { this.heat = Math.max(0, this.heat - 3 * dt); if (this.heat >= 99) { this.stage = 'pickup'; this.target = DEPOT; this.heat = 0; this.notify('Crew recovered the cargo. Regroup at Blackline and try again.'); } }
  }
  private hud() {
    const set = (s: string, v: string) => { this.root.querySelector(s)!.textContent = v; };
    set('#world-cash', '$' + schoolClient.getProgress().cash.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})); set('#world-rep', `${this.wins} JOBS COMPLETE`);
    set('#world-speed', String(Math.round(Math.abs(this.speed) * 1.4))); (this.root.querySelector('#world-boost') as HTMLElement).style.width = `${this.boost}%`;
    set('#world-objective', this.stage === 'paid' ? 'The streets are yours.' : this.stage === 'escape' ? 'Bring the cargo home.' : 'Meet the Blackline crew.');
    set('#world-detail', this.stage === 'paid' ? 'Explore, or return to the hideout for your next job.' : this.stage === 'escape' ? 'Rivals are on your tail. Follow the gold marker to the hideout.' : 'A shipment. A rival crew. One clean getaway. Get to the docks.');
    const distance = this.actor.position.distanceTo(this.target); set('#world-distance', `${Math.round(distance)} m TO ${this.stage === 'escape' || this.stage === 'paid' ? 'HIDEOUT' : 'BLACKLINE'}`); set('#world-heat', this.stage === 'escape' ? `HEAT ${Math.round(this.heat)}%` : 'FREE ROAM');
    if (this.navigation) { set('#world-objective', this.navigation.name); set('#world-detail', 'Follow the gold marker. Press E at the destination, or F beside a vehicle.'); set('#world-distance', `${Math.round(this.actor.position.distanceTo(this.navigation.point))} m TO DESTINATION`); }
    const btn = this.root.querySelector<HTMLButtonElement>('.world-interact')!; btn.hidden = this.overlay || distance > 18 || !['pickup', 'escape', 'paid'].includes(this.stage); btn.textContent = this.stage === 'paid' ? 'E · NEXT JOB' : this.stage === 'escape' ? 'E · STASH THE CARGO' : 'E · TALK TO THE CREW';
    const place = this.nearActivity(); if (place && !this.overlay) { btn.hidden = false; btn.textContent = `E · ${place}`; }
    const ride = this.onFoot ? this.nearRide() : null;
    set('[data-action="vehicle"]', this.onFoot ? ride ? `F · ${ride === this.currentRide || this.owned.includes(ride.name) || ride.mesh.userData.unlocked ? 'ENTER' : 'HOTWIRE'} ${ride.name}` : 'F · FIND A VEHICLE' : 'F · EXIT VEHICLE');
    set('.world-action-status',this.actions?.status??'');
    (this.root.querySelector('[data-action=jump]') as HTMLElement).hidden=!this.onFoot;
    (this.root.querySelector('[data-action=punch]') as HTMLElement).hidden=!this.onFoot;
    (this.root.querySelector('[data-drive=block]') as HTMLElement).hidden=!this.onFoot;
    set('.world-kit', `${this.onFoot ? 'ON FOOT' : this.currentRide?.name ?? 'Gold GT'}${this.armed ? ` · ${this.ammo} ROUNDS · ${this.rangeScore} PTS` : ''}${this.parkPass ? ' · PARK PASS' : ''}`);
    (this.root.querySelector('[data-action="fire"]') as HTMLElement).hidden = !this.onFoot || !this.armed;
    this.root.querySelector('.world-toast')!.classList.toggle('show', performance.now() < this.toastUntil);
    const ctx = this.map.getContext('2d')!; ctx.fillStyle = '#182734'; ctx.fillRect(0, 0, 180, 180);
    const xy = (n: number) => 63 + n * .125; ctx.strokeStyle = '#53616d'; ctx.lineWidth = 3;
    ctx.fillStyle = '#21485a'; ctx.fillRect(0, 0, 180, 180); ctx.fillStyle = '#263942'; ctx.fillRect(xy(-465), xy(-465), 116, 116); ctx.fillRect(xy(640), xy(-150), 30, 38);
    for (const r of ROADS) { ctx.beginPath(); ctx.moveTo(xy(r), xy(-450)); ctx.lineTo(xy(r), xy(450)); ctx.moveTo(xy(-450), xy(r)); ctx.lineTo(xy(450), xy(r)); ctx.stroke(); }
    const pin = this.navigation?.point ?? this.target; ctx.fillStyle = '#ffd16a'; ctx.beginPath(); ctx.arc(xy(pin.x), xy(pin.z), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#9de8c5'; for (const item of this.loot) if (!item.claimed) ctx.fillRect(xy(item.mesh.position.x) - 1.5, xy(item.mesh.position.z) - 1.5, 3, 3);
    ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#ffe5a1'; for (const [label, x, z] of [['R',350,0],['S',300,180],['H',675,105],['T',-360,0],['B',-360,-120],['D',480,120]] as [string,number,number][]) ctx.fillText(label,xy(x),xy(z));
    if (this.stage === 'escape') for (const r of this.rivals) { ctx.fillStyle = '#ff6969'; ctx.fillRect(xy(r.position.x) - 2, xy(r.position.z) - 2, 4, 4); }
    ctx.save(); ctx.translate(xy(this.actor.position.x), xy(this.actor.position.z)); ctx.rotate(-this.yaw); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-4, -4); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  private modal(html: string) { this.overlay = true; this.keys.clear(); this.touches.clear(); const m = this.root.querySelector<HTMLElement>('.world-modal')!; m.hidden = false; m.innerHTML = `<section class="world-card">${html}</section>`; m.querySelector<HTMLElement>('input,button')?.focus(); }
  private closeModal() { this.challenge=null;this.overlay = false; this.root.querySelector<HTMLElement>('.world-modal')!.hidden = true; this.keys.clear(); this.touches.clear(); }
  private brief() {
    this.stage = 'brief'; this.target = DEPOT;
    this.modal(`<span class="eyebrow">BLACKLINE / JOB ${String(this.mission + 1).padStart(2, '0')}</span><h1>THE DOCKS<br><em>DON’T SLEEP.</em></h1><p class="world-dialogue">“Shipment just landed. Our rivals think it’s theirs. Check the cargo, grab the keys, and bring it home.”</p><div class="contract"><div><small>THE JOB</small><b>Cargo interception</b></div><div><small>YOUR CUT</small><b>$${900 + this.mission * 100}</b></div><div><small>THE SKILL</small><b>Multiplication</b></div></div><button class="world-primary" data-action="start">TAKE THE JOB →</button><p class="world-note">Drive freely. Start the job when you reach the gold marker. Progress saves on this browser.</p>`);
  }
  private interact() {
    if (this.overlay) return;
    const activity = this.nearActivity();
    if(activity==='BOARDWALK HURDLES'||activity==='CONTAINER CLIMB'){if(!this.onFoot){this.notify('Hop out with F to start this on-foot course.');return;}this.actions?.startCourse(activity==='BOARDWALK HURDLES'?0:1);return;}
    if(activity==='STREET SPARRING'){if(!this.onFoot){this.notify('Hop out with F to join the street fight.');return;}if(!this.actions?.fighting)this.actions?.startFight();return;}
    if (activity === 'ISLAND BUILDER') { this.speed = 0; this.builder(); return; }
    if (activity === 'TUNE SHOP' || activity === 'BODY SHOP') { this.speed = 0; this.shop(activity === 'BODY SHOP'); return; }
    if (activity === 'RANGE / AMMO') { this.speed = 0; this.range(); return; }
    if (activity === 'STUNT PARK') {
      this.speed = 0;
      if (this.parkPass) { const pending=this.landedRamps.filter(i=>!this.paidRamps.includes(i)); if(!pending.length){this.notify('Park pass active. Land each of the three ramps, then return here for your sponsor payout.');return;} this.ask('AIRTIME / SPONSOR PAYOUT','CASH IN YOUR RUN.', `${pending.length} new ramp landings pay $150 each. What is your sponsor payout?`,pending.length*150,`${pending.length} × 150`,'Multiply your new landings by $150.','Multiplication / stunt rewards',()=>{const fresh=pending.filter(i=>!this.paidRamps.includes(i));this.paidRamps.push(...fresh);const p=schoolClient.getProgress();p.cash+=fresh.length*150;schoolClient.saveProgress(p);this.save();this.notify(`Sponsor paid $${fresh.length*150}. Keep riding!`);}); return; }
      this.ask('AIRTIME / ADMISSION', 'EARN YOUR PASS.', 'Six stunt sessions cost $25 each. What is the full-day price? Calculate and pay for a permanent park pass.', 150, '6 × 25', 'Four sessions cost $100. Two more cost $50.', 'Multiplication / admission', () => { if(this.parkPass || !this.spend(150)) return; this.parkPass = true; this.save(); this.notify('Park pass unlocked. Bikes and quads are parked by the gate.'); }); return;
    }
    if (this.actor.position.distanceTo(this.target) > 18) return;
    this.speed = 0;
    if (this.stage === 'paid') { this.mission++; this.stage='brief';this.save(); this.brief(); return; }
    if (this.stage === 'escape') { this.complete(); return; }
    if (this.stage !== 'pickup') return;
    this.stage = 'manifest'; this.question = { a: 12 + this.mission % 7, b: 14 + this.mission % 5 };
    const { a, b } = this.question;
    this.modal(`<span class="eyebrow">BLACKLINE IMPORTS / CARGO MANIFEST</span><h1>CHECK THE TAKE.</h1><p class="world-dialogue">“${a} crates. ${b} parts in each. Tell me how many parts we’re moving so I can clear the shipment.”</p><div class="cargo-grid">${Array.from({ length: a }, () => `<div class="cargo-crate">${b}<small>PARTS</small></div>`).join('')}</div><form><label for="cargo-answer">TOTAL PARTS IN THE SHIPMENT</label><div class="cargo-input"><input id="cargo-answer" type="number" min="0" step="1" inputmode="numeric" required autocomplete="off"><button class="world-primary">CLEAR CARGO →</button></div></form><p id="cargo-coach" role="status">Break the shipment into smaller groups if that helps. No countdown.</p>`);
  }
  private answer() {
    if (this.challenge) {
      const input = this.root.querySelector<HTMLInputElement>('#activity-answer'); if (!input?.value.trim()) return;
      const c = this.challenge, answer = Number(input.value), correct = Number.isFinite(answer) && Math.abs(answer - c.answer) < .005;
      this.records.push({ date: new Date().toISOString(), skill: c.skill, question: c.question, answer, correct }); this.records = this.records.slice(-200); this.save();
      if (!correct) { sfxMiss(); this.root.querySelector('#activity-coach')!.textContent = c.hint; input.select(); return; }
      this.challenge = null; this.closeModal(); sfxHit(); c.done(); return;
    }
    if (this.stage !== 'manifest') return; const input = this.root.querySelector<HTMLInputElement>('#cargo-answer'); if (!input || !input.value.trim()) return;
    const answer = Number(input.value), { a, b } = this.question, correct = answer === a * b;
    this.records.push({ date: new Date().toISOString(), skill: 'Multiplication / partial products', question: `${a} × ${b}`, answer, correct }); this.records = this.records.slice(-200); this.save();
    if (!correct) { sfxMiss(); this.root.querySelector('#cargo-coach')!.textContent = `Crew tip: split ${a} into 10 + ${a - 10}. Ten crates hold ${10 * b} parts. The other ${a - 10} hold ${(a - 10) * b}. Add those two groups. Try again.`; input.select(); return; }
    sfxBoost(); this.stage = 'escape'; this.target = HOME; this.heat = 15;
    this.rivals.forEach((r, i) => { r.position.set(120, 0, -240 + i * 8); r.userData.dx = 0; r.userData.dz = 1; });
    this.closeModal(); this.notify('Cargo cleared. Rival crew inbound. Get to the hideout!');
  }
  private complete() {
    if (this.stage !== 'escape') return;
    const pay = 900 + this.mission * 100; const p = schoolClient.getProgress(); p.cash += pay; schoolClient.saveProgress(p); this.wins++; this.stage = 'paid'; this.save(); sfxWin();
    this.modal(`<span class="eyebrow">JOB COMPLETE / RESPECT EARNED</span><h1>CLEAN<br><em>GETAWAY.</em></h1><p>You checked ${this.question.a * this.question.b} parts and brought the shipment home.</p><div class="world-payout">+$${pay.toLocaleString()}</div><p>Your bankroll is $${p.cash.toLocaleString()}. ${this.upgraded ? 'Street tune installed.' : 'Spend $700 on a street tune for more speed and stronger nitro.'}</p>${!this.upgraded ? '<button data-action="upgrade">INSTALL STREET TUNE · $700</button>' : ''}<button class="world-primary" data-action="next">NEXT JOB →</button><button data-action="resume">Explore the city</button>`);
  }
  private upgrade() { const p = schoolClient.getProgress(); if (this.upgraded || p.cash < 700) return; p.cash -= 700; schoolClient.saveProgress(p); this.upgraded = true; this.save(); sfxHit(); const b = this.root.querySelector<HTMLButtonElement>('[data-action="upgrade"]'); if (b) { b.disabled = true; b.textContent = 'STREET TUNE INSTALLED'; } }
  private pause() { if (this.overlay) return; this.modal('<span class="eyebrow">TAKE A BREATHER</span><h1>CITY ON HOLD.</h1><button class="world-primary" data-action="resume">BACK TO THE STREETS →</button><button data-action="next">Start a new job</button><button data-action="school">School hub</button>'); }
  private parent() {
    const correct = this.records.filter(r => r.correct).length;
    this.modal(`<span class="eyebrow">PARENT REVIEW / THIS BROWSER</span><h1>BEHIND THE GAME.</h1><div class="contract"><div><small>JOBS</small><b>${this.wins}</b></div><div><small>ANSWERS</small><b>${this.records.length}</b></div><div><small>CORRECT</small><b>${correct}</b></div></div><p>Practice history, not school grades. Retries are included. School information in the existing hub may be sample data until a live feed is connected.</p><div class="world-history">${this.records.slice(-12).reverse().map(r => `<div><span>${new Date(r.date).toLocaleDateString()} · ${r.question} = ${r.answer}</span><b>${r.correct ? 'Correct' : 'Retried'}</b></div>`).join('') || '<p>Complete a cargo check to start a learning history.</p>'}</div><button class="world-primary" data-action="resume">RETURN →</button><button data-action="school">OPEN SCHOOL HUB</button>`);
  }
  private notify(s: string) { this.root.querySelector('.world-toast')!.textContent = s; this.toastUntil = performance.now() + 6500; }
  private nearActivity() { const p = this.actor.position;if(Math.hypot(p.x+60,p.z-280)<17)return 'BOARDWALK HURDLES';if(Math.hypot(p.x-60,p.z-280)<17)return 'CONTAINER CLIMB';if(Math.hypot(p.x-180,p.z-315)<20)return 'STREET SPARRING'; if (Math.hypot(p.x - 345, p.z) < 24) return 'RANGE / AMMO'; if (Math.hypot(p.x - 300, p.z - 180) < 26) return 'STUNT PARK'; if (Math.hypot(p.x - 675, p.z - 105) < 33) return 'ISLAND BUILDER'; if (Math.hypot(p.x + 360, p.z) < 26) return 'TUNE SHOP'; if (Math.hypot(p.x + 360, p.z + 120) < 26) return 'BODY SHOP'; return ''; }
  private destinations(): [string, number, number][] { return [['Blackline job', 120, -120], ['Hideout', -120, 120], ['Iron Sights range', 345, 0], ['Airtime stunt park', 300, 180], ['Redline tune shop', -360, 0], ['Chroma body shop', -360, -120], ['Marina / boats & jet skis', 490, 120], ['Island builder (take a boat)', 675, 105],['Boardwalk hurdles (on foot)',-60,280],['Container climb (on foot)',60,280],['Street sparring',180,315]]; }
  private mapMenu() { this.modal(`<span class="eyebrow">STERLING CITY / GPS</span><h1>EXPLORE THE CITY.</h1><svg class="city-overview" viewBox="0 0 640 250" role="img" aria-label="City map: mainland on the left, marina on the east coast, island across the channel"><rect width="640" height="250" fill="#146781"/><rect x="15" y="15" width="350" height="220" rx="8" fill="#647b70"/><path d="M40 70H345M40 120H345M40 175H345M95 25V225M175 25V225M255 25V225" stroke="#243b48" stroke-width="13"/><rect x="475" y="45" width="145" height="160" rx="22" fill="#8b9e76"/><path d="M350 125H392M450 125H490" stroke="#dab889" stroke-width="13"/><path d="M395 125H450" stroke="#ffd176" stroke-width="3" stroke-dasharray="6 5"/><g fill="white" font-size="14" font-family="Arial" font-weight="bold"><text x="115" y="53">DOWNTOWN</text><text x="265" y="105">MARINA</text><text x="496" y="105">ISLAND</text><text x="482" y="145">HOUSE / GARAGE</text><text x="45" y="212">HURDLES · CLIMB · FIGHTS</text><text x="270" y="195">STUNT PARK</text></g></svg><div class="shop-grid"><button data-action="shuttle-marina">SHUTTLE TO MARINA / BOATS</button><button data-action="shuttle-course">VISIT ON-FOOT COURSES</button><button data-action="shuttle-fight">VISIT STREET SPARRING</button></div><div class="shop-grid">${this.destinations().map(([name], i) => `<button data-action="nav-${i}">${name} →</button>`).join('')}</div><p>F: leave or enter a vehicle. E: talk or interact. On foot: Space jumps, J punches, hold Q blocks, R fires at the range. Shift sprints.</p><button data-action="resume">CLOSE MAP</button>`); }
  private save() { try { localStorage.setItem(SAVE, JSON.stringify({ streetRewards:this.streetRewards, stage:this.stage, wins: this.wins, mission: this.mission, upgraded: this.upgraded, records: this.records, recovered: this.recovered, ammo: this.ammo, armed: this.armed, parkPass: this.parkPass, hits: this.hits, rangeScore:this.rangeScore, landedRamps:this.landedRamps, paidRamps:this.paidRamps, dock:this.dock, workshop:this.workshop, landscaping:this.landscaping, house: this.house, pool: this.pool, garage: this.garage, spaces: this.spaces, quoted: this.quoted, owned: this.owned, upgrades: this.upgrades })); } catch { this.storageFailed = true; this.notify('Storage unavailable: progress lasts for this session only.'); } }
  private restore() { try { const p = JSON.parse(localStorage.getItem(SAVE) || '{}'); this.streetRewards=Array.isArray(p.streetRewards)?p.streetRewards.filter((id:unknown)=>['brawl','course-0','course-1'].includes(String(id))):[];this.stage=p.stage==='paid'?'paid':'brief';this.rangeScore=Number.isFinite(p.rangeScore)?Math.max(0,p.rangeScore):0;this.landedRamps=Array.isArray(p.landedRamps)?p.landedRamps.filter((i:number)=>Number.isInteger(i)&&i>=0&&i<3):[];this.paidRamps=Array.isArray(p.paidRamps)?p.paidRamps.filter((i:number)=>Number.isInteger(i)&&i>=0&&i<3):[];this.dock=p.dock===true;this.workshop=p.workshop===true;this.landscaping=p.landscaping===true;this.house = p.house === true; this.pool = p.pool === true; this.garage = p.garage === true; this.quoted = p.quoted === true; this.spaces = Number.isInteger(p.spaces) ? Math.max(0, Math.min(5, p.spaces)) : 0; this.owned = Array.isArray(p.owned) ? p.owned.filter((n: unknown) => typeof n === 'string') : ['Gold GT']; this.upgrades = p.upgrades && typeof p.upgrades === 'object' && !Array.isArray(p.upgrades) ? p.upgrades : {}; this.wins = Number.isFinite(p.wins) ? Math.max(0, p.wins) : 0; this.mission = Number.isFinite(p.mission) ? Math.max(0, p.mission) : 0; this.upgraded = p.upgraded === true; this.ammo = Number.isFinite(p.ammo) ? Math.max(0, p.ammo) : 0; this.armed = p.armed === true; this.parkPass = p.parkPass === true; this.hits = Number.isFinite(p.hits) ? Math.max(0, p.hits) : 0; this.recovered = Array.isArray(p.recovered) ? p.recovered.filter((n: number) => Number.isInteger(n) && n >= 0 && n < 8) : []; this.records = Array.isArray(p.records) ? p.records.filter((r: RecordEntry) => typeof r.question === 'string' && /^[0-9 ×+.%$÷−=()?-]+$/.test(r.question) && Number.isFinite(r.answer) && typeof r.correct === 'boolean').slice(-200) : []; } catch {} }
  hide() { this.active = false; this.keys.clear(); this.touches.clear(); this.root.hidden = true; }
  show() { this.active = true; this.root.hidden = false; this.clock.getDelta(); this.resize(); }
}