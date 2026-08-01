import { Router, Request, Response } from 'express'
import cors from 'cors'
import { ALL_SCOPE_KEYS } from '../../mcp/scopes'

function publicUrl(): string {
  return process.env.API_URL ?? 'http://localhost:3001'
}

export function mcpWellKnownRouter(): Router {
  const router = Router()
  router.use(cors())

  router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
    const base = publicUrl()
    res.json({
      resource: `${base}/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ['header'],
    })
  })

  router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
    const base = publicUrl()
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ALL_SCOPE_KEYS,
    })
  })

  return router
}
