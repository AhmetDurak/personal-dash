import { useState, useEffect, useRef } from 'react'
import type { ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'

interface Props {
  session: Pick<ReadingSession, 'id' | 'title' | 'category' | 'sourceContent' | 'readingStartedAt'>
  onSave: (patch: Partial<{ title: string; category: string | null; sourceContent: string }>) => void
  onReady: () => void
}

export function ReadingStage({ session, onSave, onReady }: Props) {
  const { t } = useLanguage()
  const [elapsed, setElapsed] = useState(0)
  const [title, setTitle] = useState(session.title)
  const [category, setCategory] = useState(session.category ?? '')
  const [content, setContent] = useState(session.sourceContent)
  const sessionIdRef = useRef(session.id)

  useEffect(() => {
    if (sessionIdRef.current !== session.id) {
      sessionIdRef.current = session.id
      setTitle(session.title)
      setCategory(session.category ?? '')
      setContent(session.sourceContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  useEffect(() => {
    const start = new Date(session.readingStartedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.readingStartedAt])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); onSave({ title: e.target.value }) }}
            className="w-full text-lg font-semibold text-gray-900 dark:text-slate-100 bg-transparent border-0 border-b border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 focus:border-xero-green focus:outline-none focus:ring-2 focus:ring-xero-green/30 rounded-sm px-0 py-2 transition-colors"
          />
          <input
            value={category}
            onChange={e => { setCategory(e.target.value); onSave({ category: e.target.value }) }}
            placeholder={t.readingCategoryPlaceholder}
            className="w-full text-[11px] font-medium text-gray-400 dark:text-slate-500 bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-xero-green/30 rounded-sm px-0 py-1.5"
          />
        </div>
        <span className="text-xs font-mono text-gray-400 dark:text-slate-500 tabular-nums flex-shrink-0 pt-1">{mm}:{ss}</span>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-6">
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); onSave({ sourceContent: e.target.value }) }}
          rows={14}
          className="w-full text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-2 focus:ring-xero-green/30 rounded-md resize-y"
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 text-center">{t.readingFocusHint}</p>

      <button
        onClick={onReady}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark transition-colors"
      >
        {t.readingReadyButton}
      </button>
    </div>
  )
}
