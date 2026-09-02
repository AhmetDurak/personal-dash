import { useState, useEffect, useRef } from 'react'
import type { ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { IconEdit, IconCheck } from '../../../lib/icons'

interface Props {
  session: Pick<ReadingSession, 'id' | 'title' | 'category' | 'sourceContent' | 'readingStartedAt'>
  onSave: (patch: Partial<{ title: string; category: string | null; sourceContent: string }>) => void
  onReady: () => void
}

export function ReadingStage({ session, onSave, onReady }: Props) {
  const { t } = useLanguage()
  const [elapsed, setElapsed] = useState(0)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(session.title)
  const [category, setCategory] = useState(session.category ?? '')
  const [content, setContent] = useState(session.sourceContent)
  const sessionIdRef = useRef(session.id)

  useEffect(() => {
    if (sessionIdRef.current !== session.id) {
      sessionIdRef.current = session.id
      setEditing(false)
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

  const inputCls = 'w-full bg-transparent border-0 border-b border-gray-100 dark:border-slate-700 focus:border-xero-green focus:outline-none focus:ring-2 focus:ring-xero-green/30 rounded-sm transition-colors'

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); onSave({ title: e.target.value }) }}
                autoFocus
                className={`${inputCls} text-lg font-semibold text-gray-900 dark:text-slate-100 px-0 py-2`}
              />
              <input
                value={category}
                onChange={e => { setCategory(e.target.value); onSave({ category: e.target.value }) }}
                placeholder={t.readingCategoryPlaceholder}
                className={`${inputCls} text-[11px] font-medium text-gray-400 dark:text-slate-500 px-0 py-1.5`}
              />
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate py-2">{session.title}</h1>
              <span className="block text-[11px] font-medium text-gray-400 dark:text-slate-500 py-1.5 min-h-[1.5em]">{session.category}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <span className="text-xs font-mono text-gray-400 dark:text-slate-500 tabular-nums">{mm}:{ss}</span>
          <button
            onClick={() => setEditing(e => !e)}
            title={editing ? t.readingDoneEditing : t.edit}
            aria-label={editing ? t.readingDoneEditing : t.edit}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-xero-green hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {editing ? <IconCheck className="w-4 h-4" strokeWidth={2} /> : <IconEdit className="w-4 h-4" strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-6">
        {editing ? (
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); onSave({ sourceContent: e.target.value }) }}
            rows={14}
            className="w-full text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-2 focus:ring-xero-green/30 rounded-md resize-y"
          />
        ) : (
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{session.sourceContent}</p>
        )}
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
