import { Router, Request, Response } from 'express'
import passport from 'passport'
import { Pool } from 'pg'
import { seedDemoUser, DEMO_GOOGLE_ID } from '../../db/seed-demo'

export function authRouter(pool?: Pool) {
  const router = Router()

  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  )

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (_req, res) => {
      res.redirect(process.env.FRONTEND_URL ?? '/')
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

  router.post('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err)
      res.json({ ok: true })
    })
  })

  return router
}
