import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReadingSessions, useReadingStats, type ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { ConfirmDialog } from '../ConfirmDialog'
import { ItemFolderTree, isTouch } from '../ItemFolderTree'
import { buildFolderTree, getItemsInFolder } from '../../../lib/folderTree'
import { IconAdd, IconDelete, IconReading, IconMenu } from '../../../lib/icons'
import { formatDate } from '../../../utils/format'

function SessionCard({ session, onDeleteClick }: { session: ReadingSession; onDeleteClick: () => void }) {
  const { t } = useLanguage()
  const isCompleted = session.status === 'completed'

  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4">
      <Link to={`/learn/language/reading/${session.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-3 py-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{session.title}</p>
            {isCompleted && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-xero-green/10 text-xero-green flex-shrink-0">
                {session.totalScore}/25
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-slate-500">
            {session.category && <span>{session.category}</span>}
            <span>{formatDate(session.createdAt)}</span>
            {!isCompleted && <span className="text-amber-500 font-medium">{t.readingInProgress}</span>}
          </div>
        </div>
        <span className="text-xs font-medium text-xero-green flex-shrink-0">
          {isCompleted ? t.readingView : t.readingContinue}
        </span>
      </Link>
      <button onClick={onDeleteClick} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
        <IconDelete className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

export function ReadingListView() {
  const { t } = useLanguage()
  const { sessions, isLoading, removeSession, moveSessionToFolder, renameSessionFolder, deleteSessionFolder } = useReadingSessions()
  const { stats } = useReadingStats()
  const navigate = useNavigate()
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const deleting = sessions.find(s => s.id === confirmDeleteId) ?? null

  const sessionTree = buildFolderTree(sessions)
  const scopedSessions = getItemsInFolder(sessionTree, selectedFolder)
  const scopeLabel = selectedFolder === null ? t.readingAllSessions : selectedFolder === '' ? t.readingUnsorted : selectedFolder

  function TreePane() {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-2 space-y-0.5 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => { setSelectedFolder(null); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === null ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            {t.readingAllSessions}
          </button>
          <button onClick={() => { setSelectedFolder(''); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === '' ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            {t.readingUnsorted}
          </button>
        </div>
        <ItemFolderTree<ReadingSession>
          tree={sessionTree}
          selectedId={null}
          showItems={false}
          selectedFolder={selectedFolder}
          onSelectFolder={path => { setSelectedFolder(path); setMobileTreeOpen(false) }}
          itemLabel={s => s.title}
          newItemLabel={t.readingNewSession}
          onSelectItem={() => {}}
          onNewItem={folder => navigate(folder ? `/learn/language/reading/new?folder=${encodeURIComponent(folder)}` : '/learn/language/reading/new')}
          onRenameFolder={renameSessionFolder}
          onDeleteFolder={path => setConfirmDeleteFolder(path)}
          onMoveItemToFolder={(id, folder) => moveSessionToFolder(id, folder)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Folder tree column — desktop permanent, mobile overlay */}
      <div className="hidden md:flex w-44 flex-shrink-0 flex-col border-r border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        {TreePane()}
      </div>
      {mobileTreeOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileTreeOpen(false)} />
          <div className="relative w-64 h-full bg-gray-50 dark:bg-slate-900 flex flex-col shadow-2xl">
            {TreePane()}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <button onClick={() => setMobileTreeOpen(true)}
                className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
                <IconMenu className="w-4 h-4" strokeWidth={2} />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{scopeLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/learn/language/reading/progress"
                className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-3 py-2.5 min-h-[40px] flex items-center transition-colors"
              >
                {t.readingProgressLink}
              </Link>
              <Link
                to="/learn/language/reading/new"
                className="flex items-center gap-1.5 text-xs bg-xero-green text-white px-3 py-2 rounded-xl font-medium hover:bg-xero-green-dark transition-colors min-h-[40px]"
              >
                <IconAdd className="w-3.5 h-3.5" strokeWidth={2.5} />
                {t.readingNewSession}
              </Link>
            </div>
          </div>

          {stats && stats.totalSessions > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t.readingStatTotal, value: stats.totalSessions },
                { label: t.readingStatAvgScore, value: stats.avgScore != null ? `${stats.avgScore.toFixed(1)}/25` : '—' },
                { label: t.readingStatBest, value: stats.bestScore != null ? `${stats.bestScore}/25` : '—' },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">{k.label}</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{k.value}</p>
                </div>
              ))}
            </div>
          )}

          {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">…</p>}

          <div className="space-y-3">
            {scopedSessions.map(s => (
              <SessionCard key={s.id} session={s} onDeleteClick={() => setConfirmDeleteId(s.id)} />
            ))}
          </div>

          {!isLoading && scopedSessions.length === 0 && (
            <div className="text-center py-14">
              <IconReading className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{t.readingEmptyTitle}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.readingEmptyHint}</p>
            </div>
          )}
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          message={`"${deleting.title}" will be deleted.`}
          confirmLabel={t.delete}
          onConfirm={() => { removeSession(deleting.id); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {confirmDeleteFolder !== null && (
        <ConfirmDialog
          message={`Delete folder "${confirmDeleteFolder}" and all sessions inside?`}
          confirmLabel={t.delete}
          onConfirm={async () => { await deleteSessionFolder(confirmDeleteFolder); setConfirmDeleteFolder(null) }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
    </div>
  )
}
