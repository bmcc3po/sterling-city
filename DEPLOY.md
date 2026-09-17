# Latch Sterling City onto claimreach.com

Target: **https://sterling.claimreach.com**  
Worker name: `sterling-city` (separate from `claimpoint` and `cdc-workup` — do not overwrite those).  
Does **not** bind `claimreach.com/*` or `/m6`.

`wrangler.jsonc` already sets Custom Domain `sterling.claimreach.com`. A real-account `npx wrangler deploy` (no `--temporary`) creates the hostname + SSL in the **claimreach.com** zone. No CNAME is required if that succeeds.

## Blocked on this agent — exact missing auth

Checked 2026-09-17:

| Channel | Status |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` in env | **Missing** |
| `npx wrangler whoami` | **Not authenticated** — needs `wrangler login` or a token |
| Cloudflare Bindings MCP | Logged into the **same** account as `claimpoint` + `cdc-workup` (claimreach.com). **List-only** — no Worker upload, no custom domain, no DNS tools |
| GitHub `bmcc3po` PAT (`repo` scope) | Present (old OpenClaw `secrets.env` on Drive). Used only to publish this repo. **No Cloudflare token in that file.** |
| `cdc-workup` GitHub Actions secrets | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` **not** set there either |

Wrangler in this environment fails with:

> In a non-interactive environment, it's necessary to set a `CLOUDFLARE_API_TOKEN` environment variable… To continue without logging in, rerun with `--temporary`.

`--temporary` / claim-preview is **forbidden** as the lasting URL. Do not use it.

### Token to create (claimreach.com account)

Dashboard → **My Profile** → **API Tokens** → **Create Token** → template **Edit Cloudflare Workers**, or custom:

- Account → Cloudflare Workers Scripts → **Edit**
- Zone → Workers Routes → **Edit** on `claimreach.com`
- Zone → SSL and Certificates → **Edit** on `claimreach.com` (Custom Domain)
- Zone → DNS → **Edit** on `claimreach.com` (only if attaching CNAME by hand)

Also copy **Account ID** from Workers overview (right column).

Then either:

```bash
export CLOUDFLARE_API_TOKEN=…
export CLOUDFLARE_ACCOUNT_ID=…   # optional if the token is single-account
npx wrangler whoami              # must show the claimreach.com account, not a preview
npm run build
npx wrangler deploy              # NEVER --temporary
```

or add the same two values as GitHub Actions secrets on `bmcc3po/sterling-city` and run the **Deploy sterling-city Worker** workflow.

or on a laptop: `npx wrangler login` as that account (OAuth).

Confirm:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://sterling.claimreach.com/
```

Expect **200** and HTML title `STERLING CITY`. Do not treat the URL as live until that passes.

## Manual DNS if Custom Domain API fails

After a successful real-account `wrangler deploy`, Wrangler prints `https://sterling-city.<subdomain>.workers.dev`.

The workers.dev subdomain for this account is almost certainly **`bmc`** (`*.bmc.workers.dev` resolves; `cdc-workup.bmc.workers.dev` is 404 because that Worker has `workers_dev` off).

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `sterling` | `sterling-city.bmc.workers.dev` | Proxied (orange cloud) |

If Wrangler prints a different `*.workers.dev` host, use that instead of `bmc`.

Do **not** add a CNAME on `claimreach.com` apex or `www`. Do **not** add a Worker route `claimreach.com/*`.

## Fallback (do not use unless subdomain is impossible)

`https://claimreach.com/sterling` would live **inside** the Next Pages app (`public/sterling` + Vite `base: '/sterling/'`). That is a CRM deploy. Do not mix it into Worker routes for `claimreach.com/*` — that would steal `/m6`.
