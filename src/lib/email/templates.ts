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

function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 0;">
      <tr>
        <td style="background-color:${YELLOW};border-radius:6px;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${BODY_FONT};font-size:15px;font-weight:bold;letter-spacing:0.3px;color:${BLACK};text-decoration:none;border-radius:6px;">${label}</a>
        </td>
      </tr>
    </table>`
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

function layout(heading: string, bodyHtml: string): string {
  return `${WEBFONT_STYLE}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#efeaf3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${PURPLE};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px 0;text-align:center;">
              <a href="${HOME_URL}" target="_blank" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="Stride Run Club" width="150" style="display:inline-block;width:150px;max-width:60%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;text-align:center;">
              <h1 style="margin:0;font-family:${HEADING_FONT};font-size:28px;line-height:1.25;letter-spacing:-0.3px;color:#ffffff;">${heading}</h1>
              <div style="width:44px;height:3px;background-color:${YELLOW};border-radius:2px;margin:16px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 40px;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
              ${bodyHtml}
            </td>
          </tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>`
}

function detailRow(label: string, valueHtml: string): string {
  return `
    <tr>
      <td style="padding:12px 18px;font-family:${MONO_FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.55);white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:12px 18px;font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:#ffffff;vertical-align:top;">${valueHtml}</td>
    </tr>`
}

export function welcomeEmail(params: {
  fullName: string | null
  username: string
  siteUrl: string
}): EmailContent {
  const { fullName, username, siteUrl } = params
  const profileUrl = `${siteUrl}/profile/${encodeURIComponent(username)}`

  const body = `
    <p style="margin:0 0 18px;">Hey ${firstName(fullName)},</p>
    <p style="margin:0 0 18px;">Your Stride profile is live — welcome to Bengaluru&#39;s fastest-growing running community. Whether it&#39;s your very first run or your fiftieth race, there&#39;s a place for you here. <strong style="color:#ffffff;">All paces, all fitness levels, one crew.</strong></p>
    <p style="margin:0 0 12px;font-family:${MONO_FONT};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${YELLOW};">Hit the ground running</p>
    <ul style="margin:0;padding-left:20px;">
      <li style="margin-bottom:10px;">Complete your profile so the community can find you</li>
      <li style="margin-bottom:10px;">Keep an eye out for our weekly runs across the city — cafe hops, lake loops, track nights and more</li>
      <li style="margin-bottom:0;">Bring a friend. Runs are better together.</li>
    </ul>
    ${ctaButton(profileUrl, 'View your profile')}
  `

  return {
    subject: 'Welcome to Stride Run Club — move as one 🏃',
    htmlContent: layout('Welcome to the club!', body),
  }
}

export function registrationConfirmedEmail(params: {
  fullName: string | null
  eventName: string
  eventDate: string | null
  location: string | null
  confirmationCode: string
  confirmationUrl: string
}): EmailContent {
  const { fullName, eventName, eventDate, location, confirmationCode, confirmationUrl } = params

  const rows = [
    detailRow('Event', escapeHtml(eventName)),
    eventDate ? detailRow('Date &amp; time', `${escapeHtml(formatEventDateIST(eventDate))} <span style="color:rgba(255,255,255,0.55);">(IST)</span>`) : '',
    location ? detailRow('Location', escapeHtml(location)) : '',
    detailRow('Code', `<span style="font-family:${MONO_FONT};font-size:15px;font-weight:bold;letter-spacing:1px;color:${YELLOW};">${escapeHtml(confirmationCode)}</span>`),
  ].join('')

  const body = `
    <p style="margin:0 0 18px;">Hey ${firstName(fullName)},</p>
    <p style="margin:0 0 22px;">Your spot is locked in for <strong style="color:#ffffff;">${escapeHtml(eventName)}</strong>. Here&#39;s everything you need:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;">
      ${rows}
    </table>
    <p style="margin:22px 0 0;">Keep your ticket handy — you&#39;ll need it at check-in.</p>
    ${ctaButton(confirmationUrl, 'View your ticket')}
  `

  return {
    subject: `You're in! Booking confirmed for ${eventName}`,
    htmlContent: layout('See you at the start line!', body),
  }
}
