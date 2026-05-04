# AGM Multi-Tenant HOA Portal

One Cloudflare Pages deployment that serves any number of HOAs at
`/<hoa-slug>` (e.g. `/queenscourt`, `/oakridge`) plus a single admin console
at `/admin` with a tenant switcher.

- **Resident UI** — splash login + documents/calendar/maintenance/architectural/contact tabs.
  Iframe-embeddable on the AGM marketing site.
- **Admin UI** — log in once, switch between any HOA from a dropdown, manage
  events / documents / form submissions, create new HOAs.

Stack: React + Vite (single bundle for both UIs), Cloudflare Pages Functions,
D1 (SQLite), R2 (object storage), Resend (email).

## Local development

```bash
npm install
npx wrangler d1 create hoa-portal           # paste returned ID into wrangler.toml
npx wrangler r2 bucket create hoa-portal-docs
npm run db:init                             # apply schema.sql

cat > .dev.vars <<'EOF'
ADMIN_PASS_HASH=<sha256 hex of your admin password>
SESSION_SECRET=<openssl rand -hex 32>
RESEND_API_KEY=<optional — emails skipped if empty>
RESEND_FROM=AGM HOA Portal <portal@agmrealestategroup.com>
EOF

# Generate the hash:
echo -n 'your-admin-password' | shasum -a 256

npm run pages:dev                           # serves at http://localhost:8788
```

Then visit:

- `http://localhost:8788/admin` — log in, click **+ New HOA**, create one (e.g.
  slug `queenscourt`). Optionally upload a hero image and set passwords.
- `http://localhost:8788/queenscourt` — enter the resident password you just set.

## Production deploy

```bash
npx wrangler pages secret put ADMIN_PASS_HASH
npx wrangler pages secret put SESSION_SECRET
npx wrangler pages secret put RESEND_API_KEY     # optional
npx wrangler pages secret put RESEND_FROM        # optional

npm run db:init:remote
git push origin main                              # Cloudflare Pages auto-deploys
```

## Embedding on the AGM website

```html
<iframe
  src="https://<your-domain>/queenscourt"
  width="100%" height="900" style="border: none;"
  title="Queens Court Resident Portal"
></iframe>
```

`X-Frame-Options` is intentionally **not** set in `public/_headers` so the
resident view can be iframe-embedded. The admin app frame-busts on mount.

## Architecture notes

- **Per-HOA data** lives in D1 with `hoa_id` foreign keys cascading from
  `hoas`. Schema in `schema.sql`.
- **Documents** are stored in R2 under keys `<hoa_id>/documents/<uuid>`.
  Hero images at `_hoa_assets/<hoa_id>/hero.<ext>`.
- **Auth** uses HMAC-signed cookies (`functions/_lib/auth.js`):
  - Admin session — `__Host`-style, `SameSite=Strict`, 12h
  - Resident — per-HOA, `SameSite=Lax` (works inside iframes), 7d
  - Board — per-HOA, `SameSite=Lax`, 24h, requires resident first
- **Admin password** is single — one login unlocks all HOAs.
  Per-HOA admin permissions are out of scope for v1.
