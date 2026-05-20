import useSWR from 'swr'

export interface AuthUser {
  id: number
  email: string
  name: string
  picture: string | null
}

const fetcher = (url: string) =>
  fetch(url).then(r => (r.ok ? r.json() : null))

export function useAuth() {
  const { data, isLoading, mutate } = useSWR<AuthUser | null>('/auth/me', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  })

  async function logout() {
    await fetch('/auth/logout', { method: 'POST' })
    mutate(null)
  }

  return { user: data ?? null, isLoading, logout }
}
