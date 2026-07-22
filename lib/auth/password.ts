import crypto from 'crypto'

/**
 * Hash e verificação de senhas usando scrypt (nativo do Node, sem dependências).
 *
 * Formato armazenado: `scrypt$<salt_hex>$<hash_hex>`
 *
 * Também aceita, para compatibilidade, hashes legados em SHA-256 (64 hex chars),
 * sinalizando `needsUpgrade` para que a senha seja re-hasheada no próximo login.
 */

const SCRYPT_KEYLEN = 64
const SALT_BYTES = 16

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SALT_BYTES)
  const derived = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

function verifyScrypt(plain: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3) return false
  const [, saltHex, hashHex] = parts
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const derived = crypto.scryptSync(plain, salt, expected.length)
    return (
      expected.length === derived.length &&
      crypto.timingSafeEqual(expected, derived)
    )
  } catch {
    return false
  }
}

function verifyLegacySha256(plain: string, stored: string): boolean {
  const computed = crypto.createHash('sha256').update(plain).digest('hex')
  try {
    const a = Buffer.from(computed, 'hex')
    const b = Buffer.from(stored, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyPassword(
  plain: string,
  stored: string | null | undefined
): { valid: boolean; needsUpgrade: boolean } {
  if (!stored) return { valid: false, needsUpgrade: false }

  if (stored.startsWith('scrypt$')) {
    return { valid: verifyScrypt(plain, stored), needsUpgrade: false }
  }

  // Hash legado (SHA-256 sem salt) — valida e marca para upgrade.
  const valid = verifyLegacySha256(plain, stored)
  return { valid, needsUpgrade: valid }
}
