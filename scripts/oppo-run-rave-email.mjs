// Renderer for the Mall Run & Party with OPPO promo mail (Lulu Mall, Sunday 11 October).
//
// Same sheet as scripts/map-festival-email.mjs, locked to the Modern Elegant
// pairing (Instrument Serif + Instrument Sans): white paper on a warm ground,
// purple CTA, yellow used only as a fill. Only the copy, poster and event facts
// differ. Event facts come from the `events` row for slug `oppo-run-rave` and
// the event's schedule poster.
//
// The poster must be the JPEG at email-posters/oppo-run-rave.jpg, produced by
// `node --env-file=.env.local scripts/prepare-event-poster.mjs oppo-run-rave`.
// Outlook for Windows cannot decode the event's WebP banner.

const BASE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets'
export const LIVE_ASSETS = {
  poster: BASE + '/images/web-assets/email-posters/oppo-run-rave.jpg',
  logo: BASE + '/images/web-assets/email-icons/stride-logo-purple-bg.png',
  ducky: BASE + '/images/web-assets/ducky-2.png',
  ig: BASE + '/images/web-assets/email-icons/instagram.png',
  strava: BASE + '/images/web-assets/email-icons/strava.png'
}

const HOME_URL = 'https://www.strideclub.in'
const EVENT_URL = HOME_URL + '/events/oppo-run-rave'
const UTM_CAMPAIGN = 'oppo-run-rave'
const MAPS_URL = 'https://maps.app.goo.gl/b8LN6fDeeBAxEm9s8'
const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL = 'https://strava.app.link/eFnB8k3rw2b'

export const SUBJECT = 'Sunday plan: a 3K, a DJ, and OPPO gadgets'
const PREHEADER = 'Beginner-friendly, around Lulu Mall. \u20B9599, or \u20B9999 for two. Sunday 11 Oct, check-in from 6:15 AM.'

/* Same five links, in the same order, as the welcome email's footer. */
const FOOTER_LINKS = [
  { title: 'Blog', href: HOME_URL + '/blog' },
  { title: 'Partnerships', href: HOME_URL + '/partnerships' },
  { title: 'Privacy Policy', href: HOME_URL + '/privacy-policy' },
  { title: 'Terms of Service', href: HOME_URL + '/terms-of-service' },
  { title: 'Contact Us', href: HOME_URL + '/contact-us' }
]

const DISPLAY = "'Instrument Serif', Georgia, 'Times New Roman', serif"
const BODY = "'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const DISPLAY_FALLBACK = "Georgia, 'Times New Roman', serif"
const BODY_FALLBACK = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wght@400;500;600;700&display=swap">'

/* Neutral palette. Yellow is a fill, never a text colour. */
const C = {
  paper: '#FFFFFF',
  ground: '#EDEAE4',
  ink: '#1C1A22',
  body: '#4A4652',
  muted: '#79737F',
  stone: '#F4F1ED',
  rule: '#E4E0DA',
  purple: '#4B2862',
  yellow: '#E1D03F'
}

/* From the "The Morning Looks Like This" poster. Icebreakers and cooldown are
   dropped: four rows is enough to show the shape of the morning. */
const SCHEDULE = [
  { time: '6:15 AM', what: 'Check-in opens. It closes at 6:45 sharp.' },
  { time: '7:00 AM', what: 'Warm-up' },
  { time: '7:20 AM', what: 'Run starts' },
  { time: '8:30 AM', what: 'Dance party till 10' }
]

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function tagged(slot) {
  return EVENT_URL +
    '?utm_source=brevo&utm_medium=email&utm_campaign=' + UTM_CAMPAIGN +
    '&utm_content=' + slot
}

export function buildEmail({ name, assets = LIVE_ASSETS, fallback = false, unsubscribeUrl }) {
  const displayFamily = fallback ? DISPLAY_FALLBACK : DISPLAY
  const bodyText = 'font-family:' + (fallback ? BODY_FALLBACK : BODY) + ';'
  const pad = 'padding-left:36px;padding-right:36px;'
  const firstName = esc(name || 'there')
  const label = bodyText + 'font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:' + C.muted + ';padding-bottom:6px;'
  const para = 'margin:0 0 14px;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.body + ';'

  const footerLinks = FOOTER_LINKS.map(l =>
    '<a href="' + l.href + '" style="' + bodyText + 'font-size:12px;color:' + C.muted + ';text-decoration:none;">' + l.title + '</a>'
  ).join('<span style="color:' + C.rule + ';">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>')

  const schedule = SCHEDULE.map(s =>
    '<tr>' +
      '<td width="92" valign="top" style="padding:0 0 11px;' + bodyText + 'font-size:15px;line-height:1.6;color:' + C.purple + ';font-weight:700;white-space:nowrap;">' + s.time + '</td>' +
      '<td valign="top" style="padding:0 0 11px;' + bodyText + 'font-size:15px;line-height:1.6;color:' + C.body + ';">' + s.what + '</td>' +
    '</tr>'
  ).join('')

  return '' +
'<!doctype html>' +
'<html lang="en"><head>' +
'<meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light only">' +
'<meta name="supported-color-schemes" content="light only">' +
'<title>Mall Run &amp; Party with OPPO, Sunday 11 October</title>' +
(fallback ? '' : FONT_LINK) +
'<style>' +
'  body{margin:0;padding:0;width:100%!important;background:' + C.ground + ';-webkit-text-size-adjust:100%;}' +
'  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}' +
'  table{border-collapse:collapse;}' +
'  a{text-decoration:none;}' +
'  .col{width:600px;}' +
'  .pad{padding-left:36px;padding-right:36px;}' +
'  @media only screen and (max-width:620px){' +
'    .col{width:100%!important;}' +
'    .pad{padding-left:22px!important;padding-right:22px!important;}' +
'    .stack{display:block!important;width:100%!important;}' +
'    .stack-gap{height:16px!important;}' +
'    .h1{font-size:28px!important;}' +
'  }' +
'</style>' +
'</head>' +
'<body style="margin:0;padding:0;background:' + C.ground + ';">' +

'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + PREHEADER + '</div>' +

'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.ground + ';">' +
'<tr><td align="center" style="padding:28px 12px 40px;">' +

'<table role="presentation" class="col" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:' + C.paper + ';border-radius:16px;overflow:hidden;">' +

  /* Logo + yellow fill rule */
  '<tr><td class="pad" align="center" style="' + pad + 'padding-top:34px;padding-bottom:26px;text-align:center;">' +
    '<img src="' + assets.logo + '" width="150" alt="Stride Run Club" style="display:inline-block;width:150px;max-width:55%;height:auto;border-radius:6px;">' +
    '<div style="width:46px;height:4px;background:' + C.yellow + ';border-radius:2px;margin:18px auto 0;"></div>' +
  '</td></tr>' +

  /* Title + subtitle */
  '<tr><td class="pad" align="center" style="' + pad + 'padding-bottom:20px;text-align:center;">' +
    '<h1 class="h1" style="margin:0;font-family:' + displayFamily + ';font-weight:400;font-size:35px;line-height:1.14;letter-spacing:-.005em;color:' + C.ink + ';text-align:center;">' +
      'Mall Run &amp; Party with OPPO' +
    '</h1>' +
    '<p style="margin:10px 0 0;' + bodyText + 'font-size:17px;line-height:1.5;color:' + C.body + ';text-align:center;">' +
      'A beginner-friendly 3K around Lulu Mall, then a morning dance party.' +
    '</p>' +
  '</td></tr>' +

  /* Greeting + pitch */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:24px;">' +
    '<p style="margin:0 0 14px;' + bodyText + 'font-size:16px;line-height:1.65;color:' + C.ink + ';font-weight:600;">Hey ' + firstName + ',</p>' +
    '<p style="' + para + '">This Sunday we’re running around Lulu Mall with OPPO. It’s Stride’s first mall run, and the route is one none of us has run before.</p>' +
    '<p style="' + para + '">The run is 3K at an easy pace, so you don’t need to call yourself a runner to come. After the cooldown a DJ takes over, and the dance party goes till 10.</p>' +
    '<p style="margin:0;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.body + ';">Get a performance T-shirt, enjoy beverages, and win OPPO gadgets at games.</p>' +
  '</td></tr>' +

  /* Poster */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:28px;">' +
    '<a href="' + tagged('hero-poster') + '" style="display:block;">' +
      '<img src="' + assets.poster + '" width="528" alt="The AM Party poster: Stride Run Club and OPPO, 11 October, Sunday, Lulu Mall, Bengaluru" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;">' +
    '</a>' +
  '</td></tr>' +

  /* Schedule */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:8px;">' +
    '<div style="' + bodyText + 'font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:' + C.muted + ';padding-bottom:14px;">How the morning goes</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + schedule + '</table>' +
  '</td></tr>' +

  '<tr><td class="pad" style="' + pad + 'padding-top:10px;padding-bottom:28px;">' +
    '<p style="margin:0;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.ink + ';font-weight:600;">Come on your own and you’ll leave knowing people. Or bring a friend: two tickets are ₹999 instead of ₹1,198.</p>' +
  '</td></tr>' +

  /* When / where */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:28px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.stone + ';border-radius:12px;">' +
      '<tr><td style="padding:20px 22px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
          '<tr>' +
            '<td class="stack" width="50%" valign="top" style="padding:0 10px 0 0;">' +
              '<div style="' + label + '">When</div>' +
              '<div style="' + bodyText + 'font-size:15px;line-height:1.5;color:' + C.ink + ';font-weight:650;">Sunday, 11 October<br>6:15 AM</div>' +
              '<div style="' + bodyText + 'font-size:13px;line-height:1.5;color:' + C.muted + ';padding-top:4px;">Check-in closes 6:45 AM</div>' +
            '</td>' +
            '<td class="stack-gap" width="1" style="font-size:0;line-height:0;">&nbsp;</td>' +
            '<td class="stack" width="50%" valign="top" style="padding:0;">' +
              '<div style="' + label + '">Where</div>' +
              '<div style="' + bodyText + 'font-size:15px;line-height:1.5;color:' + C.ink + ';font-weight:650;">Lulu Mall<br>Bengaluru</div>' +
              '<div style="padding-top:4px;"><a href="' + MAPS_URL + '" style="' + bodyText + 'font-size:13px;line-height:1.5;color:' + C.purple + ';font-weight:650;text-decoration:underline;">Open in Maps</a></div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  /* CTA, rounded-md, never a pill */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:14px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>' +
      '<td align="center" bgcolor="' + C.purple + '" style="background:' + C.purple + ';border-radius:6px;">' +
        '<a href="' + tagged('register-cta') + '" style="display:block;padding:16px 24px;' + bodyText + 'font-size:16px;font-weight:700;letter-spacing:.01em;color:#FFFFFF;text-decoration:none;">Get your ticket</a>' +
      '</td>' +
    '</tr></table>' +
  '</td></tr>' +

  '<tr><td class="pad" align="center" style="' + pad + 'padding-bottom:32px;text-align:center;">' +
    '<div style="' + bodyText + 'font-size:13px;line-height:1.6;color:' + C.muted + ';">₹599 for one, ₹999 for two. 200 spots.<br>Bag drop and water at the venue.</div>' +
  '</td></tr>' +

  /* Footer, identical to the MAP mail */
  '<tr><td class="pad" style="' + pad + 'padding-top:0;padding-bottom:0;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ' + C.rule + ';">' +
      '<tr><td align="center" style="padding:26px 0 0;text-align:center;">' +
        '<img src="' + assets.ducky + '" width="72" alt="Ducky, the Stride mascot" style="display:inline-block;width:72px;height:auto;border:0;">' +
      '</td></tr>' +
      '<tr><td align="center" style="padding:14px 0 0;text-align:center;' + bodyText + 'font-size:13px;line-height:1.6;color:' + C.muted + ';">' +
        'Bengaluru’s running community for every pace.<br>Events, group runs, and training.' +
      '</td></tr>' +
      '<tr><td align="center" style="padding:16px 0 0;text-align:center;' + bodyText + 'font-size:12px;line-height:1.9;">' + footerLinks + '</td></tr>' +
      /* Marketing mail must carry a working unsubscribe. Only rendered when the
         sender passes a signed link, so a preview build shows no dead link. */
      (unsubscribeUrl
        ? '<tr><td align="center" style="padding:12px 0 0;text-align:center;' + bodyText + 'font-size:11px;line-height:1.6;color:' + C.muted + ';">' +
            'You\u2019re getting this because you opted in to emails about Stride runs and partner events. ' +
            '<a href="' + esc(unsubscribeUrl) + '" style="' + bodyText + 'font-size:11px;color:' + C.muted + ';text-decoration:underline;">Unsubscribe</a>' +
          '</td></tr>'
        : '') +
      '<tr><td align="center" style="padding:16px 0 0;text-align:center;">' +
        '<a href="' + INSTAGRAM_URL + '" style="display:inline-block;padding:0 9px;text-decoration:none;">' +
          '<img src="' + assets.ig + '" width="22" height="22" alt="Instagram" style="display:inline-block;width:22px;height:22px;border:0;">' +
        '</a>' +
        '<a href="' + STRAVA_URL + '" style="display:inline-block;padding:0 9px;text-decoration:none;">' +
          '<img src="' + assets.strava + '" width="22" height="22" alt="Strava" style="display:inline-block;width:22px;height:22px;border:0;">' +
        '</a>' +
      '</td></tr>' +
      '<tr><td style="padding:24px 0 0;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ' + C.rule + ';">' +
          '<tr>' +
            '<td style="padding:18px 0 0;' + bodyText + 'font-size:11px;line-height:1.5;color:' + C.muted + ';">&copy; 2026 Stride Run Club, Bengaluru</td>' +
            '<td align="right" style="padding:18px 0 0;text-align:right;font-family:' + displayFamily + ';font-weight:400;font-size:17px;line-height:1.4;letter-spacing:-.005em;color:' + C.ink + ';">Move as One.</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  '<tr><td style="height:34px;font-size:0;line-height:0;">&nbsp;</td></tr>' +

'</table>' +
'</td></tr></table>' +
'</body></html>'
}

/* `unsubscribeUrl` is the signed per-recipient link (see unsubscribeUrl in the
   send script). Optional only so preview builds can render without a secret. */
export function render(firstName, unsubscribeUrl) {
  return buildEmail({ name: firstName, unsubscribeUrl })
}
