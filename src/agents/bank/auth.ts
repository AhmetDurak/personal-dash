import { createHash, randomBytes } from 'crypto'

// In-memory store: state → code_verifier (cleared after use)
const pkceStore = new Map<string, string>()

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function buildAuthUrl(): string {
  const state = base64url(randomBytes(16))
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())

  pkceStore.set(state, verifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.DB_CLIENT_ID!,
    redirect_uri: process.env.DB_REDIRECT_URI!,
    scope: 'read_accounts read_transactions',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  const base = (process.env.DB_API_BASE ?? 'https://simulator-api.db.com').replace(/\/+$/, '').replace(/\/gw$/, '')
  return `${base}/gw/oidc/authorize?${params}`
}

export function consumeVerifier(state: string): string | undefined {
  const verifier = pkceStore.get(state)
  pkceStore.delete(state)
  return verifier
}
