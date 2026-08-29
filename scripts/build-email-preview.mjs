// Render every transactional email template into ONE self-contained HTML page:
// an email switcher, a light/dark toggle that actually re-renders the message,
// and all images inlined. Open it in a browser to check a template before you
// send anything.
//
// Run:  node scripts/build-email-preview.mjs [out.html]
//       (defaults to a file in the OS temp dir; the path is printed)
//
// No credentials needed — it only fetches the public asset URLs the templates
// already reference.
//
// Deliberately self-contained: the previous version patched a saved Claude
// artifact file for its UI, which meant it only ran on one machine, in one
// session. This one builds its own harness, so it keeps working.

import { readFileSync, writeFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { join } from 'path'
import { tmpdir } from 'os'
import ts from 'typescript'

const OUT = process.argv[2] ?? join(tmpdir(), 'email-preview.html')

// templates.ts has no imports on purpose, so a standalone transpile is exact.
const tmp = join(tmpdir(), 'stride-templates-preview.mjs')
writeFileSync(tmp, ts.transpileModule(readFileSync('src/lib/email/templates.ts', 'utf8'), {
  compilerOptions: { module: 'ESNext', target: 'ES2020' },
}).outputText)
const {
  welcomeEmail, registrationConfirmedEmail, selectedForEventEmail, slayReportingTimeEmail,
} = await import(pathToFileURL(tmp).href)

const SITE = 'https://www.strideclub.in'
const STORAGE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets'

// Synthetic sample data throughout — never a real member.
const ticket = {
  fullName: 'Asha Rao',
  eventName: 'Stride Sunday Long Run — Cubbon Park',
  eventDate: '2026-09-06T06:00:00+05:30',
  location: 'Cubbon Park, Bengaluru',
  locationUrl: 'https://maps.google.com/?q=Cubbon+Park+Bengaluru',
  routeUrl: 'https://www.strava.com/routes/example',
  bannerUrl: `${STORAGE}/images/web-assets/email-posters/curl-rox.jpg`,
  runnerTag: 'A617',
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Stride',
  confirmationUrl: `${SITE}/events/sunday-long-run/confirmation/example`,
  amountPaidPaise: 59900,
  paymentId: 'pay_ExampleId123',
  selectedPackages: [{ id: 'p1', name: 'Early Bird', amountPaise: 59900 }],
}

const EMAILS = {
  welcome: {
    label: 'Welcome',
    ...welcomeEmail({ fullName: 'Asha Rao', username: 'asharao', siteUrl: SITE }),
  },
  confirmation: {
    label: 'Ticket (registered)',
    ...registrationConfirmedEmail(ticket),
  },
  selected: {
    label: 'Ticket (invite approved)',
    ...selectedForEventEmail(ticket),
  },
  slay: {
    label: 'Slay run-day',
    ...slayReportingTimeEmail({
      fullName: 'Asha Rao',
      reportingTime: '12:15 pm',
      runName: 'Curl Rox',
      runDate: '2026-08-23T07:30:00+00:00',
      location: 'HYFIT, HSR Layout',
      locationUrl: 'https://maps.app.goo.gl/example',
      posterUrl: `${STORAGE}/images/web-assets/email-posters/curl-rox.jpg`,
      whatsappUrl: 'https://chat.whatsapp.com/example',
      noteTitle: 'Raceday check',
      note: [
        '- Wear comfortable clothes and shoes.',
        '- No entry is permitted after 1:30 p.m.',
        '- Waves will start every 20 minutes from 1 p.m.',
        '- Take care of your belongings.',
      ].join('\n'),
    }),
  },
}

// ── Inline every remote image, so the page works offline and in a sandbox ────
const all = Object.values(EMAILS).map(e => e.htmlContent).join('')
const urls = [...new Set([...all.matchAll(/https:\/\/[^"')\s]+\.(?:png|jpe?g|webp|gif)/g)].map(m => m[0]))]
const dataUris = {}
for (const url of urls) {
  try {
    const res = await fetch(url)
    if (!res.ok) { console.warn(`  skip ${url} → ${res.status}`); continue }
    const type = res.headers.get('content-type') ?? 'image/png'
    dataUris[url] = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
  } catch (err) { console.warn(`  skip ${url}: ${err.message}`) }
}

// ── Force each colour scheme ────────────────────────────────────────────────
// The templates set no background and flip their text via prefers-color-scheme,
// so to preview a mode we pin the scheme and paint the canvas the client would.
function variants(html) {
  let h = html.replace(/@import url\([^)]*\);?/g, '') // fonts: let the host page load them
  for (const [url, uri] of Object.entries(dataUris)) h = h.split(url).join(uri)

  const start = '/*DARK-START*/', end = '/*DARK-END*/'

  // Light-only templates (the paper sheet the ticket email uses) carry no dark
  // block, because they paint their own background instead of inheriting the
  // reader's canvas. There is nothing to pin, so both tabs show the same render.
  if (h.indexOf(start) === -1) return { light: h, dark: h }

  const block = h.slice(h.indexOf(start), h.indexOf(end) + end.length)
  const rules = block.slice(block.indexOf('/*RULES-START*/') + 15, block.indexOf('/*RULES-END*/'))

  const pin = (s, scheme) => s
    .split('content="light dark"').join(`content="${scheme}"`)
    .split('color-scheme: light dark;').join(`color-scheme: ${scheme};`)

  return {
    light: pin(h.split(block).join('html,body{background:#ffffff !important;}'), 'light'),
    dark: pin(h.split(block).join(`${rules}html,body{background:#15171b !important;}`), 'dark'),
  }
}

const data = Object.fromEntries(
  Object.entries(EMAILS).map(([key, e]) => [key, { label: e.label, subject: e.subject, ...variants(e.htmlContent) }])
)

// ── The harness ─────────────────────────────────────────────────────────────
const page = `<!DOCTYPE html>
<html lang="en" data-color="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stride Email Preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Figtree:wght@400;500;600;700&family=Geist+Mono:wght@400;700&display=swap">
<style>
  :root { --bg:#f6f6f7; --fg:#16151a; --dim:#6d6a75; --line:rgba(22,21,26,.14); --card:#fff; }
  html[data-color="dark"] { --bg:#121114; --fg:#f2f0f4; --dim:#9a96a1; --line:rgba(242,240,244,.16); --card:#1b1a1f; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family:'Figtree',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  header { display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between;
           padding:20px 24px; border-bottom:1px solid var(--line); }
  h1 { margin:0; font-family:'Libre Baskerville',Georgia,serif; font-size:19px; font-weight:400; }
  .seg { display:flex; flex-wrap:wrap; border:1px solid var(--line); border-radius:6px; overflow:hidden; }
  .seg button { appearance:none; background:transparent; border:0; padding:9px 14px; cursor:pointer;
                font-family:'Geist Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.12em;
                text-transform:uppercase; color:var(--dim); min-height:40px; }
  .seg button + button { border-left:1px solid var(--line); }
  .seg button[aria-pressed="true"] { background:var(--fg); color:var(--bg); }
  .seg button:focus-visible { outline:2px solid #E1D03F; outline-offset:-2px; }
  main { max-width:720px; margin:0 auto; padding:24px; }
  .subject { font-size:13px; color:var(--dim); margin:0 0 12px;
             font-family:'Geist Mono',ui-monospace,monospace; overflow-wrap:anywhere; }
  .frame { border:1px solid var(--line); border-radius:8px; overflow:hidden; background:var(--card); }
  iframe { display:block; width:100%; height:min(78vh,900px); border:0; }
</style>
</head>
<body>
<header>
  <h1>Email preview</h1>
  <div class="seg" id="which" role="group" aria-label="Template"></div>
  <div class="seg" id="mode" role="group" aria-label="Reader appearance">
    <button type="button" data-mode="light" aria-pressed="true">Light</button>
    <button type="button" data-mode="dark" aria-pressed="false">Dark</button>
  </div>
</header>
<main>
  <p class="subject" id="subject"></p>
  <div class="frame"><iframe id="frame" title="Rendered email" sandbox="allow-same-origin"></iframe></div>
</main>
<script type="application/json" id="data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var keys = Object.keys(DATA);
  var which = keys[0], mode = 'light';
  var whichBar = document.getElementById('which');

  keys.forEach(function (k) {
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.key = k; b.textContent = DATA[k].label;
    whichBar.appendChild(b);
  });

  function render() {
    var d = DATA[which];
    document.documentElement.dataset.color = mode;
    document.getElementById('subject').textContent = d.subject;
    document.getElementById('frame').srcdoc = d[mode];
    whichBar.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.key === which));
    });
    document.querySelectorAll('#mode button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  }

  whichBar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-key]'); if (!b) return;
    which = b.dataset.key; render();
  });
  document.getElementById('mode').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-mode]'); if (!b) return;
    mode = b.dataset.mode; render();
  });

  render();
</script>
</body>
</html>`

writeFileSync(OUT, page)
console.log(`✓ ${Object.keys(data).length} templates · ${Object.keys(dataUris).length}/${urls.length} images inlined`)
console.log(`  ${OUT} (${(page.length / 1024).toFixed(0)} KB)`)
