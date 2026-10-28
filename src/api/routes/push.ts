import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { pushTick, sendToUser, vapidPublicKey } from '../../push/notifier'
import { isValidTimeZone } from '../../push/messages'

// Authenticated: device subscription management (mounted at /api/push)
export function pushRouter(pool: Pool): Router {
  const router = Router()

  router.get('/vapid-public-key', (_req: Request, res: Response) => {
    res.json({ key: vapidPublicKey() })
  })

  router.post('/subscribe', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { subscription, tz } = req.body as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; tz?: string
    }
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth
    if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: 'invalid subscription' }); return }
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, tz) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth, tz=EXCLUDED.tz`,
      [uid, endpoint, p256dh, auth, tz && isValidTimeZone(tz) ? tz : 'UTC']
    )
    res.json({ ok: true })
  })

  router.post('/unsubscribe', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { endpoint } = req.body as { endpoint?: string }
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2', [endpoint ?? '', uid])
    res.json({ ok: true })
  })

  router.post('/test', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const reached = await sendToUser(pool, uid, {
      key: 'test', title: 'Personal Dashboard', body: 'Push notifications are working 🎉', url: '/home',
    })
    res.json({ reached })
  })

  return router
}

// Public, secret-protected: called by an external cron (mounted at POST /push/tick).
// On Render's free plan the server sleeps when idle, so the cron also wakes it.
export function pushTickHandler(pool: Pool) {
  return async (req: Request, res: Response) => {
    const secret = process.env.PUSH_CRON_SECRET
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ error: 'Unauthorized' }); return }
    res.json(await pushTick(pool))
  }
}
