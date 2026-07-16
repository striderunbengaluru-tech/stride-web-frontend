// Brand-styled transactional email templates. Email clients require
// table-based layout and inline styles — Tailwind does not apply here.
// Colors mirror the site tokens: #4B2862 (stride-purple-primary),
// #E1D03F (stride-yellow-accent), #010101 (copy-black on yellow).

type EmailContent = { subject: string; htmlContent: string }

const PURPLE = '#4B2862'
const YELLOW = '#E1D03F'
const BLACK = '#010101'

// Site typefaces (layout.tsx loads the same three via next/font). Clients that
// support webfonts (Apple Mail, iOS, Samsung, Outlook macOS) render them from
// the @import below; Gmail strips webfonts and falls back to the system stacks.
const BODY_FONT = "'Figtree', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const HEADING_FONT = "'Libre Baskerville', Georgia, 'Times New Roman', serif"
const MONO_FONT = "'Geist Mono', 'Courier New', Courier, monospace"

const WEBFONT_STYLE = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Figtree:wght@400;500;600;700&family=Geist+Mono:wght@400;700&display=swap');
  </style>`

// PNG copies of site assets — Gmail does not render SVG, Outlook does not
// render WebP, so the email versions live alongside the originals as PNG.
const LOGO_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.png'
const DUCKY_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/ducky-2.png'
// Brand-yellow lucide icons rasterized for email (inline SVG doesn't render in Gmail)
const ICON_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/email-icons'

// Footer links always point at the canonical live site, independent of the
// deploy that sent the email (CTA links use NEXT_PUBLIC_SITE_URL instead).
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

// Glassmorphic feature card (site glass pattern): centered icon, left-aligned copy.
function featureCard(icon: string, title: string, bodyHtml: string): string {
  return `
    <tr>
      <td style="padding:20px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:12px;">
          <tr>
            <td style="padding:30px 28px 26px;">
              <div style="text-align:center;">
                <img src="${ICON_BASE}/${icon}.png" alt="" width="52" style="display:inline-block;width:52px;height:52px;border:0;">
              </div>
              <h3 style="margin:18px 0 0;font-family:${HEADING_FONT};font-size:19px;line-height:1.35;color:#ffffff;">${title}</h3>
              <p style="margin:10px 0 0;font-family:${BODY_FONT};font-size:14px;line-height:1.65;color:rgba(255,255,255,0.8);">${bodyHtml}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

// Mirrors the website footer: Ducky the mascot, brand line, Explore/Legal
// links, socials, and the "Move as One." tagline with copyright on a
// bordered bottom bar.
function footer(): string {
  const links = FOOTER_LINKS.map(
    l =>
      `<a href="${l.href}" target="_blank" style="color:rgba(255,255,255,0.55);text-decoration:none;">${l.title}</a>`
  ).join('<span style="color:rgba(255,255,255,0.25);">&nbsp;&nbsp;·&nbsp;&nbsp;</span>')

  return `
    <tr>
      <td style="padding:0 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid rgba(255,255,255,0.12);">
          <tr>
            <td style="padding:26px 0 0;text-align:center;">
              <img src="${DUCKY_URL}" alt="Ducky, the Stride mascot" width="72" style="display:inline-block;width:72px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0 0;text-align:center;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:rgba(255,255,255,0.55);">
              Bengaluru&#39;s running community for every pace.<br>Events, group runs, and training.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.8;">
              ${links}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;text-align:center;font-family:${BODY_FONT};font-size:12px;">
              <a href="${INSTAGRAM_URL}" target="_blank" style="color:rgba(255,255,255,0.55);text-decoration:underline;">Instagram</a>
              <span style="color:rgba(255,255,255,0.25);">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
              <a href="${STRAVA_URL}" target="_blank" style="color:rgba(255,255,255,0.55);text-decoration:underline;">Strava</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid rgba(255,255,255,0.1);">
                <tr>
                  <td style="padding:18px 0 0;font-family:${BODY_FONT};font-size:11px;color:rgba(255,255,255,0.3);">&copy; ${new Date().getFullYear()} Stride Run Club, Bengaluru</td>
                  <td style="padding:18px 0 0;text-align:right;font-family:${HEADING_FONT};font-weight:bold;font-size:18px;letter-spacing:-0.3px;color:${YELLOW};">Move as One.</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

// Full-bleed hero layout (Stripo SaaS-welcome inspired): centered logo, large
// mixed-weight headline, «tagline», divider, greeting + wide CTA, then stacked
// glass feature cards under a "Get started" heading, closed by the site footer.
export function welcomeEmail(params: {
  fullName: string | null
  username: string
  siteUrl: string
}): EmailContent {
  const { fullName, username, siteUrl } = params
  const profileUrl = `${siteUrl}/profile/${encodeURIComponent(username)}`

  const htmlContent = `${WEBFONT_STYLE}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PURPLE};padding:0 0 8px;">
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
              <h1 style="margin:0;font-family:${HEADING_FONT};font-size:34px;line-height:1.2;letter-spacing:-0.5px;font-weight:normal;color:#ffffff;">Welcome to <strong style="font-weight:bold;color:${YELLOW};">the club!</strong></h1>
            </td>
          </tr>
          <tr>
            <td style="padding:44px 32px 0;">
              <div style="border-top:1px solid rgba(255,255,255,0.25);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:38px 32px 0;">
              <h2 style="margin:0;font-family:${HEADING_FONT};font-size:23px;line-height:1.3;color:#ffffff;">Hey ${firstName(fullName)},</h2>
              <p style="margin:16px 0 0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">Your Stride profile is live — welcome to Bengaluru&#39;s fastest-growing running community. Whether it&#39;s your very first run or your fiftieth race, there&#39;s a place for you here. <strong style="color:#ffffff;">All paces, all fitness levels, one crew.</strong></p>
              ${ctaButton(profileUrl, 'View your profile', true)}
            </td>
          </tr>
          <tr>
            <td style="padding:52px 32px 0;text-align:center;">
              <h2 style="margin:0;font-family:${HEADING_FONT};font-size:26px;line-height:1.3;letter-spacing:-0.3px;font-weight:normal;color:#ffffff;">Here&#39;s your <strong style="font-weight:bold;color:${YELLOW};">next steps</strong></h2>
            </td>
          </tr>
          ${featureCard(
            'footprints',
            'Weekly runs, new routes',
            `Cafe hops, lake loops, hill repeats, track nights — we run somewhere new across Bengaluru every single week. Follow <a href="${INSTAGRAM_URL}" target="_blank" style="color:${YELLOW};text-decoration:underline;">@stride_runclub_bengaluru</a> to catch the next one.`
          )}
          ${featureCard(
            'circle-user-round',
            'Your runner profile',
            'Add a photo, link your Strava, and tell your story so the crew can find you. Your Stride Tag is your check-in pass at every run.'
          )}
          ${featureCard(
            'heart-handshake',
            'Bring a friend',
            '63% of our runners last year were first-timers. Runs are better together — bring someone along for their first 5K.'
          )}
          <tr><td style="padding:0 0 44px;"></td></tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>`

  return {
    subject: 'Welcome to Stride Run Club — move as one 🏃',
    htmlContent,
  }
}

// Ticket-style confirmation (Dribbble email-confirmation motif): check-mark
// moment, serif headline, then the booking as an event ticket — details on
// top, a dashed perforation, and a boarding-pass code stub below.
export function registrationConfirmedEmail(params: {
  fullName: string | null
  eventName: string
  eventDate: string | null
  location: string | null
  confirmationCode: string
  confirmationUrl: string
}): EmailContent {
  const { fullName, eventName, eventDate, location, confirmationCode, confirmationUrl } = params

  const ticketLabel = (text: string) =>
    `<p style="margin:0 0 5px;font-family:${MONO_FONT};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,0.55);">${text}</p>`

  const dateCell = eventDate
    ? `<td style="padding:22px 12px 0 28px;vertical-align:top;">
        ${ticketLabel('Date &amp; time')}
        <p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:#ffffff;">${escapeHtml(formatEventDateIST(eventDate))} <span style="color:rgba(255,255,255,0.55);">IST</span></p>
      </td>`
    : ''
  const locationCell = location
    ? `<td style="padding:22px 28px 0 ${eventDate ? '12px' : '28px'};vertical-align:top;">
        ${ticketLabel('Location')}
        <p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:#ffffff;">${escapeHtml(location)}</p>
      </td>`
    : ''

  const htmlContent = `${WEBFONT_STYLE}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PURPLE};padding:0 0 8px;">
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
              <h1 style="margin:18px 0 0;font-family:${HEADING_FONT};font-size:32px;line-height:1.25;letter-spacing:-0.5px;font-weight:normal;color:#ffffff;">See you at the <strong style="font-weight:bold;color:${YELLOW};">start line!</strong></h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 0;">
              <p style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">Hey ${firstName(fullName)}, your spot is locked in. Bring your energy — we&#39;ll bring the crew.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;">
                <tr>
                  <td colspan="2" style="padding:26px 28px 0;">
                    ${ticketLabel('Event')}
                    <h2 style="margin:0;font-family:${HEADING_FONT};font-size:21px;line-height:1.35;color:#ffffff;">${escapeHtml(eventName)}</h2>
                  </td>
                </tr>
                <tr>${dateCell}${locationCell}</tr>
                <tr>
                  <td colspan="2" style="padding:26px 28px 0;">
                    <div style="border-top:1px dashed rgba(255,255,255,0.3);"></div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:20px 28px 26px;text-align:center;">
                    ${ticketLabel('Confirmation code')}
                    <p style="margin:2px 0 0;font-family:${MONO_FONT};font-size:22px;font-weight:bold;letter-spacing:3px;color:${YELLOW};">${escapeHtml(confirmationCode)}</p>
                    <p style="margin:8px 0 0;font-family:${BODY_FONT};font-size:12px;color:rgba(255,255,255,0.55);">Your Stride Tag is your ticket — mention it to the lead Strider at the run.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              ${ctaButton(confirmationUrl, 'View your ticket', true)}
            </td>
          </tr>
          <tr><td style="padding:0 0 48px;"></td></tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>`

  return {
    subject: `You're in! Booking confirmed for ${eventName}`,
    htmlContent,
  }
}
