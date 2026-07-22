import crypto from 'crypto'

/**
 * Sessão de admin baseada em cookie assinado (HMAC-SHA256), sem dependências.
 *
 * Token: `<payload_base64url>.<hmac_base64url>`
 * Payload: { adminId, email, exp } (exp em segundos, epoch)
 *
 * Requer a variável de ambiente SESSION_SECRET. Em produção, sem ela a
 * verificação sempre falha (fail-closed).
 */

export const SESSION_COOKIE = 'admin_session'
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 horas

export interface SessionPayload {
  adminId: string
  email: string
  exp: number
}

function getSecret(): string | null {
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV !== 'production') {
    // Segredo de desenvolvimento apenas — NUNCA usar em produção.
    return 'dev-only-insecure-session-secret-change-me'
  }
  return null
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(
    input.replace(/-/g, '+').replace(/_/g, '/') + pad,
    'base64'
  )
}

function sign(data: string, secret: string): string {
  return b64url(crypto.createHmac('sha256', secret).update(data).digest())
}

export function createSessionToken(
  admin: { adminId: string; email: string },
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS
): string | null {
  const secret = getSecret()
  if (!secret) return null

  const payload: SessionPayload = {
    adminId: admin.adminId,
    email: admin.email,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }
  const payloadPart = b64url(JSON.stringify(payload))
  const signature = sign(payloadPart, secret)
  return `${payloadPart}.${signature}`
}

export function verifySessionToken(
  token: string | null | undefined
): SessionPayload | null {
  if (!token) return null
  const secret = getSecret()
  if (!secret) return null

  const dot = token.indexOf('.')
  if (dot < 0) return null
  const payloadPart = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  const expected = sign(payloadPart, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(
      b64urlDecode(payloadPart).toString('utf8')
    ) as SessionPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: DEFAULT_MAX_AGE_SECONDS,
}
