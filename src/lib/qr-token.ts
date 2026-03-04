import { createHmac, timingSafeEqual } from 'crypto'

// STRIDE_QR_SECRET must be set in .env.local and Vercel env vars
const SECRET = process.env.STRIDE_QR_SECRET ?? 'dev-secret-change-in-production'

export type QrPayload = {
  registrationId: string
  eventId: string
  userId: string
  issuedAt: number
}

export function generateQrToken(registrationId: string, eventId: string, userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ r: registrationId, e: eventId, u: userId, t: Date.now() })
  ).toString('base64url')

  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyQrToken(token: string): QrPayload | null {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return null

  const payload = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)

  const expectedSig = createHmac('sha256', SECRET).update(payload).digest('base64url')

  try {
    if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
      return null
    }
  } catch {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (!decoded.r || !decoded.e || !decoded.u || !decoded.t) return null
    return {
      registrationId: decoded.r,
      eventId: decoded.e,
      userId: decoded.u,
      issuedAt: decoded.t,
    }
  } catch {
    return null
  }
}
