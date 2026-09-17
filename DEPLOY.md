# Latch Sterling City onto claimreach.com

Target: **https://sterling.claimreach.com**  
Worker name: `sterling-city` (separate from `claimpoint` and `cdc-workup` — do not overwrite those).  
Does **not** bind `claimreach.com/*` or `/m6`.

## One command (real account — no `--temporary`)

```bash
export CLOUDFLARE_API_TOKEN="…"   # see token scopes below
npm run build
npx wrangler deploy                 # NOT wrangler deploy --temporary
```

`wrangler.jsonc` already sets Custom Domain `sterling.claimreach.com`. Wrangler will create the hostname + SSL in the **claimreach.com** zone. No CNAME is required if that succeeds.

## Token / login that is missing on this agent

This environment has:

- Cloudflare **Bindings MCP** (can *list* `claimpoint` + `cdc-workup`)
- **No** Wrangler CLI login
- **No** `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` in env

Create a token on the **same** account that owns claimreach.com:

Dashboard → My Profile → API Tokens → Create Token

Use **Edit Cloudflare Workers**, or a custom token with:

- Account → Cloudflare Workers Scripts → Edit
- Account → Cloudflare Workers Routes → Edit (if shown)
- Zone → Workers Routes → Edit on `claimreach.com`
- Zone → SSL and Certificates → Edit on `claimreach.com` (custom domain)
- Zone → DNS → Edit on `claimreach.com` (only if you add the CNAME by hand)

Then either:

```bash
export CLOUDFLARE_API_TOKEN=…
npx wrangler whoami    # must show the claimreach.com account, not a preview
npx wrangler deploy
```

or on this machine: `npx wrangler login` as that account (OAuth).

## Manual DNS if Custom Domain API fails

After a successful `wrangler deploy`, Wrangler prints `https://sterling-city.<subdomain>.workers.dev`.

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `sterling` | `sterling-city.<subdomain>.workers.dev` | Proxied (orange cloud) |

Example if the account workers.dev subdomain is `bmc`: `sterling-city.bmc.workers.dev`.

Confirm with:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://sterling.claimreach.com/
```

Expect **200** and HTML title `STERLING CITY`.

## Fallback (do not use unless subdomain is impossible)

`https://claimreach.com/sterling` would live **inside** the Next Pages app (`public/sterling` + Vite `base: '/sterling/'`). That is a CRM deploy. Do not mix it into Worker routes for `claimreach.com/*` — that would steal `/m6`.
