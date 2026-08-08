import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import {
  agentSessionLinkMatchesChannel,
  findBestAgentSession,
  listAgentSessions,
  mergeAgentSessionHistory,
} from './agentSessions.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL: ${name}\n        ${msg}`)
  }
}

function withAgentHome(fn) {
  const homeDir = mkdtempSync(join(tmpdir(), 'nexus-agent-sessions-'))
  try {
    mkdirSync(join(homeDir, '.codex'), { recursive: true })
    const db = new Database(join(homeDir, '.codex', 'state_1.sqlite'))
    db.exec(`
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        cwd TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL DEFAULT '',
        first_user_message TEXT NOT NULL DEFAULT '',
        preview TEXT NOT NULL DEFAULT '',
        model TEXT,
        model_provider TEXT NOT NULL DEFAULT '',
        rollout_path TEXT NOT NULL DEFAULT ''
      )
    `)
    fn({ homeDir, db })
    db.close()
  } finally {
    rmSync(homeDir, { recursive: true, force: true })
  }
}

test('listAgentSessions discovers resumable Codex main threads for the project cwd', () => withAgentHome(({ homeDir, db }) => {
  const insert = db.prepare(`
    INSERT INTO threads (id, cwd, created_at, updated_at, source, archived, title, first_user_message, preview)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insert.run('codex-old', '/work/project', 100, 150, 'cli', 0, 'Old task', 'old prompt', 'old preview')
  insert.run('codex-new', '/work/project', 200, 260, 'cli', 0, 'New task', 'new prompt', 'new preview')
  insert.run('codex-other', '/work/other', 300, 320, 'cli', 0, 'Other', 'other', 'other')
  insert.run('codex-child', '/work/project', 230, 240, '{"subagent":{"thread_spawn":{}}}', 0, '', '', '')
  insert.run('codex-archived', '/work/project', 400, 420, 'cli', 1, 'Archived', 'archived', 'archived')

  const sessions = listAgentSessions({ homeDir, cwd: '/work/project', limit: 20 })
  assert.deepEqual(sessions.map(session => session.id), ['codex-new', 'codex-old'])
  assert.equal(sessions[0].launcher, 'codex')
  assert.equal(sessions[0].title, 'New task')
  assert.equal(sessions[0].createdAt, '1970-01-01T00:03:20.000Z')
}))

test('listAgentSessions groups Claude-compatible prompt history by session id', () => withAgentHome(({ homeDir }) => {
  mkdirSync(join(homeDir, '.claude'), { recursive: true })
  writeFileSync(join(homeDir, '.claude', 'history.jsonl'), [
    JSON.stringify({ display: 'first prompt', timestamp: 1000, project: '/work/project', sessionId: 'claude-one' }),
    JSON.stringify({ display: 'latest prompt', timestamp: 3000, project: '/work/project', sessionId: 'claude-one' }),
    JSON.stringify({ display: 'other project', timestamp: 4000, project: '/work/other', sessionId: 'claude-other' }),
  ].join('\n'), 'utf8')

  const sessions = listAgentSessions({ homeDir, cwd: '/work/project', limit: 20 })
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].id, 'claude-one')
  assert.equal(sessions[0].launcher, 'claude')
  assert.equal(sessions[0].title, 'first prompt')
  assert.equal(sessions[0].preview, 'latest prompt')
  assert.equal(sessions[0].updatedAt, '1970-01-01T00:00:03.000Z')
}))

test('listAgentSessions reports malformed prompt history without hiding valid sessions', () => withAgentHome(({ homeDir }) => {
  mkdirSync(join(homeDir, '.claude'), { recursive: true })
  writeFileSync(join(homeDir, '.claude', 'history.jsonl'), [
    '{malformed json',
    JSON.stringify({ display: 'valid prompt', timestamp: 1000, project: '/work/project', sessionId: 'claude-valid' }),
  ].join('\n'), 'utf8')
  const warnings = []

  const sessions = listAgentSessions({
    homeDir,
    cwd: '/work/project',
    limit: 20,
    logger: { warn: message => warnings.push(message) },
  })

  assert.deepEqual(sessions.map(session => session.id), ['claude-valid'])
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /Skipped 1 malformed claude session history line/)
}))

test('findBestAgentSession uses launcher, cwd, process start, and existing links', () => {
  const sessions = [
    { id: 'wrong-time', launcher: 'codex', cwd: '/work/project', createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'already-linked', launcher: 'codex', cwd: '/work/project', createdAt: '2026-08-01T00:10:01.000Z' },
    { id: 'match', launcher: 'codex', cwd: '/work/project', createdAt: '2026-08-01T00:10:02.000Z' },
    { id: 'wrong-launcher', launcher: 'claude', cwd: '/work/project', createdAt: '2026-08-01T00:10:02.000Z' },
  ]
  const match = findBestAgentSession({
    channel: { launcher: 'codex', cwd: '/work/project', createdAt: '2026-07-31T00:00:00.000Z' },
    sessions,
    processStartedAt: '2026-08-01T00:10:00.000Z',
    linkedSessionKeys: new Set(['codex:already-linked']),
  })
  assert.equal(match?.id, 'match')
})

test('mergeAgentSessionHistory joins archives and links without duplicating native history', () => {
  const items = mergeAgentSessionHistory({
    nativeSessions: [{
      id: 'native-id', launcher: 'codex', cwd: '/work/project', title: 'Native title', preview: 'Last prompt',
      createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T01:00:00.000Z',
    }],
    archives: [{
      id: 'archive-id', project: 'proj', channelIndex: 2, windowName: 'codex', cwd: '/work/project',
      launcher: 'codex', profile: '', status: 'closed', transcriptSize: 42,
      createdAt: '2026-08-01T00:30:00.000Z', closedAt: '2026-08-01T00:40:00.000Z',
      metadata: { agentSessionId: 'native-id' },
    }],
    links: [{ launcher: 'codex', agentSessionId: 'native-id', project: 'proj', channelIndex: 7, cwd: '/work/project' }],
    channels: [{
      project: 'proj', channelIndex: 7, launcher: 'codex', status: 'active',
      metadata: { agentSessionId: 'native-id' },
    }],
  })

  assert.equal(items.length, 1)
  assert.equal(items[0].key, 'agent:codex:native-id')
  assert.equal(items[0].archiveId, 'archive-id')
  assert.equal(items[0].title, 'Native title')
  assert.equal(items[0].linkedChannel.channelIndex, 7)
  assert.equal(items[0].linkedChannel.status, 'active')
})

test('agent session links only reuse active channels with matching native session metadata', () => {
  const link = {
    launcher: 'codex',
    agentSessionId: 'session-one',
    project: 'proj',
    channelIndex: 2,
  }

  assert.equal(agentSessionLinkMatchesChannel(link, {
    launcher: 'codex',
    status: 'active',
    metadata: { agentSessionId: 'session-one' },
  }), true)
  assert.equal(agentSessionLinkMatchesChannel(link, {
    launcher: 'codex',
    status: 'active',
    metadata: { agentSessionId: 'different-session' },
  }), false)
  assert.equal(agentSessionLinkMatchesChannel(link, {
    launcher: 'codex',
    status: 'closed',
    metadata: { agentSessionId: 'session-one' },
  }), false)
})

test('mergeAgentSessionHistory selects the newest archive and removes older duplicates for a native session', () => {
  const items = mergeAgentSessionHistory({
    nativeSessions: [{
      id: 'native-id', launcher: 'codex', cwd: '/work/project', title: 'Native title', preview: 'Last prompt',
      createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T03:00:00.000Z',
    }],
    archives: [
      {
        id: 'new-archive', project: 'proj', channelIndex: 2, windowName: 'new', cwd: '/work/project',
        launcher: 'codex', profile: '', status: 'closed', transcriptSize: 84,
        createdAt: '2026-08-01T02:00:00.000Z', closedAt: '2026-08-01T02:30:00.000Z',
        metadata: { agentSessionId: 'native-id' },
      },
      {
        id: 'old-archive', project: 'proj', channelIndex: 2, windowName: 'old', cwd: '/work/project',
        launcher: 'codex', profile: '', status: 'closed', transcriptSize: 42,
        createdAt: '2026-08-01T01:00:00.000Z', closedAt: '2026-08-01T01:30:00.000Z',
        metadata: { agentSessionId: 'native-id' },
      },
    ],
  })

  assert.equal(items.length, 1)
  assert.equal(items[0].archiveId, 'new-archive')
  assert.equal(items[0].transcriptSize, 84)
})

test('mergeAgentSessionHistory treats a recycled active channel as closed for the old session link', () => {
  const items = mergeAgentSessionHistory({
    nativeSessions: [{
      id: 'old-session', launcher: 'codex', cwd: '/work/project', title: 'Old session', preview: '',
      createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T01:00:00.000Z',
    }],
    links: [{ launcher: 'codex', agentSessionId: 'old-session', project: 'proj', channelIndex: 2 }],
    channels: [{
      project: 'proj', channelIndex: 2, launcher: 'codex', status: 'active',
      metadata: { agentSessionId: 'new-session' },
    }],
  })

  assert.deepEqual(items[0].linkedChannel, { project: 'proj', channelIndex: 2, status: 'closed' })
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
