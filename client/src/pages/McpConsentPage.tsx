import { useEffect, useState } from 'react'

interface ScopeGroup {
  key: string
  label: string
  description: string
  checked: boolean
}

export function McpConsentPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [scopeGroups, setScopeGroups] = useState<ScopeGroup[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/mcp/authorize/pending')
      .then(r => { if (!r.ok) throw new Error('no_pending'); return r.json() as Promise<{ clientName: string; scopeGroups: ScopeGroup[] }> })
      .then(data => { setClientName(data.clientName); setScopeGroups(data.scopeGroups) })
      .catch(() => setError('This connection request has expired or is invalid. Please try connecting again from Claude or ChatGPT.'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(key: string) {
    setScopeGroups(gs => gs.map(g => (g.key === key ? { ...g, checked: !g.checked } : g)))
  }

  async function decide(approve: boolean) {
    setSubmitting(true)
    const grantedScopes = scopeGroups.filter(g => g.checked).map(g => g.key)
    const res = await fetch('/api/mcp/authorize/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, grantedScopes }),
    })
    const data = await res.json() as { redirectUrl: string }
    window.location.href = data.redirectUrl
  }

  if (loading) return <div className="h-screen bg-gray-950" />

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 px-6">
        <p className="text-gray-400 text-sm max-w-sm text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-950 px-6">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-xl font-bold text-white mb-1">Connect {clientName}</h1>
        <p className="text-gray-500 text-sm mb-6">
          {clientName} wants to access your Personal Dashboard. Review and choose what to allow.
        </p>

        <div className="space-y-3 mb-6">
          {scopeGroups.map(g => (
            <label
              key={g.key}
              className="flex items-start gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={g.checked}
                onChange={() => toggle(g.key)}
                className="mt-0.5 w-4 h-4 accent-xero-green flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-white">{g.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{g.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => decide(true)}
            disabled={submitting || scopeGroups.every(g => !g.checked)}
            className="flex-1 bg-xero-green text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-xero-green-dark active:scale-[0.98] transition-all disabled:opacity-40 min-h-[44px]"
          >
            Allow
          </button>
          <button
            onClick={() => decide(false)}
            disabled={submitting}
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-700 active:scale-[0.98] transition-all min-h-[44px]"
          >
            Deny
          </button>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          You can revoke access later by deleting this app's connection from your account settings.
        </p>
      </div>
    </div>
  )
}
