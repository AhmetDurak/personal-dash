import { useState } from 'react'
import { useLanguage } from '../../../hooks/useLanguage'

export function ReflectStage({ onSubmit }: { onSubmit: (learned: string, canExplain2min: boolean, takeaway: string) => void }) {
  const { t } = useLanguage()
  const [learned, setLearned] = useState('')
  const [canExplain, setCanExplain] = useState<boolean | null>(null)
  const [takeaway, setTakeaway] = useState('')

  const inputCls = 'w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green resize-none'

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1.5">{t.readingLearnedLabel}</span>
        <textarea value={learned} onChange={e => setLearned(e.target.value)} rows={3} className={inputCls} />
      </label>

      <div>
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1.5">{t.readingExplain2minLabel}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setCanExplain(true)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${canExplain === true ? 'bg-emerald-500 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            {t.readingYes}
          </button>
          <button
            onClick={() => setCanExplain(false)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${canExplain === false ? 'bg-amber-500 text-white' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            {t.readingNotYet}
          </button>
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1.5">{t.readingTakeawayLabel}</span>
        <input value={takeaway} onChange={e => setTakeaway(e.target.value)} className={inputCls} placeholder={t.readingTakeawayPlaceholder} />
      </label>

      <button
        onClick={() => onSubmit(learned, canExplain ?? false, takeaway)}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark transition-colors"
      >
        {t.readingCompleteSession}
      </button>
    </div>
  )
}
