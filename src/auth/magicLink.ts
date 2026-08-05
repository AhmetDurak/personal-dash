import crypto from 'crypto'
import { Pool } from 'pg'
import { sendMagicLinkEmail } from '../email/resend'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 3

function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Always resolves — a rate-limited or malformed request is silently dropped so the
// response to the caller stays identical either way (no signal about whether an
// email address is already being flooded).
export async function requestMagicLink(pool: Pool, email: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM magic_link_tokens WHERE email = $1 AND created_at > now() - $2::interval`,
    [email, `${RATE_LIMIT_WINDOW_MS} milliseconds`]
  )
  if (rows[0].n >= RATE_LIMIT_MAX_REQUESTS) return

  const token = randomToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
  await pool.query(
    `INSERT INTO magic_link_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)`,
    [hashToken(token), email, expiresAt]
  )

  const link = `${process.env.API_URL ?? 'http://localhost:3001'}/auth/magic-link/callback?token=${token}`
  await sendMagicLinkEmail(email, link)
}

// Consumes a token (marks it used so it can't be replayed) and returns the matching
// user row, creating one by email if this is the first time this address has logged in.
export async function consumeMagicLinkToken(pool: Pool, token: string): Promise<Express.User | null> {
  const { rows } = await pool.query(
    `UPDATE magic_link_tokens SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING email`,
    [hashToken(token)]
  )
  const email = rows[0]?.email as string | undefined
  if (!email) return null

  const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  if (existing[0]) return existing[0] as Express.User

  const { rows: created } = await pool.query(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *`,
    [email, email.split('@')[0]]
  )
  return created[0] as Express.User
}
