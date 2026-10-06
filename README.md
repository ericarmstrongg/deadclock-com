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
| `/download/windows`, `/download/overwolf` | redirects, set in `public/_redirects` |
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

## Before launch

### Download links

Both Windows links live in **`public/_redirects`**, and the HTML never changes. Replace the two
`TODO` placeholders:

| Path | Goes to |
|---|---|
| `/download/windows` | The Windows installer `.exe` (the main Windows button) |
| `/download/overwolf` | The Overwolf store listing, `https://www.overwolf.com/app/<publisher>-<app>` (the small "Overwolf store" link) |

The installer can't live in this repo. Cloudflare static assets cap each file at 25 MiB, which an
Electron installer will exceed. Host it on GitHub Releases or R2. With GitHub, the "latest" form
keeps the line unchanged across releases:
`https://github.com/<owner>/<repo>/releases/latest/download/<installer>.exe`.

An unsigned installer triggers Windows SmartScreen warnings on download, so code-sign it.

The iPhone button links straight to `https://apps.apple.com/app/id6738394006`. It is deliberately not
a redirect, so iPhones open the App Store app directly.

### Images

Every image on the landing page is a placeholder that describes the shot it needs. **Save a file
with the exact name below into `public/images/` and it replaces the placeholder.** No HTML edits.
The page keeps its layout either way, because each image has a fixed aspect ratio.

| File | Size | What |
|---|---|---|
| `hero-gameplay.jpg` | 2560 × 1440 | Full-screen Deadlock mid-match with the overlay visible and easy to read, ideally one timer in its orange alert state. See the composition note below |
| `two-monitors.jpg` | 2400 × 1200 | Two monitors: Deadlock full-screen on the left, the Deadclock desktop app on the right |
| `overlay-closeup.png` | 1600 × 1200 | Tight crop of the in-game overlay, one timer in the alert state |
| `settings.png` | 1600 × 1200 | The desktop app's settings page |
| `iphone-timers.png` | 1290 × 2796 | iPhone Timers screen |
| `iphone-settings.png` | 1290 × 2796 | iPhone Settings screen |
| `og.png` | 1200 × 630 | Social share card. **Replace the current one**, it has an old tagline and says "overlay for Windows" |

**Hero composition.** The hero shot runs edge to edge across the first screen and fades into the
page at the bottom. On desktop the headline and buttons sit over its left 40% on a dark fade. On
phones the shot is cropped to a square biased to the right. So put the overlay right of center and
keep the left 40% quiet. The fade is in `styles.css` under "landing hero" if you want to move it.

### Legal

`privacy.html` and `terms.html` are general templates based on what the apps use (Firebase, AdMob,
Overwolf, Cloudflare, Apple and Overwolf purchases). Have a lawyer review them, and update them if the
apps start collecting anything new or the way the Windows app is distributed changes. Terms section 10
still says the desktop app "is distributed through Overwolf", and several places mention Overwolf
purchases.

## How the download buttons work

`public/site.js` reads the visitor's platform and sets `<html data-platform>`.

| Visitor | Download for Windows | Download for iPhone |
|---|---|---|
| Windows | Downloads the installer | Apple's web App Store page |
| iPhone / iPad | Dialog: needs a Windows PC, with Copy link | Opens the App Store app |
| Mac, Android, Linux | Same dialog | Apple's web App Store page |
| Unknown, or JS off | Downloads the installer | App Store |

The dialog always has a "Download the installer anyway" link, so a wrong guess never blocks anyone.
The small "Overwolf store" link is never intercepted. Preview any case with
`?platform=windows|ios|android|mac|linux|other`, for example `/?platform=ios`.

## Privacy policy match

`privacy.html` says the website sets no cookies and uses no analytics. The site loads nothing from
third parties: system fonts plus one self-hosted font file (DM Serif Display, SIL Open Font License,
in `public/fonts/`), no external scripts or trackers. Keep it that way, or update the policy first.
That includes Cloudflare Web Analytics, which is off unless you enable it in the dashboard.
