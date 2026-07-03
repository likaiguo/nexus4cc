const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const AGENT_LAUNCHERS = new Set(['codex', 'claude', 'cfuse'])

function normalizeLauncher(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeMetadata(metadata) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
}

export function plainTerminalText(value = '') {
  return String(value || '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '')
}

export function detectAgentSessionId({ launcher = '', capturedText = '', metadata = {} } = {}) {
  const normalized = normalizeLauncher(launcher)
  const meta = normalizeMetadata(metadata)
  const metadataId = String(meta.agentSessionId || meta.sessionId || '').trim()
  if (metadataId) return metadataId
  if (!AGENT_LAUNCHERS.has(normalized)) return ''

  const text = String(capturedText || '')
  const launcherPattern = new RegExp(`(?:${normalized}|agent|conversation|session|resume)[^\\n\\r]{0,80}(${UUID_RE.source})`, 'i')
  const launcherMatch = text.match(launcherPattern)
  if (launcherMatch?.[1]) return launcherMatch[1]

  const genericMatch = text.match(UUID_RE)
  return genericMatch?.[0] || ''
}

export function buildSessionArchiveInput({ channel = {}, capturedText = '', status = 'snapshot', closedAt = null } = {}) {
  const metadata = normalizeMetadata(channel.metadata)
  const launcher = normalizeLauncher(channel.launcher) || 'bash'
  const agentSessionId = detectAgentSessionId({ launcher, capturedText, metadata })
  return {
    project: channel.project || '',
    channelIndex: channel.channelIndex ?? channel.index ?? 0,
    windowName: channel.windowName || channel.name || '',
    cwd: channel.cwd || '',
    launcher,
    profile: channel.profile || '',
    status,
    capturedText,
    startedAt: channel.createdAt || null,
    closedAt,
    metadata: {
      ...metadata,
      ...(agentSessionId ? { agentSessionId } : {}),
    },
  }
}
