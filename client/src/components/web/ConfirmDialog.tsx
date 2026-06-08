interface Props {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, confirmLabel = 'Yes, proceed', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Are you sure?</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-3 text-sm rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-3 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium min-h-[44px]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
