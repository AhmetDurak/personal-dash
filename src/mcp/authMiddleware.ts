import { Request, Response, NextFunction } from 'express'
import { Pool } from 'pg'
import { verifyAccessToken } from './oauth/tokens'
import { parseScope } from './scopes'
import { PostgresRepository } from '../agents/ledger/PostgresRepository'
import { LedgerAgent } from '../agents/ledger/LedgerAgent'
import { ETFAgent } from '../agents/etf/ETFAgent'

function publicUrl(): string {
  return process.env.API_URL ?? 'http://localhost:3001'
}

function unauthorized(res: Response, error: string) {
  res
    .status(401)
    .set('WWW-Authenticate', `Bearer resource_metadata="${publicUrl()}/.well-known/oauth-protected-resource"`)
    .json({ error })
}

// Guards the /mcp protocol endpoint with the new OAuth-issued access tokens —
// deliberately separate from the legacy session/bearer_token scheme in app.ts's requireAuth.
export function requireMcpAuth(pool: Pool) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) { unauthorized(res, 'unauthorized'); return }

    const verified = await verifyAccessToken(pool, token)
    if (!verified) { unauthorized(res, 'invalid_token'); return }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [verified.user_id])
    if (!rows[0]) { unauthorized(res, 'invalid_token'); return }

    req.user = rows[0] as Express.User
    req.mcpScope = parseScope(verified.scope)
    next()
  }
}

// Mirrors attachAgents in app.ts, using the userId resolved from the MCP access token.
export function attachMcpAgents(pool: Pool) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const uid = (req.user as Express.User).id
    req.ledger = new LedgerAgent(new PostgresRepository(pool, uid))
    req.etf = new ETFAgent(pool, uid)
    next()
  }
}
