import type { ReadingStatus } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'

const STATUS_STEP_INDEX: Record<ReadingStatus, number> = {
  reading: 0, recall: 2, evaluate: 3, improve: 4, reflect: 5, completed: 5,
}

export function StageProgress({ status }: { status: ReadingStatus }) {
  const { t } = useLanguage()
  const steps = [t.readingStepRead, t.readingStepRecall, t.readingStepSummary, t.readingStepEvaluate, t.readingStepImprove, t.readingStepReflect]
  const current = STATUS_STEP_INDEX[status]

  return (
    <div className="flex items-center mb-6" aria-label="Session progress">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center gap-1.5 ${i <= current ? 'text-xero-green' : 'text-gray-300 dark:text-slate-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              i < current ? 'bg-xero-green text-white' : i === current ? 'border-2 border-xero-green text-xero-green' : 'border border-gray-200 dark:border-slate-600'
            }`}>
              {i < current ? '✓' : i + 1}
            </span>
            <span className="text-[11px] font-medium hidden sm:inline whitespace-nowrap">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 ${i < current ? 'bg-xero-green' : 'bg-gray-200 dark:bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
