import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// Read-only, amounts-only investment tools — deliberately no per-holding composition,
// fund names, or bank-connection status (none of that is persisted server-side; see plan notes).
export function registerInvestmentTools(server: McpServer, req: Request) {
  server.registerTool('investments_get_watchlist', {
    title: 'Get investment watchlist prices',
    description: 'Live price and change% for each ticker on the watchlist. Amounts only — no fund names, sectors, or holdings composition. Read-only.',
    inputSchema: {},
  }, async () => {
    const tickers = await req.etf.list()
    const results = await Promise.all(tickers.map(async ticker => {
      try {
        const snap = await req.etf.snapshot(ticker)
        return { ticker, price: snap.price, changePct: snap.changePct }
      } catch {
        return { ticker, price: null, changePct: null, error: 'unavailable' }
      }
    }))
    return json(results)
  })

  server.registerTool('investments_get_ytd_contributions', {
    title: 'Get YTD investment contributions',
    description: 'Cumulative amount contributed to the Investments category so far this year. This is money moved into savings/investment accounts, NOT a live portfolio market value. Read-only.',
    inputSchema: {},
  }, async () => {
    const summary = await req.ledger.getSummary(currentMonth())
    return json({ month: summary.month, investmentsYTD: summary.investmentsYTD })
  })
}
