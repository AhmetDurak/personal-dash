import { createPortal } from 'react-dom'
import { useState } from 'react'
import { HelpTooltip } from './HelpTooltip'

export interface ColumnMapping {
  dateCol:   number | null
  nameCol:   number | null
  amountCol: number | null
  typeCol:   number | null
  catCol:    number | null
  separator: string
  hasHeader: boolean
}

interface PreviewData {
  headers:   string[]
  sampleRows: string[][]
  detected:  Omit<ColumnMapping, 'separator' | 'hasHeader'>
  separator: string
  hasHeader: boolean
  totalRows: number
}

interface Props {
  file:       File
  preview:    PreviewData
  onConfirm:  (file: File, mapping: ColumnMapping) => void
  onClose:    () => void
}

const FIELD_LABELS: { key: keyof Omit<ColumnMapping, 'separator' | 'hasHeader'>; label: string; required: boolean }[] = [
  { key: 'dateCol',   label: 'Date',     required: true  },
  { key: 'nameCol',   label: 'Name / Payee', required: true  },
  { key: 'amountCol', label: 'Amount',   required: true  },
  { key: 'typeCol',   label: 'Type (income/expense)', required: false },
  { key: 'catCol',    label: 'Category', required: false },
]

export function CsvImportModal({ file, preview, onConfirm, onClose }: Props) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    ...preview.detected,
    separator: preview.separator,
    hasHeader: preview.hasHeader,
  })

  const isReady = mapping.dateCol !== null && mapping.nameCol !== null && mapping.amountCol !== null

  function setCol(key: keyof Omit<ColumnMapping, 'separator' | 'hasHeader'>, val: string) {
    setMapping(m => ({ ...m, [key]: val === '' ? null : Number(val) }))
  }

  const NONE_OPT = <option value="">— not mapped —</option>

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              Map CSV Columns
              <HelpTooltip id="csv-mapping" title="Column mapping" side="bottom">
                <p>Tell us which column in your CSV contains each piece of data.</p>
                <p>Auto-detection works for most banks. Adjust if anything looks wrong.</p>
                <p><strong>Type</strong> column (optional): should contain "income"/"credit" or "expense"/"debit". If absent, positive amounts = income.</p>
              </HelpTooltip>
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {file.name} · {preview.totalRows} data rows · sep: {preview.separator === '\t' ? 'tab' : `"${preview.separator}"`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xl leading-none ml-4">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Column mapping selects */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Column mapping</p>
            {FIELD_LABELS.map(({ key, label, required }) => {
              const val = mapping[key]
              const autoDetected = preview.detected[key] !== null && preview.detected[key] === val
              return (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 dark:text-slate-300 w-44 flex-shrink-0">
                    {label}
                    {required && <span className="text-red-400 ml-0.5">*</span>}
                    {autoDetected && (
                      <span className="ml-1.5 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">auto</span>
                    )}
                  </label>
                  <select
                    value={val ?? ''}
                    onChange={e => setCol(key, e.target.value)}
                    className={`flex-1 text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 ${
                      required && val === null
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    {NONE_OPT}
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          {/* Sample data preview */}
          {preview.sampleRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Preview (first {preview.sampleRows.length} rows)</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                <table className="w-full text-xs min-w-max">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                      {preview.headers.map((h, i) => {
                        const mappedTo = FIELD_LABELS.find(f => mapping[f.key] === i)
                        return (
                          <th key={i} className="text-left px-3 py-2 font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap">
                            {h || `Col ${i + 1}`}
                            {mappedTo && (
                              <span className="ml-1 text-[9px] bg-xero-green/10 text-xero-green px-1 py-0.5 rounded-full">{mappedTo.label}</span>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {preview.sampleRows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                        {preview.headers.map((_, ci) => (
                          <td key={ci} className={`px-3 py-2 text-gray-600 dark:text-slate-400 whitespace-nowrap max-w-[180px] truncate ${
                            FIELD_LABELS.some(f => mapping[f.key] === ci) ? 'font-medium text-gray-800 dark:text-slate-200' : ''
                          }`}>
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">Highlighted columns are the ones currently mapped above.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => isReady && onConfirm(file, mapping)}
            disabled={!isReady}
            className="flex-1 py-2.5 text-sm rounded-xl bg-xero-green text-white font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40"
          >
            Import {preview.totalRows} rows
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
