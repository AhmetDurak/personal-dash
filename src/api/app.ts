import 'dotenv/config'
import path from 'path'
import express, { Request, Response, NextFunction } from 'express'
import { migrate } from '../db/migrate'
import session from 'express-session'
import passport from 'passport'
import connectPgSimple from 'connect-pg-simple'
import { pool } from '../db/pool'
import { configurePassport } from '../auth/passport'
import { PostgresRepository } from '../agents/ledger/PostgresRepository'
import { LedgerAgent } from '../agents/ledger/LedgerAgent'
import { ETFAgent } from '../agents/etf/ETFAgent'
import { entriesRouter } from './routes/entries'
import { summaryRouter } from './routes/summary'
import { bankRouter } from './routes/bank'
import { chartsRouter } from './routes/charts'
import { importPdfRouter } from './routes/importPdf'
import { importCsvRouter } from './routes/importCsv'
import { etfRouter } from './routes/etf'
import { notificationsRouter } from './routes/notifications'
import { notebookRouter } from './routes/notebook'
import { budgetsRouter } from './routes/budgets'
import { templatesRouter } from './routes/templates'
import { authRouter } from './routes/auth'
import { journalRouter } from './routes/journal'
import { mealRouter } from './routes/meal'
import { receiptsRouter } from './routes/receipts'
import { sportRouter } from './routes/sport'
import { planRouter } from './routes/plan'
import { translateRouter } from './routes/translate'
import { analyticsRouter } from './routes/analytics'
import { chainsRouter } from './routes/chains'
import { mcpWellKnownRouter } from './routes/mcpWellKnown'
import { mcpOAuthRouter } from './routes/mcpOAuth'
import { mcpConsentApiRouter } from './routes/mcpConsentApi'
import { mcpRouter } from './routes/mcp'

const PgSession = connectPgSimple(session)

const app = express()
app.set('trust proxy', 1) // Render terminates TLS at the edge — needed for secure cookies below
app.use(express.json())

app.use(session({
  store: new PgSession({ pool, tableName: 'sessions', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}))

configurePassport(pool)
app.use(passport.initialize())
app.use(passport.session())

// Auth routes (public)
app.use('/auth', authRouter(pool))

// MCP remote connector: OAuth discovery/registration/authorize/token (public — own auth scheme)
// and the protocol endpoint itself (guarded internally by requireMcpAuth, not the session/bearer scheme below).
app.use(mcpWellKnownRouter())
app.use(mcpOAuthRouter(pool))
app.use(mcpRouter(pool))

// Require login for all API routes (session cookie OR Bearer token)
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next()

  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE bearer_token = $1', [token])
      if (rows[0]) {
        req.user = rows[0] as Express.User
        return next()
      }
    } catch { /* fall through */ }
  }

  res.status(401).json({ error: 'Unauthorized' })
}

// Attach user-scoped agents to every authenticated API request
function attachAgents(req: Request, _res: Response, next: NextFunction) {
  const uid = (req.user as Express.User).id
  req.ledger = new LedgerAgent(new PostgresRepository(pool, uid))
  req.etf    = new ETFAgent(pool, uid)
  next()
}

app.use('/api', requireAuth, attachAgents)

app.use('/api/entries',       entriesRouter())
app.use('/api',               summaryRouter())
app.use('/api/bank',          bankRouter())
app.use('/api/charts',        chartsRouter())
app.use('/api/import/pdf',    importPdfRouter())
app.use('/api/import/csv',    importCsvRouter())
app.use('/api/etf',           etfRouter())
app.use('/api/notifications', notificationsRouter(pool))
app.use('/api/notebook',      notebookRouter(pool))
app.use('/api/budgets',       budgetsRouter(pool))
app.use('/api/templates',     templatesRouter(pool))
app.use('/api/journal',       journalRouter(pool))
app.use('/api/meal',          mealRouter(pool))
app.use('/api/receipts',      receiptsRouter(pool))
app.use('/api/sport',         sportRouter(pool))
app.use('/api/plan',          planRouter(pool))
app.use('/api/translate',     translateRouter())
app.use('/api/analytics',    analyticsRouter(pool))
app.use('/api/chains',       chainsRouter(pool))
app.use('/api/mcp',          mcpConsentApiRouter(pool))

app.get('/health', (_req, res) => res.json({ ok: true }))

// Serve React client build in production
const CLIENT_DIST = path.join(__dirname, '../../client/dist')
app.use(express.static(CLIENT_DIST))
app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')))

const PORT = process.env.PORT ?? 3001
migrate()
  .then(() => app.listen(PORT, () => console.log(`API listening on :${PORT}`)))
  .catch(err => { console.error('Migration failed:', err); process.exit(1) })
