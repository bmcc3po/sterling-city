import { schoolClient } from './schoolFeed';
// Development-only play-test fixtures. Never loaded in production; no player save writes.
export function prepareTestStorage() {
  const store=window.sessionStorage;
  Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem:(k:string)=>store.getItem('sterling-qa:'+k), setItem:(k:string,v:string)=>store.setItem('sterling-qa:'+k,v), removeItem:(k:string)=>store.removeItem('sterling-qa:'+k) } });
  if(!store.getItem('sterling-qa:initialized')){const p=schoolClient.getProgress();p.cash=30000;schoolClient.saveProgress(p);store.setItem('sterling-qa:initialized','yes');}
}
export function attachPlaytest(world: any) {
  const panel=document.createElement('div');panel.style.cssText='position:fixed;z-index:200;bottom:0;left:220px;background:#172431;padding:4px;color:white;font:12px sans-serif';
  panel.innerHTML='<b>TEST SAVE</b> '+['Drive','Sprint','Stop','Block','Punch held','Course jump','Crash','Docks','Hideout','Estate view','Hotwire','Marina','Island dock','Builder','Tune','Body','Park','Ramp','Range'].map(n=>`<button>${n}</button>`).join('');document.body.append(panel);
  panel.onclick=e=>{const name=(e.target as HTMLElement).textContent;if(name==='Punch held'){world.keys.add('KeyJ');return;}if(name==='Block'){world.keys.add('KeyQ');return;}if(name==='Drive'||name==='Sprint'){world.keys.add('KeyW');if(name==='Sprint')world.keys.add('ShiftLeft');return;}if(name==='Stop'){world.keys.clear();world.speed=0;return;}world.challenge=null;world.closeModal();world.speed=0;world.verticalSpeed=0;world.footVelocity=0;world.keys.clear();world.navigation=null;
    const locations:Record<string,number[]>={'Course jump':[-60,297,0],Crash:[9,62,0],Docks:[120,-120,0],Hideout:[-120,120,0],'Estate view':[760,80,Math.PI],Hotwire:[9,78,0],Marina:[490,120,Math.PI/2],'Island dock':[630,120,Math.PI/2],Builder:[675,105,0],Tune:[-360,0,0],Body:[-360,-120,0],Park:[300,180,0],Ramp:[350,218,0],Range:[345,0,Math.PI]};const p=locations[name??''];if(!p)return;
    world.onFoot=!['Tune','Body','Ramp','Crash'].includes(name!);world.avatar.visible=world.onFoot;world.actor.position.set(p[0],0,p[1]);world.yaw=p[2];world.actor.rotation.y=p[2];world.camera.position.set(p[0]-Math.sin(p[2])*(world.onFoot?14:21),world.onFoot?9:12,p[1]-Math.cos(p[2])*(world.onFoot?14:21));world.camera.lookAt(p[0]+Math.sin(p[2])*8,2,p[1]+Math.cos(p[2])*8);
  };
}
