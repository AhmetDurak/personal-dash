import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { LanguageContext, useLanguageState } from './hooks/useLanguage'
import { LoginPage } from './pages/LoginPage'
import { TopBar } from './components/web/TopBar'
import { Sidebar } from './components/web/Sidebar'
import { AppTour } from './components/web/AppTour'
import { DashboardHeader } from './components/web/DashboardHeader'
import { OverviewTab } from './tabs/OverviewTab'
import { CashFlowTab } from './tabs/CashFlowTab'
import { SimplifiedTab } from './tabs/SimplifiedTab'
import { TransactionsTab } from './tabs/TransactionsTab'
import { ETFTab } from './tabs/ETFTab'
import { NewsTab } from './tabs/NewsTab'
import { LearnTab } from './tabs/LearnTab'
import { LearnSectionTab, LifeTab } from './tabs/NotebookTab'
import { TodayTab } from './tabs/TodayTab'
import { currentMonth } from './utils/format'
import type { Span } from './components/web/BalanceChart'

function NewsPage() {
  return (
    <div className="h-full flex flex-col bg-xero-bg">
      <header className="flex items-center px-8 py-4 bg-white border-b border-xero-border flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">News Feed</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <NewsTab />
      </div>
    </div>
  )
}

function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
  })
  function set(v: T) { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }
  return [value, set] as const
}

function FinanceDashboard() {
  const [month, setMonth] = useLocalState<string>('fd:month', currentMonth())
  const [span, setSpan]   = useLocalState<Span>('fd:span', '6M')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full bg-xero-bg overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader month={month} onMonthChange={setMonth} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Routes>
            <Route path="overview"     element={<OverviewTab month={month} span={span} onSpanChange={setSpan} />} />
            <Route path="cashflow"     element={<CashFlowTab month={month} span={span} onSpanChange={setSpan} />} />
            <Route path="simplified"   element={<SimplifiedTab month={month} span={span} onSpanChange={setSpan} />} />
            <Route path="transactions" element={<TransactionsTab month={month} onMonthChange={setMonth} />} />
            <Route path="etf"          element={<ETFTab />} />
            <Route path="learn"        element={<LearnTab />} />
            <Route path="*"            element={<Navigate to="/finance/overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export function App() {
  const { user, isLoading } = useAuth()
  const langCtx = useLanguageState()
  useReminderNotifications()

  if (isLoading) return <div className="h-screen bg-gray-950" />
  if (!user)     return <LoginPage />

  return (
    <LanguageContext.Provider value={langCtx}>
      <div className="flex flex-col h-dvh overflow-hidden">
        <TopBar />
        <AppTour />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/today"       element={<TodayTab />} />
            <Route path="/life/*"      element={<LifeTab />} />
            <Route path="/learn/*"     element={<LearnSectionTab />} />
            <Route path="/news"        element={<NewsPage />} />
            <Route path="/finance/*"   element={<FinanceDashboard />} />
            {/* Legacy redirects */}
            <Route path="/workspace/log/*"   element={<Navigate to="/life/log" replace />} />
            <Route path="/workspace/meal/*"  element={<Navigate to="/life/meal" replace />} />
            <Route path="/workspace/sport/*" element={<Navigate to="/life/sport" replace />} />
            <Route path="/workspace/reminders" element={<Navigate to="/life/reminders" replace />} />
            <Route path="/workspace/notes"   element={<Navigate to="/learn/notes" replace />} />
            <Route path="/workspace/mindmap" element={<Navigate to="/learn/mindmap" replace />} />
            <Route path="/workspace/vocab"   element={<Navigate to="/learn/language" replace />} />
            <Route path="/learn/vocab"       element={<Navigate to="/learn/language" replace />} />
            <Route path="/workspace/*"       element={<Navigate to="/learn/notes" replace />} />
            <Route path="*"            element={<Navigate to="/today" replace />} />
          </Routes>
        </div>
      </div>
    </LanguageContext.Provider>
  )
}
