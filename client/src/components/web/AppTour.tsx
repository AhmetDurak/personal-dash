import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const TOUR_KEY = 'app:tour:done'

interface Step {
  emoji:       string
  title:       string
  description: string
  highlight?:  string  // hint text for the area being described
}

const STEPS: Step[] = [
  {
    emoji:       '👋',
    title:       'Welcome to your Personal Dashboard',
    description: 'This is your all-in-one hub for managing your finances, daily life, learning, and staying informed. Let\'s take a quick look at what\'s available.',
  },
  {
    emoji:       '💰',
    title:       'Finance',
    description: 'Track your income and expenses, view cash flow statements, monitor your ETF watchlist, and explore finance learning materials. Use the sidebar to switch between views.',
    highlight:   'Top bar → Finance',
  },
  {
    emoji:       '📅',
    title:       'Today',
    description: 'Plan your day, track tasks, and write a daily journal entry. Your weekly view lets you navigate between days without losing context.',
    highlight:   'Top bar → Today',
  },
  {
    emoji:       '🌿',
    title:       'Life',
    description: 'Log your daily activity, track meals and nutrition, and monitor your sport sessions. Each section auto-saves as you type.',
    highlight:   'Top bar → Life',
  },
  {
    emoji:       '📚',
    title:       'Learn',
    description: 'Keep notes with full markdown support, build a vocabulary in any language, write annotated sentences, and save financial rules that matter to you.',
    highlight:   'Top bar → Learn',
  },
  {
    emoji:       '📰',
    title:       'News',
    description: 'Stay current with financial markets, ETFs on your watchlist, commodities, and AI & tech — all in one feed. Filtered by category.',
    highlight:   'Top bar → News',
  },
  {
    emoji:       '✅',
    title:       'You\'re all set!',
    description: 'Tip: look for the  ⓘ  icon next to section titles — it shows a quick explanation of that feature. You can revisit this tour anytime from the Settings menu.',
  },
]

export function AppTour() {
  const [step, setStep]   = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // small delay so layout is painted first
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  function close() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else close()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const isFirst = step === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
        onClick={close}
      />

      {/* Card */}
      <div className="relative pointer-events-auto w-full sm:max-w-md mx-4 mb-6 sm:mb-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-xero-green to-emerald-400 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Emoji + content */}
          <div className="text-4xl mb-4">{current.emoji}</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2 pr-8">{current.title}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{current.description}</p>

          {current.highlight && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-xero-green" />
              {current.highlight}
            </div>
          )}

          {/* Step dots + nav */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all ${
                    i === step
                      ? 'w-5 h-2 bg-xero-green'
                      : 'w-2 h-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-xero-green hover:bg-emerald-600 transition-colors px-4 py-1.5 rounded-xl"
              >
                {isLast ? 'Get started' : 'Next'}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Call this from the Settings menu to re-run the tour */
export function resetTour() {
  localStorage.removeItem(TOUR_KEY)
}
