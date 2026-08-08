import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthFetch } from './AuthSessionProvider'
import { Icon } from './icons'
import { SessionHistoryList } from './SessionHistoryList'
import {
  asRecord,
  dialogFocusWrapIndex,
  formatHistoryTime,
  mapArchiveDetail,
  mapSessionHistoryItems,
  requestSessionContinuation,
  type ArchiveDetail,
  type SessionContinuationTarget,
  type SessionHistoryItem,
} from './sessionHistory'

interface Props {
  readonly token: string
  readonly currentProject: string
  readonly currentChannelIndex: number
  readonly onClose: () => void
  readonly onContinued: (target: SessionContinuationTarget) => void
}

type BusyAction = 'snapshot' | 'reply' | null

function payloadText(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === 'string' ? payload[key] : ''
}

export default function SessionHistoryPanel({ token, currentProject, currentChannelIndex, onClose, onContinued }: Props) {
  const { t } = useTranslation()
  const authFetch = useAuthFetch()
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  const [items, setItems] = useState<readonly SessionHistoryItem[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [detail, setDetail] = useState<ArchiveDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [error, setError] = useState('')

  const selected = useMemo(
    () => items.find(item => item.key === selectedKey) ?? items[0] ?? null,
    [items, selectedKey],
  )

  const loadHistory = useCallback(async (): Promise<readonly SessionHistoryItem[]> => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ project: currentProject, limit: '200' })
      const response = await authFetch(`/api/agent-session-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`history list failed: ${response.status}`)
      const rows = mapSessionHistoryItems(await response.json())
      setItems(rows)
      setSelectedKey(previous => previous && rows.some(item => item.key === previous) ? previous : rows[0]?.key ?? '')
      return rows
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause
      setError(cause.message)
      setItems([])
      return []
    } finally {
      setLoading(false)
    }
  }, [authFetch, currentProject, token])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => { closeRef.current = onClose }, [onClose])

  const requestClose = useCallback(() => {
    closeRef.current()
  }, [])

  useEffect(() => {
    panelRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [requestClose])

  function containDialogFocus(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ))
    if (focusable.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }
    const wrapIndex = dialogFocusWrapIndex({
      focusedIndex: focusable.findIndex(element => element === document.activeElement),
      focusableCount: focusable.length,
      backward: event.shiftKey,
    })
    if (wrapIndex === null) return
    event.preventDefault()
    focusable[wrapIndex]?.focus()
  }

  useEffect(() => {
    if (!selected?.archiveId) {
      setDetail(null)
      setDetailLoading(false)
      return
    }
    let active = true
    setDetail(null)
    setDetailLoading(true)
    authFetch(`/api/session-archives/${encodeURIComponent(selected.archiveId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(response => {
        if (!response.ok) throw new Error(`archive detail failed: ${response.status}`)
        return response.json()
      })
      .then(payload => {
        if (active) setDetail(mapArchiveDetail(asRecord(payload).archive))
      })
      .catch(cause => {
        if (!active) return
        if (!(cause instanceof Error)) throw cause
        setError(cause.message)
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })
    return () => { active = false }
  }, [authFetch, selected?.archiveId, token])

  async function snapshotCurrent(): Promise<void> {
    setBusyAction('snapshot')
    setError('')
    try {
      const response = await authFetch('/api/session-archives/snapshot', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: currentProject, index: currentChannelIndex }),
      })
      if (!response.ok) throw new Error(`snapshot failed: ${response.status}`)
      const archiveId = payloadText(asRecord(asRecord(await response.json()).archive), 'id')
      const rows = await loadHistory()
      setSelectedKey(rows.find(item => item.archiveId === archiveId)?.key ?? rows[0]?.key ?? '')
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause
      setError(cause.message)
    } finally {
      setBusyAction(null)
    }
  }

  async function continueReply(): Promise<void> {
    if (!selected?.resumable) return
    setBusyAction('reply')
    setError('')
    try {
      const target = await requestSessionContinuation(authFetch, {
        token,
        project: currentProject,
        historyKey: selected.key,
      })
      onContinued(target)
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause
      setError(cause.message)
      setBusyAction(null)
    }
  }

  const content = detail?.capturedText || selected?.preview || ''
  const contentLabel = selected?.archiveId ? t('sessionArchives.archiveTranscript') : t('sessionArchives.nativePreview')

  return (
    <div className="fixed inset-0 z-[620] flex items-center justify-center bg-black/60 sm:p-5" onPointerDown={requestClose}>
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-history-title"
        tabIndex={-1}
        className="w-full h-[100dvh] sm:h-[88dvh] sm:max-w-6xl bg-nexus-menu-bg border border-nexus-border sm:rounded-lg shadow-2xl flex flex-col overflow-hidden outline-none"
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={containDialogFocus}
      >
        <header className="min-h-12 px-3 py-2 border-b border-nexus-border flex items-center gap-2 shrink-0">
          <Icon name="archive" size={18} className="text-nexus-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="session-history-title" className="m-0 text-sm font-semibold text-nexus-text">{t('sessionArchives.title')}</h2>
            <p className="m-0 mt-0.5 text-[11px] text-nexus-text-2 font-mono truncate">
              {t('sessionArchives.currentProject', { project: currentProject })}:{currentChannelIndex}
            </p>
          </div>
          <button type="button" className="h-8 px-2.5 rounded-md border border-nexus-border bg-transparent text-nexus-text text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40" onClick={() => void snapshotCurrent()} disabled={busyAction !== null} title={t('sessionArchives.snapshot')} aria-label={t('sessionArchives.snapshot')}>
            <Icon name="save" size={14} />
            <span className="hidden sm:inline">{busyAction === 'snapshot' ? t('sessionArchives.snapshotting') : t('sessionArchives.snapshot')}</span>
          </button>
          <button type="button" className="h-8 w-8 rounded-md border border-nexus-border bg-transparent text-nexus-text-2 cursor-pointer flex items-center justify-center" onClick={requestClose} title={t('common.close')} aria-label={t('common.close')}>
            <Icon name="x" size={16} />
          </button>
        </header>
        {error && <div role="alert" className="px-3 py-2 border-b border-nexus-border text-xs text-nexus-error bg-nexus-bg">{error}</div>}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <nav aria-label={t('sessionArchives.title')} className="max-h-[36dvh] md:max-h-none md:w-80 md:border-r border-b md:border-b-0 border-nexus-border shrink-0 overflow-y-auto">
            <SessionHistoryList items={items} selectedKey={selected?.key ?? ''} loading={loading} onSelect={setSelectedKey} />
          </nav>
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-nexus-border flex items-center gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-nexus-text font-medium truncate">{selected?.title || t('sessionArchives.noSelection')}</div>
                <div className="text-[11px] text-nexus-text-2 font-mono truncate">{selected?.cwd || ''}</div>
                {selected && <div className="text-[11px] text-nexus-muted truncate">{contentLabel} · {formatHistoryTime(selected.updatedAt)}</div>}
              </div>
              <button type="button" className="min-h-9 px-3 rounded-md bg-nexus-accent border-none text-white text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40 shrink-0" onClick={() => void continueReply()} disabled={!selected?.resumable || busyAction !== null}>
                <Icon name="message" size={14} />
                {busyAction === 'reply' ? t('sessionArchives.resuming') : t('sessionArchives.continueReply')}
              </button>
            </div>
            {detailLoading ? (
              <div className="p-4 text-xs text-nexus-text-2">{t('common.loading')}</div>
            ) : (
              <pre className="flex-1 min-h-0 overflow-auto m-0 p-3 bg-nexus-bg text-nexus-text text-xs font-mono whitespace-pre-wrap break-words leading-5 select-text">
                {selected ? content || t('sessionArchives.noContent') : t('sessionArchives.noSelection')}
              </pre>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
