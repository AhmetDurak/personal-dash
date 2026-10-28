import { describe, it, expect } from 'vitest'
import { buildFolderTree, sortFolderTree, treeSortOptions } from '../folderTree'

interface Item { id: number; folder: string | null; name: string; created: string; updated: string }

const items: Item[] = [
  { id: 1, folder: null,    name: 'banana', created: '2026-01-02', updated: '2026-03-01' },
  { id: 2, folder: null,    name: 'apple',  created: '2026-01-03', updated: '2026-02-01' },
  { id: 3, folder: 'Zeta',  name: 'cherry', created: '2026-01-01', updated: '2026-01-01' },
  { id: 4, folder: 'Alpha', name: 'date',   created: '2026-01-04', updated: '2026-01-05' },
]
const options = treeSortOptions<Item>({ label: i => i.name, created: i => i.created, updated: i => i.updated })
const opt = (v: string) => options.find(o => o.value === v)!

describe('treeSortOptions', () => {
  it('only offers date options the item type has', () => {
    expect(options.map(o => o.value)).toEqual(['updated', 'created', 'created-asc', 'az', 'za'])
    const noUpdated = treeSortOptions<Item>({ label: i => i.name, created: i => i.created })
    expect(noUpdated.map(o => o.value)).not.toContain('updated')
  })

  it('sorts by each key', () => {
    const ids = (v: string) => [...items].sort(opt(v).compare).map(i => i.id)
    expect(ids('az')).toEqual([2, 1, 3, 4])
    expect(ids('za')).toEqual([4, 3, 1, 2])
    expect(ids('created')).toEqual([4, 2, 1, 3])
    expect(ids('created-asc')).toEqual([3, 1, 2, 4])
    expect(ids('updated')).toEqual([1, 2, 4, 3])
  })
})

describe('sortFolderTree', () => {
  it('sorts items at each level and folders by name', () => {
    const tree = sortFolderTree(buildFolderTree(items), opt('az').compare)
    expect(tree.items.map(i => i.name)).toEqual(['apple', 'banana'])
    expect(tree.children.map(c => c.name)).toEqual(['Alpha', 'Zeta'])
  })

  it('reverses folder order for Z → A', () => {
    const tree = sortFolderTree(buildFolderTree(items), opt('za').compare, opt('za').foldersDesc)
    expect(tree.children.map(c => c.name)).toEqual(['Zeta', 'Alpha'])
  })
})
