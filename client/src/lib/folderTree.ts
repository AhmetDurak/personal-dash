export interface FolderNode<T> {
  path: string
  name: string
  children: FolderNode<T>[]
  items: T[]
}

export function buildFolderTree<T extends { folder: string | null }>(
  allItems: T[],
  extraPaths: string[] = [],
): FolderNode<T> {
  const root: FolderNode<T> = { path: '', name: 'root', children: [], items: [] }
  const nodeMap = new Map<string, FolderNode<T>>()
  nodeMap.set('', root)

  function ensurePath(folderPath: string): FolderNode<T> {
    if (nodeMap.has(folderPath)) return nodeMap.get(folderPath)!
    const parts = folderPath.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    const parent = ensurePath(parentPath)
    const node: FolderNode<T> = {
      path: folderPath,
      name: parts[parts.length - 1],
      children: [],
      items: [],
    }
    parent.children.push(node)
    nodeMap.set(folderPath, node)
    return node
  }

  for (const p of extraPaths) {
    if (p) ensurePath(p)
  }

  for (const item of allItems) {
    const folderPath = item.folder ?? ''
    const node = folderPath ? ensurePath(folderPath) : root
    node.items.push(item)
  }

  return root
}

// Sorts each level's children according to their position in a flat manual-order
// list of paths (paths not present fall back to the end, in their existing order).
export function applyManualOrder<T>(node: FolderNode<T>, order: string[]): FolderNode<T> {
  const indexOf = (path: string) => {
    const i = order.indexOf(path)
    return i === -1 ? order.length : i
  }
  const children = [...node.children]
    .sort((a, b) => indexOf(a.path) - indexOf(b.path))
    .map(c => applyManualOrder(c, order))
  return { ...node, children }
}

export function collectFolderPaths<T>(node: FolderNode<T>): string[] {
  const paths: string[] = []
  function walk(n: FolderNode<T>) {
    if (n.path) paths.push(n.path)
    for (const c of n.children) walk(c)
  }
  walk(node)
  return paths
}

export function countAllItems<T>(node: FolderNode<T>): number {
  return node.items.length + node.children.reduce((sum, c) => sum + countAllItems(c), 0)
}

export function getItemsInFolder<T>(node: FolderNode<T>, folderPath: string | null): T[] {
  if (folderPath === null) {
    const all: T[] = []
    function collect(n: FolderNode<T>) {
      all.push(...n.items)
      for (const c of n.children) collect(c)
    }
    collect(node)
    return all
  }
  if (folderPath === '') return node.items
  const target = findNode(node, folderPath)
  if (!target) return []
  const all: T[] = []
  function collect(n: FolderNode<T>) {
    all.push(...n.items)
    for (const c of n.children) collect(c)
  }
  collect(target)
  return all
}

export function findNode<T>(node: FolderNode<T>, path: string): FolderNode<T> | null {
  if (node.path === path) return node
  for (const c of node.children) {
    const found = findNode(c, path)
    if (found) return found
  }
  return null
}

export interface TreeSortAccessors<T> {
  label: (item: T) => string
  created: (item: T) => string
  updated?: (item: T) => string
  due?: (item: T) => string
}

export interface TreeSortOption<T> {
  value: string
  label: string
  compare: (a: T, b: T) => number
  foldersDesc?: boolean
}

const time = (iso: string) => new Date(iso).getTime()

// The sort choices shared by every folder tree; date options only appear when the
// item type has that date.
export function treeSortOptions<T>({ label, created, updated, due }: TreeSortAccessors<T>): TreeSortOption<T>[] {
  const options: TreeSortOption<T>[] = []
  if (due) options.push({ value: 'due', label: 'Due first', compare: (a, b) => time(due(a)) - time(due(b)) })
  if (updated) options.push({ value: 'updated', label: 'Last edited', compare: (a, b) => time(updated(b)) - time(updated(a)) })
  options.push(
    { value: 'created', label: 'Newest', compare: (a, b) => time(created(b)) - time(created(a)) },
    { value: 'created-asc', label: 'Oldest', compare: (a, b) => time(created(a)) - time(created(b)) },
    { value: 'az', label: 'A → Z', compare: (a, b) => label(a).localeCompare(label(b)) },
    { value: 'za', label: 'Z → A', compare: (a, b) => label(b).localeCompare(label(a)), foldersDesc: true },
  )
  return options
}

// Sorts items at every level with `compare`. Folders are always ordered by name
// (reversed for Z → A) so they stay easy to find whatever the item order.
export function sortFolderTree<T>(node: FolderNode<T>, compare: (a: T, b: T) => number, foldersDesc = false): FolderNode<T> {
  const children = [...node.children]
    .sort((a, b) => foldersDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name))
    .map(c => sortFolderTree(c, compare, foldersDesc))
  return { ...node, children, items: [...node.items].sort(compare) }
}
