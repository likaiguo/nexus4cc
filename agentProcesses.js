const AGENT_LAUNCHERS = Object.freeze(['cfuse', 'codex', 'claude'])
const PROCESS_LINE = /^\s*(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.*)$/
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export function parseProcessTable(output) {
  const processes = []
  for (const line of String(output || '').split('\n')) {
    const match = line.match(PROCESS_LINE)
    if (!match) continue
    const startedAtMs = Date.parse(match[3])
    processes.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      startedAt: Number.isFinite(startedAtMs) ? new Date(startedAtMs).toISOString() : null,
      command: match[4],
    })
  }
  return processes
}

function launcherFromCommand(command) {
  const normalized = String(command || '').toLowerCase()
  return AGENT_LAUNCHERS.find(launcher => new RegExp(`(^|[\\s/])${launcher}([\\s]|$)`).test(normalized)) || ''
}

function sessionIdFromCommand(command, launcher) {
  const pattern = launcher === 'codex'
    ? new RegExp(`\\bcodex\\s+resume\\s+['"]?(${UUID})`, 'i')
    : new RegExp(`--(?:resume|session-id)\\s+['"]?(${UUID})`, 'i')
  return String(command || '').match(pattern)?.[1] || ''
}

export function findLiveAgentProcess({ panePid, processes = [] } = {}) {
  const rootPid = Number(panePid)
  if (!Number.isFinite(rootPid) || rootPid <= 0) return null

  const childrenByParent = new Map()
  for (const process of processes) {
    const children = childrenByParent.get(process.ppid) || []
    children.push(process)
    childrenByParent.set(process.ppid, children)
  }

  const pending = [...(childrenByParent.get(rootPid) || [])]
  const seen = new Set([rootPid])
  while (pending.length > 0) {
    const process = pending.shift()
    if (!process || seen.has(process.pid)) continue
    seen.add(process.pid)
    const launcher = launcherFromCommand(process.command)
    if (launcher) {
      return {
        launcher,
        sessionId: sessionIdFromCommand(process.command, launcher),
        startedAt: process.startedAt,
      }
    }
    pending.push(...(childrenByParent.get(process.pid) || []))
  }
  return null
}
