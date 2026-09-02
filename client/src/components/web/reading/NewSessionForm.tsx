import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReadingSessions } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'

const inputCls = 'w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green resize-none'

export function NewSessionForm() {
  const { t } = useLanguage()
  const { createSession } = useReadingSessions()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const canStart = title.trim().length > 0 && content.trim().length > 0

  async function handleStart() {
    if (!canStart || saving) return
    setSaving(true)
    const session = await createSession(title.trim(), content, category.trim() || null)
    setSaving(false)
    if (session?.id) navigate(`/learn/reading/${session.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t.readingNewSessionTitle}</h1>

      <label className="block">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1.5">{t.readingTitleLabel}</span>
        <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder={t.readingTitlePlaceholder} />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1.5">{t.readingCategoryLabel}</span>
        <input value={category} onChange={e => setCategory(e.target.value)} className={inputCls} placeholder={t.readingCategoryPlaceholder} />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1.5">{t.readingContentLabel}</span>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} className={inputCls} placeholder={t.readingContentPlaceholder} />
      </label>

      <button
        onClick={handleStart}
        disabled={!canStart || saving}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark disabled:opacity-40 transition-colors"
      >
        {t.readingStartReading}
      </button>
    </div>
  )
}
