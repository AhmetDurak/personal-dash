import { useState } from 'react'
import { sortFolderTree, treeSortOptions, type FolderNode, type TreeSortAccessors } from '../lib/folderTree'

// Sort state for a folder tree view, remembered per view in localStorage.
export function useTreeSort<T>(storageKey: string, accessors: TreeSortAccessors<T>, defaultSort: string) {
  const options = treeSortOptions(accessors)
  const [sortKey, setSortKeyState] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? defaultSort } catch { return defaultSort }
  })
  const active = options.find(o => o.value === sortKey) ?? options.find(o => o.value === defaultSort) ?? options[0]

  function setSortKey(key: string) {
    setSortKeyState(key)
    try { localStorage.setItem(storageKey, key) } catch { /* storage unavailable — keep in memory only */ }
  }

  return {
    sort: { key: active.value, options: options.map(({ value, label }) => ({ value, label })), onChange: setSortKey },
    sortItems: (items: T[]) => [...items].sort(active.compare),
    sortTree: (tree: FolderNode<T>) => sortFolderTree(tree, active.compare, active.foldersDesc),
  }
}
