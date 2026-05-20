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
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-gray-900">Are you sure?</p>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
