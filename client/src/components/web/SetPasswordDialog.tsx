import { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  email: string
  hasPassword: boolean
  onDone: () => void
  onCancel: () => void
}

export function SetPasswordDialog({ email, hasPassword, onDone, onCancel }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
        return
      }
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-3 text-base sm:text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:border-gray-400 dark:focus:border-slate-400'

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {hasPassword ? 'Change password' : 'Set a password'}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 break-words">
            Sign in with <span className="text-gray-700 dark:text-slate-200">{email}</span> and this password, without Google.
          </p>
        </div>
        {/* Hidden username field so password managers save the right account */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password (min. 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={inputClass}
        />
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 text-sm rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-3 text-sm rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-colors font-medium min-h-[44px] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
