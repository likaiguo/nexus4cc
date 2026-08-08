export interface LinkedChannel {
  readonly project: string
  readonly channelIndex: number
  readonly status: 'active' | 'closed'
}

export interface SessionHistoryItem {
  readonly key: string
  readonly source: 'native' | 'archive'
  readonly archiveId: string | null
  readonly agentSessionId: string
  readonly project: string
  readonly channelIndex: number | null
  readonly windowName: string
  readonly cwd: string
  readonly launcher: string
  readonly profile: string
  readonly title: string
  readonly preview: string
  readonly transcriptSize: number
  readonly createdAt: string
  readonly updatedAt: string
  readonly closedAt: string | null
  readonly linkedChannel: LinkedChannel | null
  readonly resumable: boolean
}

export interface ArchiveDetail {
  readonly id: string
  readonly capturedText: string
}

export interface SessionContinuationTarget {
  readonly project: string
  readonly channelIndex: number
}

interface SessionContinuationRequest {
  readonly token: string
  readonly project: string
  readonly historyKey: string
}

interface SessionSwitchOptions {
  readonly openComposerAfterSwitch: true
}

interface SessionContinuationActions {
  readonly closePanel: () => void
  readonly switchSession: (
    project: string,
    channelIndex: number,
    options: SessionSwitchOptions,
  ) => void
}

type HistoryFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class SessionHistoryRequestError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'SessionHistoryRequestError'
    this.status = status
  }
}

interface DialogFocusWrapRequest {
  readonly focusedIndex: number
  readonly focusableCount: number
  readonly backward: boolean
}

export function dialogFocusWrapIndex({ focusedIndex, focusableCount, backward }: DialogFocusWrapRequest): number | null {
  if (focusableCount <= 0) return null
  if (focusedIndex < 0) return backward ? focusableCount - 1 : 0
  if (backward && focusedIndex === 0) return focusableCount - 1
  if (!backward && focusedIndex === focusableCount - 1) return 0
  return null
}

export async function requestSessionContinuation(
  fetchHistory: HistoryFetch,
  request: SessionContinuationRequest,
): Promise<SessionContinuationTarget> {
  const response = await fetchHistory('/api/agent-session-history/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${request.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: request.project, historyKey: request.historyKey }),
  })
  if (!response.ok) {
    throw new SessionHistoryRequestError(`continue reply failed: ${response.status}`, response.status)
  }
  const payload = asRecord(await response.json())
  const project = text(payload.project)
  const channelIndex = typeof payload.index === 'number' && Number.isFinite(payload.index)
    ? Math.floor(payload.index)
    : null
  if (!project || channelIndex === null) {
    throw new SessionHistoryRequestError('continue reply returned no channel')
  }
  return { project, channelIndex }
}

export function completeSessionContinuation(
  target: SessionContinuationTarget,
  actions: SessionContinuationActions,
): void {
  actions.closePanel()
  actions.switchSession(target.project, target.channelIndex, { openComposerAfterSwitch: true })
}

export function asRecord(value: unknown): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return record
  for (const [key, entry] of Object.entries(value)) record[key] = entry
  return record
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function int(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function mapLinkedChannel(value: unknown): LinkedChannel | null {
  const row = asRecord(value)
  const project = text(row.project)
  if (!project) return null
  return {
    project,
    channelIndex: int(row.channelIndex),
    status: row.status === 'active' ? 'active' : 'closed',
  }
}

export function mapSessionHistoryItem(value: unknown): SessionHistoryItem | null {
  const row = asRecord(value)
  const key = text(row.key)
  if (!key) return null
  return {
    key,
    source: row.source === 'archive' ? 'archive' : 'native',
    archiveId: nullableText(row.archiveId),
    agentSessionId: text(row.agentSessionId),
    project: text(row.project),
    channelIndex: typeof row.channelIndex === 'number' ? int(row.channelIndex) : null,
    windowName: text(row.windowName),
    cwd: text(row.cwd),
    launcher: text(row.launcher, 'bash'),
    profile: text(row.profile),
    title: text(row.title),
    preview: text(row.preview),
    transcriptSize: int(row.transcriptSize),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
    closedAt: nullableText(row.closedAt),
    linkedChannel: mapLinkedChannel(row.linkedChannel),
    resumable: row.resumable !== false,
  }
}

export function mapSessionHistoryItems(value: unknown): readonly SessionHistoryItem[] {
  const items = asRecord(value).items
  if (!Array.isArray(items)) return []
  return items.map(mapSessionHistoryItem).filter((item): item is SessionHistoryItem => item !== null)
}

export function mapArchiveDetail(value: unknown): ArchiveDetail | null {
  const row = asRecord(value)
  const id = text(row.id)
  return id ? { id, capturedText: text(row.capturedText) } : null
}

export function formatHistoryTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function formatHistoryBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
