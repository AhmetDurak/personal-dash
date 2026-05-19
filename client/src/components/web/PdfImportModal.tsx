import { createPortal } from 'react-dom'
import { useState } from 'react'
import { formatEur, formatDate } from '../../utils/format'
import type { PdfPreview, ParsedTx } from '../../types'

interface Props {
  preview: PdfPreview
  onClose: () => void
  onImported: (result: { imported: number; overridden: number }) => void
}

export function PdfImportModal({ preview, onClose, onImported }: Props) {
  const [decisions, setDecisions] = useState<Record<number, 'override' | 'skip'>>(() =>
    Object.fromEntries(preview.conflicts.map((_, i) => [i, 'skip']))
  )
  const [importing, setImporting] = useState(false)
  const [currentConflict, setCurrentConflict] = useState(0)

  function setDecision(i: number, action: 'override' | 'skip') {
    setDecisions(d => ({ ...d, [i]: action }))
  }

  async function handleImport() {
    setImporting(true)
    const entries: { tx: ParsedTx; overrideId?: string }[] = [
      ...preview.ready.map(tx => ({ tx })),
      ...preview.conflicts
        .map((c, i) => ({ c, i }))
        .filter(({ i }) => decisions[i] === 'override')
        .map(({ c, i: _ }) => ({ tx: c.incoming, overrideId: c.existing.id })),
    ]

    const res = await fetch('/api/import/pdf/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    const data = await res.json() as { imported: number; overridden: number }
    setImporting(false)
    onImported(data)
  }

  const conflict = preview.conflicts[currentConflict]
  const totalConflicts = preview.conflicts.length
  const overrideCount = Object.values(decisions).filter(d => d === 'override').length
  const importCount = preview.ready.length + overrideCount

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-xero-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import PDF</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {preview.ready.length} ready · {totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ready entries summary */}
          {preview.ready.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-xero-green/8 border border-xero-green/20 rounded-xl text-sm">
              <span className="text-xero-green text-lg">✓</span>
              <span className="text-gray-700">
                <span className="font-semibold text-xero-green">{preview.ready.length}</span> entries will be imported automatically
              </span>
            </div>
          )}

          {/* Conflict review */}
          {totalConflicts > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Conflict {currentConflict + 1} of {totalConflicts}
                </p>
                <div className="flex gap-1">
                  {preview.conflicts.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentConflict(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentConflict ? 'bg-xero-green' :
                        decisions[i] === 'override' ? 'bg-amber-400' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {conflict && (
                <div className="border border-xero-border rounded-xl overflow-hidden">
                  {/* Existing entry */}
                  <div className="px-4 py-3 bg-red-50 border-b border-xero-border">
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Existing entry</p>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{conflict.existing.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(conflict.existing.date)} · {conflict.existing.category}</p>
                      </div>
                      <p className={`text-sm font-semibold flex-shrink-0 ${conflict.existing.type === 'income' ? 'text-xero-green' : 'text-gray-800'}`}>
                        {conflict.existing.type === 'income' ? '+' : '-'}{formatEur(conflict.existing.amount)}
                      </p>
                    </div>
                  </div>
                  {/* Incoming entry */}
                  <div className="px-4 py-3 bg-amber-50">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">From PDF</p>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{conflict.incoming.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(conflict.incoming.date)} · {conflict.incoming.category}</p>
                      </div>
                      <p className={`text-sm font-semibold flex-shrink-0 ${conflict.incoming.type === 'income' ? 'text-xero-green' : 'text-gray-800'}`}>
                        {conflict.incoming.type === 'income' ? '+' : '-'}{formatEur(conflict.incoming.amount)}
                      </p>
                    </div>
                  </div>
                  {/* Decision buttons */}
                  <div className="flex border-t border-xero-border">
                    <button
                      onClick={() => setDecision(currentConflict, 'skip')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        decisions[currentConflict] === 'skip'
                          ? 'bg-gray-100 text-gray-700'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >Skip</button>
                    <div className="w-px bg-xero-border" />
                    <button
                      onClick={() => setDecision(currentConflict, 'override')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        decisions[currentConflict] === 'override'
                          ? 'bg-amber-50 text-amber-600'
                          : 'text-gray-400 hover:bg-amber-50'
                      }`}
                    >Override</button>
                  </div>
                </div>
              )}

              {/* Prev / Next navigation */}
              {totalConflicts > 1 && (
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentConflict(i => Math.max(0, i - 1))}
                    disabled={currentConflict === 0}
                    className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >‹ Previous</button>
                  <button
                    onClick={() => setCurrentConflict(i => Math.min(totalConflicts - 1, i + 1))}
                    disabled={currentConflict === totalConflicts - 1}
                    className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >Next ›</button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleImport} disabled={importing || importCount === 0}
              className="flex-1 py-2.5 text-sm rounded-lg bg-xero-green text-white font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-50">
              {importing ? 'Importing…' : `Import ${importCount} ${importCount === 1 ? 'entry' : 'entries'}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
