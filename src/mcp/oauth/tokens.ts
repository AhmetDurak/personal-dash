import crypto from 'crypto'
import { Pool } from 'pg'

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000        // 1 hour
const REFRESH_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000 // 180 days

function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export interface IssuedTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface VerifiedAccessToken {
  user_id: number
  client_id: string
  scope: string
}

export async function issueTokenPair(pool: Pool, params: { clientId: string; userId: number; scope: string }): Promise<IssuedTokens> {
  const accessToken = randomToken()
  const refreshToken = randomToken()
  const accessExpires = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)
  const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

  await pool.query(
    `INSERT INTO mcp_access_tokens (token_hash, client_id, user_id, scope, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [hashToken(accessToken), params.clientId, params.userId, params.scope, accessExpires]
  )
  await pool.query(
    `INSERT INTO mcp_refresh_tokens (token_hash, client_id, user_id, scope, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [hashToken(refreshToken), params.clientId, params.userId, params.scope, refreshExpires]
  )

  return { accessToken, refreshToken, expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) }
}

export async function verifyAccessToken(pool: Pool, token: string): Promise<VerifiedAccessToken | null> {
  const { rows } = await pool.query(
    `SELECT user_id, client_id, scope FROM mcp_access_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(token)]
  )
  return (rows[0] as VerifiedAccessToken) ?? null
}

// Rotates a refresh token: revokes the old one and issues a new access+refresh pair.
export async function rotateRefreshToken(pool: Pool, refreshToken: string): Promise<IssuedTokens | null> {
  const { rows } = await pool.query(
    `UPDATE mcp_refresh_tokens
     SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     RETURNING client_id, user_id, scope`,
    [hashToken(refreshToken)]
  )
  const row = rows[0] as { client_id: string; user_id: number; scope: string } | undefined
  if (!row) return null
  return issueTokenPair(pool, { clientId: row.client_id, userId: row.user_id, scope: row.scope })
}
