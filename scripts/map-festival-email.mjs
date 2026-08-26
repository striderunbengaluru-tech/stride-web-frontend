// Renderer for the MAP Fitness Festival promo mail.
//
// Extracted verbatim from the approved preview artifact
// (claude.ai/code/artifact/70f76ff4-e526-4512-a291-ba3accbe3667) rather than
// retyped, so what lands in an inbox is byte-identical to what was signed off.
// Locked to the Modern Elegant pairing with the live Supabase image URLs.
//
// Used by scripts/send-map-festival-emails.mjs. If the copy changes, re-extract
// rather than editing both by hand.

  var BASE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets';
  var POSTER_LIVE = BASE + '/images/web-assets/email-posters/map-fitness-rave.jpg';
  var LOGO_LIVE = BASE + '/images/web-assets/email-icons/stride-logo-purple-bg.png';
  var DUCKY_LIVE = BASE + '/images/web-assets/ducky-2.png';
  var IG_LIVE = BASE + '/images/web-assets/email-icons/instagram.png';
  var STRAVA_LIVE = BASE + '/images/web-assets/email-icons/strava.png';
  var HOME_URL = 'https://www.strideclub.in';
  var EVENT_URL = HOME_URL + '/events/map-fitness-rave';

  /* Campaign tags. `utm_content` is the only value that differs between the two
     links, so the poster and the button can be told apart instead of collapsing
     into one number. See the Attribution note on the page for what Vercel can
     actually do with these. */
  var UTM_CAMPAIGN = 'map-fitness-rave';

  function tagged(slot) {
    return EVENT_URL +
      '?utm_source=brevo' +
      '&utm_medium=email' +
      '&utm_campaign=' + UTM_CAMPAIGN +
      '&utm_content=' + slot;
  }
  var MAPS_URL = 'https://maps.app.goo.gl/tAjVpGyvEU7ajnbn9';
  var INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/';
  var STRAVA_URL = 'https://strava.app.link/eFnB8k3rw2b';

  /* Same five links, in the same order, as the welcome email's footer. */
  var FOOTER_LINKS = [
    { title: 'Blog', href: HOME_URL + '/blog' },
    { title: 'Partnerships', href: HOME_URL + '/partnerships' },
    { title: 'Privacy Policy', href: HOME_URL + '/privacy-policy' },
    { title: 'Terms of Service', href: HOME_URL + '/terms-of-service' },
    { title: 'Contact Us', href: HOME_URL + '/contact-us' }
  ];

  /* Four directions, not four skins. Each carries its own case, tracking and
     weight, because a face only reads as chosen when it is set properly.
     `fallback` is the stack minus the web font — what Gmail and Outlook show. */
  var PAIRINGS = [
    {
      id: 'poster',
      name: 'Poster Echo',
      faces: 'Archivo Black + Archivo',
      note: 'Heavy condensed caps, straight off the poster. The loudest of the four; pick it if the mail should feel like the artwork shouting.',
      display: "'Archivo Black', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
      displayFallback: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
      displayWeight: '400',
      displayCase: 'uppercase',
      displayTrack: '-0.01em',
      displayLh: '1.08',
      displaySize: '30px',
      body: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif",
      bodyFallback: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },
    {
      id: 'site',
      name: 'Site Match',
      faces: 'Libre Baskerville + Figtree',
      note: 'The exact faces strideclub.in already uses, so the mail and the site read as one brand. The safe, coherent choice.',
      display: "'Libre Baskerville', Georgia, 'Times New Roman', serif",
      displayFallback: "Georgia, 'Times New Roman', serif",
      displayWeight: '700',
      displayCase: 'none',
      displayTrack: '-0.008em',
      displayLh: '1.24',
      displaySize: '27px',
      body: "Figtree, 'Helvetica Neue', Helvetica, Arial, sans-serif",
      bodyFallback: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },
    {
      id: 'warm',
      name: 'Warm Editorial',
      faces: 'Fraunces + Inter',
      note: 'A soft, slightly wonky serif. Leans on community warmth rather than event hype, and closest to how Stride actually writes.',
      display: "Fraunces, Georgia, 'Times New Roman', serif",
      displayFallback: "Georgia, 'Times New Roman', serif",
      displayWeight: '700',
      displayCase: 'none',
      displayTrack: '-0.014em',
      displayLh: '1.16',
      displaySize: '31px',
      body: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
      bodyFallback: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },
    {
      id: 'elegant',
      name: 'Modern Elegant',
      faces: 'Instrument Serif + Instrument Sans',
      note: 'High-contrast serif at a large size, everything else quiet. The most premium and least shouty of the four.',
      display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
      displayFallback: "Georgia, 'Times New Roman', serif",
      displayWeight: '400',
      displayCase: 'none',
      displayTrack: '-0.005em',
      displayLh: '1.14',
      displaySize: '35px',
      body: "'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      bodyFallback: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    }
  ];

  /* Neutral palette. Yellow is a fill, never a text colour. */
  var C = {
    paper: '#FFFFFF',
    ground: '#EDEAE4',
    ink: '#1C1A22',
    body: '#4A4652',
    muted: '#79737F',
    stone: '#F4F1ED',
    rule: '#E4E0DA',
    purple: '#4B2862',
    yellow: '#E1D03F'
  };

  /* Deliberately short. The paragraphs above already cover the run, the three
     workouts, the dance party, the coffee and the meal; repeating them here
     would just say the same thing twice. These two are what the copy omits. */
  var BULLETS = [
    'RowErg and deadlift challenges, with goodies for whoever tops the board.',
    'A photographer on the floor, catching you in action.'
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildEmail(opts) {
    var p = opts.pairing;
    var displayFamily = opts.fallback ? p.displayFallback : p.display;
    var bodyFamily = opts.fallback ? p.bodyFallback : p.body;
    var name = esc(opts.name || 'there');
    var fontLink = opts.fallback ? '' :
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&family=Figtree:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter:wght@400;500;600;700&family=Instrument+Serif&family=Instrument+Sans:wght@400;500;600;700&display=swap">';

    var bodyText = 'font-family:' + bodyFamily + ';';
    var pad = 'padding-left:36px;padding-right:36px;';

    var footerLinks = FOOTER_LINKS.map(function (l) {
      return '<a href="' + l.href + '" style="' + bodyText + 'font-size:12px;color:' + C.muted + ';text-decoration:none;">' + l.title + '</a>';
    }).join('<span style="color:' + C.rule + ';">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>');

    var items = BULLETS.map(function (b) {
      return '' +
        '<tr>' +
          '<td width="18" valign="top" style="padding:0 0 11px;' + bodyText + 'font-size:15px;line-height:1.6;color:' + C.purple + ';">&bull;</td>' +
          '<td valign="top" style="padding:0 0 11px;' + bodyText + 'font-size:15px;line-height:1.6;color:' + C.body + ';">' + b + '</td>' +
        '</tr>';
    }).join('');

    return '' +
'<!doctype html>' +
'<html lang="en"><head>' +
'<meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light only">' +
'<meta name="supported-color-schemes" content="light only">' +
'<title>MAP Fitness Festival, Sunday 30 August</title>' +
fontLink +
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
'    .h1{font-size:26px!important;}' +
'  }' +
'</style>' +
'</head>' +
'<body style="margin:0;padding:0;background:' + C.ground + ';">' +

/* Preheader — the line the inbox shows beside the subject. */
'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' +
  'A community run, your pick of three workouts, and a gym dance party. Sunday 30 August, 6:15 AM.' +
'</div>' +

'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.ground + ';">' +
'<tr><td align="center" style="padding:28px 12px 40px;">' +

'<table role="presentation" class="col" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:' + C.paper + ';border-radius:16px;overflow:hidden;">' +

  /* ── Logo, centred. The yellow fill rule sits under it as the only brand
        accent on the page; it carries no text, so its 1.6:1 on white is moot. ── */
  '<tr><td class="pad" align="center" style="' + pad + 'padding-top:34px;padding-bottom:26px;text-align:center;">' +
    '<img src="' + opts.logo + '" width="150" alt="Stride Run Club" style="display:inline-block;width:150px;max-width:55%;height:auto;border-radius:6px;">' +
    '<div style="width:46px;height:4px;background:' + C.yellow + ';border-radius:2px;margin:18px auto 0;"></div>' +
  '</td></tr>' +

  /* ── Title + subtitle ── */
  '<tr><td class="pad" align="center" style="' + pad + 'padding-bottom:20px;text-align:center;">' +
    '<h1 class="h1" style="margin:0;font-family:' + displayFamily + ';font-weight:' + p.displayWeight + ';font-size:' + p.displaySize + ';line-height:' + p.displayLh + ';letter-spacing:' + p.displayTrack + ';text-transform:' + p.displayCase + ';color:' + C.ink + ';text-align:center;">' +
      'MAP Fitness Festival' +
    '</h1>' +
    '<p style="margin:10px 0 0;' + bodyText + 'font-size:17px;line-height:1.5;color:' + C.body + ';text-align:center;">' +
      'A refreshing run, multiple workouts, and a gym dance party.' +
    '</p>' +
  '</td></tr>' +

  /* ── Greeting + callout ── */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:24px;">' +
    '<p style="margin:0 0 14px;' + bodyText + 'font-size:16px;line-height:1.65;color:' + C.ink + ';font-weight:600;">' +
      'Hey ' + name + ',' +
    '</p>' +
    '<p style="margin:0 0 14px;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.body + ';">' +
      'This Sunday, we’re bringing the MAP Fitness Festival to MAP Fitness, HRBR Layout.' +
    '</p>' +
    '<p style="margin:0 0 14px;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.body + ';">' +
      'Start with a community run, then choose your workout — yoga, boxing, or functional training. And once the workouts are done, we’re turning up the energy with a gym dance party.' +
    '</p>' +
    '<p style="margin:0;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.body + ';">' +
      'Plus, refresh with coffee from Black Poetry Coffee and grab a meal to fuel up after.' +
    '</p>' +
  '</td></tr>' +

  /* ── Poster ── */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:28px;">' +
    '<a href="' + tagged('hero-poster') + '" style="display:block;">' +
      '<img src="' + opts.poster + '" width="528" alt="MAP Fitness Festival poster: 30 August, MAP Fitness, HRBR Layout" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;">' +
    '</a>' +
  '</td></tr>' +

  /* ── What is in store ── */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:8px;">' +
    '<div style="' + bodyText + 'font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:' + C.muted + ';padding-bottom:14px;">' +
      'Also on the floor' +
    '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + items + '</table>' +
  '</td></tr>' +

  '<tr><td class="pad" style="' + pad + 'padding-top:10px;padding-bottom:28px;">' +
    '<p style="margin:0;' + bodyText + 'font-size:16px;line-height:1.68;color:' + C.ink + ';font-weight:600;">' +
      'Multiple ways to move, multiple ways to have fun. Come do your weekend differently.' +
    '</p>' +
  '</td></tr>' +

  /* ── When / where ── */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:28px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.stone + ';border-radius:12px;">' +
      '<tr><td style="padding:20px 22px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
          '<tr>' +
            '<td class="stack" width="50%" valign="top" style="padding:0 10px 0 0;">' +
              '<div style="' + bodyText + 'font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:' + C.muted + ';padding-bottom:6px;">When</div>' +
              '<div style="' + bodyText + 'font-size:15px;line-height:1.5;color:' + C.ink + ';font-weight:650;">Sunday, 30 August<br>6:15 AM</div>' +
              '<div style="' + bodyText + 'font-size:13px;line-height:1.5;color:' + C.muted + ';padding-top:4px;">Entry closes 6:45 AM</div>' +
            '</td>' +
            '<td class="stack-gap" width="1" style="font-size:0;line-height:0;">&nbsp;</td>' +
            '<td class="stack" width="50%" valign="top" style="padding:0;">' +
              '<div style="' + bodyText + 'font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:' + C.muted + ';padding-bottom:6px;">Where</div>' +
              '<div style="' + bodyText + 'font-size:15px;line-height:1.5;color:' + C.ink + ';font-weight:650;">MAP Fitness<br>HRBR Layout</div>' +
              '<div style="padding-top:4px;"><a href="' + MAPS_URL + '" style="' + bodyText + 'font-size:13px;line-height:1.5;color:' + C.purple + ';font-weight:650;text-decoration:underline;">Open in Maps</a></div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  /* ── CTA ── rounded-md, never a pill. */
  '<tr><td class="pad" style="' + pad + 'padding-bottom:14px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>' +
      '<td align="center" bgcolor="' + C.purple + '" style="background:' + C.purple + ';border-radius:6px;">' +
        '<a href="' + tagged('register-cta') + '" style="display:block;padding:16px 24px;' + bodyText + 'font-size:16px;font-weight:700;letter-spacing:.01em;color:#FFFFFF;text-decoration:none;">' +
          'Register now' +
        '</a>' +
      '</td>' +
    '</tr></table>' +
  '</td></tr>' +

  '<tr><td class="pad" align="center" style="' + pad + 'padding-bottom:32px;">' +
    '<div style="' + bodyText + 'font-size:13px;line-height:1.5;color:' + C.muted + ';">Limited spots.</div>' +
  '</td></tr>' +

  /* ── Footer: the welcome email's footer, recoloured for white paper. The
        original sets "Move as One." in brand yellow, which survives that
        template's transparent canvas but not this white card, so it is set in
        ink here. Links and order are otherwise identical. ── */
  '<tr><td class="pad" style="' + pad + 'padding-top:0;padding-bottom:0;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ' + C.rule + ';">' +
      '<tr><td align="center" style="padding:26px 0 0;text-align:center;">' +
        '<img src="' + opts.ducky + '" width="72" alt="Ducky, the Stride mascot" style="display:inline-block;width:72px;height:auto;border:0;">' +
      '</td></tr>' +
      '<tr><td align="center" style="padding:14px 0 0;text-align:center;' + bodyText + 'font-size:13px;line-height:1.6;color:' + C.muted + ';">' +
        'Bengaluru\u2019s running community for every pace.<br>Events, group runs, and training.' +
      '</td></tr>' +
      '<tr><td align="center" style="padding:16px 0 0;text-align:center;' + bodyText + 'font-size:12px;line-height:1.9;">' + footerLinks + '</td></tr>' +
      '<tr><td align="center" style="padding:16px 0 0;text-align:center;">' +
        '<a href="' + INSTAGRAM_URL + '" style="display:inline-block;padding:0 9px;text-decoration:none;">' +
          '<img src="' + opts.ig + '" width="22" height="22" alt="Instagram" style="display:inline-block;width:22px;height:22px;border:0;">' +
        '</a>' +
        '<a href="' + STRAVA_URL + '" style="display:inline-block;padding:0 9px;text-decoration:none;">' +
          '<img src="' + opts.strava + '" width="22" height="22" alt="Strava" style="display:inline-block;width:22px;height:22px;border:0;">' +
        '</a>' +
      '</td></tr>' +
      '<tr><td style="padding:24px 0 0;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ' + C.rule + ';">' +
          '<tr>' +
            '<td style="padding:18px 0 0;' + bodyText + 'font-size:11px;line-height:1.5;color:' + C.muted + ';">&copy; 2026 Stride Run Club, Bengaluru</td>' +
            '<td align="right" style="padding:18px 0 0;text-align:right;font-family:' + displayFamily + ';font-weight:' + p.displayWeight + ';font-size:17px;line-height:1.4;letter-spacing:' + p.displayTrack + ';text-transform:' + p.displayCase + ';color:' + C.ink + ';">Move as One.</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  '<tr><td style="height:34px;font-size:0;line-height:0;">&nbsp;</td></tr>' +

'</table>' +

'</td></tr></table>' +
'</body></html>';
  }

const CHOSEN = PAIRINGS.filter(function (x) { return x.id === 'elegant'; })[0];

export function render(firstName) {
  return buildEmail({
    pairing: CHOSEN, name: firstName, fallback: false,
    poster: POSTER_LIVE, logo: LOGO_LIVE, ducky: DUCKY_LIVE, ig: IG_LIVE, strava: STRAVA_LIVE
  });
}
export const PAIRING_NAME = CHOSEN.name;
