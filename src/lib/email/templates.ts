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
const DARK_OVERRIDES =
  '/*RULES-START*/.t{color:#ffffff !important;}.t-muted{color:#CFC9D6 !important;}.card{border-color:#3A3A3A !important;}/*RULES-END*/'

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
              <p class="t" style="margin:16px 0 0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${TEXT};">Your Stride profile is live. Welcome to Bengaluru&#39;s fastest-growing running community: first run or fiftieth race, there&#39;s a place for you here. <strong>All paces, all fitness levels, one crew.</strong></p>
              ${ctaButton(profileUrl, 'View your profile', true)}
            </td>
          </tr>
          <tr>
            <td style="padding:52px 32px 0;text-align:center;">
              <h2 class="t" style="margin:0;font-family:${HEADING_FONT};font-size:26px;line-height:1.3;letter-spacing:-0.3px;font-weight:normal;color:${TEXT};">Here&#39;s your <strong style="font-weight:bold;color:${YELLOW};">next steps</strong></h2>
            </td>
          </tr>
          ${featureCard(
            'footprints',
            'Weekly runs, new routes',
            `Cafe hops, lake loops, hill repeats, track nights. We run somewhere new across Bengaluru every week, and <a href="${INSTAGRAM_URL}" target="_blank" style="color:${YELLOW};text-decoration:underline;">@stride_runclub_bengaluru</a> is where the next one drops.`
          )}
          ${featureCard(
            'circle-user-round',
            'Your runner profile',
            'Add a photo, link your Strava, and tell your story so the crew can find you. Your Stride Tag is your check-in pass at every run.'
          )}
          ${featureCard(
            'heart-handshake',
            'Bring a friend',
            '63% of our runners last year were first-timers. Runs are better with company, so bring someone along for their first 5K.'
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

export function registrationConfirmedEmail(params: {
  fullName: string | null
  eventName: string
  eventDate: string | null
  location: string | null
  locationUrl: string | null
  bannerUrl: string | null
  runnerTag: string | null
  calendarUrl: string | null
  confirmationUrl: string
  amountPaidPaise: number | null
  paymentId: string | null
}): EmailContent {
  const { fullName, eventName, eventDate, location, locationUrl, bannerUrl, runnerTag, calendarUrl, confirmationUrl, amountPaidPaise, paymentId } = params

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
      ? `<a href="${locationUrl}" target="_blank" style="color:${YELLOW};text-decoration:underline;">${escapeHtml(location)}</a> <span class="t-muted" style="font-family:${BODY_FONT};font-size:12px;color:${MUTED};">(opens in Google Maps)</span>`
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

  const paymentRow = amountPaidPaise != null
    ? `<tr>
        <td style="padding:20px 28px 0;">
          ${ticketLabel('Amount paid')}
          <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${TEXT};">₹${(amountPaidPaise / 100).toLocaleString('en-IN')}${
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
              <h1 class="t" style="margin:18px 0 0;font-family:${HEADING_FONT};font-size:32px;line-height:1.25;letter-spacing:-0.5px;font-weight:normal;color:${TEXT};">See you at the <strong style="font-weight:bold;color:${YELLOW};">start line!</strong></h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 0;">
              <p class="t" style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${TEXT};">Hey ${firstName(fullName)}, your spot is locked in. Bring your energy and we&#39;ll bring the crew.</p>
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
    subject: `Ticket for ${eventName}`,
    htmlContent: emailDocument(bodyContent),
  }
}
