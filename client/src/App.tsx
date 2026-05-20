import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDarkMode } from './hooks/useDarkMode'
import { Sidebar } from './components/web/Sidebar'
import { DashboardHeader } from './components/web/DashboardHeader'
import { OverviewTab } from './tabs/OverviewTab'
import { CashFlowTab } from './tabs/CashFlowTab'
import { SimplifiedTab } from './tabs/SimplifiedTab'
import { TransactionsTab } from './tabs/TransactionsTab'
import { ETFTab } from './tabs/ETFTab'
import { NewsTab } from './tabs/NewsTab'
import { LearnTab } from './tabs/LearnTab'
import { currentMonth } from './utils/format'
import type { Span } from './components/web/BalanceChart'

function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
  })
  function set(v: T) { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }
  return [value, set] as const
}

export function App() {
  const [month, setMonth] = useLocalState<string>('fd:month', currentMonth())
  const [span, setSpan]   = useLocalState<Span>('fd:span', '6M')
  const { dark, toggle }  = useDarkMode()

  return (
    <div className="flex h-screen bg-xero-bg overflow-hidden">
      <Sidebar dark={dark} onToggleDark={toggle} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader month={month} onMonthChange={setMonth} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview"     element={<OverviewTab month={month} span={span} onSpanChange={setSpan} />} />
            <Route path="/cashflow"     element={<CashFlowTab month={month} span={span} onSpanChange={setSpan} />} />
            <Route path="/simplified"   element={<SimplifiedTab month={month} span={span} onSpanChange={setSpan} />} />
            <Route path="/transactions" element={<TransactionsTab month={month} onMonthChange={setMonth} />} />
            <Route path="/etf"          element={<ETFTab />} />
            <Route path="/news"         element={<NewsTab />} />
            <Route path="/learn"        element={<LearnTab />} />
            <Route path="*"             element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
