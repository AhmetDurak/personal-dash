import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStories } from '../../hooks/useKanban'
import { buildFolderTree } from '../../lib/folderTree'
import { ItemFolderTree } from './ItemFolderTree'
import type { Story } from '../../hooks/useKanban'
import { KanbanBoard } from './KanbanBoard'
import { ConfirmDialog } from './ConfirmDialog'
import { IconChevronLeft } from '../../lib/icons'

export function KanbanView() {
  const { stories, isLoading, addStory, updateStory, moveStoryToFolder, renameFolder, deleteFolder, deleteStory } = useStories()
  const [storyParams, setStoryParams] = useSearchParams()
  const selectedId = storyParams.get('story') ? Number(storyParams.get('story')) : null
  function setSelectedId(id: number | null) {
    setStoryParams(p => { id !== null ? p.set('story', String(id)) : p.delete('story'); return p }, { replace: true })
  }
  const [confirmDeleteStory, setConfirmDeleteStory] = useState<Story | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)

  const tree = buildFolderTree(stories)
  const selectedStory = stories.find(s => s.id === selectedId) ?? null

  async function handleNew(folder: string | null) {
    const story = await addStory('Untitled Story', folder)
    setSelectedId(story.id)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Folder tree — desktop permanent, mobile overlay */}
      <div className={`${selectedId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-64 border-r border-gray-100 dark:border-slate-700 flex-col bg-gray-50 dark:bg-slate-900 flex-shrink-0`}>
        {isLoading ? (
          <p className="text-xs text-gray-400 p-4">Loading…</p>
        ) : (
          <ItemFolderTree<Story>
            tree={tree}
            selectedId={selectedId}
            itemLabel={s => `${s.title || 'Untitled'}${s.total_count ? ` · ${s.done_count}/${s.total_count}` : ''}`}
            newItemLabel="+ New Story"
            onSelectItem={s => setSelectedId(s.id)}
            onNewItem={handleNew}
            onDeleteItem={s => setConfirmDeleteStory(s)}
            onRenameFolder={renameFolder}
            onDeleteFolder={path => setConfirmDeleteFolder(path)}
            onMoveItemToFolder={(id, folder) => moveStoryToFolder(id, folder)}
          />
        )}
      </div>

      {/* Board — hidden on mobile when no story open */}
      <div className={`${selectedId === null ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        {selectedStory === null ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500">
            <div className="text-center">
              <p className="text-5xl mb-3">🗂️</p>
              <p className="text-sm">Select a story or create a new one</p>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelectedId(null)}
              className="md:hidden flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors px-3 pt-2 min-h-[44px]"
            >
              <IconChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Stories
            </button>
            <KanbanBoard
              key={selectedStory.id}
              story={selectedStory}
              onUpdateStory={updates => updateStory(selectedStory.id, updates)}
            />
          </>
        )}
      </div>

      {confirmDeleteStory && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteStory.title}" and all its tickets? This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDeleteStory(null)}
          onConfirm={() => {
            deleteStory(confirmDeleteStory.id)
            if (selectedId === confirmDeleteStory.id) setSelectedId(null)
            setConfirmDeleteStory(null)
          }}
        />
      )}
      {confirmDeleteFolder && (
        <ConfirmDialog
          message={`Delete folder "${confirmDeleteFolder}" and every story inside it? This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDeleteFolder(null)}
          onConfirm={() => { deleteFolder(confirmDeleteFolder); setConfirmDeleteFolder(null) }}
        />
      )}
    </div>
  )
}
