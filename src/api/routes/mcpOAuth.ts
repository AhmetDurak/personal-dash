import { Router, Request, Response } from 'express'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import { registerClient, findClient } from '../../mcp/oauth/clients'
import { findAuthorizationCode, markAuthorizationCodeUsed } from '../../mcp/oauth/codes'
import { issueTokenPair, rotateRefreshToken } from '../../mcp/oauth/tokens'
import { verifyPkce } from '../../mcp/oauth/pkce'

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri)
    if (u.protocol === 'https:') return true
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true
    return false
  } catch {
    return false
  }
}

export function mcpOAuthRouter(pool: Pool): Router {
  const router = Router()
  const formParser = express.urlencoded({ extended: true })

  // ── Dynamic Client Registration (RFC 7591) — intentionally unauthenticated ──
  router.post('/oauth/register', cors(), express.json(), async (req: Request, res: Response) => {
    const body = req.body as { redirect_uris?: unknown; client_name?: unknown }
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === 'string') : []
    if (redirectUris.length === 0 || !redirectUris.every(isAllowedRedirectUri)) {
      res.status(400).json({ error: 'invalid_client_metadata', error_description: 'redirect_uris must be non-empty HTTPS (or localhost) URLs' })
      return
    }
    const clientName = typeof body.client_name === 'string' ? body.client_name : undefined
    const client = await registerClient(pool, { clientName, redirectUris })
    res.status(201).json({
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
    })
  })

  // ── Authorization endpoint — browser navigation, no CORS needed ─────────────
  router.get('/oauth/authorize', async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>
    const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, resource } = q

    if (response_type !== 'code' || !client_id || !redirect_uri || !code_challenge) {
      res.status(400).send('Invalid authorization request')
      return
    }
    if ((code_challenge_method ?? 'S256') !== 'S256') {
      res.status(400).send('Only PKCE S256 is supported')
      return
    }
    const client = await findClient(pool, client_id)
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
      res.status(400).send('Unknown client or redirect_uri')
      return
    }

    req.session.mcpAuthRequest = {
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope ?? '',
      state,
      codeChallenge: code_challenge,
      codeChallengeMethod: 'S256',
      resource,
    }

    // Explicitly wait for the session to persist before redirecting — express-session's
    // save-on-res.end hook races with connect-pg-simple's write in practice, and the
    // browser's next request (to /auth/google or /mcp-consent) can arrive before the
    // mcpAuthRequest write actually lands, making it look "missing" moments later.
    req.session.save(err => {
      if (err) { res.status(500).send('Failed to persist authorization request'); return }
      res.redirect(req.isAuthenticated() ? '/mcp-consent' : '/auth/google')
    })
  })

  // ── Token endpoint — server-to-server, no CORS needed ────────────────────────
  router.post('/oauth/token', formParser, express.json(), async (req: Request, res: Response) => {
    const body = req.body as Record<string, string | undefined>
    const grantType = body.grant_type

    if (grantType === 'authorization_code') {
      const { code, redirect_uri, client_id, code_verifier } = body
      if (!code || !redirect_uri || !client_id || !code_verifier) {
        res.status(400).json({ error: 'invalid_request' })
        return
      }
      // Validate fully (client, redirect_uri, PKCE) BEFORE marking the code used — a failed
      // attempt (e.g. wrong verifier) must not burn a code the legitimate client could still redeem.
      const stored = await findAuthorizationCode(pool, code)
      if (!stored || stored.client_id !== client_id || stored.redirect_uri !== redirect_uri) {
        res.status(400).json({ error: 'invalid_grant' })
        return
      }
      if (!verifyPkce(code_verifier, stored.code_challenge)) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' })
        return
      }
      const marked = await markAuthorizationCodeUsed(pool, code)
      if (!marked) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Code already used or expired' })
        return
      }
      const tokens = await issueTokenPair(pool, { clientId: stored.client_id, userId: stored.user_id, scope: stored.scope })
      res.json({
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
        scope: stored.scope,
      })
      return
    }

    if (grantType === 'refresh_token') {
      const { refresh_token } = body
      if (!refresh_token) {
        res.status(400).json({ error: 'invalid_request' })
        return
      }
      const tokens = await rotateRefreshToken(pool, refresh_token)
      if (!tokens) {
        res.status(400).json({ error: 'invalid_grant' })
        return
      }
      res.json({
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
      })
      return
    }

    res.status(400).json({ error: 'unsupported_grant_type' })
  })

  return router
}
