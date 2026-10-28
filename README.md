# deadclock-com

Marketing site for **Deadclock** at deadclock.gg. A landing page, plus Support, Privacy and Terms.

Plain static HTML, CSS and one small JS file. No framework, no build step. Hosted on Cloudflare
Workers static assets, and everything served lives in `public/`.

| URL | File |
|---|---|
| `/` | `public/index.html` |
| `/support` | `public/support.html` |
| `/privacy` | `public/privacy.html` |
| `/terms` | `public/terms.html` |
| `/download/windows`, `/download/overwolf` | redirects, set in `public/_redirects` (currently both land on `/#download`) |
| anything else | `public/404.html` |

The header and footer are repeated in each page, so change all five when you edit them.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:8787.

## Deploy

```bash
npm run deploy
```

The first deploy opens a browser to log in to Cloudflare. `wrangler.jsonc` attaches `deadclock.gg`
as a custom domain. If the apex already has an A, AAAA or CNAME record, delete it first or the
attach fails. To send `www.deadclock.gg` to the apex, add a Redirect Rule in the Cloudflare
dashboard.

## The landing page

Top to bottom: hero with a live demo of the overlay, a ticker of the nine timers, four stats, the
in-game overlay (a real gameplay screenshot with a zoomed live copy of the overlay), a tabbed tour
of the Windows app, an iPhone coverflow, a six-card feature grid, and the download section.

`site.js` is progressive enhancement only. With JS off the page still reads top to bottom. It
drives the scroll reveals, the live overlay demos (`[data-overlay]`), the app tour (`[data-tabs]`),
the phone coverflow (`[data-phones]`) and the count-up numbers (`[data-count]`). Everything that
moves stops for visitors with `prefers-reduced-motion`.

The overlay demos are *demos*: timer periods are sped up and the speech caption stands in for the
spoken callout. Edit the `data-t` (seconds left) and `data-p` (period) on each `.ov-row` to retime
them.

## Windows is "Coming soon"

The Windows app isn't released, so every Windows and Overwolf link on the site is a disabled
`<button class="btn btn-soon" disabled>` or the words "coming soon". There is no installer link
anywhere in the HTML. The iPhone button links straight to `https://apps.apple.com/app/id6738394006`.
It is deliberately not a redirect, so iPhones open the App Store app directly.

When Windows ships:

1. In `public/_redirects`, replace both `/#download` targets:

   | Path | Goes to |
   |---|---|
   | `/download/windows` | The Windows installer `.exe` |
   | `/download/overwolf` | The Overwolf store listing, `https://www.overwolf.com/app/<publisher>-<app>` |

   The installer can't live in this repo. Cloudflare static assets cap each file at 25 MiB, which an
   Electron installer will exceed. Host it on GitHub Releases or R2. With GitHub, the "latest" form
   keeps the line unchanged across releases:
   `https://github.com/<owner>/<repo>/releases/latest/download/<installer>.exe`.

   An unsigned installer triggers Windows SmartScreen warnings on download, so code-sign it.

2. In `public/index.html`, search for `btn-soon` and `Coming soon`. Turn each disabled button into
   `<a class="btn btn-primary" href="/download/windows">Download for Windows</a>`, drop the
   "Coming soon" pills and eyebrow labels, and change the Overwolf notes to a link to
   `/download/overwolf`.
3. Update the `description` and `og:description` meta tags, the support FAQ answers about
   installing and platforms, and `public/images/og.png` (it says "Windows · Coming soon").

## Images

Everything is in `public/images/` as WebP, except the logo files and `og.png`.

| Files | Source | Notes |
|---|---|---|
| `hero-gameplay.webp`, `hero-gameplay-1280.webp` | Overwolf QA screenshot `10-overlay-in-action.png` | Full-screen Deadlock with the overlay. 2560 and 1280 wide for `srcset` |
| `app-timers.webp`, `app-timers-alert.webp` | QA screenshots `01-timers-live`, `02-timers-alert` | Cropped to x 0–684 to drop the test-ad panel. The alert one is the orange flash state |
| `app-settings.webp`, `app-settings-alerts.webp` | QA screenshots `04-settings`, `05-settings-alerts` | Same crop |
| `app-players.webp` | QA screenshot `11-players` | Window border trimmed, **other players' names blurred**. Redo the blur if you replace it |
| `ios-*.webp` | App Store raw captures (`raw/*.png`, 1320 × 2868) | Resized to 780 wide. The phone bezel and Dynamic Island are CSS (`.phone`) |
| `og.png` | Rendered from the page's own look | 1200 × 630. Re-render when the tagline or platform status changes |

When you re-capture the desktop app, crop the test ads out, and blur or fake any real player names
before it goes on a public page.

### Legal

`privacy.html` and `terms.html` are general templates based on what the apps use (Firebase, AdMob,
Overwolf, Cloudflare, Apple and Overwolf purchases). Have a lawyer review them, and update them if the
apps start collecting anything new or the way the Windows app is distributed changes. Terms section 10
still says the desktop app "is distributed through Overwolf", and several places mention Overwolf
purchases.

## Privacy policy match

`privacy.html` says the website sets no cookies and uses no analytics. The site loads nothing from
third parties: system fonts plus one self-hosted font file (DM Serif Display, SIL Open Font License,
in `public/fonts/`), no external scripts or trackers. Keep it that way, or update the policy first.
That includes Cloudflare Web Analytics, which is off unless you enable it in the dashboard.
