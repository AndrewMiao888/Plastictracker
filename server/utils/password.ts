import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && value.length <= 128 && value.trim().length >= 10
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$${salt}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false
  const [algorithm, salt, hashHex] = encoded.split('$')
  if (algorithm !== 'scrypt' || !salt || !hashHex || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hashHex)) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = (await scrypt(password, salt, expected.length)) as Buffer
  return timingSafeEqual(actual, expected)
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
