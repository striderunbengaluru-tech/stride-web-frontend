import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { coordsFromMapsUrl } from '@/lib/maps-coords'
import { slugify } from '@/lib/utils/slug'
import {
  MAX_PASSES_PER_REGISTRATION,
  getWalletPassCount,
  incrementWalletPassCount,
} from '@/lib/wallet-quota'

// GET /api/events/wallet-pass?reg=<registrationId>&platform=apple|google
//
// Generates a wallet pass for the viewer's own CONFIRMED registration via the
// WalletWallet API (hosted signing — no Apple certificates needed) and either
// streams the .pkpass (Apple) or redirects to the Google Wallet save link.
// Plain <a href> buttons on the confirmation page hit this directly.
//
// The pass QR encodes {SITE_URL}/admin/check-in?reg=<id> — scannable by any
// native camera, but the destination sits behind the admin middleware/layout
// gate, so only admins can act on it.

const WALLETWALLET_ENDPOINT = 'https://api.walletwallet.dev/api/passes'
const RELEVANT_TEXT = "You've almost reached! Show this pass to one of the Stride leads"

// No brand logo, thumbnail or brand-purple `color` on the pass, deliberately.
//
// WalletWallet moved custom colours and custom logo/icon/thumbnail images to
// its Pro plan. On the free plan those fields don't degrade — they make the API
// reject the whole request with a 400 ("Custom color is a Pro-only feature",
// then "Custom logo is a Pro-only feature"), so no pass is generated at all.
// `colorPreset` is still free, so the pass keeps a dark theme.
//
// Don't re-add logoURL / iconURL / thumbnailURL / color without a Pro
// subscription — it silently breaks every wallet button again.

// Origin of the deployment actually serving this request, so pass links point
// at the environment that generated them (staging → staging.strideclub.in,
// production → www.strideclub.in) regardless of how NEXT_PUBLIC_SITE_URL is
// set. Vercel's proxy provides x-forwarded-host/proto; local dev falls back to
// the plain Host header.
function requestOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'
  const proto = request.headers.get('x-forwarded-proto')
    ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  return `${proto}://${host}`
}

function fmtEventOn(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  // "Sat, 18 July 2026, 6:00 AM" in event-local (IST) time
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
  return `${date}, ${time.toUpperCase()}`
}

/**
 * Download name for the .pkpass: the run's name in kebab-case with a `-wallet`
 * suffix, e.g. "HYFIT Games Bootcamp" → `hyfit-games-bootcamp-wallet.pkpass`.
 *
 * Every pass used to arrive as `stride-run.pkpass`, so a member with two saved
 * runs got `stride-run (1).pkpass` and no way to tell which was which.
 *
 * Two guards: a name that slugifies to nothing (a title written entirely in
 * emoji or a non-Latin script) would otherwise yield `-wallet.pkpass`, and the
 * length cap keeps an unusually long event name from producing a filename some
 * filesystems reject. The cap trims a trailing hyphen so a mid-word cut can't
 * read as `long-name--wallet`.
 */
function passFilename(eventName: string): string {
  const slug = slugify(eventName).slice(0, 60).replace(/-+$/, '')
  return `${slug || 'stride-run'}-wallet.pkpass`
}

export async function GET(request: Request) {
  const siteUrl = requestOrigin(request)
  const apiKey = process.env.STRIDE_WALLETWALLET_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Wallet passes are not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const registrationId = searchParams.get('reg') ?? ''
  const platform = searchParams.get('platform') === 'google' ? 'google' : 'apple'
  // format=json → fetch-based client (loader + toasts): errors come back as
  // JSON with a code instead of navigation redirects.
  const wantsJson = searchParams.get('format') === 'json'
  if (!registrationId) {
    return NextResponse.json({ error: 'Missing registration' }, { status: 400 })
  }

  // Viewer must own this CONFIRMED registration
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return wantsJson
      ? NextResponse.json({ error: 'Please sign in first', code: 'auth' }, { status: 401 })
      : NextResponse.redirect(new URL('/become-a-member', siteUrl), 302)
  }

  const { data: registration } = await adminClient
    .from('event_registrations')
    .select('id, user_id, event_id, status')
    .eq('id', registrationId)
    .maybeSingle()

  if (!registration || registration.user_id !== user.id || registration.status !== 'CONFIRMED') {
    return wantsJson
      ? NextResponse.json({ error: 'Registration not found', code: 'not-found' }, { status: 404 })
      : NextResponse.redirect(new URL('/my-runs', siteUrl), 302)
  }

  const [{ data: event }, { data: profile }, passCount] = await Promise.all([
    adminClient
      .from('events')
      .select('name, slug, event_date, location, location_url')
      .eq('id', registration.event_id)
      .single(),
    adminClient
      .from('users')
      .select('runner_tag')
      .eq('id', user.id)
      .single(),
    getWalletPassCount(registrationId),
  ])

  if (!event) {
    return wantsJson
      ? NextResponse.json({ error: 'Event not found', code: 'not-found' }, { status: 404 })
      : NextResponse.redirect(new URL('/my-runs', siteUrl), 302)
  }

  const confirmationUrl = new URL(`/events/${event.slug}/confirmation/${registration.id}`, siteUrl)

  // Per-registration cap — protects the 1000/month free-tier allowance
  if (passCount >= MAX_PASSES_PER_REGISTRATION) {
    if (wantsJson) {
      return NextResponse.json(
        { error: `You’ve hit the download limit for this booking (${MAX_PASSES_PER_REGISTRATION} passes).`, code: 'limit' },
        { status: 429 }
      )
    }
    confirmationUrl.searchParams.set('wallet', 'limit')
    return NextResponse.redirect(confirmationUrl, 302)
  }
  const coords = await coordsFromMapsUrl(event.location_url)
  const eventOn = fmtEventOn(event.event_date)

  const payload: Record<string, unknown> = {
    // Any camera can scan this URL; the page behind it is admin-gated and
    // performs the check-in for this registration.
    barcodeValue: `${siteUrl}/admin/check-in?reg=${registration.id}`,
    barcodeFormat: 'QR',
    logoText: 'Stride Run Club',
    organizationName: 'Stride Run Club',
    colorPreset: 'dark',
    primaryFields: [{ label: "You're In!", value: event.name }],
    ...(eventOn ? { secondaryFields: [{ label: 'Event on', value: eventOn }] } : {}),
    ...(profile?.runner_tag
      ? { headerFields: [{ label: 'RUNNER TAG', value: profile.runner_tag }] }
      : {}),
    backFields: [
      { label: 'Notifications', value: ' ', changeMessage: '%@' },
      ...(event.location ? [{ label: 'Meeting point', value: event.location }] : []),
      { label: 'Your booking', value: `${siteUrl}/my-runs` },
    ],
    ...(coords
      ? { locations: [{ latitude: coords.latitude, longitude: coords.longitude, relevantText: RELEVANT_TEXT }] }
      : {}),
  }

  const res = await fetch(WALLETWALLET_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // A 4xx here means the request itself is unacceptable — a plan restriction
    // or a bad payload — and will keep failing until someone changes the code
    // or the subscription. Only 429 and 5xx are worth a retry. Logged loudly
    // because nothing else surfaces this: the member-facing copy for a 4xx
    // deliberately does not promise that trying again will help.
    const isConfigFailure = res.status >= 400 && res.status < 500 && res.status !== 429
    console.error(
      `[wallet-pass] walletwallet ${isConfigFailure ? 'REJECTED THE REQUEST' : 'error'}`,
      res.status,
      detail
    )
    const code = res.status === 429 ? 'quota' : isConfigFailure ? 'unavailable' : 'error'
    if (wantsJson) {
      const message = code === 'quota'
        ? 'Wallet passes are temporarily unavailable. Please try again later.'
        : code === 'unavailable'
        ? 'Wallet passes aren’t available right now. Your spot is confirmed either way — show the QR on this page at the run.'
        : 'We couldn’t generate your pass just now. Please try again in a bit.'
      return NextResponse.json({ error: message, code }, { status: 502 })
    }
    confirmationUrl.searchParams.set('wallet', code)
    return NextResponse.redirect(confirmationUrl, 302)
  }

  const data = (await res.json()) as { serialNumber?: string; googleSaveUrl?: string; applePass?: string }

  // Count successful generations against this registration's cap
  await incrementWalletPassCount(registrationId, passCount)

  if (platform === 'google') {
    if (!data.googleSaveUrl) {
      if (wantsJson) return NextResponse.json({ error: 'Google Wallet link unavailable', code: 'error' }, { status: 502 })
      confirmationUrl.searchParams.set('wallet', 'error')
      return NextResponse.redirect(confirmationUrl, 302)
    }
    // JSON mode: the client opens this in a NEW tab so the confirmation page
    // (and its state) stays put.
    if (wantsJson) return NextResponse.json({ url: data.googleSaveUrl })
    return NextResponse.redirect(data.googleSaveUrl, 302)
  }

  if (!data.applePass) {
    if (wantsJson) return NextResponse.json({ error: 'Apple Wallet pass unavailable', code: 'error' }, { status: 502 })
    confirmationUrl.searchParams.set('wallet', 'error')
    return NextResponse.redirect(confirmationUrl, 302)
  }
  const pkpass = Buffer.from(data.applePass, 'base64')
  return new NextResponse(pkpass, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      // The browser fetches this as a blob and names the download itself, so
      // the client reads this header back rather than hardcoding a second copy
      // of the naming rule.
      'Content-Disposition': `attachment; filename="${passFilename(event.name)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
