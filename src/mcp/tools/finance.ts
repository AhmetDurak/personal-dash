import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import { ChartAgent } from '../../agents/chart/ChartAgent'

const MONTH_RE = /^\d{4}-\d{2}$/

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function lastNMonths(endMonth: string, n: number): string[] {
  const [y, m] = endMonth.split('-').map(Number)
  const months: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

// Read-only tools over the existing LedgerAgent/ChartAgent — no write methods are exposed.
export function registerFinanceTools(server: McpServer, req: Request) {
  server.registerTool('finance_get_month_summary', {
    title: 'Get month summary',
    description: 'Income, expenses by category, net, end balance, and savings rate for a given month. Read-only.',
    inputSchema: {
      month: z.string().regex(MONTH_RE).optional().describe('YYYY-MM, defaults to the current month'),
    },
  }, async ({ month }) => json(await req.ledger.getSummary(month ?? currentMonth())))

  server.registerTool('finance_list_transactions', {
    title: 'List transactions',
    description: 'List all ledger transactions for a given month. Read-only.',
    inputSchema: {
      month: z.string().regex(MONTH_RE).optional().describe('YYYY-MM, defaults to the current month'),
    },
  }, async ({ month }) => json(await req.ledger.getTransactions(month ?? currentMonth())))

  server.registerTool('finance_top_payees', {
    title: 'Top payees',
    description: 'Top payees/spend recipients for a month, ranked by total amount. Read-only.',
    inputSchema: {
      month: z.string().regex(MONTH_RE).optional().describe('YYYY-MM, defaults to the current month'),
      limit: z.number().int().positive().max(50).optional().describe('Max results, default 10'),
    },
  }, async ({ month, limit }) => json(await req.ledger.topPayees(month ?? currentMonth(), limit ?? 10)))

  server.registerTool('finance_category_breakdown', {
    title: 'Category breakdown',
    description: 'Expense breakdown by category for a month, matching the dashboard donut chart. Read-only.',
    inputSchema: {
      month: z.string().regex(MONTH_RE).optional().describe('YYYY-MM, defaults to the current month'),
    },
  }, async ({ month }) => {
    const summary = await req.ledger.getSummary(month ?? currentMonth())
    return json(new ChartAgent().getCategoryDonut(summary))
  })

  server.registerTool('finance_balance_trend', {
    title: 'Balance trend',
    description: 'End-of-month balance and cumulative YTD investment contributions over the last N months. Read-only.',
    inputSchema: {
      months: z.number().int().positive().max(24).optional().describe('How many months back to include, default 6'),
      endMonth: z.string().regex(MONTH_RE).optional().describe('Last month in the range, defaults to the current month'),
    },
  }, async ({ months, endMonth }) => {
    const range = lastNMonths(endMonth ?? currentMonth(), months ?? 6)
    const summaries = await Promise.all(range.map(m => req.ledger.getSummary(m)))
    return json(new ChartAgent().getBalanceSeries(summaries))
  })

  server.registerTool('finance_income_vs_expense', {
    title: 'Income vs expense',
    description: 'Monthly income vs total expenses over the last N months. Read-only.',
    inputSchema: {
      months: z.number().int().positive().max(24).optional().describe('How many months back to include, default 6'),
      endMonth: z.string().regex(MONTH_RE).optional().describe('Last month in the range, defaults to the current month'),
    },
  }, async ({ months, endMonth }) => {
    const range = lastNMonths(endMonth ?? currentMonth(), months ?? 6)
    const summaries = await Promise.all(range.map(m => req.ledger.getSummary(m)))
    return json(new ChartAgent().getIncomeVsExpenseBar(summaries))
  })
}
