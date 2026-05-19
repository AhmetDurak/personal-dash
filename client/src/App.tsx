import { useState } from 'react'
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
import type { Tab } from './components/web/Sidebar'
import type { Span } from './components/web/BalanceChart'

function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
  })
  function set(v: T) { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }
  return [value, set] as const
}

export function App() {
  const [tab, setTab]     = useLocalState<Tab>('fd:tab', 'overview')
  const [month, setMonth] = useLocalState<string>('fd:month', currentMonth())
  const [span, setSpan]   = useLocalState<Span>('fd:span', '6M')
  const { dark, toggle }  = useDarkMode()

  return (
    <div className="flex h-screen bg-xero-bg overflow-hidden">
      <Sidebar active={tab} onChange={setTab} dark={dark} onToggleDark={toggle} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader tab={tab} month={month} onMonthChange={setMonth} />
        <main className="flex-1 overflow-y-auto">
          {tab === 'overview'     && <OverviewTab month={month} span={span} onSpanChange={setSpan} />}
          {tab === 'cashflow'     && <CashFlowTab month={month} span={span} onSpanChange={setSpan} />}
          {tab === 'simplified'   && <SimplifiedTab month={month} span={span} onSpanChange={setSpan} />}
          {tab === 'transactions' && <TransactionsTab month={month} onMonthChange={setMonth} />}
          {tab === 'etf'          && <ETFTab />}
          {tab === 'news'         && <NewsTab />}
          {tab === 'learn'        && <LearnTab />}
        </main>
      </div>
    </div>
  )
}
