import { createContext, useContext, useEffect, useState } from 'react'
import { getToken, saveToken, clearToken } from './tokenStorage'

interface AuthContextValue {
  token: string | null
  isLoading: boolean
  connect: (token: string) => Promise<void>
  disconnect: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  isLoading: true,
  connect: async () => {},
  disconnect: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getToken().then(t => { setToken(t); setIsLoading(false) })
  }, [])

  async function connect(t: string) {
    await saveToken(t)
    setToken(t)
  }

  async function disconnect() {
    await clearToken()
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, isLoading, connect, disconnect }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
