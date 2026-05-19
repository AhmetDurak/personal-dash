import { Router, Request, Response } from 'express'
import { BankAgent } from '../../agents/bank/BankAgent'
import { CategoryAgent } from '../../agents/category/CategoryAgent'
import { LedgerAgent } from '../../agents/ledger/LedgerAgent'
import { buildAuthUrl, consumeVerifier } from '../../agents/bank/auth'
import { performSimulatorLogin } from '../../agents/bank/simulator'

export function bankRouter(ledger: LedgerAgent): Router {
  const router = Router()
  const bank = new BankAgent()
  const category = new CategoryAgent()

  router.get('/auth', (_req: Request, res: Response) => {
    res.redirect(buildAuthUrl())
  })

  router.get('/auth/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string
    const state = req.query.state as string
    if (!code) {
      res.status(400).json({ error: 'Missing code' })
      return
    }
    try {
      const verifier = consumeVerifier(state)
      const token = await bank.getToken(code, verifier)
      res.json(token)
    } catch (err) {
      res.status(502).json({ error: (err as Error).message })
    }
  })

  router.post('/connect', async (_req: Request, res: Response) => {
    try {
      const { accessToken, refreshToken } = await performSimulatorLogin()
      res.json({ access_token: accessToken, refresh_token: refreshToken })
    } catch (err) {
      res.status(502).json({ error: (err as Error).message })
    }
  })

  router.post('/sync', async (req: Request, res: Response) => {
    const { token, iban, from, to } = req.body as {
      token: string
      iban: string
      from: string
      to: string
    }
    try {
      const raw = await bank.getTransactions(token, iban, from, to)
      const txs = category.classifyBatch(raw)
      const saved = await ledger.saveBankTransactions(txs)
      res.json({ synced: saved.length, transactions: saved })
    } catch (err) {
      res.status(502).json({ error: (err as Error).message })
    }
  })

  return router
}
