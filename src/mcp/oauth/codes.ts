import crypto from 'crypto'
import { Pool } from 'pg'

const CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes, single use

export interface AuthorizationCodeParams {
  clientId: string
  userId: number
  redirectUri: string
  scope: string
  codeChallenge: string
  codeChallengeMethod: string
  resource?: string | null
}

export interface StoredAuthorizationCode {
  code: string
  client_id: string
  user_id: number
  redirect_uri: string
  scope: string
  code_challenge: string
  code_challenge_method: string
  resource: string | null
  expires_at: string
  used: boolean
}

export async function issueAuthorizationCode(pool: Pool, params: AuthorizationCodeParams): Promise<string> {
  const code = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await pool.query(
    `INSERT INTO mcp_authorization_codes
       (code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, resource, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [code, params.clientId, params.userId, params.redirectUri, params.scope,
      params.codeChallenge, params.codeChallengeMethod, params.resource ?? null, expiresAt]
  )
  return code
}

// Read-only lookup — does NOT mark the code used. Callers must validate client_id/redirect_uri/PKCE
// against the result before calling markAuthorizationCodeUsed, so a failed attempt (e.g. wrong PKCE
// verifier) never burns a code the legitimate client could still redeem.
export async function findAuthorizationCode(pool: Pool, code: string): Promise<StoredAuthorizationCode | null> {
  const { rows } = await pool.query(
    `SELECT * FROM mcp_authorization_codes WHERE code = $1 AND used = FALSE AND expires_at > now()`,
    [code]
  )
  return (rows[0] as StoredAuthorizationCode) ?? null
}

// Atomically marks the code used so it cannot be redeemed twice; returns false if it was already
// used/expired in the meantime (e.g. a concurrent request raced this one).
export async function markAuthorizationCodeUsed(pool: Pool, code: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE mcp_authorization_codes SET used = TRUE WHERE code = $1 AND used = FALSE AND expires_at > now()`,
    [code]
  )
  return (rowCount ?? 0) > 0
}
