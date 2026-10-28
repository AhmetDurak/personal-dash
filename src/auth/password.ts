import crypto from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEY_LEN = 64

export const MIN_PASSWORD_LENGTH = 8

// Stored as "scrypt$<salt b64>$<hash b64>"
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, KEY_LEN)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

// Used when no user/password exists, so a miss takes as long as a wrong password
// and response timing doesn't reveal which emails have accounts.
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(KEY_LEN).toString('base64')}`

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [scheme, saltB64, hashB64] = (stored ?? DUMMY_HASH).split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length)
  return crypto.timingSafeEqual(actual, expected) && !!stored
}

// In-memory brute-force guard: max failed attempts per email per window.
const FAIL_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 10
const failures = new Map<string, number[]>()

export function isLoginLocked(email: string, now = Date.now()): boolean {
  const recent = (failures.get(email) ?? []).filter(t => now - t < FAIL_WINDOW_MS)
  failures.set(email, recent)
  return recent.length >= MAX_FAILS
}

export function recordLoginFailure(email: string, now = Date.now()): void {
  failures.set(email, [...(failures.get(email) ?? []), now])
}

export function clearLoginFailures(email: string): void {
  failures.delete(email)
}
