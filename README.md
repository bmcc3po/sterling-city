# STERLING CITY

Kid-safe night-city driving game: GTA energy, 5th-grade math as every mission lock.

Sterling (age ~10–11) owns the gold GT. Missions are courier drops, vault cracks, getaway races, and garage upgrades. Wrong math raises **wanted stars** and sends **Coach** cruisers — no guns, no blood, no stealing cars.

## Play

Open the deployed URL on an iPhone (or desktop). First screen is the city, not a menu.

- **Phone:** left joystick steer, GAS / BRAKE
- **Desktop:** WASD or arrows, Space to drift
- Gold blip on the radar is always the next mission
- Math gates: exact change / line-up-the-dots decimals (Topics 1–2) and place-value multiply (Topic 3)
- Correct answers pay cash and punch the camera; wrong answers flash Coach for under 3 seconds, then you are back in the world

## Local

```bash
npm install
npm run dev
```

Dev server: `http://127.0.0.1:43180`

Production (after a **separate** `sterling-city` Pages/Workers project is Git-connected or deployed): **https://sterling.claimreach.com**. Do not attach that hostname to the CRM Pages project `claimreach`. See `DEPLOY.md`.

GitHub (Git-connect this, not `bmcc3po/claimreach`): `https://github.com/bmcc3po/sterling-city`

```bash
export CLOUDFLARE_API_TOKEN="…"   # account that owns claimreach.com
npm run build
npx wrangler deploy               # never --temporary
```

`dist/` is the static SPA. If Custom Domain does not attach, CNAME `sterling` → the printed `*.workers.dev` host (proxied).

## Stack

Vite + TypeScript + Three.js (WebGL, bloom, wet-road reflector, chase camera, vehicle slip physics).
