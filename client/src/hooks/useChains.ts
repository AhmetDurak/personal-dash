import { useState } from 'react'

export type ChainMark = 'check' | 'cross' | null

export interface Chain {
  id: string
  name: string
  length: number
  marks: ChainMark[]
  createdAt: string
}

const STORAGE_KEY = 'learn:chains'

function load(): Chain[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Chain[] } catch { return [] }
}

export function useChains() {
  const [chains, setChains] = useState<Chain[]>(load)

  function save(next: Chain[]) {
    setChains(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function addChain(name: string, length: number) {
    const chain: Chain = {
      id: crypto.randomUUID(),
      name,
      length,
      marks: Array(length).fill(null),
      createdAt: new Date().toISOString(),
    }
    save([chain, ...chains])
  }

  function toggleMark(chainId: string, index: number) {
    save(chains.map(c => {
      if (c.id !== chainId) return c
      const marks = [...c.marks]
      marks[index] = marks[index] === null ? 'check' : marks[index] === 'check' ? 'cross' : null
      return { ...c, marks }
    }))
  }

  function removeChain(chainId: string) {
    save(chains.filter(c => c.id !== chainId))
  }

  return { chains, addChain, toggleMark, removeChain }
}
