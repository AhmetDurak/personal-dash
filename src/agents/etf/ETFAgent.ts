import YahooFinance from 'yahoo-finance2'
import { Pool } from 'pg'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export interface ETFSnapshot {
  ticker: string
  name: string
  currency: string
  price: number
  previousClose: number
  change: number
  changePct: number
  high52w: number
  low52w: number
  nav: number | null
  totalAssets: number | null
  ter: number | null          // annual expense ratio (fraction)
  yield: number | null
  ytdReturn: number | null
  beta: number | null
  category: string | null
  fundFamily: string | null
  isin: string | null
  inception: string | null
  replicationMethod: string | null
  distribution: string | null // 'Accumulating' | 'Distributing'
}

export interface ETFCandle { date: string; close: number }

export interface ETFHolding { name: string; weight: number }

export interface ETFComposition {
  topHoldings: ETFHolding[]
  sectors: { name: string; weight: number }[]
  countries: { name: string; weight: number }[]
  bondRating: { name: string; weight: number }[]
  equityStyle: string | null
}

export interface ETFRisk {
  beta: number | null
  alpha: number | null
  stdDev: number | null
  sharpe: number | null
  treynor: number | null
  r2: number | null
  meanReturn: number | null
}

export interface NewsItem {
  id: string
  title: string
  publisher: string
  link: string
  publishedAt: string
  thumbnail: string | null
}

export interface CategorizedNewsItem extends NewsItem {
  category: 'etf' | 'metals' | 'ai' | 'politics'
  relatedTicker?: string
}

export interface MetalPrice {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  currency: string
}

export interface NewsFeed {
  news: CategorizedNewsItem[]
  metals: MetalPrice[]
}

// 5-min cache for news, 15-min for price data
const cache = new Map<string, { ts: number; ttl: number; data: unknown }>()
const TTL = 15 * 60 * 1000
const NEWS_TTL = 5 * 60 * 1000

function fromCache<T>(key: string): T | null {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < hit.ttl) return hit.data as T
  return null
}
function toCache(key: string, data: unknown, ttl = TTL) { cache.set(key, { ts: Date.now(), ttl, data }) }

type YFOptions = { validateResult: boolean }

async function safeQuoteSummary(ticker: string, modules: string[]): Promise<Record<string, unknown> | null> {
  try {
    const result = await (yahooFinance.quoteSummary as (
      symbol: string,
      queryOptions: { modules: string[] },
      opts: YFOptions
    ) => Promise<Record<string, unknown>>)(ticker, { modules }, { validateResult: false })
    return result
  } catch {
    return null
  }
}

export class ETFAgent {
  constructor(private pool: Pool) {}

  // ── Watchlist ──────────────────────────────────────────────────────────────

  async list(): Promise<string[]> {
    const { rows } = await this.pool.query('SELECT ticker FROM etf_watchlist ORDER BY added_at')
    return rows.map(r => r.ticker as string)
  }

  async add(ticker: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO etf_watchlist (ticker) VALUES ($1) ON CONFLICT (ticker) DO NOTHING',
      [ticker.toUpperCase()]
    )
  }

  async remove(ticker: string): Promise<void> {
    await this.pool.query('DELETE FROM etf_watchlist WHERE ticker = $1', [ticker.toUpperCase()])
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  async snapshot(ticker: string): Promise<ETFSnapshot> {
    const key = `snap:${ticker}`
    const cached = fromCache<ETFSnapshot>(key)
    if (cached) return cached

    const [quote, summary] = await Promise.all([
      (yahooFinance.quote as (symbol: string, q: Record<string, never>, opts: YFOptions) => Promise<Record<string, unknown>>)(ticker, {}, { validateResult: false }),
      safeQuoteSummary(ticker, ['summaryDetail', 'defaultKeyStatistics', 'fundProfile', 'topHoldings', 'assetProfile']),
    ])

    const sd   = summary?.['summaryDetail'] as Record<string, unknown> | undefined
    const ks   = summary?.['defaultKeyStatistics'] as Record<string, unknown> | undefined
    const fp   = summary?.['fundProfile'] as Record<string, unknown> | null | undefined
    const fees = (fp?.['feesExpensesInvestment'] as Record<string, unknown> | undefined)

    const inceptionRaw = ks?.['fundInceptionDate']
    const inceptionStr = inceptionRaw ? new Date(inceptionRaw as string).toISOString().slice(0, 10) : null

    // totalNetAssets is in millions in Yahoo Finance
    const totalNetAssets = fees?.['totalNetAssets'] as number | null | undefined

    const result: ETFSnapshot = {
      ticker:           ticker.toUpperCase(),
      name:             String(quote['longName'] ?? quote['shortName'] ?? ticker),
      currency:         String(quote['currency'] ?? 'EUR'),
      price:            Number(quote['regularMarketPrice'] ?? 0),
      previousClose:    Number(quote['regularMarketPreviousClose'] ?? 0),
      change:           Number(quote['regularMarketChange'] ?? 0),
      changePct:        Number(quote['regularMarketChangePercent'] ?? 0),
      high52w:          Number(quote['fiftyTwoWeekHigh'] ?? sd?.['fiftyTwoWeekHigh'] ?? 0),
      low52w:           Number(quote['fiftyTwoWeekLow']  ?? sd?.['fiftyTwoWeekLow']  ?? 0),
      nav:              (sd?.['navPrice'] as number | null | undefined) ?? null,
      totalAssets:      totalNetAssets != null ? totalNetAssets * 1e6 : null,
      ter:              (fees?.['annualReportExpenseRatio'] as number | null | undefined) ?? null,
      yield:            (sd?.['yield'] as number | null | undefined) ?? null,
      ytdReturn:        (ks?.['ytdReturn'] as number | null | undefined) ?? null,
      beta:             (ks?.['beta'] as number | null | undefined) ?? null,
      category:         (fp?.['categoryName'] as string | null | undefined) ?? null,
      fundFamily:       (fp?.['family'] as string | null | undefined) ?? (ks?.['fundFamily'] as string | null | undefined) ?? null,
      isin:             null,
      inception:        inceptionStr,
      replicationMethod: null,
      distribution:     null,
    }

    toCache(key, result)
    return result
  }

  async chart(ticker: string, range: string): Promise<ETFCandle[]> {
    const RANGE_DAYS: Record<string, number> = {
      '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '3y': 365 * 3, '5y': 365 * 5,
    }
    const days = RANGE_DAYS[range] ?? 365
    const interval = days <= 30 ? '1d' : '1wk'
    const key = `chart:${ticker}:${range}`
    const cached = fromCache<ETFCandle[]>(key)
    if (cached) return cached

    const period2 = new Date()
    const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const result = await (yahooFinance.chart as unknown as (
      symbol: string, q: { period1: Date; period2: Date; interval: string }, opts: YFOptions
    ) => Promise<{ quotes: { date: Date | string; close: number | null }[] }>)(
      ticker, { period1, period2, interval }, { validateResult: false }
    )
    const candles: ETFCandle[] = (result.quotes ?? [])
      .filter(q => q.close != null)
      .map(q => ({
        date: new Date(q.date).toISOString().slice(0, 10),
        close: q.close!,
      }))

    toCache(key, candles)
    return candles
  }

  async composition(ticker: string): Promise<ETFComposition> {
    const key = `comp:${ticker}`
    const cached = fromCache<ETFComposition>(key)
    if (cached) return cached

    const summary = await safeQuoteSummary(ticker, ['topHoldings'])
    const th = summary?.['topHoldings'] as Record<string, unknown> | null | undefined

    const topHoldings: ETFHolding[] = ((th?.['holdings'] as { holdingName?: string; holdingPercent?: number }[] | undefined) ?? [])
      .map(h => ({ name: h.holdingName ?? '', weight: (h.holdingPercent ?? 0) * 100 }))

    const sectors: { name: string; weight: number }[] = ((th?.['sectorWeightings'] as Record<string, number>[] | undefined) ?? [])
      .flatMap(obj => Object.entries(obj).map(([name, weight]) => ({ name, weight: weight * 100 })))

    const result: ETFComposition = { topHoldings, sectors, countries: [], bondRating: [], equityStyle: null }
    toCache(key, result)
    return result
  }

  async risk(ticker: string): Promise<ETFRisk> {
    const key = `risk:${ticker}`
    const cached = fromCache<ETFRisk>(key)
    if (cached) return cached

    const summary = await safeQuoteSummary(ticker, ['defaultKeyStatistics', 'fundPerformance'])
    const ks = summary?.['defaultKeyStatistics'] as Record<string, unknown> | undefined
    const fp = summary?.['fundPerformance'] as Record<string, unknown> | null | undefined
    const rr = (fp?.['riskOverviewStatistics'] as Record<string, unknown> | undefined)
    const riskStats = (rr?.['riskStatistics'] as Record<string, unknown>[] | undefined)?.[0]

    const result: ETFRisk = {
      beta:       (ks?.['beta'] as number | null | undefined) ?? null,
      alpha:      (riskStats?.['alpha'] as number | null | undefined) ?? null,
      stdDev:     (riskStats?.['stdDev'] as number | null | undefined) ?? null,
      sharpe:     (riskStats?.['sharpe'] as number | null | undefined) ?? null,
      treynor:    (riskStats?.['treynor'] as number | null | undefined) ?? null,
      r2:         (riskStats?.['r2'] as number | null | undefined) ?? null,
      meanReturn: (riskStats?.['meanAnnualReturn'] as number | null | undefined) ?? null,
    }

    toCache(key, result)
    return result
  }

  // ── News & Metals ──────────────────────────────────────────────────────────

  async newsFor(symbol: string, count = 5): Promise<NewsItem[]> {
    try {
      const raw = await (yahooFinance.search as (
        q: string, opts: { quotesCount: number; newsCount: number }, extra: YFOptions
      ) => Promise<unknown>)(symbol, { quotesCount: 0, newsCount: count }, { validateResult: false })
      const items = (raw as { news?: Record<string, unknown>[] }).news ?? []
      return items
        .filter(n => n['title'] && n['link'])
        .map(n => ({
          id:          String(n['uuid'] ?? n['link']),
          title:       String(n['title']),
          publisher:   String(n['publisher'] ?? ''),
          link:        String(n['link']),
          publishedAt: n['providerPublishTime']
            ? new Date(n['providerPublishTime'] as string).toISOString()
            : new Date().toISOString(),
          thumbnail:   ((n['thumbnail'] as Record<string, unknown> | undefined)?.['resolutions'] as { url: string; tag: string }[] | undefined)
            ?.find(r => r.tag === '140x140')?.url ?? null,
        }))
    } catch { return [] }
  }

  async newsFeed(): Promise<NewsFeed> {
    const cacheKey = 'news:feed'
    const cached = fromCache<NewsFeed>(cacheKey)
    if (cached) return cached

    const watchlistTickers = await this.list()

    const METAL_TICKERS = ['GC=F', 'SI=F', 'HG=F', 'CL=F']
    const AI_TICKERS    = ['NVDA', 'MSFT']
    const BÖRSE_TICKERS = ['^GDAXI', 'SPY']

    const [etfNewsArr, metalNewsArr, aiNewsArr, börseNewsArr, metalPricesArr] = await Promise.all([
      Promise.all(watchlistTickers.slice(0, 5).map(t =>
        this.newsFor(t, 5).then(items => items.map(n => ({ ...n, category: 'etf' as const, relatedTicker: t })))
      )),
      Promise.all(METAL_TICKERS.map(t =>
        this.newsFor(t, 4).then(items => items.map(n => ({ ...n, category: 'metals' as const, relatedTicker: t })))
      )),
      Promise.all(AI_TICKERS.map(t =>
        this.newsFor(t, 5).then(items => items.map(n => ({ ...n, category: 'ai' as const, relatedTicker: t })))
      )),
      Promise.all(BÖRSE_TICKERS.map(t =>
        this.newsFor(t, 5).then(items => items.map(n => ({ ...n, category: 'politics' as const, relatedTicker: t })))
      )),
      // EUR/USD rate + metal quotes in parallel
      Promise.all([
        (yahooFinance.quote as (s: string, q: Record<string, never>, o: YFOptions) => Promise<Record<string, unknown>>)('EURUSD=X', {}, { validateResult: false })
          .then(q => Number(q['regularMarketPrice'] ?? 1)).catch(() => 1),
        ...METAL_TICKERS.map(sym =>
          (yahooFinance.quote as (s: string, q: Record<string, never>, o: YFOptions) => Promise<Record<string, unknown>>)(sym, {}, { validateResult: false })
        ),
      ]),
    ])

    const allNews: CategorizedNewsItem[] = [
      ...etfNewsArr.flat(),
      ...metalNewsArr.flat(),
      ...aiNewsArr.flat(),
      ...börseNewsArr.flat(),
    ]

    const seen = new Set<string>()
    const news = allNews.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
    news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    const [eurUsd, ...metalQuotes] = metalPricesArr as [number, ...Record<string, unknown>[]]
    const rate = eurUsd > 0 ? eurUsd : 1
    const NAMES: Record<string, string> = { 'GC=F': 'Gold', 'SI=F': 'Silber', 'HG=F': 'Kupfer', 'CL=F': 'Öl (WTI)' }
    const metals: MetalPrice[] = metalQuotes
      .map((q, i) => {
        const sym = METAL_TICKERS[i]
        const usdPrice = Number(q['regularMarketPrice'] ?? 0)
        if (!usdPrice) return null
        return {
          symbol:    sym,
          name:      NAMES[sym] ?? sym,
          price:     usdPrice / rate,
          change:    Number(q['regularMarketChange'] ?? 0) / rate,
          changePct: Number(q['regularMarketChangePercent'] ?? 0),
          currency:  'EUR',
        } satisfies MetalPrice
      })
      .filter((m): m is MetalPrice => m !== null)

    const result: NewsFeed = { news, metals }
    toCache(cacheKey, result, NEWS_TTL)
    return result
  }

  async search(query: string): Promise<{ ticker: string; name: string; exchange: string }[]> {
    const results = await (yahooFinance.search as (
      q: string, opts: { quotesCount: number; newsCount: number }, extra: YFOptions
    ) => Promise<unknown>)(query, { quotesCount: 8, newsCount: 0 }, { validateResult: false })
    const quotes = (results as { quotes?: Record<string, unknown>[] }).quotes ?? []
    return quotes
      .filter((q: Record<string, unknown>) => q['quoteType'] === 'ETF' || q['quoteType'] === 'MUTUALFUND')
      .map((q: Record<string, unknown>) => ({
        ticker:   String(q['symbol'] ?? ''),
        name:     String(q['longname'] ?? q['shortname'] ?? q['symbol'] ?? ''),
        exchange: String(q['exchange'] ?? ''),
      }))
  }
}
