import { useCallback, useEffect, useMemo, useState } from 'react'

export interface QuickPhrase {
  id: string
  title: string
  text: string
  appendEnter: boolean
  position: number
  useCount: number
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
}

export type QuickPhraseInput = {
  title: string
  text: string
  appendEnter: boolean
}

export function useQuickPhrases(token: string) {
  const [phrases, setPhrases] = useState<QuickPhrase[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sortedPhrases = useMemo(
    () => phrases.slice().sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    [phrases],
  )

  const fetchPhrases = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/quick-phrases', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(await responseError(res))
      setPhrases(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPhrases()
  }, [fetchPhrases])

  const savePhrase = useCallback(async (id: string | null, input: QuickPhraseInput) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(id ? `/api/quick-phrases/${encodeURIComponent(id)}` : '/api/quick-phrases', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await responseError(res))
      const data: { readonly phrase: QuickPhrase } = await res.json()
      setPhrases(prev => {
        const exists = prev.some(item => item.id === data.phrase.id)
        return exists ? prev.map(item => item.id === data.phrase.id ? data.phrase : item) : [...prev, data.phrase]
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setSaving(false)
    }
  }, [token])

  const deletePhrase = useCallback(async (phrase: QuickPhrase, editingId: string | null) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/quick-phrases/${encodeURIComponent(phrase.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await responseError(res))
      setPhrases(prev => prev.filter(item => item.id !== phrase.id).map((item, index) => ({ ...item, position: index })))
      return editingId === phrase.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setSaving(false)
    }
  }, [token])

  const movePhrase = useCallback(async (phrase: QuickPhrase, direction: -1 | 1) => {
    const index = sortedPhrases.findIndex(item => item.id === phrase.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= sortedPhrases.length) return
    const next = sortedPhrases.slice()
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    const optimistic = next.map((entry, position) => ({ ...entry, position }))
    setPhrases(optimistic)
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/quick-phrases/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order: optimistic.map(entry => entry.id) }),
      })
      if (!res.ok) throw new Error(await responseError(res))
      const data: unknown = await res.json()
      if (hasPhrases(data)) setPhrases(data.phrases)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      fetchPhrases()
    } finally {
      setSaving(false)
    }
  }, [fetchPhrases, sortedPhrases, token])

  const recordPhraseUse = useCallback(async (id: string) => {
    try {
      await fetch(`/api/quick-phrases/${encodeURIComponent(id)}/use`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[Nexus] Failed to record quick phrase usage: ${message}`)
    }
  }, [token])

  return {
    deletePhrase,
    error,
    loading,
    movePhrase,
    recordPhraseUse,
    savePhrase,
    saving,
    setError,
    sortedPhrases,
  }
}

async function responseError(res: Response) {
  try {
    const data: unknown = await res.json()
    if (hasErrorMessage(data)) return data.error
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `${res.status} ${res.statusText}: ${message}`
  }
  return `${res.status} ${res.statusText}`
}

function hasErrorMessage(data: unknown): data is { readonly error: string } {
  return typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
}

function hasPhrases(data: unknown): data is { readonly phrases: QuickPhrase[] } {
  return typeof data === 'object' && data !== null && 'phrases' in data && Array.isArray(data.phrases)
}
