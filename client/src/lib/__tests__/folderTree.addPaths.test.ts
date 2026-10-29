import { describe, it, expect } from 'vitest'
import { buildFolderTree, addFolderPaths, collectFolderPaths } from '../folderTree'

describe('addFolderPaths', () => {
  const items = [{ id: 1, folder: 'B' }, { id: 2, folder: 'B/x' }]

  it('inserts empty folders and their parents in name order', () => {
    const tree = addFolderPaths(buildFolderTree(items), ['A/new', 'B/a'])
    expect(collectFolderPaths(tree)).toEqual(['A', 'A/new', 'B', 'B/a', 'B/x'])
  })

  it('does not duplicate existing folders or mutate the input tree', () => {
    const base = buildFolderTree(items)
    const tree = addFolderPaths(base, ['B/x'])
    expect(collectFolderPaths(tree)).toEqual(['B', 'B/x'])
    addFolderPaths(base, ['C'])
    expect(collectFolderPaths(base)).toEqual(['B', 'B/x'])
  })
})
