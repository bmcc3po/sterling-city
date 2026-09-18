# STERLING CITY

School Hub + Topic 3 Grand Prix first. The open-world city is a later reward, not the product.

Sterling (age ~10–11) lands on a **bright full-screen School Hub** — not a dark popup over the city. The loop he should want to open is **Topic 3 Grand Prix**: Savvas kid-voice partial products (houses hundreds/tens/ones → × bottom → add → estimate). Correct steps boost. Wrong answers stall. The step board stays on screen. Kid-safe — no gore.

## Play

Live: **https://sterling.claimreach.com**

1. School Hub opens first (Game Hall).
2. **Play Grand Prix** — 118 × 13 is the first gate.
3. **Speed Houses** is playable on the hub screen itself.
4. Missing Quick Checks stay **AT SCHOOL only** chips — not in-game quizzes.
5. **Enter City** is a secondary stub.

## Local

```bash
npm install
npm run dev
```

Dev server: `http://127.0.0.1:43180`

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=sterling-city --branch=main --commit-dirty=true
```

Host: `sterling.claimreach.com` · Pages project `sterling-city`. See `DEPLOY.md`.

Do **not** attach that hostname to the CRM Pages project `claimreach`.

## Pedagogy

Topic 3 markers that must remain in the bundle:

- `pp-drill-steps`
- `ONES LINE`
- `hundreds_house`
- `askTarget`
- `factors` `{ a: 118`

STER WORK school-feed hooks load `/school/feed.json`, then `/school/feed.sample.json`, then the rich mock. Campus Parent AUTH_FAIL is a handoff to the STER WORK computer — not a login in this browser.
