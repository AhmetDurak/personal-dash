import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

const ADMIN_EMAIL = 'durakahmet049@gmail.com'

function requireAdmin(req: Request, res: Response): boolean {
  const user = req.user as Express.User
  if (user?.email !== ADMIN_EMAIL) { res.status(403).json({ error: 'Forbidden' }); return false }
  return true
}

export function analyticsRouter(pool: Pool): Router {
  const router = Router()

  // POST /api/analytics/event — called via sendBeacon from frontend
  router.post('/event', async (req: Request, res: Response) => {
    const { session_id, page, duration_ms, device, browser, os } = req.body as {
      session_id?: string; page?: string; duration_ms?: number
      device?: string; browser?: string; os?: string
    }
    if (!session_id || !page) return res.status(400).end()
    await pool.query(
      `INSERT INTO analytics_events (session_id, page, duration_ms, device, browser, os)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session_id.slice(0, 64), page.slice(0, 200), duration_ms ?? null, device ?? null, browser ?? null, os ?? null]
    )
    res.status(204).end()
  })

  // GET /api/analytics/stats?days=30
  router.get('/stats', async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)

    const [overview, bounce, timeline, pages, devices, browsers, osRows, activeNow] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                          AS total_views,
          COUNT(DISTINCT session_id)                                        AS unique_visitors,
          COALESCE(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0) AS avg_duration_ms
        FROM analytics_events
        WHERE timestamp > now() - ($1 || ' days')::INTERVAL
      `, [days]),

      pool.query(`
        WITH counts AS (
          SELECT session_id, COUNT(DISTINCT page) AS pages
          FROM analytics_events
          WHERE timestamp > now() - ($1 || ' days')::INTERVAL
          GROUP BY session_id
        )
        SELECT ROUND(
          COUNT(*) FILTER (WHERE pages = 1)::numeric / NULLIF(COUNT(*), 0), 4
        ) AS bounce_rate FROM counts
      `, [days]),

      pool.query(`
        SELECT
          DATE(timestamp AT TIME ZONE 'UTC') AS date,
          COUNT(*)                           AS views,
          COUNT(DISTINCT session_id)         AS visitors
        FROM analytics_events
        WHERE timestamp > now() - ($1 || ' days')::INTERVAL
        GROUP BY DATE(timestamp AT TIME ZONE 'UTC')
        ORDER BY date
      `, [days]),

      pool.query(`
        SELECT
          page,
          COUNT(*)                                                                  AS views,
          COUNT(DISTINCT session_id)                                                AS visitors,
          COALESCE(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0)     AS avg_duration_ms
        FROM analytics_events
        WHERE timestamp > now() - ($1 || ' days')::INTERVAL
        GROUP BY page
        ORDER BY views DESC
        LIMIT 20
      `, [days]),

      pool.query(`
        SELECT device, COUNT(*) AS count
        FROM analytics_events
        WHERE timestamp > now() - ($1 || ' days')::INTERVAL AND device IS NOT NULL
        GROUP BY device ORDER BY count DESC
      `, [days]),

      pool.query(`
        SELECT browser, COUNT(*) AS count
        FROM analytics_events
        WHERE timestamp > now() - ($1 || ' days')::INTERVAL AND browser IS NOT NULL
        GROUP BY browser ORDER BY count DESC
      `, [days]),

      pool.query(`
        SELECT os, COUNT(*) AS count
        FROM analytics_events
        WHERE timestamp > now() - ($1 || ' days')::INTERVAL AND os IS NOT NULL
        GROUP BY os ORDER BY count DESC
      `, [days]),

      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS active
        FROM analytics_events
        WHERE timestamp > now() - INTERVAL '5 minutes'
      `),
    ])

    res.json({
      overview: {
        totalViews:    parseInt(overview.rows[0].total_views),
        uniqueVisitors: parseInt(overview.rows[0].unique_visitors),
        avgDurationMs: Math.round(parseFloat(overview.rows[0].avg_duration_ms)),
        bounceRate:    parseFloat(bounce.rows[0].bounce_rate ?? '0'),
        activeNow:     parseInt(activeNow.rows[0].active),
      },
      timeline: timeline.rows.map(r => ({
        date:     r.date,
        views:    parseInt(r.views),
        visitors: parseInt(r.visitors),
      })),
      pages: pages.rows.map(r => ({
        page:          r.page,
        views:         parseInt(r.views),
        visitors:      parseInt(r.visitors),
        avgDurationMs: Math.round(parseFloat(r.avg_duration_ms)),
      })),
      devices:  devices.rows.map(r => ({ device: r.device, count: parseInt(r.count) })),
      browsers: browsers.rows.map(r => ({ browser: r.browser, count: parseInt(r.count) })),
      os:       osRows.rows.map(r => ({ os: r.os, count: parseInt(r.count) })),
    })
  })

  return router
}
