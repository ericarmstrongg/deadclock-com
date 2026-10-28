/*
 * The only server code on deadclock.gg. Static files are served straight from public/ by
 * Cloudflare; this Worker runs for /api/* only (see run_worker_first in wrangler.jsonc).
 *
 *   POST /api/interest  records interest in the Windows app, two ways:
 *                         {kind: "click", source}           someone pressed a "Notify me" button
 *                         {kind: "email", source, email}    someone left their email
 *   GET  /api/geo       tells analytics.js whether this visitor needs to be asked before analytics
 *                       cookies are set (EEA, UK, Switzerland)
 *
 * Data lives in the DB binding (Cloudflare D1). Read it with:
 *   npx wrangler d1 execute deadclock-interest --remote --command "SELECT * FROM signups"
 */

// Countries where analytics cookies need an opt-in: EU, the rest of the EEA, the UK and Switzerland.
const CONSENT_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE = /^[a-z0-9-]{1,32}$/;

function reply(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

// The tables are created on first use, so a fresh database needs no migration step.
let schema;
function ensureSchema(db) {
  schema ??= db
    .batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS clicks (
           id INTEGER PRIMARY KEY,
           at TEXT NOT NULL DEFAULT (datetime('now')),
           source TEXT NOT NULL,
           country TEXT
         )`,
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS signups (
           email TEXT PRIMARY KEY COLLATE NOCASE,
           at TEXT NOT NULL DEFAULT (datetime('now')),
           source TEXT NOT NULL,
           country TEXT
         )`,
      ),
    ])
    .catch((err) => {
      schema = undefined;
      throw err;
    });
  return schema;
}

async function interest(request, env, url) {
  if (request.method !== 'POST') return reply({ ok: false }, 405, { allow: 'POST' });

  // Browsers always send Origin on a POST. Anything not coming from this site is ignored.
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== url.host) return reply({ ok: false }, 403);

  let body;
  try {
    const text = await request.text();
    if (text.length > 2048) return reply({ ok: false }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ ok: false }, 400);
  }

  const source = typeof body?.source === 'string' && SOURCE.test(body.source) ? body.source : 'unknown';
  const country = request.cf?.country ?? null;

  try {
    await ensureSchema(env.DB);

    if (body?.kind === 'click') {
      await env.DB.prepare('INSERT INTO clicks (source, country) VALUES (?, ?)').bind(source, country).run();
      return reply({ ok: true });
    }

    if (body?.kind === 'email') {
      // Bots fill in the hidden field. Tell them it worked and store nothing.
      if (body.website) return reply({ ok: true });

      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email.length > 254 || !EMAIL.test(email)) return reply({ ok: false, error: 'email' }, 422);

      await env.DB.prepare('INSERT OR IGNORE INTO signups (email, source, country) VALUES (?, ?, ?)')
        .bind(email, source, country)
        .run();
      return reply({ ok: true });
    }
  } catch (err) {
    console.error('interest failed', err);
    return reply({ ok: false }, 500);
  }

  return reply({ ok: false }, 400);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/interest') return interest(request, env, url);

    if (url.pathname === '/api/geo') {
      return reply({ consent: CONSENT_COUNTRIES.has(request.cf?.country ?? '') });
    }

    return reply({ ok: false }, 404);
  },
};
