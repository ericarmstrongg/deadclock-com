# deadclock-com

Marketing site for **Deadclock** at deadclock.gg. A landing page, plus Support, Privacy and Terms.

Plain static HTML, CSS and a few small JS files. No framework, no build step. Hosted on Cloudflare
Workers static assets, and everything served lives in `public/`. One tiny Worker, `src/worker.js`,
handles `/api/*` for the Windows waitlist.

| URL | File |
|---|---|
| `/` | `public/index.html` |
| `/support` | `public/support.html` |
| `/privacy` | `public/privacy.html` |
| `/terms` | `public/terms.html` |
| `/download/windows`, `/download/overwolf` | redirects, set in `public/_redirects` (currently both land on `/#download`) |
| `/api/interest`, `/api/geo` | `src/worker.js` (waitlist and analytics consent) |
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

The waitlist needs its D1 database to exist before a deploy that includes it. The one for
deadclock.gg already exists and its id is in `wrangler.jsonc`. To set up a fresh Cloudflare account,
create it once and paste the `database_id` it prints into the `d1_databases` entry:

```bash
npx wrangler d1 create deadclock-interest
```

The tables are created by the Worker on first use, so there is no migration step.

## The landing page

Top to bottom: hero with a live demo of the overlay, the in-game overlay (a real gameplay
screenshot with a zoomed live copy of the overlay), a tabbed tour of the Windows app, an iPhone
coverflow, a six-card feature grid, and the download section.

`site.js` is progressive enhancement only. With JS off the page still reads top to bottom. It
drives the scroll reveals, the live overlay demos (`[data-overlay]`), the app tour (`[data-tabs]`)
and the phone coverflow (`[data-phones]`). Everything that moves stops for visitors with
`prefers-reduced-motion`.

The overlay demos are *demos*: timer periods are sped up and the speech caption stands in for the
spoken callout. Edit the `data-t` (seconds left) and `data-p` (period) on each `.ov-row` to retime
them.

## Windows is "Coming soon"

The Windows app isn't released, so every Windows and Overwolf mention on the site says "coming
soon", and the buttons are `<button class="btn btn-soon" data-notify="where">` "Notify me" buttons
that open the waitlist dialog (see below). There is no installer link anywhere in the HTML. The
iPhone button links straight to `https://apps.apple.com/app/id6738394006`. It is deliberately not
a redirect, so iPhones open the App Store app directly.

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

2. In `public/index.html`, search for `data-notify` and `Coming soon`. Turn each "Notify me" button
   into `<a class="btn btn-primary" href="/download/windows">Download for Windows</a>`, drop the
   "Coming soon" pills and eyebrow labels, change the Overwolf notes to a link to
   `/download/overwolf`, and delete the `<dialog id="notify">` block and `notify.js`.
3. Update the `description` and `og:description` meta tags, the support FAQ answers about
   installing and platforms, and `public/images/og.png` (it says "Windows · Coming soon").
4. Email everyone in `signups` (see below), then delete the rows. The privacy policy promises the
   list is deleted within 30 days of the launch email.

## Windows waitlist

Every "Notify me" button opens a dialog with one email field. Two things are recorded, so a visitor
who is interested but never types an email still counts:

| What | Table | Columns |
|---|---|---|
| Pressed a "Notify me" button (once per button per visit) | `clicks` | `at`, `source`, `country` |
| Left their email (lower-cased, one row per address) | `signups` | `email`, `at`, `source`, `country` |

`source` says which button: `hero`, `overlay`, `windows` or `download`. `country` comes from
Cloudflare. No IP address is stored. Both events also go to Google Analytics as `notify_click` and
`generate_lead` (plus `notify_dismiss` when the dialog is closed without an email). The email address
itself is never sent to Google.

Read it from a terminal (drop `--remote` to read the local dev copy instead):

```bash
# how many people showed interest, and how many left an email, by button
npx wrangler d1 execute deadclock-interest --remote --command "SELECT source, COUNT(*) AS presses, (SELECT COUNT(*) FROM signups s WHERE s.source = c.source) AS emails FROM clicks c GROUP BY source"

# the list, as JSON you can paste into a spreadsheet or a mailer
npx wrangler d1 execute deadclock-interest --remote --json --command "SELECT email, at, country FROM signups ORDER BY at"
```

The same data is browsable in the Cloudflare dashboard under Storage & databases, D1.

Protection against junk: the endpoint only accepts same-site requests, caps the body size, checks the
address format, and a hidden form field catches most bots (they get a fake "ok" and nothing is
stored). If it ever gets abused, add a Cloudflare rate-limiting rule for `/api/interest`, or Turnstile.

The Worker only sees `/api/*` requests, so the static pages stay free to serve.

## Analytics

The site uses Google Analytics 4 through `public/analytics.js`, in **its own GA4 property**, separate
from the iPhone app's. A web stream inside the app's property would blend into its user, retention
and conversion numbers, and cross-device matching between a marketing site and an app isn't useful
here. Nothing is measured until you fill in the ID:

1. In Google Analytics, Admin, **Create, Property**. Name it "deadclock.gg" and put it in the same
   account as the app so one login covers both.
2. In the new property, Admin, Data collection, **Data streams, Add stream, Web**, for
   `https://deadclock.gg`. Copy the **Measurement ID** (`G-…`).
3. Paste it into `MEASUREMENT_ID` at the top of `public/analytics.js`, and deploy.
4. In the property's Admin: set **Data retention** to 14 months (the policy says "no more than 14
   months"), and leave **Google signals** off.
5. After a visitor has done it once, mark `generate_lead` (Windows email) and `notify_click` as **Key
   events** (Admin, Events) to see them as conversions.

What you get without any code: visitors, sources, countries, devices, page views, engagement time,
and scroll depth. What `analytics.js` adds as events:

| Event | When | Parameters |
|---|---|---|
| `section_view` | a section crosses the middle of the screen, once per visit | `section` (`hero`, `overlay`, `windows`, `iphone`, `features`, `download`) |
| `app_store_click` | any App Store link | `location` (section it was in) |
| `notify_click` | a "Notify me" button | `source` |
| `generate_lead` | an email was submitted | `method`, `source` |
| `notify_dismiss` | the dialog closed without an email | `source` |
| `tour_tab` | the visitor picked a Windows app tour tab | `tab` |
| `phone_screen` | the visitor picked an iPhone screen | `screen` |
| `nav_click`, `footer_click`, `email_click` | header and footer links, mailto links | `target` or `location` |

To use `section`, `source` and the like in reports, register them under Admin, Custom definitions, as
event-scoped custom dimensions.

Consent: visitors in the EEA, UK and Switzerland (`/api/geo`) get a banner and nothing from Google
loads until they accept. Everywhere else it starts straight away. Visitors who send Global Privacy
Control or Do Not Track are never measured. Ad features are off and no personal data is sent.

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

`privacy.html` (section 2, "Website", plus sections 1, 7, 9, 10 and 12) describes what the site
collects: Google Analytics cookies (with a consent banner in the EEA, UK and Switzerland), and the
Windows launch list. The only third-party script is Google's `gtag.js`, and it loads only when
`MEASUREMENT_ID` is set and the visitor is allowed to be measured. Fonts are self-hosted
(DM Serif Display, SIL Open Font License, in `public/fonts/`). If you add anything else that
collects data, update the policy first. That includes Cloudflare Web Analytics, which is off unless
you enable it in the dashboard.
