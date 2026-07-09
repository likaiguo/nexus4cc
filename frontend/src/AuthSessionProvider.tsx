import { createContext, useCallback, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AuthExpiredHandler } from './authSession'
import { fetchWithAuth } from './authSession'

const noopAuthExpired: AuthExpiredHandler = () => {}

const AuthExpiredContext = createContext<AuthExpiredHandler>(noopAuthExpired)

interface AuthSessionProviderProps {
  readonly children: ReactNode
  readonly onAuthExpired: AuthExpiredHandler
}

export function AuthSessionProvider({ children, onAuthExpired }: AuthSessionProviderProps) {
  return (
    <AuthExpiredContext.Provider value={onAuthExpired}>
      {children}
    </AuthExpiredContext.Provider>
  )
}

export function useAuthExpired(): AuthExpiredHandler {
  return useContext(AuthExpiredContext)
}

export function useAuthFetch() {
  const onAuthExpired = useAuthExpired()
  return useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => fetchWithAuth(input, init, onAuthExpired),
    [onAuthExpired],
  )
}
