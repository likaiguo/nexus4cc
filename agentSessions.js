import Database from 'better-sqlite3'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const MAX_HISTORY_LIMIT = 500
const PROCESS_MATCH_WINDOW_MS = 5 * 60 * 1000

function cappedLimit(value, fallback = 100) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), MAX_HISTORY_LIMIT)
}

function isoFromEpoch(value, multiplier = 1) {
  const timestamp = Number(value) * multiplier
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  return new Date(timestamp).toISOString()
}

function sessionTime(value) {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function sessionKey(launcher, sessionId) {
  return `${String(launcher || '').toLowerCase()}:${String(sessionId || '')}`
}

function optionalColumn(columns, name, fallback = "''") {
  return columns.has(name) ? name : `${fallback} AS ${name}`
}

function listCodexSessions({ homeDir, cwd, limit, env, logger }) {
  const codexHome = env.CODEX_HOME || join(homeDir, '.codex')
  if (!existsSync(codexHome)) return []
  const dbFiles = readdirSync(codexHome)
    .filter(name => /^state_.*\.sqlite$/.test(name))
    .map(name => join(codexHome, name))
  const sessions = []

  for (const dbFile of dbFiles) {
    let db = null
    try {
      db = new Database(dbFile, { readonly: true, fileMustExist: true })
      const columns = new Set(db.prepare('PRAGMA table_info(threads)').all().map(row => row.name))
      if (!columns.has('id') || !columns.has('cwd') || !columns.has('created_at') || !columns.has('updated_at')) continue
      const filters = ['cwd = ?']
      if (columns.has('archived')) filters.push('archived = 0')
      if (columns.has('source')) filters.push("source = 'cli'")
      const query = `
        SELECT id, cwd, created_at, updated_at,
          ${optionalColumn(columns, 'title')},
          ${optionalColumn(columns, 'first_user_message')},
          ${optionalColumn(columns, 'preview')},
          ${optionalColumn(columns, 'model')},
          ${optionalColumn(columns, 'model_provider')}
        FROM threads
        WHERE ${filters.join(' AND ')}
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
      `
      for (const row of db.prepare(query).all(cwd, limit)) {
        sessions.push({
          id: String(row.id),
          launcher: 'codex',
          cwd: String(row.cwd),
          title: String(row.title || row.first_user_message || 'Codex session'),
          preview: String(row.preview || row.first_user_message || row.title || ''),
          createdAt: isoFromEpoch(row.created_at, 1000),
          updatedAt: isoFromEpoch(row.updated_at, 1000),
          model: String(row.model || ''),
          provider: String(row.model_provider || ''),
        })
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error
      logger.warn(`[Nexus] Codex session history read failed for ${dbFile}: ${error.message}`)
    } finally {
      db?.close()
    }
  }
  return sessions
}

function listPromptHistory({ file, launcher, cwd, logger }) {
  if (!existsSync(file)) return []
  const grouped = new Map()
  let malformedLines = 0
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      if (entry?.project !== cwd || !entry?.sessionId) continue
      const timestamp = Number(entry.timestamp)
      if (!Number.isFinite(timestamp) || timestamp <= 0) continue
      const id = String(entry.sessionId)
      const display = String(entry.display || '').trim()
      const existing = grouped.get(id)
      if (!existing) {
        grouped.set(id, { id, launcher, cwd, title: display || `${launcher} session`, preview: display, createdAtMs: timestamp, updatedAtMs: timestamp })
      } else {
        existing.createdAtMs = Math.min(existing.createdAtMs, timestamp)
        if (timestamp >= existing.updatedAtMs) {
          existing.updatedAtMs = timestamp
          existing.preview = display || existing.preview
        }
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      malformedLines += 1
    }
  }
  if (malformedLines > 0) {
    logger.warn(`[Nexus] Skipped ${malformedLines} malformed ${launcher} session history line(s) in ${file}`)
  }
  return [...grouped.values()].map(entry => ({
    id: entry.id,
    launcher: entry.launcher,
    cwd: entry.cwd,
    title: entry.title,
    preview: entry.preview,
    createdAt: isoFromEpoch(entry.createdAtMs),
    updatedAt: isoFromEpoch(entry.updatedAtMs),
    model: '',
    provider: '',
  }))
}

export function listAgentSessions({ homeDir = homedir(), cwd = '', limit = 100, env = process.env, logger = console } = {}) {
  const normalizedCwd = String(cwd || '').trim()
  if (!normalizedCwd) return []
  const max = cappedLimit(limit)
  const sessions = [
    ...listCodexSessions({ homeDir, cwd: normalizedCwd, limit: max, env, logger }),
    ...listPromptHistory({ file: join(homeDir, '.claude', 'history.jsonl'), launcher: 'claude', cwd: normalizedCwd, logger }),
    ...listPromptHistory({ file: join(homeDir, '.codefuse', 'engine', 'cc', 'history.jsonl'), launcher: 'cfuse', cwd: normalizedCwd, logger }),
  ]
  const deduped = new Map()
  for (const session of sessions) {
    const key = sessionKey(session.launcher, session.id)
    const existing = deduped.get(key)
    if (!existing || sessionTime(session.updatedAt) > sessionTime(existing.updatedAt)) deduped.set(key, session)
  }
  return [...deduped.values()]
    .sort((left, right) => sessionTime(right.updatedAt) - sessionTime(left.updatedAt))
    .slice(0, max)
}

export function findBestAgentSession({ channel, sessions = [], processStartedAt = null, linkedSessionKeys = new Set() } = {}) {
  const launcher = String(channel?.launcher || '').toLowerCase()
  const cwd = String(channel?.cwd || '')
  const candidates = sessions.filter(session => (
    session.launcher === launcher
    && session.cwd === cwd
    && !linkedSessionKeys.has(sessionKey(session.launcher, session.id))
  ))
  const processStartedMs = sessionTime(processStartedAt)
  if (processStartedMs > 0) {
    return candidates
      .map(session => ({ session, distance: Math.abs(sessionTime(session.createdAt) - processStartedMs) }))
      .filter(candidate => candidate.distance <= PROCESS_MATCH_WINDOW_MS)
      .sort((left, right) => left.distance - right.distance)[0]?.session ?? null
  }
  const channelStartedMs = sessionTime(channel?.createdAt)
  if (channelStartedMs <= 0) return null
  const eligible = candidates.filter(session => sessionTime(session.createdAt) >= channelStartedMs - 60_000)
  return eligible.length === 1 ? eligible[0] : null
}

export function agentSessionLinkMatchesChannel(link, channel) {
  if (!link || !channel || channel.status !== 'active') return false
  const linkedLauncher = String(link.launcher || '').toLowerCase()
  const channelLauncher = String(channel.launcher || '').toLowerCase()
  const linkedSessionId = String(link.agentSessionId || '')
  const channelSessionId = String(channel?.metadata?.agentSessionId || '')
  return Boolean(linkedSessionId)
    && linkedLauncher === channelLauncher
    && linkedSessionId === channelSessionId
}

function linkedChannel(link, channelsByKey) {
  if (!link) return null
  const channel = channelsByKey.get(`${link.project}:${link.channelIndex}`)
  const status = agentSessionLinkMatchesChannel(link, channel) ? 'active' : 'closed'
  return { project: link.project, channelIndex: link.channelIndex, status }
}

export function mergeAgentSessionHistory({ nativeSessions = [], archives = [], links = [], channels = [] } = {}) {
  const linksBySession = new Map(links.map(link => [sessionKey(link.launcher, link.agentSessionId), link]))
  const channelsByKey = new Map(channels.map(channel => [`${channel.project}:${channel.channelIndex}`, channel]))
  const archivesBySession = new Map()
  for (const archive of archives) {
    const agentSessionId = String(archive?.metadata?.agentSessionId || '')
    if (!agentSessionId) continue
    const key = sessionKey(archive.launcher, agentSessionId)
    const existing = archivesBySession.get(key)
    const archiveTime = sessionTime(archive.closedAt || archive.createdAt)
    const existingTime = sessionTime(existing?.closedAt || existing?.createdAt)
    if (!existing || archiveTime > existingTime) archivesBySession.set(key, archive)
  }
  const mergedSessionKeys = new Set()
  const items = nativeSessions.map(session => {
    const key = sessionKey(session.launcher, session.id)
    const archive = archivesBySession.get(key) || null
    if (archive) mergedSessionKeys.add(key)
    return {
      key: `agent:${session.launcher}:${session.id}`,
      source: 'native',
      archiveId: archive?.id || null,
      agentSessionId: session.id,
      project: archive?.project || linksBySession.get(key)?.project || '',
      channelIndex: archive?.channelIndex ?? linksBySession.get(key)?.channelIndex ?? null,
      windowName: archive?.windowName || '',
      cwd: session.cwd,
      launcher: session.launcher,
      profile: archive?.profile || '',
      title: session.title,
      preview: session.preview,
      transcriptSize: archive?.transcriptSize || 0,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      closedAt: archive?.closedAt || null,
      linkedChannel: linkedChannel(linksBySession.get(key), channelsByKey),
      resumable: true,
    }
  })
  for (const archive of archives) {
    const agentSessionId = String(archive?.metadata?.agentSessionId || '')
    if (agentSessionId && mergedSessionKeys.has(sessionKey(archive.launcher, agentSessionId))) continue
    items.push({
      key: `archive:${archive.id}`,
      source: 'archive',
      archiveId: archive.id,
      agentSessionId,
      project: archive.project,
      channelIndex: archive.channelIndex,
      windowName: archive.windowName,
      cwd: archive.cwd,
      launcher: archive.launcher,
      profile: archive.profile,
      title: archive.windowName || `${archive.launcher} archive`,
      preview: '',
      transcriptSize: archive.transcriptSize,
      createdAt: archive.createdAt,
      updatedAt: archive.closedAt || archive.createdAt,
      closedAt: archive.closedAt,
      linkedChannel: null,
      resumable: true,
    })
  }
  return items.sort((left, right) => sessionTime(right.updatedAt) - sessionTime(left.updatedAt))
}
