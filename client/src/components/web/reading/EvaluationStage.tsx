import { useState } from 'react'
import type { EvaluationScores } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { CRITERIA, WEAKNESS_OPTIONS, criterionLabel, weaknessLabel } from './shared'

function emptyScores(): EvaluationScores {
  const blank = { score: 0, note: '' }
  return {
    understanding: { ...blank }, mainIdea: { ...blank }, unnecessaryDetailsRemoved: { ...blank },
    clarity: { ...blank }, explainability: { ...blank },
  }
}

function scoreColor(score: number, selected: boolean) {
  if (!selected) return 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'
  if (score <= 1) return 'bg-red-500 text-white'
  if (score <= 3) return 'bg-amber-500 text-white'
  return 'bg-emerald-500 text-white'
}

export function EvaluationStage({ onSubmit }: { onSubmit: (scores: EvaluationScores, weakness: string | null, note: string | null) => void }) {
  const { t } = useLanguage()
  const [scores, setScores] = useState<EvaluationScores>(emptyScores())
  const [weakness, setWeakness] = useState<string | null>(null)
  const [weaknessNote, setWeaknessNote] = useState('')

  const total = CRITERIA.reduce((sum, k) => sum + scores[k].score, 0)

  function setCriterionScore(key: keyof EvaluationScores, value: number) {
    setScores(s => ({ ...s, [key]: { ...s[key], score: value } }))
  }
  function setCriterionNote(key: keyof EvaluationScores, note: string) {
    setScores(s => ({ ...s, [key]: { ...s[key], note } }))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.readingScorecardTitle}</h2>
        <span className="text-sm font-bold text-xero-green">{total} / 25</span>
      </div>

      <div className="space-y-3">
        {CRITERIA.map(key => (
          <div key={key} className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{criterionLabel(t, key)}</span>
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">{scores[key].score}/5</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setCriterionScore(key, n)}
                  className={`min-h-[44px] flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${scoreColor(n, scores[key].score === n)}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              value={scores[key].note}
              onChange={e => setCriterionNote(key, e.target.value)}
              placeholder={t.readingWhyScorePlaceholder}
              className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
            />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4 space-y-3">
        <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{t.readingWeaknessLabel}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WEAKNESS_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setWeakness(opt)}
              className={`text-left text-xs px-3 py-2 min-h-[44px] flex items-center rounded-lg font-medium transition-colors ${
                weakness === opt ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green' : 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {weaknessLabel(t, opt)}
            </button>
          ))}
        </div>
        {weakness === 'other' && (
          <input
            value={weaknessNote}
            onChange={e => setWeaknessNote(e.target.value)}
            placeholder={t.readingWeaknessOtherNote}
            className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
          />
        )}
      </div>

      <button
        onClick={() => onSubmit(scores, weakness, weakness === 'other' ? weaknessNote : null)}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark transition-colors"
      >
        {t.readingSubmitEvaluation}
      </button>
    </div>
  )
}
