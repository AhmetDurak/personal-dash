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
