import 'dotenv/config'
import express from 'express'
import { pool } from '../db/pool'
import { PostgresRepository } from '../agents/ledger/PostgresRepository'
import { LedgerAgent } from '../agents/ledger/LedgerAgent'
import { ETFAgent } from '../agents/etf/ETFAgent'
import { entriesRouter } from './routes/entries'
import { summaryRouter } from './routes/summary'
import { bankRouter } from './routes/bank'
import { chartsRouter } from './routes/charts'
import { importPdfRouter } from './routes/importPdf'
import { etfRouter } from './routes/etf'
import { notificationsRouter } from './routes/notifications'

const app = express()
app.use(express.json())

const repo   = new PostgresRepository(pool)
const ledger = new LedgerAgent(repo)
const etf    = new ETFAgent(pool)

app.use('/api/entries',       entriesRouter(ledger))
app.use('/api',               summaryRouter(ledger))
app.use('/api/bank',          bankRouter(ledger))
app.use('/api/charts',        chartsRouter(ledger))
app.use('/api/import/pdf',    importPdfRouter(ledger))
app.use('/api/etf',           etfRouter(etf))
app.use('/api/notifications', notificationsRouter(ledger, etf, pool))

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`API listening on :${PORT}`))
