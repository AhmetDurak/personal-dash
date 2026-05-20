import { Router, Request, Response } from 'express'

export function etfRouter(): Router {
  const router = Router()

  router.get('/watchlist', async (req: Request, res: Response) => {
    try { res.json(await req.etf.list()) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.post('/watchlist', async (req: Request, res: Response) => {
    const { ticker } = req.body as { ticker?: string }
    if (!ticker?.trim()) { res.status(400).json({ error: 'ticker required' }); return }
    try { await req.etf.add(ticker.trim()); res.json({ ok: true }) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.delete('/watchlist/:ticker', async (req: Request, res: Response) => {
    try { await req.etf.remove(req.params.ticker); res.json({ ok: true }) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/snapshot/:ticker', async (req: Request, res: Response) => {
    try { res.json(await req.etf.snapshot(req.params.ticker)) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/chart/:ticker', async (req: Request, res: Response) => {
    const range = (req.query.range as string) ?? '1y'
    try { res.json(await req.etf.chart(req.params.ticker, range)) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/composition/:ticker', async (req: Request, res: Response) => {
    try { res.json(await req.etf.composition(req.params.ticker)) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/risk/:ticker', async (req: Request, res: Response) => {
    try { res.json(await req.etf.risk(req.params.ticker)) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/news', async (req: Request, res: Response) => {
    try { res.json(await req.etf.newsFeed()) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/search', async (req: Request, res: Response) => {
    const q = req.query.q as string
    if (!q?.trim()) { res.status(400).json({ error: 'q required' }); return }
    try { res.json(await req.etf.search(q.trim())) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  return router
}
