import { useState, useMemo } from 'react'

export interface SortOption<T> {
  value: string
  label: string
  compare: (a: T, b: T) => number
}

export interface SortFilterConfig<T> {
  search: (item: T) => string
  sorts: SortOption<T>[]
  defaultSort?: string
}

export function useSortFilter<T>(items: T[], config: SortFilterConfig<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(config.defaultSort ?? config.sorts[0]?.value ?? '')

  const result = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter(item => config.search(item).toLowerCase().includes(q))
      : items
    const sort = config.sorts.find(s => s.value === sortKey)
    return sort ? [...filtered].sort(sort.compare) : filtered
  }, [items, query, sortKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortOptions = config.sorts.map(({ value, label }) => ({ value, label }))

  return { query, setQuery, sortKey, setSortKey, result, sortOptions }
}
