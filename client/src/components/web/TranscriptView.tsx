import { useState } from 'react'
import { useTranscripts, TranscriptFetchError, type Transcript, type TranscriptPreview } from '../../hooks/useTranscripts'
import { useLanguage } from '../../hooks/useLanguage'
import { ConfirmDialog } from './ConfirmDialog'
import { ItemFolderTree } from './ItemFolderTree'
import { ResizableSidebar } from './ResizableSidebar'
import { buildFolderTree } from '../../lib/folderTree'
import { IconTranscript, IconDelete, IconExternalLink } from '../../lib/icons'

// Maps the backend's stable reason codes (see errorReason() in src/api/routes/transcript.ts)
// to a localized message key, so the UI never has to show the raw library error text.
const REASON_MESSAGE_KEYS = {
  disabled: 'transcriptErrorDisabled',
  unavailable: 'transcriptErrorUnavailable',
  no_captions: 'transcriptErrorNoCaptions',
  rate_limited: 'transcriptErrorRateLimited',
  invalid_url: 'transcriptErrorInvalidUrl',
} as const

export function TranscriptView() {
  const { t } = useLanguage()
  const {
    transcripts, isLoading, fetchPreview, createTranscript, removeTranscript,
    moveTranscriptToFolder, renameTranscriptFolder, deleteTranscriptFolder,
  } = useTranscripts()

  function localizeError(err: unknown): string {
    if (err instanceof TranscriptFetchError && err.reason && err.reason in REASON_MESSAGE_KEYS) {
      return t[REASON_MESSAGE_KEYS[err.reason as keyof typeof REASON_MESSAGE_KEYS]]
    }
    return t.transcriptError
  }

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [newFolder, setNewFolder] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<TranscriptPreview | null>(null)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingFolderPath, setDeletingFolderPath] = useState<string | null>(null)

  const tree = buildFolderTree(transcripts)
  const selected = transcripts.find(item => item.id === selectedId) ?? null
  const showDetail = isNew || selected !== null

  function handleNewItemRequest(folder: string | null) {
    setIsNew(true)
    setSelectedId(null)
    setNewFolder(folder)
    setUrl('')
    setPreview(null)
    setError(null)
  }

  function selectExisting(item: Transcript) {
    setIsNew(false)
    setSelectedId(item.id)
    setError(null)
  }

  function backToList() {
    setIsNew(false)
    setSelectedId(null)
  }

  async function handleFetch() {
    if (!url.trim()) return
    setFetching(true)
    setError(null)
    try {
      setPreview(await fetchPreview(url.trim()))
    } catch (err) {
      setPreview(null)
      setError(localizeError(err))
    } finally {
      setFetching(false)
    }
  }

  async function handleSave() {
    if (!url.trim() || !preview) return
    setSaving(true)
    setError(null)
    try {
      const created = await createTranscript(url.trim(), newFolder)
      setIsNew(false)
      setPreview(null)
      setSelectedId(created.id)
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await removeTranscript(id)
    if (selectedId === id) setSelectedId(null)
  }

  function TreePane() {
    return (
      <ItemFolderTree<Transcript>
        tree={tree}
        selectedId={selectedId}
        itemLabel={item => item.title}
        itemIcon={<IconTranscript className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />}
        newItemLabel={`+ ${t.transcriptNew}`}
        onSelectItem={selectExisting}
        onNewItem={handleNewItemRequest}
        onDeleteItem={item => setConfirmDeleteId(item.id)}
        onRenameFolder={renameTranscriptFolder}
        onDeleteFolder={path => setDeletingFolderPath(path)}
        onMoveItemToFolder={(id, folder) => moveTranscriptToFolder(id, folder)}
      />
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ResizableSidebar
        storageKey="notebook:tree-width"
        defaultWidth={224}
        mobileClassName={showDetail ? 'hidden' : 'flex w-full'}
        className="border-r border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
      >
        {isLoading
          ? <p className="text-xs text-gray-400 p-4">…</p>
          : TreePane()}
      </ResizableSidebar>

      <div className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        {!showDetail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500">
            <div className="text-center">
              <IconTranscript className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
              <p className="text-sm">{t.transcriptEmptyTitle}</p>
              <p className="text-xs mt-1">{t.transcriptEmptyHint}</p>
            </div>
          </div>
        ) : isNew ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={backToList}
                  className="md:hidden flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-3 -ml-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Back"
                >
                  ←
                </button>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t.transcriptNew}</h1>
              </div>

              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleFetch() }}
                  placeholder={t.transcriptUrlPlaceholder}
                  className="flex-1 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-xero-green min-h-[44px]"
                />
                <button
                  onClick={handleFetch}
                  disabled={fetching || !url.trim()}
                  className="text-sm bg-xero-green text-white px-4 py-2.5 rounded-xl font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40 min-h-[44px] flex-shrink-0"
                >
                  {fetching ? t.transcriptFetching : t.transcriptFetch}
                </button>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              {preview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{preview.title}</p>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-xs bg-gray-900 dark:bg-slate-200 text-white dark:text-slate-900 px-3 py-2.5 rounded-lg font-medium disabled:opacity-40 min-h-[44px] min-w-[44px] flex-shrink-0"
                    >
                      {saving ? t.transcriptSaving : t.transcriptSave}
                    </button>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 max-h-[50vh] overflow-y-auto whitespace-pre-wrap">
                    {preview.transcriptText}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={backToList}
                    className="md:hidden flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-3 -ml-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Back"
                  >
                    ←
                  </button>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{selected.title}</h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title={selected.url}
                  >
                    <IconExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                  </a>
                  <button
                    onClick={() => setConfirmDeleteId(selected.id)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <IconDelete className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 whitespace-pre-wrap">
                {selected.transcriptText}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmDialog
          message={t.transcriptDeleteConfirm}
          confirmLabel={t.delete}
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {deletingFolderPath !== null && (
        <ConfirmDialog
          message={`Delete "${deletingFolderPath.split('/').pop()}" and all transcripts inside?`}
          confirmLabel={t.delete}
          onConfirm={async () => {
            await deleteTranscriptFolder(deletingFolderPath)
            setDeletingFolderPath(null)
            if (selected?.folder?.startsWith(deletingFolderPath)) setSelectedId(null)
          }}
          onCancel={() => setDeletingFolderPath(null)}
        />
      )}
    </div>
  )
}
