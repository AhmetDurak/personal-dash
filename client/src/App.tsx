import { useState } from 'react'
import { DashboardHeader } from './components/web/DashboardHeader'
import { TabBar, type Tab } from './components/web/TabBar'
import { OverviewTab } from './tabs/OverviewTab'
import { TransactionsTab } from './tabs/TransactionsTab'
import { ChartsTab } from './tabs/ChartsTab'
import { currentMonth } from './utils/format'

export function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [month, setMonth] = useState(currentMonth)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader month={month} />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1 max-w-3xl w-full mx-auto">
        {tab === 'overview' && <OverviewTab month={month} />}
        {tab === 'transactions' && <TransactionsTab month={month} onMonthChange={setMonth} />}
        {tab === 'charts' && <ChartsTab month={month} />}
      </main>
    </div>
  )
}
