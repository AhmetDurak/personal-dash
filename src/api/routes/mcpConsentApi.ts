import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { findClient } from '../../mcp/oauth/clients'
import { issueAuthorizationCode } from '../../mcp/oauth/codes'
import { upsertConsent } from '../../mcp/oauth/consent'
import { SCOPE_GROUPS, ALL_SCOPE_KEYS, parseScope, serializeScope, type ScopeKey } from '../../mcp/scopes'

export function mcpConsentApiRouter(pool: Pool): Router {
  const router = Router()

  router.get('/authorize/pending', async (req: Request, res: Response) => {
    const pending = req.session.mcpAuthRequest
    if (!pending) {
      res.status(404).json({ error: 'no_pending_authorization' })
      return
    }
    const client = await findClient(pool, pending.clientId)
    const requested = parseScope(pending.scope)
    const scopeKeys = requested.length > 0 ? requested : ALL_SCOPE_KEYS

    res.json({
      clientName: client?.client_name ?? 'Unknown app',
      scopeGroups: scopeKeys.map(key => ({ key, ...SCOPE_GROUPS[key], checked: true })),
    })
  })

  router.post('/authorize/decision', async (req: Request, res: Response) => {
    const pending = req.session.mcpAuthRequest
    if (!pending) {
      res.status(404).json({ error: 'no_pending_authorization' })
      return
    }
    const body = req.body as { approve?: boolean; grantedScopes?: string[] }
    const stateParam = pending.state ? `&state=${encodeURIComponent(pending.state)}` : ''

    if (!body.approve) {
      delete req.session.mcpAuthRequest
      res.json({ redirectUrl: `${pending.redirectUri}?error=access_denied${stateParam}` })
      return
    }

    const grantedScopes = (body.grantedScopes ?? []).filter((s): s is ScopeKey => (ALL_SCOPE_KEYS as string[]).includes(s))
    if (grantedScopes.length === 0) {
      delete req.session.mcpAuthRequest
      res.json({ redirectUrl: `${pending.redirectUri}?error=access_denied${stateParam}` })
      return
    }

    const userId = (req.user as Express.User).id
    const scope = serializeScope(grantedScopes)

    const code = await issueAuthorizationCode(pool, {
      clientId: pending.clientId,
      userId,
      redirectUri: pending.redirectUri,
      scope,
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      resource: pending.resource,
    })
    await upsertConsent(pool, { userId, clientId: pending.clientId, grantedScope: scope })

    delete req.session.mcpAuthRequest
    res.json({ redirectUrl: `${pending.redirectUri}?code=${encodeURIComponent(code)}${stateParam}` })
  })

  return router
}
