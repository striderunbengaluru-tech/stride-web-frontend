/**
 * The MCP Apps views — the HTML an agent renders inline in a conversation.
 *
 * Self-contained by necessity: a view runs in a sandboxed iframe with no
 * network access unless the resource declares `_meta.ui.csp` domains, and
 * declaring any would mean this UI could break when something outside Stride
 * changed. So no fonts, no scripts, no images from a CDN — inline CSS, system
 * fonts, and the brand palette written out as hex because Tailwind's build does
 * not reach in here.
 *
 * The palette is Stride's: `#4B2862` purple ground, `#E1D03F` yellow accent,
 * `#010101` copy on yellow. Kept in step with tailwind.config.js by hand, which
 * is the trade for a view that renders identically in every host.
 */

export const EVENT_CARD_URI = 'ui://stride/event-card.html'
export const LEADERBOARD_URI = 'ui://stride/leaderboard.html'

const PURPLE = '#4B2862'
const YELLOW = '#E1D03F'
const BLACK = '#010101'

/**
 * Shared chrome. `data` arrives as a JSON string the host injects, so each view
 * reads it from a script tag rather than fetching anything.
 */
function shell(title: string, body: string, script: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: ${PURPLE};
    color: #fff;
    padding: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 18px 20px;
    backdrop-filter: blur(8px);
  }
  .card + .card { margin-top: 10px; }
  h1 { font-size: 1.35rem; line-height: 1.25; margin-bottom: 4px; font-weight: 700; }
  h2 { font-size: 1rem; font-weight: 600; margin-bottom: 10px; }
  .sub { color: rgba(255,255,255,0.65); font-size: 0.9rem; margin-bottom: 14px; }
  .meta { display: grid; gap: 6px; margin-bottom: 16px; }
  .row { display: flex; gap: 10px; font-size: 0.9rem; }
  .label { color: rgba(255,255,255,0.45); min-width: 84px; flex-shrink: 0; }
  .price { color: ${YELLOW}; font-weight: 700; font-size: 1.1rem; }
  .cta {
    display: inline-block; background: ${YELLOW}; color: ${BLACK};
    font-weight: 700; padding: 10px 18px; border-radius: 6px;
    text-decoration: none; font-size: 0.9rem; min-height: 44px; line-height: 24px;
  }
  .cta:hover { opacity: 0.9; }
  .pill {
    display: inline-block; font-size: 0.7rem; text-transform: uppercase;
    letter-spacing: 0.08em; color: ${YELLOW}; border: 1px solid rgba(225,208,63,0.35);
    background: rgba(225,208,63,0.10); border-radius: 999px; padding: 3px 9px;
    margin-bottom: 12px;
  }
  ol { list-style: none; counter-reset: rank; }
  li { counter-increment: rank; display: flex; align-items: baseline; gap: 12px;
       padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.92rem; }
  li:last-child { border-bottom: 0; }
  li::before { content: counter(rank); color: ${YELLOW}; font-weight: 700;
               min-width: 22px; font-variant-numeric: tabular-nums; }
  .name { flex: 1; }
  .runs { color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums; }
  .tier { color: rgba(255,255,255,0.35); font-size: 0.78rem; }
  .empty { color: rgba(255,255,255,0.5); font-size: 0.9rem; }
  @media (max-width: 380px) {
    .row { flex-direction: column; gap: 1px; }
    .label { min-width: 0; }
  }
</style>
</head>
<body>
<main id="root">${body}</main>
<script>${script}</script>
</body>
</html>`
}

/** Escapes untrusted strings for HTML text and attribute contexts alike. */
const ESCAPE_FN = `
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
`

/**
 * Reads the tool result the host hands the view.
 *
 * MCP Apps hosts deliver it by `postMessage` notification; the shape has moved
 * between drafts, so this checks the two places it lands and falls back to a
 * message listener. All three paths end in the same `render(data)`.
 */
const BOOTSTRAP = `
function payload(msg) {
  if (!msg) return null;
  return msg.structuredContent || msg.result || msg.data || msg.params || null;
}
function boot() {
  var initial = (window.mcpApp && window.mcpApp.toolResult)
    || (window.__MCP_APP__ && window.__MCP_APP__.toolResult)
    || null;
  if (initial) render(payload(initial) || initial);
  window.addEventListener('message', function (event) {
    var data = payload(event.data && (event.data.payload || event.data));
    if (data) render(data);
  });
}
boot();
`

export const EVENT_CARD_HTML = shell(
  'Stride event',
  '<div class="card"><p class="empty">Loading event…</p></div>',
  ESCAPE_FN + `
function row(label, value) {
  if (value == null || value === '') return '';
  return '<div class="row"><span class="label">' + esc(label) + '</span><span>' + esc(value) + '</span></div>';
}
function when(iso) {
  if (!iso) return 'Date to be announced';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata'
    }) + ' IST';
  } catch (e) { return iso; }
}
function render(data) {
  var e = data && (data.event || data);
  if (!e || !e.name) return;

  var packages = Array.isArray(e.packages) ? e.packages : [];
  var pkgHtml = packages.length
    ? '<h2>Packages</h2><div class="meta">' + packages.map(function (p) {
        return row(p.name, '₹' + Number(p.amountPaise / 100).toLocaleString('en-IN')
          + (p.spotsLeft != null ? ' · ' + p.spotsLeft + ' left' : ''));
      }).join('') + '</div>'
    : '';

  document.getElementById('root').innerHTML =
    '<div class="card">'
    + (e.inviteOnly ? '<span class="pill">Invite only</span>' : '')
    + '<h1>' + esc(e.name) + '</h1>'
    + (e.subtitle ? '<p class="sub">' + esc(e.subtitle) + '</p>' : '')
    + '<div class="meta">'
      + row('When', when(e.eventDate))
      + row('Where', e.location)
      + row('Distance', e.distanceKm ? e.distanceKm + ' km' : '')
      + row('Difficulty', e.difficulty)
      + row('Spots left', e.spotsLeft != null ? e.spotsLeft : '')
    + '</div>'
    + '<p class="price">' + esc(e.priceLabel || '') + '</p>'
    + pkgHtml
    + (e.absoluteUrl
        ? '<p style="margin-top:16px"><a class="cta" href="' + esc(e.absoluteUrl)
          + '" target="_blank" rel="noopener noreferrer">'
          + (e.registrationsClosed ? 'View event' : 'Register on strideclub.in') + '</a></p>'
        : '')
    + '</div>';
}
` + BOOTSTRAP,
)

export const LEADERBOARD_HTML = shell(
  'Stride leaderboard',
  '<div class="card"><p class="empty">Loading leaderboard…</p></div>',
  ESCAPE_FN + `
function render(data) {
  var athletes = (data && (data.athletes || data.rows)) || [];
  var total = data && data.totalAthletes;
  if (!Array.isArray(athletes) || athletes.length === 0) return;

  var items = athletes.map(function (a) {
    var name = a.url && a.absoluteUrl
      ? '<a class="name" style="color:#fff" href="' + esc(a.absoluteUrl)
        + '" target="_blank" rel="noopener noreferrer">' + esc(a.name) + '</a>'
      : '<span class="name">' + esc(a.name) + '</span>';
    return '<li>' + name
      + '<span class="tier">' + esc(a.tier || '') + '</span>'
      + '<span class="runs">' + esc(a.runsCompleted) + ' runs</span></li>';
  }).join('');

  document.getElementById('root').innerHTML =
    '<div class="card">'
    + '<h1>Stride leaderboard</h1>'
    + '<p class="sub">Ranked by community runs attended'
      + (total ? ', out of ' + esc(total) + ' athletes' : '') + '.</p>'
    + '<ol>' + items + '</ol>'
    + '</div>';
}
` + BOOTSTRAP,
)
