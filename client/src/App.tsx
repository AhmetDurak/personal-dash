import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { useAnalytics } from './hooks/useAnalytics'
import { LanguageContext, useLanguageState } from './hooks/useLanguage'
import { TopBar } from './components/web/TopBar'
import { Sidebar } from './components/web/Sidebar'
import { AppTour } from './components/web/AppTour'
import { DashboardHeader } from './components/web/DashboardHeader'
import { currentMonth } from './utils/format'
import type { Span } from './components/web/BalanceChart'

// Route-level code splitting: each tab downloads only when visited, instead of
// bundling the entire app (including NotebookTab.tsx, by far the largest file)
// into one eager chunk.
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const McpConsentPage = lazy(() => import('./pages/McpConsentPage').then(m => ({ default: m.McpConsentPage })))
const OverviewTab = lazy(() => import('./tabs/OverviewTab').then(m => ({ default: m.OverviewTab })))
const CashFlowTab = lazy(() => import('./tabs/CashFlowTab').then(m => ({ default: m.CashFlowTab })))
const TransactionsTab = lazy(() => import('./tabs/TransactionsTab').then(m => ({ default: m.TransactionsTab })))
const ETFTab = lazy(() => import('./tabs/ETFTab').then(m => ({ default: m.ETFTab })))
const NewsTab = lazy(() => import('./tabs/NewsTab').then(m => ({ default: m.NewsTab })))
const UpdatesTab = lazy(() => import('./tabs/UpdatesTab').then(m => ({ default: m.UpdatesTab })))
const LearnTab = lazy(() => import('./tabs/LearnTab').then(m => ({ default: m.LearnTab })))
const Planner = lazy(() => import('./tabs/Planner').then(m => ({ default: m.Planner })))
const HomeTab = lazy(() => import('./tabs/HomeTab').then(m => ({ default: m.HomeTab })))
const AdminTab = lazy(() => import('./tabs/AdminTab').then(m => ({ default: m.AdminTab })))
const LearnSectionTab = lazy(() => import('./tabs/NotebookTab').then(m => ({ default: m.LearnSectionTab })))
const LifeTab = lazy(() => import('./tabs/NotebookTab').then(m => ({ default: m.LifeTab })))
const RemindersView = lazy(() => import('./tabs/NotebookTab').then(m => ({ default: m.RemindersView })))

function RouteFallback() {
  return <div className="h-full w-full bg-xero-bg dark:bg-slate-900 animate-pulse" />
}

function NewsPage() {
  return (
    <div className="h-full flex flex-col bg-xero-bg">
      <header className="flex items-center px-8 py-4 bg-white border-b border-xero-border flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">News Feed</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={<RouteFallback />}>
          <NewsTab />
        </Suspense>
      </div>
    </div>
  )
}

function UpdatesPage() {
  return (
    <div className="h-full flex flex-col bg-xero-bg">
      <header className="flex items-center px-8 py-4 bg-white border-b border-xero-border flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Updates</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={<RouteFallback />}>
          <UpdatesTab />
        </Suspense>
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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="transactions" element={<TransactionsTab month={month} onMonthChange={setMonth} />} />
              <Route path="cashflow"     element={<CashFlowTab month={month} span={span} onSpanChange={setSpan} />} />
              <Route path="overview"     element={<OverviewTab month={month} span={span} onSpanChange={setSpan} />} />
              <Route path="etf"          element={<ETFTab />} />
              <Route path="learn"        element={<LearnTab />} />
              <Route path="simplified"   element={<Navigate to="/finance/transactions" replace />} />
              <Route path="*"            element={<Navigate to="/finance/transactions" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function AnalyticsTracker() { useAnalytics(); return null }

export function App() {
  const { user, isLoading } = useAuth()
  const langCtx = useLanguageState()
  useReminderNotifications()

  if (isLoading) return <div className="h-screen bg-gray-950" />
  if (!user) return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )

  const isDemo = user.email === 'demo@personaldashboard.app'

  return (
    <LanguageContext.Provider value={langCtx}>
      <div className="flex flex-col h-dvh overflow-hidden">
        {isDemo && (
          <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-amber-500 flex-shrink-0">
            <span className="text-xs text-amber-950 font-semibold">
              You're exploring the demo — data resets periodically.
            </span>
            <a href="/auth/google" className="text-xs text-amber-950 underline underline-offset-2 hover:opacity-70 transition-opacity font-bold">
              Sign in with Google to save your own data →
            </a>
          </div>
        )}
        <TopBar />
        <AnalyticsTracker />
        <AppTour />
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login"       element={<Navigate to="/home" replace />} />
              <Route path="/mcp-consent" element={<McpConsentPage />} />
              <Route path="/home"        element={<HomeTab />} />
              <Route path="/planner"     element={<Planner />} />
              <Route path="/today"       element={<Navigate to="/planner" replace />} />
              <Route path="/reminders"   element={<RemindersView standalone />} />
              <Route path="/life/*"      element={<LifeTab />} />
              <Route path="/learn/*"     element={<LearnSectionTab />} />
              <Route path="/news"        element={<NewsPage />} />
              <Route path="/updates"     element={<UpdatesPage />} />
              <Route path="/finance/*"   element={<FinanceDashboard />} />
              <Route path="/admin"       element={<AdminTab userEmail={user.email} />} />
              {/* Legacy redirects */}
              <Route path="/workspace/log/*"     element={<Navigate to="/life/log" replace />} />
              <Route path="/workspace/meal/*"    element={<Navigate to="/life/meal" replace />} />
              <Route path="/workspace/sport/*"   element={<Navigate to="/life/sport" replace />} />
              <Route path="/workspace/reminders" element={<Navigate to="/reminders" replace />} />
              <Route path="/life/reminders"      element={<Navigate to="/reminders" replace />} />
              <Route path="/workspace/notes"     element={<Navigate to="/learn/notes" replace />} />
              <Route path="/workspace/mindmap"   element={<Navigate to="/learn/mindmap" replace />} />
              <Route path="/workspace/vocab"     element={<Navigate to="/learn/language" replace />} />
              <Route path="/learn/vocab"         element={<Navigate to="/learn/language" replace />} />
              <Route path="/workspace/*"         element={<Navigate to="/learn/notes" replace />} />
              <Route path="*"            element={<Navigate to="/home" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </LanguageContext.Provider>
  )
}
