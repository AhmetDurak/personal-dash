import useSWR from 'swr'
import type { Publication } from '../types'

interface ServerPublication {
  id: number
  title: string
  body: string
  type: string
  link: string | null
  read: boolean
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function toPublication(p: ServerPublication): Publication {
  return { id: p.id, title: p.title, body: p.body, type: p.type, link: p.link, read: p.read, createdAt: p.created_at }
}

export function usePublications() {
  const { data, mutate, isLoading } = useSWR<ServerPublication[]>('/api/publications', fetcher, {
    refreshInterval: 5 * 60 * 1000,
  })

  const publications = (data ?? []).map(toPublication)
  const unreadCount = publications.filter(p => !p.read).length

  async function markRead(id: number, read = true) {
    await fetch(`/api/publications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read }),
    })
    await mutate()
  }

  async function markAllRead() {
    await fetch('/api/publications/read-all', { method: 'PATCH' })
    await mutate()
  }

  async function remove(id: number) {
    await fetch(`/api/publications/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { publications, unreadCount, isLoading, markRead, markAllRead, remove }
}
