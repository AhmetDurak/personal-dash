import { useState, useEffect, useRef } from 'react'
import type { ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'

interface Fields {
  mainIdea: string; point1: string; point2: string; point3: string; importance: string; example: string
}

const FIELD_KEYS: (keyof Fields)[] = ['mainIdea', 'point1', 'point2', 'point3', 'importance', 'example']

function countWordsChars(fields: Fields) {
  const combined = FIELD_KEYS.map(k => fields[k]).join(' ').trim()
  const words = combined ? combined.split(/\s+/).length : 0
  const chars = FIELD_KEYS.map(k => fields[k]).join('').length
  return { words, chars }
}

const inputCls = 'w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green resize-none'

// Does NOT receive session.sourceContent as a prop — the source is structurally
// unreachable here, not just visually hidden, so it can't leak via devtools either.
export function SummaryStage({ session, onSave, onContinue }: {
  session: Pick<ReadingSession, 'id' | 'summaryMainIdea' | 'summaryPoint1' | 'summaryPoint2' | 'summaryPoint3' | 'summaryImportance' | 'summaryExample'>
  onSave: (patch: Partial<Fields>) => void
  onContinue: () => void
}) {
  const { t } = useLanguage()
  const [fields, setFields] = useState<Fields>({
    mainIdea: session.summaryMainIdea, point1: session.summaryPoint1, point2: session.summaryPoint2,
    point3: session.summaryPoint3, importance: session.summaryImportance, example: session.summaryExample,
  })
  const sessionIdRef = useRef(session.id)

  useEffect(() => {
    if (sessionIdRef.current !== session.id) {
      sessionIdRef.current = session.id
      setFields({
        mainIdea: session.summaryMainIdea, point1: session.summaryPoint1, point2: session.summaryPoint2,
        point3: session.summaryPoint3, importance: session.summaryImportance, example: session.summaryExample,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  function update(key: keyof Fields, value: string) {
    setFields(f => ({ ...f, [key]: value }))
    onSave({ [key]: value })
  }

  const { words, chars } = countWordsChars(fields)
  const inTarget = words >= 100 && words <= 150

  const FORM_ROWS: { key: keyof Fields; label: string; question: string; multiline?: boolean }[] = [
    { key: 'mainIdea',    label: t.readingMainIdeaLabel,    question: t.readingMainIdeaQuestion },
    { key: 'point1',      label: t.readingKeyPoint1,        question: '' },
    { key: 'point2',      label: t.readingKeyPoint2,        question: '' },
    { key: 'point3',      label: t.readingKeyPoint3,        question: '' },
    { key: 'importance',  label: t.readingImportanceLabel,  question: t.readingImportanceQuestion },
    { key: 'example',     label: t.readingExampleLabel,     question: t.readingExampleQuestion },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-5">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{t.readingRecallInstruction}</p>
      </div>

      <div className="space-y-3">
        {FORM_ROWS.map(row => (
          <label key={row.key} className="block">
            <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">{row.label}</span>
            {row.question && <span className="block text-[11px] text-gray-400 dark:text-slate-500 mb-1.5">{row.question}</span>}
            {!row.question && <span className="block mb-1.5" />}
            <textarea
              value={fields[row.key]}
              onChange={e => update(row.key, e.target.value)}
              rows={row.key === 'mainIdea' || row.key === 'importance' ? 4 : 2}
              className={inputCls}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
        <span className={inTarget ? 'text-xero-green font-medium' : ''}>
          {words} {t.readingWordsLabel} · {chars} {t.readingCharsLabel}
        </span>
        <span>{t.readingTargetHint}</span>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark transition-colors"
      >
        {t.readingContinueToEvaluation}
      </button>
    </div>
  )
}
