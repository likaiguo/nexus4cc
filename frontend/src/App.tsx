import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Terminal from './Terminal'
import { Icon } from './icons'
import { AuthSessionProvider } from './AuthSessionProvider'
import {
  AUTH_TOKEN_STORAGE_KEY,
  removeSavedAuthToken,
  validateSavedAuthToken,
} from './authSession'

const DEFAULT_LOGIN_PASSWORD = 'nexus123'
type SessionCheckState = 'idle' | 'checking' | 'valid' | 'unreachable'

interface AuthStatus {
  readonly defaultPassword: boolean
  readonly password?: string
}

function isAuthStatus(value: unknown): value is AuthStatus {
  if (typeof value !== 'object' || value === null) return false
  if (!('defaultPassword' in value) || typeof value.defaultPassword !== 'boolean') return false
  if (!('password' in value)) return true
  return value.password === undefined || typeof value.password === 'string'
}

export default function App() {
  const { t } = useTranslation()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  const [validatedToken, setValidatedToken] = useState<string | null>(null)
  const [sessionCheck, setSessionCheck] = useState<SessionCheckState>(() => token ? 'checking' : 'idle')
  const [sessionCheckRetry, setSessionCheckRetry] = useState(0)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usesDefaultPassword, setUsesDefaultPassword] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)

  const handleAuthExpired = useCallback(() => {
    removeSavedAuthToken()
    setToken(null)
    setValidatedToken(null)
    setSessionCheck('idle')
    setLoading(false)
    setError('')
    setPassword('')
    setUsesDefaultPassword(false)
  }, [])

  useEffect(() => {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (token) return
    let active = true
    setUsesDefaultPassword(false)
    fetch('/api/auth/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!active || !isAuthStatus(data)) return
        if (!data.defaultPassword) {
          setUsesDefaultPassword(false)
          return
        }
        setUsesDefaultPassword(true)
        setPassword(data.password || DEFAULT_LOGIN_PASSWORD)
      })
      .catch(() => {})
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!token) {
      setValidatedToken(null)
      setSessionCheck('idle')
      return
    }
    if (validatedToken === token) {
      setSessionCheck('valid')
      return
    }
    let active = true
    setSessionCheck('checking')
    validateSavedAuthToken(token)
      .then(result => {
        if (!active) return
        if (result === 'valid') {
          setValidatedToken(token)
          setSessionCheck('valid')
          return
        }
        if (result === 'unauthorized') {
          handleAuthExpired()
          return
        }
        setSessionCheck('unreachable')
      })
      .catch(() => {
        if (active) setSessionCheck('unreachable')
      })
    return () => { active = false }
  }, [handleAuthExpired, sessionCheckRetry, token, validatedToken])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError(t('login.wrongPassword'))
        return
      }
      const { token: authToken } = await res.json()
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken)
      setValidatedToken(authToken)
      setSessionCheck('valid')
      setToken(authToken)
    } catch {
      setError(t('login.connectionFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (token && sessionCheck === 'valid') {
    return (
      <AuthSessionProvider onAuthExpired={handleAuthExpired}>
        <Terminal token={token} onAuthExpired={handleAuthExpired} />
      </AuthSessionProvider>
    )
  }

  if (token && sessionCheck !== 'valid') {
    return (
      <div className="flex items-center justify-center w-full h-full bg-nexus-bg">
        <div className="bg-nexus-bg-2 rounded-xl p-8 min-w-80 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-nexus-border text-center">
          <h1 className="text-nexus-text text-2xl font-bold mb-3 tracking-widest">{t('login.title')}</h1>
          <p className="text-nexus-text-2 text-sm mb-5">
            {sessionCheck === 'checking' ? t('login.checkingSession') : t('login.savedSessionConnectionFailed')}
          </p>
          {sessionCheck === 'unreachable' && (
            <button
              type="button"
              className="bg-nexus-accent border-none rounded-lg text-white text-sm font-semibold py-2.5 px-5 cursor-pointer"
              onClick={() => setSessionCheckRetry(value => value + 1)}
            >
              {t('common.refresh')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-nexus-bg">
      <div className="bg-nexus-bg-2 rounded-xl p-10 px-8 min-w-80 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-nexus-border">
        <h1 className="text-nexus-text text-3xl font-bold text-center mb-2 tracking-widest">{t('login.title')}</h1>
        <p className="text-nexus-text-2 text-sm text-center mb-8">{t('login.subtitle')}</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              autoFocus
              className="w-full bg-nexus-bg border border-nexus-border rounded-lg text-nexus-text text-base py-3 pl-4 pr-12 outline-none"
            />
            <button
              type="button"
              aria-label={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
              title={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
              onClick={() => setPasswordVisible(value => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-nexus-text-2 cursor-pointer p-1"
            >
              <Icon name={passwordVisible ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
          {usesDefaultPassword && (
            <p className="text-nexus-text-2 text-xs text-center">
              {t('login.defaultPasswordHint', { password: DEFAULT_LOGIN_PASSWORD })}
            </p>
          )}
          {error && <p className="text-nexus-error text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="bg-nexus-accent border-none rounded-lg text-white text-base font-semibold py-3 px-6 mt-2 cursor-pointer">
            {loading ? t('login.loggingIn') : t('login.loginButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
