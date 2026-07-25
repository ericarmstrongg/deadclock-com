# deadclock-com

Marketing / download site for the **Deadclock desktop overlay** (the Windows app in
[`deadclock-desktop`](https://github.com/ericarmstrongg/deadclock-desktop)).

Plain static HTML + CSS — no build step, no framework, no dependencies at runtime. Deployed to
Cloudflare Workers static assets, same setup as `pickle-plate-com`.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole site — one page |
| `styles.css` | All styling |
| `images/` | Wordmark, clock mark, app icon, OG image |
| `wrangler.jsonc` | Cloudflare config (`assets.directory` is the repo root) |
| `.assetsignore` | Keeps `node_modules` and configs out of the upload — **don't delete it**, a bare deploy fails without it |

## Local preview

Nothing to build — open `index.html` in a browser, or run the real thing:

```bash
npm install && npm run dev
```

## Deploy

```bash
npm run deploy
```

First deploy will prompt a browser login to Cloudflare. After that the site is live at
`deadclock-com.<your-subdomain>.workers.dev`.

### Custom domain

Once the domain is registered and added to your Cloudflare account, attach it in the dashboard:
**Workers & Pages → deadclock-com → Settings → Domains & Routes → Add custom domain**. Cloudflare
creates the DNS record and certificate for you.

If you'd rather deploy on every push instead of from your laptop, connect the repo under
**Workers & Pages → Create → Connect to Git** and leave the build command empty.

## Things to update

- **Download links** — both buttons in the `#download` section point at
  `deadclock-desktop/releases/latest`. The portable link expects the release asset to be named
  exactly `DeadclockOverlay.exe`. These 404 until that repo is public and has a published release.
- **Domain** — `deadclock.com` is hardcoded in the `<link rel="canonical">` and `og:` tags in
  `index.html`. Change those four lines if the domain ends up different.
- **Screenshot** — the hero currently shows a CSS recreation of the overlay with a ticking demo
  clock. A real screenshot over actual gameplay would sell it harder; drop one in `images/` and
  swap the `.overlay-stage` block for an `<img>`.
