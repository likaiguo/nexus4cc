export const AUTH_TOKEN_STORAGE_KEY = 'nexus_token'
export const AUTH_WS_UNAUTHORIZED_CODE = 4001

export type AuthExpiredHandler = () => void
export type AuthValidationResult = 'valid' | 'unauthorized' | 'unreachable'
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init)

export function authHeader(token: string): string {
  return `Bearer ${token}`
}

export function removeSavedAuthToken(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function isUnauthorizedStatus(status: number): boolean {
  return status === 401
}

export function handleUnauthorizedResponse(response: Pick<Response, 'status'>, onAuthExpired: AuthExpiredHandler): boolean {
  if (!isUnauthorizedStatus(response.status)) return false
  onAuthExpired()
  return true
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  onAuthExpired: AuthExpiredHandler,
  fetchImpl: FetchLike = defaultFetch,
): Promise<Response> {
  const response = await fetchImpl(input, init)
  handleUnauthorizedResponse(response, onAuthExpired)
  return response
}

export async function validateSavedAuthToken(
  token: string,
  fetchImpl: FetchLike = defaultFetch,
): Promise<AuthValidationResult> {
  try {
    const response = await fetchImpl('/api/config', {
      headers: { Authorization: authHeader(token) },
    })
    if (isUnauthorizedStatus(response.status)) return 'unauthorized'
    return response.ok ? 'valid' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

export function isAuthWebSocketClose(code: number): boolean {
  return code === AUTH_WS_UNAUTHORIZED_CODE
}

export function shouldReconnectTerminalWebSocket(code: number): boolean {
  return !isAuthWebSocketClose(code)
}
