import useSWR from 'swr'

export interface Transcript {
  id: number
  url: string
  videoId: string
  title: string
  transcriptText: string
  folder: string | null
  createdAt: string
  updatedAt: string
}

export interface TranscriptPreview {
  videoId: string
  title: string
  transcriptText: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export class TranscriptFetchError extends Error {
  reason?: string
  constructor(message: string, reason?: string) {
    super(message)
    this.reason = reason
  }
}

async function postJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new TranscriptFetchError(data?.error || 'Request failed', data?.reason)
  return data
}

export function useTranscripts() {
  const { data, mutate, isLoading } = useSWR<Transcript[]>('/api/transcript', fetcher)

  async function fetchPreview(url: string) {
    return postJson('/api/transcript/preview', 'POST', { url }) as Promise<TranscriptPreview>
  }

  async function createTranscript(url: string, folder: string | null = null) {
    const transcript = await postJson('/api/transcript', 'POST', { url, folder }) as Transcript
    await mutate()
    return transcript
  }

  async function removeTranscript(id: number) {
    await postJson(`/api/transcript/${id}`, 'DELETE')
    await mutate()
  }

  async function moveTranscriptToFolder(id: number, folder: string | null) {
    await postJson(`/api/transcript/${id}/folder`, 'PATCH', { folder })
    await mutate()
  }

  async function renameTranscriptFolder(oldPath: string, newPath: string) {
    await postJson('/api/transcript/folder-rename', 'PATCH', { oldPath, newPath })
    await mutate()
  }

  async function deleteTranscriptFolder(path: string) {
    await postJson(`/api/transcript/folder?path=${encodeURIComponent(path)}`, 'DELETE')
    await mutate()
  }

  return {
    transcripts: data ?? [],
    isLoading,
    fetchPreview,
    createTranscript,
    removeTranscript,
    moveTranscriptToFolder,
    renameTranscriptFolder,
    deleteTranscriptFolder,
  }
}
