import { Router } from 'express'
import passport from 'passport'

export function authRouter() {
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

  router.post('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err)
      res.json({ ok: true })
    })
  })

  return router
}
