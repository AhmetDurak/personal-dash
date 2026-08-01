import { useEffect, useRef } from 'react'
import useSWR from 'swr'

export type ChainMark = 'check' | 'cross' | null

export interface Chain {
  id: string
  name: string
  length: number
  marks: ChainMark[]
  createdAt: string
}

interface ServerChain {
  id: string
  name: string
  length: number
  marks: ChainMark[]
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())
const LEGACY_STORAGE_KEY = 'learn:chains'

function toChain(c: ServerChain): Chain {
  return { id: c.id, name: c.name, length: c.length, marks: c.marks, createdAt: c.created_at }
}

// One-time migration for chains created back when this feature was localStorage-only.
async function migrateLegacyChains() {
  let legacy: { name: string; length: number; marks: ChainMark[] }[] = []
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]') } catch { legacy = [] }
  if (!legacy.length) return false
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  for (const c of legacy) {
    await fetch('/api/chains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: c.name, length: c.length, marks: c.marks }),
    })
  }
  return true
}

export function useChains() {
  const { data, mutate, isLoading } = useSWR<ServerChain[]>('/api/chains', fetcher)
  const migrated = useRef(false)

  useEffect(() => {
    if (migrated.current) return
    migrated.current = true
    migrateLegacyChains().then(didMigrate => { if (didMigrate) mutate() })
  }, [mutate])

  const chains = (data ?? []).map(toChain)

  async function addChain(name: string, length: number) {
    await fetch('/api/chains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, length }),
    })
    await mutate()
  }

  async function toggleMark(chainId: string, index: number) {
    const current = (data ?? []).find(c => c.id === chainId)
    if (!current) return
    const marks = [...current.marks]
    marks[index] = marks[index] === null ? 'check' : marks[index] === 'check' ? 'cross' : null
    await fetch(`/api/chains/${chainId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: current.name, length: current.length, marks }),
    })
    await mutate()
  }

  async function removeChain(chainId: string) {
    await fetch(`/api/chains/${chainId}`, { method: 'DELETE' })
    await mutate()
  }

  return { chains, isLoading, addChain, toggleMark, removeChain }
}
