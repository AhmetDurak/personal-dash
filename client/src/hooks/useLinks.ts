import useSWR from 'swr'

export interface EntityLink {
  id: number
  aType: string
  aId: string
  bType: string
  bId: string
  note: string | null
  createdBy: 'user' | 'ai'
  createdAt: string
}

interface ServerLink {
  id: number
  a_type: string
  a_id: string
  b_type: string
  b_id: string
  note: string | null
  created_by: 'user' | 'ai'
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function toLink(l: ServerLink): EntityLink {
  return { id: l.id, aType: l.a_type, aId: l.a_id, bType: l.b_type, bId: l.b_id, note: l.note, createdBy: l.created_by, createdAt: l.created_at }
}

export function useLinks(entityType: string, entityId: string | number | null) {
  const key = entityId !== null ? `/api/links?type=${entityType}&id=${entityId}` : null
  const { data, mutate, isLoading } = useSWR<ServerLink[]>(key, fetcher)

  const links = (data ?? []).map(toLink)

  async function createLink(bType: string, bId: string | number, note?: string) {
    if (entityId === null) return
    await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aType: entityType, aId: String(entityId), bType, bId: String(bId), note }),
    })
    await mutate()
  }

  async function deleteLink(id: number) {
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { links, isLoading, createLink, deleteLink }
}
