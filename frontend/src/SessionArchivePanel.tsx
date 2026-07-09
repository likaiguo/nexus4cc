import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './icons'
import { useAuthFetch } from './AuthSessionProvider'

interface ArchiveSummary {
  readonly id: string
  readonly project: string
  readonly channelIndex: number
  readonly windowName: string
  readonly cwd: string
  readonly launcher: string
  readonly profile: string
  readonly status: string
  readonly transcriptSize: number
  readonly createdAt: string
  readonly closedAt: string | null
  readonly metadata: Record<string, unknown>
}

interface ArchiveDetail extends ArchiveSummary { readonly capturedText: string }

interface Props {
  readonly token: string; readonly currentProject: string; readonly currentChannelIndex: number
  readonly onClose: () => void; readonly onRestored: (project: string, channelIndex: number) => void
}

function asRecord(value: unknown): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return record
  for (const [key, entry] of Object.entries(value)) record[key] = entry
  return record
}

function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback }

function int(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback }

function mapArchive(value: unknown): ArchiveSummary {
  const row = asRecord(value)
  return {
    id: text(row.id),
    project: text(row.project),
    channelIndex: int(row.channelIndex),
    windowName: text(row.windowName),
    cwd: text(row.cwd),
    launcher: text(row.launcher, 'bash'),
    profile: text(row.profile),
    status: text(row.status, 'snapshot'),
    transcriptSize: int(row.transcriptSize),
    createdAt: text(row.createdAt),
    closedAt: typeof row.closedAt === 'string' ? row.closedAt : null,
    metadata: asRecord(row.metadata),
  }
}

function mapArchiveDetail(value: unknown): ArchiveDetail {
  const row = asRecord(value)
  return {
    ...mapArchive(row),
    capturedText: text(row.capturedText),
  }
}

function formatTime(value: string | null): string {
  if (!value) return '未关闭'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export default function SessionArchivePanel({ token, currentProject, currentChannelIndex, onClose, onRestored }: Props) {
  const authFetch = useAuthFetch()
  const [archives, setArchives] = useState<ArchiveSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<ArchiveDetail | null>(null)
  const [projectOnly, setProjectOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(
    () => archives.find(archive => archive.id === selectedId) ?? archives[0] ?? null,
    [archives, selectedId],
  )

  const loadArchives = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (projectOnly && currentProject) params.set('project', currentProject)
      const response = await authFetch(`/api/session-archives?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`archive list failed: ${response.status}`)
      const rowsValue = asRecord(await response.json()).archives
      const rows = Array.isArray(rowsValue) ? rowsValue.map(mapArchive).filter(archive => archive.id) : []
      setArchives(rows)
      setSelectedId(previous => (previous && rows.some(archive => archive.id === previous) ? previous : rows[0]?.id ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [authFetch, currentProject, projectOnly, token])

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  useEffect(() => {
    if (!selected?.id) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setError('')
    authFetch(`/api/session-archives/${encodeURIComponent(selected.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(response => {
        if (!response.ok) throw new Error(`archive detail failed: ${response.status}`)
        return response.json()
      })
      .then(payload => {
        if (!cancelled) setDetail(mapArchiveDetail(asRecord(payload).archive))
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authFetch, selected?.id, token])

  async function snapshotCurrent() {
    setBusy(true)
    setError('')
    try {
      const response = await authFetch('/api/session-archives/snapshot', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: currentProject, index: currentChannelIndex }),
      })
      if (!response.ok) throw new Error(`snapshot failed: ${response.status}`)
      const payload = asRecord(await response.json())
      const archive = mapArchive(asRecord(payload.archive))
      await loadArchives()
      setSelectedId(archive.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function restoreSelected() {
    if (!selected?.id) return
    setBusy(true)
    setError('')
    try {
      const response = await authFetch(`/api/session-archives/${encodeURIComponent(selected.id)}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`restore failed: ${response.status}`)
      const payload = asRecord(await response.json())
      const project = text(payload.project, selected.project)
      const index = int(payload.index, selected.channelIndex)
      onRestored(project, index)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const transcript = detail?.capturedText ?? ''

  return (
    <div className="fixed inset-0 z-[520] bg-black/60 flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
      <div
        className="w-full max-w-6xl h-[86dvh] bg-nexus-menu-bg border border-nexus-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-12 px-3 border-b border-nexus-border flex items-center gap-2 shrink-0">
          <Icon name="archive" size={18} className="text-nexus-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-nexus-text">会话归档</div>
            <div className="text-[11px] text-nexus-text-2 font-mono truncate">{currentProject}:{currentChannelIndex}</div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-nexus-text-2">
            <input type="checkbox" checked={projectOnly} onChange={event => setProjectOnly(event.target.checked)} />
            当前项目
          </label>
          <button className="h-8 px-2.5 rounded-md border border-nexus-border bg-transparent text-nexus-text text-xs cursor-pointer flex items-center gap-1.5" onClick={snapshotCurrent} disabled={busy}>
            <Icon name="save" size={14} />
            快照
          </button>
          <button className="h-8 w-8 rounded-md border border-nexus-border bg-transparent text-nexus-text-2 cursor-pointer flex items-center justify-center" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={16} />
          </button>
        </div>
        {error && <div className="px-3 py-2 border-b border-nexus-border text-xs text-nexus-error bg-nexus-bg">{error}</div>}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div className="md:w-80 md:border-r border-b md:border-b-0 border-nexus-border min-h-[160px] md:min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-nexus-text-2">加载中...</div>
            ) : archives.length === 0 ? (
              <div className="p-4 text-xs text-nexus-text-2">暂无归档。可先点击快照保存当前频道。</div>
            ) : (
              archives.map(archive => (
                <button
                  key={archive.id}
                  className="w-full text-left bg-transparent border-0 border-b border-nexus-border px-3 py-2.5 cursor-pointer"
                  style={{ background: archive.id === selected?.id ? 'var(--nexus-tab-active)' : 'transparent' }}
                  onClick={() => setSelectedId(archive.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-nexus-text truncate">{archive.windowName || archive.launcher}</span>
                    <span className="text-[11px] text-nexus-text-2 font-mono shrink-0">{archive.launcher}</span>
                  </div>
                  <div className="text-[11px] text-nexus-text-2 font-mono truncate">{archive.project}:{archive.channelIndex}</div>
                  <div className="text-[11px] text-nexus-muted mt-1 flex items-center justify-between gap-2">
                    <span className="truncate">{formatTime(archive.closedAt ?? archive.createdAt)}</span>
                    <span className="shrink-0">{formatBytes(archive.transcriptSize)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-nexus-border flex items-center gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-nexus-text font-medium truncate">{selected?.cwd || '未选择归档'}</div>
                <div className="text-[11px] text-nexus-text-2 font-mono truncate">
                  {selected ? `${selected.id} ${selected.profile ? `profile=${selected.profile}` : ''}` : ''}
                </div>
              </div>
              <button
                className="h-8 px-3 rounded-md bg-nexus-accent border-none text-white text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                onClick={restoreSelected}
                disabled={!selected || busy}
              >
                <Icon name="play" size={14} />
                恢复
              </button>
            </div>
            {detailLoading ? (
              <div className="p-4 text-xs text-nexus-text-2">加载归档内容...</div>
            ) : (
              <pre className="flex-1 min-h-0 overflow-auto m-0 p-3 bg-nexus-bg text-nexus-text text-xs font-mono whitespace-pre-wrap break-words leading-5" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                {transcript || '没有可显示的终端归档内容。'}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
