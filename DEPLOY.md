# Latch Sterling City onto claimreach.com

Lasting play URL: **https://sterling.claimreach.com**  
Project name: **`sterling-city`** — a **separate** Pages or Workers project.  
Never attach `sterling.claimreach.com` to the live Pages project **`claimreach`** (Git → `github.com/bmcc3po/claimreach`). That would put the CRM on Sterling’s hostname and risk `/m6`.

Confirmed zone (do not retarget):

| | |
| --- | --- |
| Apex | `claimreach.com` + `www` |
| Account | `2ba9f1e76fa0bea71be1ddffac54af74` |
| Live CRM Pages | project **`claimreach`** → `claimreach.pages.dev` (auto-deploy `main`) |
| Sterling Git | `https://github.com/bmcc3po/sterling-city` |

`wrangler.jsonc` pins that account id and Custom Domain **only** `sterling.claimreach.com`.

## Preferred: Pages Git-connect (no wrangler OAuth)

Cloudflare dashboard, **same account** as claimreach.com:

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Repo: **`bmcc3po/sterling-city`** (not `claimreach`)
3. Project name: **`sterling-city`**
4. Production branch: `main`  
   Build command: `npm run build`  
   Output directory: `dist`
5. After the first deploy is green, **Custom domains** → `sterling.claimreach.com`  
   Cloudflare usually writes DNS + SSL. If it does not:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `sterling` | `sterling-city.pages.dev` | Orange-cloud (proxied) |

Do **not** CNAME `sterling` → `claimreach.pages.dev`.

Until that project exists, `sterling-city.pages.dev` will NXDOMAIN. After create, it should 200 even before the custom domain.

## CLI (same account — never `--temporary`)

Needs `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers + zone Workers Routes / SSL / DNS on `claimreach.com`):

```bash
export CLOUDFLARE_API_TOKEN="…"
export CLOUDFLARE_ACCOUNT_ID="2ba9f1e76fa0bea71be1ddffac54af74"
npx wrangler whoami
npm run build
npx wrangler deploy                 # Worker + assets + Custom Domain
# or: npm run pages                 # Pages project sterling-city
```

`--temporary` / claim-preview is forbidden.

If Custom Domain on the Worker fails, CNAME `sterling` → the printed `sterling-city.<subdomain>.workers.dev` (likely `sterling-city.bmc.workers.dev`), orange-cloud.

## Auth still missing on this agent

| Channel | Status |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | **Not in this environment** |
| `wrangler whoami` | **Not authenticated** |
| Bindings MCP | Same account (`claimpoint`, `cdc-workup` only). Cannot create Pages/Workers or DNS |
| GitHub `bmcc3po/sterling-city` | **Pushed** — ready to Git-connect |

Confirm live (do not call it live until this passes):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://sterling.claimreach.com/
```

Expect **200** and HTML title `STERLING CITY`.

`claimreach.com/m6` must stay the CRM (307 to firm-login). Do not add a Worker route `claimreach.com/*`.
