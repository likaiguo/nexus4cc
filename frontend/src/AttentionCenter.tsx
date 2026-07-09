import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import GhostShield from './GhostShield'
import { Icon } from './icons'
import { useAuthFetch } from './AuthSessionProvider'

export interface AttentionEvent {
  id: string
  type: 'needs-confirm' | 'done' | 'task-success' | 'task-error'
  project: string
  channelIndex: number | null
  taskId?: string
  summary: string
  status: 'new' | 'seen' | 'resolved' | 'dismissed'
  createdAt: string
  updatedAt: string
}

interface Props {
  token: string
  onClose: () => void
  onJump: (project: string, channelIndex?: number | null) => void
  onChanged?: () => void
}

function eventTone(type: AttentionEvent['type']) {
  if (type === 'needs-confirm') return 'text-nexus-warning'
  if (type === 'task-error') return 'text-nexus-error'
  if (type === 'done' || type === 'task-success') return 'text-nexus-success'
  return 'text-nexus-text-2'
}

export default function AttentionCenter({ token, onClose, onJump, onChanged }: Props) {
  const { t } = useTranslation()
  const authFetch = useAuthFetch()
  const [events, setEvents] = useState<AttentionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/attention-events?status=unresolved&limit=100', { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEvents(await res.json())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [authFetch, token])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  async function updateEvent(id: string, action: 'resolve' | 'dismiss') {
    try {
      const res = await authFetch(`/api/attention-events/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) return
      setEvents(prev => prev.filter(event => event.id !== id))
      onChanged?.()
    } catch {}
  }

  async function markSeen(event: AttentionEvent) {
    if (event.status !== 'new') return
    try {
      await authFetch(`/api/attention-events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seen' }),
      })
      setEvents(prev => prev.map(item => item.id === event.id ? { ...item, status: 'seen' } : item))
      onChanged?.()
    } catch {}
  }

  function handleJump(event: AttentionEvent) {
    markSeen(event)
    onJump(event.project, event.channelIndex)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[520] bg-black/60 flex items-end md:items-center justify-center md:p-5">
      <GhostShield />
      <div className="w-full md:max-w-[520px] max-h-[82dvh] md:max-h-[86vh] bg-nexus-bg border border-nexus-border rounded-t-xl md:rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-nexus-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="alert" size={18} />
            <span className="text-sm font-semibold text-nexus-text truncate">{t('attention.title')}</span>
            {events.length > 0 && (
              <span className="text-xs text-white bg-nexus-error rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                {events.length}
              </span>
            )}
          </div>
          <button className="bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex items-center justify-center" onPointerDown={onClose} title={t('common.close')}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-sm text-nexus-text-2 text-center">{t('common.loading')}</div>
          ) : error ? (
            <div className="px-4 py-4 text-sm text-nexus-error">{error}</div>
          ) : events.length === 0 ? (
            <div className="px-4 py-8 text-sm text-nexus-text-2 text-center">{t('attention.empty')}</div>
          ) : events.map(event => (
            <div key={event.id} className="border-b border-nexus-border last:border-b-0 px-4 py-3">
              <button
                type="button"
                className="w-full bg-transparent border-none p-0 text-left cursor-pointer"
                onPointerDown={(e) => { e.preventDefault(); handleJump(event) }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-semibold ${eventTone(event.type)}`}>{t(`attention.types.${event.type}`)}</span>
                  <span className="text-[11px] text-nexus-text-2 font-mono truncate">{event.project || '~'}{event.channelIndex !== null && event.channelIndex !== undefined ? `:${event.channelIndex}` : ''}</span>
                  <span className="text-[11px] text-nexus-text-2 ml-auto shrink-0">{new Date(event.updatedAt || event.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-nexus-text whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                  {event.summary || t('attention.noSummary')}
                </div>
              </button>
              <div className="flex items-center justify-between gap-2 mt-3">
                <span className="text-[11px] text-nexus-text-2">{t(`attention.status.${event.status}`)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 text-xs rounded border border-nexus-border bg-transparent text-nexus-text cursor-pointer"
                    onPointerDown={(e) => { e.preventDefault(); updateEvent(event.id, 'dismiss') }}
                  >
                    {t('attention.dismiss')}
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 text-xs rounded border-none bg-nexus-accent text-white cursor-pointer"
                    onPointerDown={(e) => { e.preventDefault(); updateEvent(event.id, 'resolve') }}
                  >
                    {t('attention.resolve')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
