import useSWR from 'swr'

async function ping(): Promise<boolean> {
  try {
    const r = await fetch('/health', { cache: 'no-store' })
    return r.ok
  } catch {
    return false
  }
}

export function useBackendStatus() {
  const { data, isLoading } = useSWR('__health__', ping, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  })
  if (isLoading) return 'loading' as const
  return data ? 'up' as const : 'down' as const
}
