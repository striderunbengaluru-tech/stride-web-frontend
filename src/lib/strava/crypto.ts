import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM for Strava OAuth tokens at rest. The key lives only in the
// STRIDE_STRAVA_TOKEN_KEY env var (32 bytes, base64 — `openssl rand -base64 32`),
// so a leaked database dump or service-role key alone yields no usable Strava
// credentials. Server-only: imported solely by route handlers and cron code.
//
// Stored format: `v1.<iv>.<auth tag>.<ciphertext>`, each part base64url. The
// version prefix leaves room to rotate the key or algorithm later.

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'
const IV_BYTES = 12
const KEY_BYTES = 32

function getKey(): Buffer {
  const raw = process.env.STRIDE_STRAVA_TOKEN_KEY
  if (!raw) throw new Error('STRIDE_STRAVA_TOKEN_KEY is not configured')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_BYTES) throw new Error('STRIDE_STRAVA_TOKEN_KEY must decode to 32 bytes')
  return key
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv, tag, ciphertext].map(part =>
    typeof part === 'string' ? part : part.toString('base64url')
  ).join('.')
}

export function decryptToken(stored: string): string {
  const [version, iv, tag, ciphertext] = stored.split('.')
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error('Unrecognised Strava token format')
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
