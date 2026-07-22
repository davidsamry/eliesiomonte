#!/usr/bin/env node
/**
 * Gera um hash de senha (scrypt) para gravar em staff_users.password_hash.
 *
 * Uso:
 *   node scripts/hash-password.mjs "minhaSenhaForte"
 *
 * Cole o valor gerado na coluna password_hash do admin no Supabase.
 */
import crypto from 'crypto'

const plain = process.argv[2]
if (!plain) {
  console.error('Uso: node scripts/hash-password.mjs "<senha>"')
  process.exit(1)
}

const salt = crypto.randomBytes(16)
const derived = crypto.scryptSync(plain, salt, 64)
const hash = `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`

console.log(hash)
