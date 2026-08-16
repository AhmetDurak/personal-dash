import useSWR from 'swr'

export type TicketStatus = 'todo' | 'in_progress' | 'done'

export interface Story {
  id: number
  title: string
  description: string
  folder: string | null
  created_at: string
  updated_at: string
  total_count: number
  done_count: number
}

export interface Ticket {
  id: number
  story_id: number
  title: string
  description: string
  status: TicketStatus
  position: number
  created_at: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())
const jsonHeaders = { 'Content-Type': 'application/json' }

export function useStories() {
  const { data, mutate, isLoading } = useSWR<Story[]>('/api/kanban/stories', fetcher)
  const stories = data ?? []

  async function addStory(title: string, folder: string | null = null) {
    const res = await fetch('/api/kanban/stories', {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify({ title, folder }),
    })
    const story = await res.json()
    await mutate()
    return story as Story
  }

  async function updateStory(id: number, updates: { title?: string; description?: string }) {
    const current = stories.find(s => s.id === id)
    if (!current) return
    await fetch(`/api/kanban/stories/${id}`, {
      method: 'PUT', headers: jsonHeaders,
      body: JSON.stringify({ title: updates.title ?? current.title, description: updates.description ?? current.description }),
    })
    await mutate()
  }

  async function moveStoryToFolder(id: number, folder: string | null) {
    await fetch(`/api/kanban/stories/${id}/folder`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function renameFolder(oldPath: string, newPath: string) {
    await fetch('/api/kanban/stories/folder-rename', {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ oldPath, newPath }),
    })
    await mutate()
  }

  async function deleteFolder(path: string) {
    await fetch(`/api/kanban/stories/folder?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    await mutate()
  }

  async function deleteStory(id: number) {
    await fetch(`/api/kanban/stories/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { stories, isLoading, addStory, updateStory, moveStoryToFolder, renameFolder, deleteFolder, deleteStory, refresh: mutate }
}

export function useTickets(storyId: number | null) {
  const { data, mutate, isLoading } = useSWR<Ticket[]>(
    storyId != null ? `/api/kanban/stories/${storyId}/tickets` : null, fetcher
  )
  const tickets = data ?? []

  async function addTicket(title: string, description = '') {
    if (storyId == null) return
    await fetch(`/api/kanban/stories/${storyId}/tickets`, {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify({ title, description }),
    })
    await mutate()
  }

  async function updateTicket(id: number, updates: { title: string; description: string }) {
    await fetch(`/api/kanban/tickets/${id}`, {
      method: 'PUT', headers: jsonHeaders, body: JSON.stringify(updates),
    })
    await mutate()
  }

  async function moveTicket(id: number, status: TicketStatus, position: number) {
    await fetch(`/api/kanban/tickets/${id}/status`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status, position }),
    })
    await mutate()
  }

  async function deleteTicket(id: number) {
    await fetch(`/api/kanban/tickets/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { tickets, isLoading, addTicket, updateTicket, moveTicket, deleteTicket, refresh: mutate }
}
