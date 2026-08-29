// Brand-styled transactional email templates. Email clients require
// table-based layout and inline styles — Tailwind does not apply here.
//
// Dark-mode strategy: DO NOT fight the client. The email sets NO background
// colour, so it inherits the reader's own canvas (white in light mode, dark in
// dark mode). Text defaults to BLACK inline (correct on the light canvas), and
// a `@media (prefers-color-scheme: dark)` block flips the `.t` / `.t-muted`
// classes to WHITE for clients that honour it (Apple Mail, iOS, Outlook app);
// Gmail — which ignores the query and auto-inverts — turns the same black text
// white on its dark canvas. Either path lands on white-on-dark. Yellow accents
// (#E1D03F) are left unclassed so they stay yellow in BOTH modes. Result:
// black + yellow on light, white + yellow on dark, immune to inversion.
//
// That now applies to the Slay mail alone. Both Stride mails — welcome and
// ticket — use a second, light-only system: the paper sheet, documented further
// down, which paints its own background instead of inheriting the reader's.
// Read that block before touching either.

type EmailContent = { subject: string; htmlContent: string }

const YELLOW = '#E1D03F' // accent — identical in light and dark
const BLACK = '#010101' // primary text (light mode) + text on the yellow CTA

// Light-mode text/border values (dark-mode equivalents live in DARK_OVERRIDES).
const TEXT = '#010101' // primary copy  → #ffffff in dark (.t)
const MUTED = '#5A5560' // secondary copy → #CFC9D6 in dark (.t-muted)
const DIM = '#8A8590' // faint separators (also .t-muted)
const BORDER = '#E4E1E8' // card borders → #3A3A3A in dark (.card)

// The dark-mode rule set, wrapped in markers so the artifact-preview build can
// extract it and force either mode. Do not remove the /*RULES-*/ markers.
// `.slay-a` is Slay's accent copy: deep pink on the light canvas, lime on the
// dark one. Harmless to the Stride templates, which never carry the class.
const DARK_OVERRIDES =
  '/*RULES-START*/.t{color:#ffffff !important;}.t-muted{color:#CFC9D6 !important;}.card{border-color:#3A3A3A !important;}.slay-a{color:#B6F33B !important;}/*RULES-END*/'

// ── Slay Run Club ────────────────────────────────────────────────────────────
// A second brand sharing this file (and Brevo's authenticated sender domain).
// Its palette is pink + lime, and the same canvas-agnostic rules apply: the
// email sets no background, so both colours have to survive a white canvas AND
// a dark one.
//
// Both values are sampled from the logo artwork, not eyeballed.
//
// SLAY_PINK is the identity pink, used only as a FILL — at 3.98:1 on white it
// is under AA for copy. SLAY_PINK_INK is the same hue darkened to 5.9:1 for
// accent copy on a light canvas, and the `.slay-a` class swaps it for lime in
// dark mode, where lime reads at 13.5:1 and the pink does not. Buttons are
// lime-on-black at 15.9:1 — the logo's own pairing, inverted.
const SLAY_PINK = '#E6358F'
const SLAY_PINK_INK = '#BE1470' // accent copy, light canvas
const SLAY_LIME = '#B6F33B'

const BODY_FONT = "'Figtree', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const HEADING_FONT = "'Libre Baskerville', Georgia, 'Times New Roman', serif"
const MONO_FONT = "'Geist Mono', 'Courier New', Courier, monospace"

// Complete HTML document with NO background colour — the reader's own light/dark
// canvas shows through, and the .t/.t-muted classes adapt the copy to it.
function emailDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      html, body { margin:0; padding:0; }
      /*DARK-START*/@media (prefers-color-scheme: dark) {${DARK_OVERRIDES}}/*DARK-END*/
      @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Figtree:wght@400;500;600;700&family=Geist+Mono:wght@400;700&display=swap');
    </style>
  </head>
  <body style="margin:0;padding:0;">
    ${body}
  </body>
</html>`
}

const LOGO_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/email-icons/stride-logo-purple-bg.png'
const DUCKY_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/ducky-2.png'
const ICON_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/email-icons'
// Square pink logo tile, PNG because Gmail strips inline SVG. Uploaded by
// scripts/upload-slay-logo.mjs.
const SLAY_LOGO_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/email-icons/slay-run-club-logo.png'

const HOME_URL = 'https://www.strideclub.in'
const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL = 'https://strava.app.link/eFnB8k3rw2b'

const FOOTER_LINKS = [
  { title: 'Blog', href: `${HOME_URL}/blog` },
  { title: 'Partnerships', href: `${HOME_URL}/partnerships` },
  { title: 'Privacy Policy', href: `${HOME_URL}/privacy-policy` },
  { title: 'Terms of Service', href: `${HOME_URL}/terms-of-service` },
  { title: 'Contact Us', href: `${HOME_URL}/contact-us` },
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(fullName: string | null): string {
  const first = fullName?.trim().split(/\s+/)[0]
  return first ? escapeHtml(first) : 'runner'
}

// Deliberately local rather than imported from @/lib/utils/money. This module has
// NO imports on purpose: scripts/build-email-artifact.mjs runs it through
// ts.transpileModule and imports the output directly, with no bundler and no path
// alias resolution, so a single value import would break the preview build.
function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}
function priceLabel(paise: number): string {
  return paise === 0 ? 'Free' : formatRupees(paise)
}

/** Structural, for the same no-imports reason. Mirrors SelectedPackage. */
type EmailPackage = { id: string; name: string; amountPaise: number }

/**
 * Which ticket email this is.
 *
 * `confirmed` — the ordinary "you registered, here's your ticket" mail.
 * `selected`  — an invite-only application that an admin just approved. Same
 *               ticket, different framing: the news is the selection, not the
 *               booking, because the runner has been waiting on a decision.
 *
 * One builder rather than two templates: the ticket card, Stride Tag block and
 * calendar button must never drift between them.
 */
type TicketVariant = 'confirmed' | 'selected'

type TicketEmailParams = {
  fullName: string | null
  eventName: string
  eventDate: string | null
  location: string | null
  locationUrl: string | null
  /** The event's run route, when one is set. Strava, Komoot or anything else. */
  routeUrl: string | null
  bannerUrl: string | null
  runnerTag: string | null
  calendarUrl: string | null
  confirmationUrl: string
  amountPaidPaise: number | null
  paymentId: string | null
  selectedPackages?: EmailPackage[]
}


// ─────────────────────────────────────────────────────────────────────────────
// Paper system — the MAP Fitness Festival sheet
// ─────────────────────────────────────────────────────────────────────────────
// The festival mail (scripts/map-festival-email.mjs, itself extracted from the
// approved preview artifact) reads like a printed card: a warm ground, a white
// 600px sheet, a high-contrast serif at a large size, and a single yellow rule
// as the only brand accent. The ticket email now uses that same sheet.
//
// It is deliberately LIGHT ONLY, unlike the canvas-agnostic strategy documented
// at the top of this file: the sheet paints its own background, so there is no
// reader canvas to inherit and nothing for a `prefers-color-scheme` rule to
// flip. `color-scheme: light only` is the ask to clients that honour it not to
// invert. The welcome email keeps the older no-background approach — the two
// systems co-exist on purpose, and neither should be "unified" without a
// redesign of both.
//
// Yellow is a FILL here, never a text colour: #E1D03F on white is 1.6:1, well
// under AA. Where the tag needs to shout, the fill is yellow and the text is
// ink (~11:1).

const PAPER_GROUND = '#EDEAE4' // the canvas around the sheet
const PAPER_SHEET = '#FFFFFF'
const PAPER_INK = '#1C1A22' // headings and emphasis
const PAPER_BODY = '#4A4652' // running copy
const PAPER_MUTED = '#79737F' // labels, captions, footer
const PAPER_STONE = '#F4F1ED' // the details panel fill
const PAPER_RULE = '#E4E0DA' // hairlines
const PURPLE = '#4B2862' // primary CTA fill + inline links

const DISPLAY_FONT = "'Instrument Serif', Georgia, 'Times New Roman', serif"
const PAPER_FONT = "'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"

// Instrument Serif ships one weight; the display size does the work instead.
const DISPLAY_WEIGHT = '400'

// A <link> rather than the @import the older document uses: the preview harness
// strips @import to load fonts itself, and this sheet needs faces that harness
// does not carry.
const PAPER_FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;700&display=swap">'

const PAPER_PAD = 'padding-left:36px;padding-right:36px;'

/** Full sheet document: warm ground, centred white card, mobile rules. */
function paperDocument(params: { title: string; preheader: string; sheet: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>${params.title}</title>
    ${PAPER_FONT_LINK}
    <style>
      body { margin:0; padding:0; width:100% !important; background:${PAPER_GROUND}; -webkit-text-size-adjust:100%; }
      img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
      table { border-collapse:collapse; }
      a { text-decoration:none; }
      .col { width:600px; }
      .pad { padding-left:36px; padding-right:36px; }
      @media only screen and (max-width:620px) {
        .col { width:100% !important; }
        .pad { padding-left:22px !important; padding-right:22px !important; }
        /* When/Where are two floated tables rather than two cells in one row.
           The festival mail stacks a single row's <td>s with display:block,
           which does not actually work: a block child of a display:table-row
           is wrapped in an anonymous cell, so WebKit and Blink keep the
           columns side by side and merely squeeze them. Dropping the float is
           the one stacking trick every client, Outlook included, honours. */
        .stack { display:block !important; width:100% !important; float:none !important; }
        .stack-next { padding-top:16px !important; }
        .h1 { font-size:27px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${PAPER_GROUND};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${params.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_GROUND};">
      <tr>
        <td align="center" style="padding:28px 12px 40px;">
          <table role="presentation" class="col" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${PAPER_SHEET};border-radius:16px;overflow:hidden;">
            ${params.sheet}
            <tr><td style="height:34px;font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** Logo, centred, with the yellow rule beneath it. */
function paperMasthead(): string {
  return `
            <tr>
              <td class="pad" align="center" style="${PAPER_PAD}padding-top:34px;padding-bottom:26px;text-align:center;">
                <a href="${HOME_URL}" target="_blank" style="text-decoration:none;">
                  <img src="${LOGO_URL}" alt="Stride Run Club" width="150" style="display:inline-block;width:150px;max-width:55%;height:auto;border-radius:6px;">
                </a>
                <div style="width:46px;height:4px;background:${YELLOW};border-radius:2px;margin:18px auto 0;"></div>
              </td>
            </tr>`
}

/** Tracked uppercase micro-label above a value. */
function paperLabel(text: string): string {
  return `<div style="font-family:${PAPER_FONT};font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${PAPER_MUTED};padding-bottom:6px;">${text}</div>`
}

/** Primary CTA — purple fill, white text, rounded-md. Never a pill. */
function paperCta(href: string, label: string): string {
  return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${PURPLE}" style="background:${PURPLE};border-radius:6px;">
                      <a href="${href}" target="_blank" style="display:block;padding:16px 24px;font-family:${PAPER_FONT};font-size:16px;font-weight:700;letter-spacing:.01em;color:#FFFFFF;text-decoration:none;">${label}</a>
                    </td>
                  </tr>
                </table>`
}

/** Secondary CTA — outline only, so it never competes with the purple one. */
function paperGhostCta(href: string, label: string, iconHtml = ''): string {
  return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;border:1px solid ${PAPER_RULE};border-radius:6px;">
                  <tr>
                    <td align="center" style="text-align:center;">
                      <a href="${href}" target="_blank" style="display:block;padding:14px 24px;font-family:${PAPER_FONT};font-size:15px;font-weight:600;color:${PAPER_INK};text-decoration:none;">${iconHtml}${label}</a>
                    </td>
                  </tr>
                </table>`
}

/**
 * The welcome email's footer, recoloured for white paper. "Move as One." is set
 * in brand yellow there, which survives that template's transparent canvas but
 * not this white sheet, so it is set in ink. Links and order are identical.
 */
function paperFooter(): string {
  const links = FOOTER_LINKS.map(
    l =>
      `<a href="${l.href}" target="_blank" style="font-family:${PAPER_FONT};font-size:12px;color:${PAPER_MUTED};text-decoration:none;">${l.title}</a>`
  ).join(`<span style="color:${PAPER_RULE};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)

  return `
            <tr>
              <td class="pad" style="${PAPER_PAD}">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PAPER_RULE};">
                  <tr>
                    <td align="center" style="padding:26px 0 0;text-align:center;">
                      <img src="${DUCKY_URL}" alt="Ducky, the Stride mascot" width="72" style="display:inline-block;width:72px;height:auto;border:0;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:14px 0 0;text-align:center;font-family:${PAPER_FONT};font-size:13px;line-height:1.6;color:${PAPER_MUTED};">
                      Bengaluru&#39;s running community for every pace.<br>Events, group runs, and training.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:16px 0 0;text-align:center;font-family:${PAPER_FONT};font-size:12px;line-height:1.9;">${links}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:16px 0 0;text-align:center;">
                      <a href="${INSTAGRAM_URL}" target="_blank" style="display:inline-block;padding:0 9px;text-decoration:none;">
                        <img src="${ICON_BASE}/instagram.png" alt="Instagram" width="22" height="22" style="display:inline-block;width:22px;height:22px;border:0;">
                      </a>
                      <a href="${STRAVA_URL}" target="_blank" style="display:inline-block;padding:0 9px;text-decoration:none;">
                        <img src="${ICON_BASE}/strava.png" alt="Strava" width="22" height="22" style="display:inline-block;width:22px;height:22px;border:0;">
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 0 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PAPER_RULE};">
                        <tr>
                          <td style="padding:18px 0 0;font-family:${PAPER_FONT};font-size:11px;line-height:1.5;color:${PAPER_MUTED};">&copy; ${new Date().getFullYear()} Stride Run Club, Bengaluru</td>
                          <td align="right" style="padding:18px 0 0;text-align:right;font-family:${DISPLAY_FONT};font-weight:${DISPLAY_WEIGHT};font-size:19px;line-height:1.4;letter-spacing:-0.005em;color:${PAPER_INK};">Move as One.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
}

// The stone panel splits the date across two lines, the way the festival mail
// does, so "When" and "Where" read as a matched pair rather than one long
// wrapping sentence. Two formatters rather than one combined string, sliced:
// the locale decides where the separator falls, so a slice would be fragile.
function formatEventDayIST(eventDate: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(eventDate))
}
function formatEventTimeIST(eventDate: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(eventDate))
}

/** A full-width row inside the stone panel, under the When/Where pair. */
function paperDetailRow(label: string, valueHtml: string): string {
  return `
                      <tr>
                        <td style="padding:18px 0 0;">
                          <div style="border-top:1px solid ${PAPER_RULE};padding-top:16px;">
                            ${paperLabel(label)}
                            <div style="font-family:${PAPER_FONT};font-size:15px;line-height:1.55;color:${PAPER_INK};">${valueHtml}</div>
                          </div>
                        </td>
                      </tr>`
}

/**
 * A "here is what to do next" block: icon, title, one paragraph.
 *
 * The icons are yellow glyphs on transparent, which all but vanish on the stone
 * panel (1.7:1). They sit on a purple tile instead — the brand's own pairing at
 * 5.5:1, and the same purple as the button above them. Outlook renders the tile
 * square because it drops border-radius; that is fine.
 */
function paperStepCard(icon: string, title: string, bodyHtml: string): string {
  return `
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_STONE};border-radius:12px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" width="44" bgcolor="${PURPLE}" style="width:44px;height:44px;background:${PURPLE};border-radius:8px;text-align:center;">
                            <img src="${ICON_BASE}/${icon}.png" alt="" width="24" style="display:inline-block;width:24px;height:24px;border:0;vertical-align:middle;">
                          </td>
                          <td width="12" style="width:12px;font-size:0;line-height:0;">&nbsp;</td>
                          <td valign="middle">
                            <div style="font-family:${PAPER_FONT};font-size:16px;font-weight:650;line-height:1.3;color:${PAPER_INK};">${title}</div>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:12px 0 0;font-family:${PAPER_FONT};font-size:14.5px;line-height:1.62;color:${PAPER_BODY};">${bodyHtml}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
}

/** Inline link inside sheet copy. Purple, never yellow — see the palette note. */
function paperLink(href: string, label: string): string {
  return `<a href="${href}" target="_blank" style="color:${PURPLE};font-weight:650;text-decoration:underline;">${label}</a>`
}

export function welcomeEmail(params: {
  fullName: string | null
  username: string
  siteUrl: string
}): EmailContent {
  const { fullName, username, siteUrl } = params
  const profileUrl = `${siteUrl}/profile/${encodeURIComponent(username)}`
  const eventsUrl = `${siteUrl}/events`
  const milestonesUrl = `${siteUrl}/milestones`

  const sheet = `${paperMasthead()}
            <tr>
              <td class="pad" align="center" style="${PAPER_PAD}padding-bottom:20px;text-align:center;">
                <h1 class="h1" style="margin:0;font-family:${DISPLAY_FONT};font-weight:${DISPLAY_WEIGHT};font-size:35px;line-height:1.14;letter-spacing:-0.005em;color:${PAPER_INK};text-align:center;">Welcome to the club</h1>
                <p style="margin:10px 0 0;font-family:${PAPER_FONT};font-size:17px;line-height:1.5;color:${PAPER_BODY};text-align:center;">You&#39;re officially a Stride Run Club member.</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:24px;">
                <p style="margin:0 0 14px;font-family:${PAPER_FONT};font-size:16px;line-height:1.65;color:${PAPER_INK};font-weight:600;">Hey ${firstName(fullName)},</p>
                <p style="margin:0 0 14px;font-family:${PAPER_FONT};font-size:16px;line-height:1.68;color:${PAPER_BODY};">Welcome to India&#39;s fastest-growing fitness community.</p>
                <p style="margin:0;font-family:${PAPER_FONT};font-size:16px;line-height:1.68;color:${PAPER_BODY};">Whether you&#39;re chasing your first 5K or your next marathon, you&#39;ll train alongside a community that makes fitness more fun and keeps you going.</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:32px;">
                ${paperCta(profileUrl, 'View your profile')}
              </td>
            </tr>
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:14px;">
                <div style="font-family:${PAPER_FONT};font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${PAPER_MUTED};">Your next steps</div>
              </td>
            </tr>
            ${paperStepCard(
              'footprints',
              'Join your first experience',
              `No matter your fitness level, you&#39;ll always find a run that&#39;s right for you. We organize 2&#8211;3 community runs every week. ${paperLink(eventsUrl, 'Join the next experience here')}.`
            )}
            ${paperStepCard(
              'circle-user-round',
              'Your runner profile',
              'Add a photo, link your Strava, and tell your story so the crew can find you. Your Stride Tag is your check-in pass at every run.'
            )}
            ${paperStepCard(
              'circle-check-big',
              'Show up, earn rewards',
              `You don&#39;t have to be the fastest runner to earn recognition. Just keep showing up. Attend more runs, climb through our membership tiers, and unlock rewards reserved for our most committed members. ${paperLink(milestonesUrl, 'View the milestones here')}.`
            )}
            <tr><td style="height:18px;font-size:0;line-height:0;">&nbsp;</td></tr>
            ${paperFooter()}`

  return {
    subject: "Welcome to Stride Run Club - The 'Fittest Club' in India.",
    htmlContent: paperDocument({
      title: 'Welcome to Stride Run Club',
      preheader: 'You&#39;re officially a Stride Run Club member. Here is how to get started.',
      sheet,
    }),
  }
}

/** An invite-only applicant has been approved — "You're selected for X". */
export function selectedForEventEmail(params: TicketEmailParams): EmailContent {
  return registrationConfirmedEmail({ ...params, variant: 'selected' })
}

export function registrationConfirmedEmail(params: TicketEmailParams & {
  variant?: TicketVariant
}): EmailContent {
  const { fullName, eventName, eventDate, location, locationUrl, routeUrl, bannerUrl, runnerTag, calendarUrl, confirmationUrl, amountPaidPaise, paymentId, selectedPackages = [], variant = 'confirmed' } = params
  const isSelection = variant === 'selected'
  const event = escapeHtml(eventName)
  const tag = escapeHtml(runnerTag ?? '—')

  // ── Poster, linked to the ticket page ──────────────────────────────────────
  const posterRow = bannerUrl
    ? `
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:28px;">
                <a href="${confirmationUrl}" target="_blank" style="display:block;">
                  <img src="${bannerUrl}" alt="${event}" width="528" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;">
                </a>
              </td>
            </tr>`
    : ''

  // ── When / Where, side by side and stacking on mobile ──────────────────────
  const whenCell = eventDate
    ? `${paperLabel('When')}
                              <div style="font-family:${PAPER_FONT};font-size:15px;line-height:1.5;color:${PAPER_INK};font-weight:650;">${escapeHtml(formatEventDayIST(eventDate))}<br>${escapeHtml(formatEventTimeIST(eventDate))}</div>
                              <div style="font-family:${PAPER_FONT};font-size:13px;line-height:1.5;color:${PAPER_MUTED};padding-top:4px;">India Standard Time</div>`
    : `${paperLabel('When')}
                              <div style="font-family:${PAPER_FONT};font-size:15px;line-height:1.5;color:${PAPER_MUTED};">To be announced</div>`

  // href escaped like the route link below it. Admin-authored and URL-validated,
  // so this is defence in depth rather than a live hole — but a quote in the
  // value would otherwise close the attribute early. The other hrefs in this
  // file are constants or built from SITE_URL, so they are not the same input.
  const whereCell = location
    ? `${paperLabel('Where')}
                              <div style="font-family:${PAPER_FONT};font-size:15px;line-height:1.5;color:${PAPER_INK};font-weight:650;">${escapeHtml(location)}</div>${
                                locationUrl
                                  ? `
                              <div style="padding-top:4px;"><a href="${escapeHtml(locationUrl)}" target="_blank" style="font-family:${PAPER_FONT};font-size:13px;line-height:1.5;color:${PURPLE};font-weight:650;text-decoration:underline;">Open in Maps</a></div>`
                                  : ''
                              }`
    : ''

  // Half-width beside When, or the full panel width when the event has no
  // location set and When is the only thing in the pair.
  const paired = whereCell !== ''
  const whenTableWidth = paired ? '48%' : '100%'

  const whereTable = paired
    ? `
                      <table role="presentation" class="stack stack-next" width="48%" align="right" cellpadding="0" cellspacing="0" border="0" style="width:48%;">
                        <tr>
                          <td valign="top" style="padding:0;">
                            ${whereCell}
                          </td>
                        </tr>
                      </table>`
    : ''

  // ── The rows that only some events carry ───────────────────────────────────
  // Wording stays provider-neutral: the admin field takes Strava, Komoot or any
  // other link, so naming Strava here would be wrong as often as it was right.
  const routeRow = routeUrl
    ? paperDetailRow('Route', `<a href="${escapeHtml(routeUrl)}" target="_blank" style="color:${PURPLE};font-weight:650;text-decoration:underline;">View the run route</a>`)
    : ''

  // Package names are admin-authored free text, so every one is escaped.
  const packagesRow = selectedPackages.length > 0
    ? paperDetailRow(
        selectedPackages.length > 1 ? 'Your packages' : 'Your package',
        selectedPackages
          .map(pkg => `${escapeHtml(pkg.name)} <span style="color:${PAPER_MUTED};">· ${priceLabel(pkg.amountPaise)}</span>`)
          .join('<br>')
      )
    : ''

  const paymentRow = amountPaidPaise != null
    ? paperDetailRow(
        'Amount paid',
        `${formatRupees(amountPaidPaise)}${
          paymentId
            ? ` <span style="font-family:${MONO_FONT};font-size:12px;color:${PAPER_MUTED};">· ${escapeHtml(paymentId)}</span>`
            : ''
        }`
      )
    : ''

  // ── Stride Tag ─────────────────────────────────────────────────────────────
  // The one place yellow is allowed to shout: as a fill, with ink on top at
  // ~11:1. It is what the runner opens this mail at the start line to find, so
  // it gets its own band rather than a row in the panel.
  const tagBand = `
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${YELLOW}" style="background:${YELLOW};border-radius:12px;">
                  <tr>
                    <td align="center" style="padding:20px 22px;text-align:center;">
                      <div style="font-family:${PAPER_FONT};font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${BLACK};">Your Stride Tag</div>
                      <div style="font-family:${MONO_FONT};font-size:30px;font-weight:700;letter-spacing:5px;line-height:1.25;color:${BLACK};padding-top:6px;">${tag}</div>
                      <div style="font-family:${PAPER_FONT};font-size:12.5px;line-height:1.5;color:${BLACK};padding-top:6px;">Mention this tag to the organizers to gain entry.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`

  const calendarCta = calendarUrl
    ? paperGhostCta(
        calendarUrl,
        'Add to Google Calendar',
        `<img src="${ICON_BASE}/google-calendar.png" alt="" width="18" style="display:inline-block;width:18px;height:18px;border:0;vertical-align:-4px;">&nbsp;`
      )
    : ''

  const sheet = `${paperMasthead()}
            <tr>
              <td class="pad" align="center" style="${PAPER_PAD}padding-bottom:20px;text-align:center;">
                <h1 class="h1" style="margin:0;font-family:${DISPLAY_FONT};font-weight:${DISPLAY_WEIGHT};font-size:35px;line-height:1.14;letter-spacing:-0.005em;color:${PAPER_INK};text-align:center;">${
                  isSelection ? 'You&#39;re selected' : 'See you at the start line'
                }</h1>
                <p style="margin:10px 0 0;font-family:${PAPER_FONT};font-size:17px;line-height:1.5;color:${PAPER_BODY};text-align:center;">${event}</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:24px;">
                <p style="margin:0 0 14px;font-family:${PAPER_FONT};font-size:16px;line-height:1.65;color:${PAPER_INK};font-weight:600;">Hey ${firstName(fullName)},</p>
                <p style="margin:0 0 14px;font-family:${PAPER_FONT};font-size:16px;line-height:1.68;color:${PAPER_BODY};">${
                  isSelection
                    ? 'Your application has been approved and your spot is confirmed. See you there.'
                    : 'Your spot is confirmed! See you there, with all the energy.'
                }</p>
                <p style="margin:0;font-family:${PAPER_FONT};font-size:16px;line-height:1.68;color:${PAPER_BODY};">All the important details for this event are given below.</p>
              </td>
            </tr>
            ${posterRow}
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_STONE};border-radius:12px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <table role="presentation" class="stack" width="${whenTableWidth}" align="left" cellpadding="0" cellspacing="0" border="0" style="width:${whenTableWidth};">
                        <tr>
                          <td valign="top" style="padding:0;">
                            ${whenCell}
                          </td>
                        </tr>
                      </table>${whereTable}
                      <div style="clear:both;height:0;font-size:0;line-height:0;">&nbsp;</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${routeRow}${packagesRow}${paymentRow}</table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${tagBand}
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:32px;">
                ${paperCta(confirmationUrl, 'View your ticket')}
                ${calendarCta}
              </td>
            </tr>
            ${paperFooter()}`

  // The inbox preview line. Deliberately no Stride Tag: it is the entry
  // credential, and the preview pane shows it on a locked screen.
  const preheader = isSelection
    ? `You&#39;re in for ${event}.`
    : `Your spot at ${event} is confirmed.`

  return {
    subject: isSelection ? `You're selected for ${eventName}` : `Ticket for ${eventName}`,
    htmlContent: paperDocument({
      title: isSelection ? `You're selected for ${eventName}` : `Ticket for ${eventName}`,
      preheader,
      sheet,
    }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Slay Run Club — reporting time
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slay's own footer. Deliberately slimmer than Stride's — no mascot, no
 * social row, no tagline — because this is a one-off operational mail rather
 * than brand communication. The policy links stay: a bulk send needs a
 * reachable owner and a privacy policy behind it.
 */
function slayFooter(): string {
  const links = [
    { title: 'Privacy Policy', href: `${HOME_URL}/privacy-policy` },
    { title: 'Terms of Service', href: `${HOME_URL}/terms-of-service` },
    { title: 'Contact Us', href: `${HOME_URL}/contact-us` },
  ]
    .map(
      l =>
        `<a href="${l.href}" target="_blank" class="t-muted" style="color:${MUTED};text-decoration:none;">${l.title}</a>`
    )
    .join(`<span class="t-muted" style="color:${DIM};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)

  return `
    <tr>
      <td style="padding:0 32px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border-top:1px solid ${BORDER};">
          <tr>
            <td style="padding:22px 0 0;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.8;">
              ${links}
            </td>
          </tr>
          <tr>
            <td class="t-muted" style="padding:14px 0 0;text-align:center;font-family:${BODY_FONT};font-size:11px;color:${DIM};">
              &copy; ${new Date().getFullYear()} Slay Run Club · Bengaluru<br>
              You&#39;re receiving this because you registered for this run.
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

/**
 * DATE ONLY, in IST — deliberately no clock time. The reporting time is the
 * mail's single answer to "when do I show up", so a second clock on the date
 * row would only compete with it.
 *
 * Null on a missing or unparseable value.
 */
function safeRunDateIST(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

/**
 * A labelled row inside the details card. Mirrors the ticket email's shape so
 * the two read as one system, but takes pre-built (already escaped) value HTML
 * because the location row can carry a link.
 */
function slayDetailRow(label: string, valueHtml: string, first = false): string {
  return `
    <tr>
      <td style="padding:${first ? '24px' : '20px'} 28px 0;">
        <p class="t-muted" style="margin:0 0 5px;font-family:${MONO_FONT};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:${MUTED};">${label}</p>
        <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.55;color:${TEXT};">${valueHtml}</p>
      </td>
    </tr>`
}

// Zero-width joiners and BOMs, which arrive invisibly in anything pasted out of
// WhatsApp. Harmless to render but they defeat the bullet match below, so they
// come off before the note is parsed.
const INVISIBLES = /[\u200B-\u200D\u2060\uFEFF]/g

/**
 * Renders the instructions block. Blank lines separate paragraphs, and a
 * paragraph whose every line starts with a dash or bullet becomes a real list
 * — pasted checklists are the common case, and a run of `<br>`-joined dashes
 * reads far worse than `<li>`s.
 *
 * `<ul>` needs explicit margin and padding: clients disagree sharply on the
 * defaults, and Outlook drops the indent altogether without them.
 */
function slayNoteBody(note: string): string {
  return note
    .replace(INVISIBLES, '')
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const spacing = i === 0 ? '0' : '14px 0 0'
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      const isList = lines.length > 0 && lines.every(l => /^[-•*]\s+/.test(l))

      if (isList) {
        const items = lines
          .map(l => l.replace(/^[-•*]\s+/, '').trim())
          .map(
            item =>
              `<li style="margin:0 0 8px;padding:0;">${escapeHtml(item)}</li>`
          )
          .join('')
        return `<ul class="t" style="margin:${spacing};padding:0 0 0 20px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${TEXT};">${items}</ul>`
      }

      return `<p class="t" style="margin:${spacing};font-family:${BODY_FONT};font-size:14px;line-height:1.7;color:${TEXT};">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`
    })
    .join('')
}

export type SlayReportingEmailParams = {
  fullName: string | null
  /** Free text so the roster's own wording survives — "12:15 pm", "12:15 PM". */
  reportingTime: string
  /** Defaults to "Slay Run Club" when no run name is given. */
  runName?: string | null
  /** ISO timestamp. Rendered as an IST date, no clock; omitted when absent. */
  runDate?: string | null
  location: string
  /** Google Maps (or any) link for the location. Plain text when absent. */
  locationUrl?: string | null
  /**
   * The run's poster, at the top of the reporting-time card. Must be JPEG or
   * PNG — Outlook on Windows cannot decode the WebP the events bucket stores,
   * and would show a broken image in the hero.
   * scripts/prepare-event-poster.mjs converts an event's first banner.
   */
  posterUrl?: string | null
  whatsappUrl: string
  /** Instructions. Blank lines split paragraphs; dashed lines become a list. */
  note?: string | null
  /** Heading above the instructions. Defaults to "A quick note". */
  noteTitle?: string | null
}

/**
 * Run-day details for Slay Run Club — one reporting time for the whole field.
 *
 * Sent in bulk from a roster, so every field is treated as untrusted free text
 * and escaped, hrefs included, where an unescaped quote would close the
 * attribute early.
 *
 * The reporting time is the whole reason the mail exists, so it takes the hero
 * slot above the fold rather than a row in the details card.
 */
export function slayReportingTimeEmail(params: SlayReportingEmailParams): EmailContent {
  const {
    fullName, reportingTime, runName, runDate,
    location, locationUrl, posterUrl, whatsappUrl, note, noteTitle,
  } = params

  const run = runName?.trim() || 'Slay Run Club'
  const dateLine = safeRunDateIST(runDate)

  // Bleeds to the card's edges, so its own top corners have to match the
  // card's 14px radius minus the 1px border.
  const posterRow = posterUrl?.trim()
    ? `<tr>
                  <td style="padding:0;">
                    <img src="${escapeHtml(posterUrl.trim())}" alt="${escapeHtml(run)}" width="100%" style="display:block;width:100%;height:auto;border:0;border-radius:13px 13px 0 0;">
                  </td>
                </tr>`
    : ''

  const dateRow = dateLine
    ? slayDetailRow('Date', escapeHtml(dateLine), true)
    : ''

  const locationValue = locationUrl?.trim()
    ? `<a href="${escapeHtml(locationUrl.trim())}" target="_blank" class="slay-a" style="color:${SLAY_PINK_INK};text-decoration:underline;">${escapeHtml(location)}</a> <span class="t-muted" style="font-family:${BODY_FONT};font-size:12px;color:${MUTED};">(opens in Maps)</span>`
    : escapeHtml(location)

  const noteBody = note?.trim() ? slayNoteBody(note) : ''
  const noteCard = noteBody
    ? `
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid ${BORDER};border-radius:12px;">
                <tr>
                  <td style="padding:22px 26px;">
                    <h3 class="t" style="margin:0 0 12px;font-family:${HEADING_FONT};font-size:17px;line-height:1.35;color:${TEXT};">${escapeHtml(noteTitle?.trim() || 'A quick note')}</h3>
                    ${noteBody}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : ''

  // Lime fill, black label — the logo's pairing inverted, and the only
  // combination in this palette that clears AA at button text size. Unclassed
  // on purpose so dark mode never repaints the on-lime text white.
  const whatsappButton = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
      <tr>
        <td style="background-color:${SLAY_LIME};border-radius:6px;text-align:center;">
          <a href="${escapeHtml(whatsappUrl)}" target="_blank" style="display:block;padding:16px 24px;font-family:${BODY_FONT};font-size:15px;font-weight:bold;letter-spacing:0.3px;color:${BLACK};text-decoration:none;border-radius:6px;">Join the WhatsApp group</a>
        </td>
      </tr>
    </table>`

  const bodyContent = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:0 0 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:48px 32px 0;text-align:center;">
              <img src="${SLAY_LOGO_URL}" alt="Slay Run Club" width="176" style="display:inline-block;width:176px;max-width:62%;height:auto;border:0;border-radius:18px;">
            </td>
          </tr>
          <tr>
            <td style="padding:38px 32px 0;text-align:center;">
              <h1 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:32px;line-height:1.25;letter-spacing:-0.5px;font-weight:normal;color:${TEXT};">You&#39;re <strong class="slay-a" style="font-weight:bold;color:${SLAY_PINK_INK};">all set.</strong></h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 0;">
              <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${TEXT};">Hey ${firstName(fullName)}, here&#39;s everything you need for <strong style="font-weight:bold;">${escapeHtml(run)}</strong>. Everyone reports at the same time — the earlier you arrive, the earlier your wave.</p>
            </td>
          </tr>

          <!-- Hero: the reporting time. The one thing everyone opens this for. -->
          <tr>
            <td style="padding:30px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid ${BORDER};border-radius:14px;">
                ${posterRow}
                <tr>
                  <td style="padding:${posterRow ? '26px 28px 30px' : '30px 28px'};text-align:center;">
                    <p class="t-muted" style="margin:0 0 6px;font-family:${MONO_FONT};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:${MUTED};">Reporting time</p>
                    <p class="t" style="margin:0;font-family:${HEADING_FONT};font-size:40px;line-height:1.15;letter-spacing:-1px;color:${TEXT};">${escapeHtml(reportingTime)} <span class="t-muted" style="font-family:${BODY_FONT};font-size:15px;letter-spacing:0;color:${MUTED};">IST</span></p>
                    <p class="t-muted" style="margin:8px 0 0;font-family:${BODY_FONT};font-size:13px;color:${MUTED};">Same for everyone.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:16px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid ${BORDER};border-radius:14px;">
                ${dateRow}
                ${slayDetailRow('Where', locationValue, !dateRow)}
                <tr><td style="padding:0 28px 26px;"></td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              ${whatsappButton}
              <p class="t-muted" style="margin:12px 0 0;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${MUTED};">All race day updates go out on WhatsApp.</p>
            </td>
          </tr>

          ${noteCard}

          <tr><td style="padding:0 0 44px;"></td></tr>
          ${slayFooter()}
        </table>
      </td>
    </tr>
  </table>`

  return {
    subject: `${run} — reporting time ${reportingTime}`,
    htmlContent: emailDocument(bodyContent),
  }
}
