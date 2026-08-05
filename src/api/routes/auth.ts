import { Router, Request, Response } from 'express'
import passport from 'passport'
import { Pool } from 'pg'
import { seedDemoUser, DEMO_GOOGLE_ID } from '../../db/seed-demo'
import { requestMagicLink, consumeMagicLinkToken } from '../../auth/magicLink'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function authRouter(pool?: Pool) {
  const router = Router()

  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  )

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect(req.session.mcpAuthRequest ? '/mcp-consent' : (process.env.FRONTEND_URL ?? '/'))
    }
  )

  router.get('/me', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' })
    res.json(req.user)
  })

  // Return the personal bearer token for mobile app setup
  router.get('/me/token', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' })
    const user = req.user as Express.User
    res.json({ token: (user as Express.User & { bearer_token: string }).bearer_token })
  })

  // Demo login — auto-seeds on first access, no OAuth needed
  router.get('/demo', async (req: Request, res: Response, next) => {
    if (!pool) { res.status(503).json({ error: 'Demo not available' }); return }
    try {
      let { rows } = await pool.query(
        'SELECT * FROM users WHERE google_id=$1',
        [DEMO_GOOGLE_ID]
      )
      if (!rows[0]) {
        await seedDemoUser(pool)
        ;({ rows } = await pool.query(
          'SELECT * FROM users WHERE google_id=$1',
          [DEMO_GOOGLE_ID]
        ))
      }
      if (!rows[0]) { res.status(500).json({ error: 'Demo seed failed' }); return }
      req.login(rows[0], (err) => {
        if (err) return next(err)
        res.redirect(process.env.FRONTEND_URL ?? '/')
      })
    } catch (err) { next(err) }
  })

  // Magic-link (passwordless) email login
  router.post('/magic-link/request', async (req: Request, res: Response) => {
    if (!pool) { res.status(503).json({ error: 'Not available' }); return }
    const email = (req.body?.email as string | undefined)?.trim().toLowerCase()
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address' })
      return
    }
    await requestMagicLink(pool, email)
    // Same response whether the request was rate-limited or actually sent — no
    // signal to the caller either way.
    res.json({ ok: true })
  })

  router.get('/magic-link/callback', async (req: Request, res: Response, next) => {
    if (!pool) { res.redirect('/login'); return }
    const token = req.query.token as string | undefined
    if (!token) { res.redirect('/login?error=invalid_link'); return }
    try {
      const user = await consumeMagicLinkToken(pool, token)
      if (!user) { res.redirect('/login?error=invalid_link'); return }
      req.login(user, (err) => {
        if (err) return next(err)
        res.redirect(req.session.mcpAuthRequest ? '/mcp-consent' : (process.env.FRONTEND_URL ?? '/'))
      })
    } catch (err) { next(err) }
  })

  router.post('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err)
      res.json({ ok: true })
    })
  })

  return router
}
