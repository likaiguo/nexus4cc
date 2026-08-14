import { asRecord, SessionHistoryRequestError } from './sessionHistory'
import type { LinkedChannel } from './sessionHistory'

export interface SessionLinkTarget {
  readonly project: string
  readonly channelIndex: number
  readonly name: string
  readonly active: boolean
  readonly cwd: string
}

export interface SessionBindingConflict {
  readonly kind: 'session-linked-elsewhere' | 'target-linked-to-other'
  readonly project: string
  readonly channelIndex: number
  readonly agentSessionId: string
}

interface SessionBindingRequest {
  readonly token: string
  readonly project: string
  readonly historyKey: string
  readonly targetChannelIndex: number
  readonly force: boolean
}

type HistoryFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class SessionBindingConflictError extends SessionHistoryRequestError {
  readonly conflicts: readonly SessionBindingConflict[]

  constructor(conflicts: readonly SessionBindingConflict[]) {
    super('manual link requires confirmation', 409)
    this.name = 'SessionBindingConflictError'
    this.conflicts = conflicts
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function int(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : null
}

function mapLinkedChannel(value: unknown): LinkedChannel | null {
  const row = asRecord(value)
  const project = text(row.project)
  const channelIndex = int(row.channelIndex)
  if (!project || channelIndex === null) return null
  return { project, channelIndex, status: row.status === 'active' ? 'active' : 'closed' }
}

function mapConflict(value: unknown): SessionBindingConflict | null {
  const row = asRecord(value)
  const kind = row.kind === 'session-linked-elsewhere' || row.kind === 'target-linked-to-other'
    ? row.kind
    : null
  const project = text(row.project)
  const channelIndex = int(row.channelIndex)
  if (!kind || !project || channelIndex === null) return null
  return { kind, project, channelIndex, agentSessionId: text(row.agentSessionId) }
}

export function mapSessionLinkTargets(value: unknown): readonly SessionLinkTarget[] {
  const payload = asRecord(value)
  const project = text(payload.project)
  if (!project || !Array.isArray(payload.channels)) return []
  return payload.channels.flatMap(channel => {
    const row = asRecord(channel)
    const channelIndex = int(row.index)
    const name = text(row.name)
    if (channelIndex === null || !name) return []
    return [{ project, channelIndex, name, active: row.active === true, cwd: text(row.cwd) }]
  })
}

export async function requestSessionLinkTargets(
  fetchHistory: HistoryFetch,
  token: string,
  project: string,
): Promise<readonly SessionLinkTarget[]> {
  const response = await fetchHistory(`/api/projects/${encodeURIComponent(project)}/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new SessionHistoryRequestError(`channel list failed: ${response.status}`, response.status)
  return mapSessionLinkTargets(await response.json())
}

export async function requestSessionBinding(
  fetchHistory: HistoryFetch,
  request: SessionBindingRequest,
): Promise<LinkedChannel> {
  const response = await fetchHistory('/api/agent-session-history/link', {
    method: 'POST',
    headers: { Authorization: `Bearer ${request.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: request.project,
      historyKey: request.historyKey,
      targetChannelIndex: request.targetChannelIndex,
      force: request.force,
    }),
  })
  const payload = asRecord(await response.json())
  if (!response.ok) {
    if (response.status === 409 && payload.code === 'agent_session_link_conflict') {
      const conflicts = Array.isArray(payload.conflicts)
        ? payload.conflicts.map(mapConflict).filter((conflict): conflict is SessionBindingConflict => conflict !== null)
        : []
      throw new SessionBindingConflictError(conflicts)
    }
    throw new SessionHistoryRequestError(text(payload.error) || `manual link failed: ${response.status}`, response.status)
  }
  const linkedChannel = mapLinkedChannel(payload.linkedChannel)
  if (!linkedChannel) throw new SessionHistoryRequestError('manual link returned no channel')
  return linkedChannel
}
