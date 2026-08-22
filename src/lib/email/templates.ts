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

function formatEventDateIST(eventDate: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(eventDate))
}

// The CTA keeps a solid yellow fill with black text in BOTH modes — deliberately
// left unclassed so dark mode never flips the on-yellow text to white.
function ctaButton(href: string, label: string, wide = false): string {
  return `
    <table role="presentation" ${wide ? 'width="100%"' : ''} cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 0;">
      <tr>
        <td style="background-color:${YELLOW};border-radius:6px;text-align:center;">
          <a href="${href}" target="_blank" style="display:${wide ? 'block' : 'inline-block'};padding:${wide ? '16px 24px' : '14px 36px'};font-family:${BODY_FONT};font-size:15px;font-weight:bold;letter-spacing:0.3px;color:${BLACK};text-decoration:none;border-radius:6px;">${label}</a>
        </td>
      </tr>
    </table>`
}

// Bordered feature card — no fill, so it reads on any canvas; the border adapts
// via the .card class.
function featureCard(icon: string, title: string, bodyHtml: string): string {
  return `
    <tr>
      <td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid ${BORDER};border-radius:12px;">
          <tr>
            <td style="padding:24px 26px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="${ICON_BASE}/${icon}.png" alt="" width="40" style="display:block;width:40px;height:40px;border:0;">
                  </td>
                  <td style="vertical-align:middle;">
                    <h3 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:18px;line-height:1.35;color:${TEXT};">${title}</h3>
                  </td>
                </tr>
              </table>
              <p class="t" style="margin:12px 0 0;font-family:${BODY_FONT};font-size:14px;line-height:1.65;color:${TEXT};">${bodyHtml}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function footer(): string {
  const links = FOOTER_LINKS.map(
    l =>
      `<a href="${l.href}" target="_blank" class="t-muted" style="color:${MUTED};text-decoration:none;">${l.title}</a>`
  ).join(`<span class="t-muted" style="color:${DIM};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)

  return `
    <tr>
      <td style="padding:0 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border-top:1px solid ${BORDER};">
          <tr>
            <td style="padding:26px 0 0;text-align:center;">
              <img src="${DUCKY_URL}" alt="Ducky, the Stride mascot" width="72" style="display:inline-block;width:72px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td class="t-muted" style="padding:14px 0 0;text-align:center;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${MUTED};">
              Bengaluru&#39;s running community for every pace.<br>Events, group runs, and training.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.8;">
              ${links}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;text-align:center;">
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border-top:1px solid ${BORDER};">
                <tr>
                  <td class="t-muted" style="padding:18px 0 0;font-family:${BODY_FONT};font-size:11px;color:${DIM};">&copy; ${new Date().getFullYear()} Stride Run Club, Bengaluru</td>
                  <td style="padding:18px 0 0;text-align:right;font-family:${HEADING_FONT};font-weight:bold;font-size:18px;letter-spacing:-0.3px;color:${YELLOW};">Move as One.</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
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

  const bodyContent = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:0 0 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:52px 32px 0;text-align:center;">
              <a href="${HOME_URL}" target="_blank" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="Stride Run Club" width="150" style="display:inline-block;width:150px;max-width:60%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px 0;text-align:center;">
              <h1 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:34px;line-height:1.2;letter-spacing:-0.5px;font-weight:normal;color:${TEXT};">Welcome to <strong style="font-weight:bold;color:${YELLOW};">the club!</strong></h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px 0;">
              <div class="card" style="border-top:1px solid ${BORDER};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 32px 0;">
              <h2 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:23px;line-height:1.3;color:${TEXT};">Hey ${firstName(fullName)},</h2>
              <p class="t" style="margin:16px 0 0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${TEXT};">You&#39;re officially a Stride Run Club member. Welcome to India&#39;s fastest-growing fitness community.</p>
              <p class="t" style="margin:16px 0 0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${TEXT};">Whether you&#39;re chasing your first 5K or your next marathon, you&#39;ll train alongside a community that makes fitness more fun and keeps you going.</p>
              ${ctaButton(profileUrl, 'View your profile', true)}
            </td>
          </tr>
          <tr>
            <td style="padding:52px 32px 0;text-align:center;">
              <h2 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:26px;line-height:1.3;letter-spacing:-0.3px;font-weight:normal;color:${TEXT};">Here are your <strong style="font-weight:bold;color:${YELLOW};">next steps</strong></h2>
            </td>
          </tr>
          ${featureCard(
            'footprints',
            'Join your first experience',
            `No matter your fitness level, you&#39;ll always find a run that&#39;s right for you. We organize 2&#8211;3 community runs every week. <a href="${eventsUrl}" target="_blank" style="color:${YELLOW};text-decoration:underline;">Join the next experience here</a>.`
          )}
          ${featureCard(
            'circle-user-round',
            'Your runner profile',
            'Add a photo, link your Strava, and tell your story so the crew can find you. Your Stride Tag is your check-in pass at every run.'
          )}
          ${featureCard(
            'circle-check-big',
            'Show up. Earn Rewards.',
            `You don&#39;t have to be the fastest runner to earn recognition. Just keep showing up. Attend more runs, climb through our membership tiers, and unlock rewards reserved for our most committed members. <a href="${milestonesUrl}" target="_blank" style="color:${YELLOW};text-decoration:underline;">View the milestones here</a>.`
          )}
          <tr><td style="padding:0 0 44px;"></td></tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>`

  return {
    subject: "Welcome to Stride Run Club - The 'Fittest Club' in India.",
    htmlContent: emailDocument(bodyContent),
  }
}

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

/** An invite-only applicant has been approved — "You're selected for X". */
export function selectedForEventEmail(params: TicketEmailParams): EmailContent {
  return registrationConfirmedEmail({ ...params, variant: 'selected' })
}

export function registrationConfirmedEmail(params: TicketEmailParams & {
  variant?: TicketVariant
}): EmailContent {
  const { fullName, eventName, eventDate, location, locationUrl, routeUrl, bannerUrl, runnerTag, calendarUrl, confirmationUrl, amountPaidPaise, paymentId, selectedPackages = [], variant = 'confirmed' } = params
  const isSelection = variant === 'selected'

  const ticketLabel = (text: string) =>
    `<p class="t-muted" style="margin:0 0 5px;font-family:${MONO_FONT};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:${MUTED};">${text}</p>`

  const bannerRow = bannerUrl
    ? `<tr>
        <td style="padding:0;">
          <a href="${confirmationUrl}" target="_blank" style="text-decoration:none;">
            <img src="${bannerUrl}" alt="${escapeHtml(eventName)}" width="100%" style="display:block;width:100%;height:auto;border:0;border-radius:13px 13px 0 0;">
          </a>
        </td>
      </tr>`
    : ''

  const whenRow = eventDate
    ? `<tr>
        <td style="padding:20px 28px 0;">
          ${ticketLabel('When')}
          <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${TEXT};">${escapeHtml(formatEventDateIST(eventDate))} <span class="t-muted" style="color:${MUTED};">IST</span></p>
        </td>
      </tr>`
    : ''

  const whereValue = location
    ? locationUrl
      // href escaped like the route link below it. Admin-authored and
      // URL-validated, so this is defence in depth rather than a live hole —
      // but a quote in the value would otherwise close the attribute early.
      // The other hrefs in this file are either constants or built from
      // SITE_URL, so they are not the same class of input.
      ? `<a href="${escapeHtml(locationUrl)}" target="_blank" style="color:${YELLOW};text-decoration:underline;">${escapeHtml(location)}</a> <span class="t-muted" style="font-family:${BODY_FONT};font-size:12px;color:${MUTED};">(opens in Google Maps)</span>`
      : escapeHtml(location)
    : null
  const whereRow = whereValue
    ? `<tr>
        <td style="padding:20px 28px 0;">
          ${ticketLabel('Where')}
          <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${TEXT};">${whereValue}</p>
        </td>
      </tr>`
    : ''

  // The run route, when the event has one. Sits under Where because that is
  // what it answers — the runner has the place, this is the shape of the run.
  // Wording stays provider-neutral: the admin field takes Strava, Komoot or any
  // other link, so naming Strava here would be wrong as often as it was right.
  const routeRow = routeUrl
    ? `<tr>
        <td style="padding:20px 28px 0;">
          ${ticketLabel('Route')}
          <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${TEXT};"><a href="${escapeHtml(routeUrl)}" target="_blank" style="color:${YELLOW};text-decoration:underline;">View the run route</a></p>
        </td>
      </tr>`
    : ''

  // What they picked, when the event was priced with packages. Package names are
  // admin-authored free text, so every one is escaped. No background colour and
  // both text classes present, per the dark-mode strategy at the top of this file.
  const packagesRow = selectedPackages.length > 0
    ? `<tr>
        <td style="padding:20px 28px 0;">
          ${ticketLabel(selectedPackages.length > 1 ? 'Your packages' : 'Your package')}
          ${selectedPackages.map(pkg => `
          <p class="t" style="margin:0 0 4px;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${TEXT};">${escapeHtml(pkg.name)} <span class="t-muted" style="color:${MUTED};">· ${priceLabel(pkg.amountPaise)}</span></p>`).join('')}
        </td>
      </tr>`
    : ''

  const paymentRow = amountPaidPaise != null
    ? `<tr>
        <td style="padding:20px 28px 0;">
          ${ticketLabel('Amount paid')}
          <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${TEXT};">${formatRupees(amountPaidPaise)}${
            paymentId
              ? ` <span class="t-muted" style="font-family:${MONO_FONT};font-size:12px;color:${MUTED};">· ${escapeHtml(paymentId)}</span>`
              : ''
          }</p>
        </td>
      </tr>`
    : ''

  // Bordered secondary CTA (no fill) with the Google Calendar mark.
  const calendarButton = calendarUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="margin:14px auto 0;border:1px solid ${BORDER};border-radius:6px;">
        <tr>
          <td style="text-align:center;">
            <a href="${calendarUrl}" target="_blank" class="t" style="display:block;padding:14px 24px;font-family:${BODY_FONT};font-size:14px;font-weight:bold;color:${TEXT};text-decoration:none;border-radius:6px;">
              <img src="${ICON_BASE}/google-calendar.png" alt="" width="18" style="display:inline-block;width:18px;height:18px;border:0;vertical-align:-4px;">
              &nbsp;Add to Google Calendar
            </a>
          </td>
        </tr>
      </table>`
    : ''

  const bodyContent = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:0 0 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:52px 32px 0;text-align:center;">
              <a href="${HOME_URL}" target="_blank" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="Stride Run Club" width="150" style="display:inline-block;width:150px;max-width:60%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px 0;text-align:center;">
              <img src="${ICON_BASE}/circle-check-big.png" alt="" width="44" style="display:inline-block;width:44px;height:44px;border:0;">
              <h1 class="t" style="margin:18px 0 0;font-family:${HEADING_FONT};font-size:32px;line-height:1.25;letter-spacing:-0.5px;font-weight:normal;color:${TEXT};">${
                isSelection
                  ? `You&#39;re <strong style="font-weight:bold;color:${YELLOW};">selected!</strong>`
                  : `See you at the <strong style="font-weight:bold;color:${YELLOW};">start line!</strong>`
              }</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 0;">
              <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${TEXT};">${
                isSelection
                  ? `Hey ${firstName(fullName)}, your application for <strong style="font-weight:bold;">${escapeHtml(eventName)}</strong> has been approved and your spot is now confirmed. See you there!`
                  : `Hey ${firstName(fullName)}, your spot is locked in. Bring your energy and we&#39;ll bring the crew.`
              }</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid ${BORDER};border-radius:14px;">
                ${bannerRow}
                <tr>
                  <td style="padding:24px 28px 0;">
                    ${ticketLabel('What')}
                    <h2 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:21px;line-height:1.35;color:${TEXT};">${escapeHtml(eventName)}</h2>
                  </td>
                </tr>
                ${whenRow}
                ${whereRow}
                ${routeRow}
                ${packagesRow}
                ${paymentRow}
                <tr>
                  <td style="padding:26px 28px 0;">
                    <div class="card" style="border-top:1px dashed ${BORDER};"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 26px;text-align:center;">
                    ${ticketLabel('Your Stride Tag')}
                    <p style="margin:2px 0 0;font-family:${MONO_FONT};font-size:26px;font-weight:bold;letter-spacing:4px;color:${YELLOW};">${escapeHtml(runnerTag ?? '—')}</p>
                    <p class="t-muted" style="margin:8px 0 0;font-family:${BODY_FONT};font-size:12px;color:${MUTED};">Mention this tag to the organizers to gain entry.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              ${ctaButton(confirmationUrl, 'View your ticket', true)}
              ${calendarButton}
            </td>
          </tr>
          <tr><td style="padding:0 0 48px;"></td></tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>`

  return {
    subject: isSelection ? `You're selected for ${eventName}` : `Ticket for ${eventName}`,
    htmlContent: emailDocument(bodyContent),
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
