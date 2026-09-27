import { SchoolHub } from './hub';
import { GrandPrix } from './grandPrix';
import { StreetWorld } from './world';
import { schoolClient } from './schoolFeed';

export async function boot() {
  const qa = import.meta.env.DEV && new URLSearchParams(location.search).has("playtest") ? await import("./playtest") : null;
  qa?.prepareTestStorage();
  const hubEl = document.getElementById('school-hub')!;
  const prixEl = document.getElementById('grand-prix')!;
  const worldEl = document.createElement('div'); worldEl.id = 'street-world'; document.body.append(worldEl);
  const back = document.createElement('button'); back.id = 'return-city'; back.textContent = '← RETURN TO CITY'; back.hidden = true; document.body.append(back);
  const openHub = () => { world?.hide(); prixEl.hidden = true; back.hidden = false; void hub.open(); };
  const hub = new SchoolHub(hubEl, {
    onPlayPrix: () => { hub.hide(); back.hidden = true; prix.start(); },
    onCash: () => {},
  });
  const prix = new GrandPrix(prixEl, {
    onExit: openHub,
    onWin: cash => { const p = schoolClient.getProgress(); p.cash += cash; p.prixWins++; schoolClient.saveProgress(p); },
  });
  let world: StreetWorld | undefined;
  try {
    world = new StreetWorld(worldEl, openHub);
    qa?.attachPlaytest(world);
    back.onclick = () => { hub.hide(); back.hidden = true; world!.show(); };
  } catch (error) {
    console.error('City startup failed', error);
    worldEl.remove(); back.remove(); void hub.open();
    const notice = document.createElement('p'); notice.textContent = 'The 3D city could not start on this device. School activities are still available.'; notice.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:150;background:#172431;color:white;padding:15px;margin:0'; document.body.append(notice);
  }
  document.getElementById('boot')!.hidden = true;
}
