import useSWR from 'swr'
import type { ETFSnapshot, ETFCandle, ETFComposition, ETFRisk, ETFSearchResult, NewsFeed } from '../types'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

export function useETFWatchlist() {
  const { data, mutate } = useSWR<string[]>('/api/etf/watchlist', fetcher)

  async function add(ticker: string) {
    await fetch('/api/etf/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    })
    await mutate()
  }

  async function remove(ticker: string) {
    await fetch(`/api/etf/watchlist/${ticker}`, { method: 'DELETE' })
    await mutate()
  }

  return { tickers: data ?? [], add, remove }
}

export function useETFSnapshot(ticker: string | null) {
  return useSWR<ETFSnapshot>(ticker ? `/api/etf/snapshot/${ticker}` : null, fetcher)
}

export function useETFChart(ticker: string | null, range: string) {
  return useSWR<ETFCandle[]>(ticker ? `/api/etf/chart/${ticker}?range=${range}` : null, fetcher)
}

export function useETFComposition(ticker: string | null) {
  return useSWR<ETFComposition>(ticker ? `/api/etf/composition/${ticker}` : null, fetcher)
}

export function useETFRisk(ticker: string | null) {
  return useSWR<ETFRisk>(ticker ? `/api/etf/risk/${ticker}` : null, fetcher)
}

export function useNewsFeed() {
  return useSWR<NewsFeed>('/api/etf/news', fetcher, { refreshInterval: 5 * 60 * 1000 })
}

export function useETFSearch(query: string) {
  return useSWR<ETFSearchResult[]>(
    query.length > 1 ? `/api/etf/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
}
