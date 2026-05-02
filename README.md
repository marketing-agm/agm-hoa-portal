# Queens Court Resident Portal

Single-page React app, built with Vite, designed to be deployed on Cloudflare Pages and embedded as an iframe on the AGM website.

## Local development 

```bash
npm install
npm run dev
```

Opens at http://localhost:5173.

## Build for deployment

```bash
npm install
npm run build
```

This produces a `dist/` folder. That folder is what you upload to Cloudflare Pages.

## Manual deployment to Cloudflare Pages

1. Run `npm install` and `npm run build` locally.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Upload assets**.
3. Name the project (e.g., `queens-court-portal`).
4. Drag the entire **`dist/` folder** into the upload area.
5. Click **Deploy**. You'll get a URL like `queens-court-portal.pages.dev`.

## Embedding on the AGM website

```html
<iframe
  src="https://queens-court-portal.pages.dev"
  width="100%"
  height="900"
  style="border: none;"
  title="Queens Court Resident Portal"
></iframe>
```

The `_headers` file in `public/` deliberately omits `X-Frame-Options` so iframe embedding works. Do not add it.

## Future: Git-based deployment

When you're ready to switch from manual upload to automatic builds on push:

1. Push this folder to a GitHub repo.
2. In Cloudflare Pages, **Settings → Builds & deployments → Connect to Git**.
3. Set build command: `npm run build`
4. Set build output directory: `dist`
5. Set Node.js version: `18` (in environment variables, key `NODE_VERSION`)

## Passwords (replace before launch)

- Resident password (splash): `queenscourt`
- Board password (Board Materials unlock): `queenscourt-board`

Both are defined as constants in `src/QueensCourtPortal.jsx`. Search for `RESIDENT_PASSWORD` and `BOARD_PASSWORD`.
