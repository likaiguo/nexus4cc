import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bindAgentSessionToChannel, suppressesAgentSessionLink } from './agentSessionBinding.js'
import { NexusStore } from './storage.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err) {
    failed++
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL: ${name}\n        ${message}`)
  }
}

function withStore(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-session-binding-'))
  try {
    const store = new NexusStore({
      dataDir: dir,
      toolbarConfigFile: join(dir, 'toolbar-config.json'),
      tasksFile: join(dir, 'tasks.json'),
      logger: { warn() {}, error() {} },
    })
    fn(store)
    store.db.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function seedChannel(store, channelIndex, agentSessionId = '') {
  return store.upsertTmuxChannel({
    project: 'proj',
    channelIndex,
    name: `channel-${channelIndex}`,
    cwd: '/work/proj',
    launcher: agentSessionId ? 'codex' : 'bash',
    status: 'active',
    metadata: agentSessionId ? { agentSessionId } : {},
  })
}

const history = {
  launcher: 'codex',
  agentSessionId: 'session-selected',
  profile: '',
  cwd: '/work/proj',
}

test('manual binding requires confirmation before moving an active session link', () => withStore(store => {
  seedChannel(store, 1, history.agentSessionId)
  const target = seedChannel(store, 2)
  store.upsertAgentSessionLink({
    launcher: history.launcher,
    agentSessionId: history.agentSessionId,
    project: 'proj',
    channelIndex: 1,
    cwd: history.cwd,
    source: 'existing-link',
  })

  const result = bindAgentSessionToChannel({ store, history, targetChannel: target })

  assert.equal(result.kind, 'conflict')
  assert.deepEqual(result.conflicts.map(conflict => conflict.kind), ['session-linked-elsewhere'])
  assert.equal(store.getAgentSessionLink('codex', history.agentSessionId).channelIndex, 1)
}))

test('confirmed manual binding moves the link and clears the previous channel resume id', () => withStore(store => {
  seedChannel(store, 1, history.agentSessionId)
  const target = seedChannel(store, 2)
  store.upsertAgentSessionLink({
    launcher: history.launcher,
    agentSessionId: history.agentSessionId,
    project: 'proj',
    channelIndex: 1,
    cwd: history.cwd,
    source: 'existing-link',
  })

  const result = bindAgentSessionToChannel({ store, history, targetChannel: target, force: true })

  assert.equal(result.kind, 'linked')
  assert.deepEqual(result.linkedChannel, { project: 'proj', channelIndex: 2, status: 'active' })
  assert.equal(store.getAgentSessionLink('codex', history.agentSessionId).channelIndex, 2)
  assert.equal(store.getTmuxChannel('proj', 1).metadata.agentSessionId, undefined)
  assert.equal(store.getTmuxChannel('proj', 1).metadata.manualUnlinkedAgentSessionId, history.agentSessionId)
  assert.equal(store.getTmuxChannel('proj', 2).metadata.agentSessionId, history.agentSessionId)
  assert.equal(store.getTmuxChannel('proj', 2).launcher, 'codex')
}))

test('manual binding requires confirmation before replacing a target channel session', () => withStore(store => {
  const target = seedChannel(store, 2, 'session-already-targeted')

  const result = bindAgentSessionToChannel({ store, history, targetChannel: target })

  assert.equal(result.kind, 'conflict')
  assert.deepEqual(result.conflicts.map(conflict => conflict.kind), ['target-linked-to-other'])
  assert.equal(store.getTmuxChannel('proj', 2).metadata.agentSessionId, 'session-already-targeted')
}))

test('manual binding is idempotent when the selected session already owns the target', () => withStore(store => {
  const target = seedChannel(store, 2, history.agentSessionId)
  store.upsertAgentSessionLink({
    launcher: history.launcher,
    agentSessionId: history.agentSessionId,
    project: 'proj',
    channelIndex: 2,
    cwd: history.cwd,
    source: 'existing-link',
  })

  const result = bindAgentSessionToChannel({ store, history, targetChannel: target })

  assert.equal(result.kind, 'linked')
  assert.equal(result.replacedAgentSessionId, '')
  assert.equal(store.getAgentSessionLink('codex', history.agentSessionId).source, 'manual-history-link')
}))

test('manual unlink suppression blocks only the migrated session id', () => {
  const channel = { metadata: { manualUnlinkedAgentSessionId: 'session-selected' } }
  assert.equal(suppressesAgentSessionLink(channel, 'session-selected'), true)
  assert.equal(suppressesAgentSessionLink(channel, 'session-next'), false)
})

test('manual binding survives store reopen for machine restart recovery', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-session-binding-reopen-'))
  const options = {
    dataDir: dir,
    toolbarConfigFile: join(dir, 'toolbar-config.json'),
    tasksFile: join(dir, 'tasks.json'),
    logger: { warn() {}, error() {} },
  }
  try {
    const first = new NexusStore(options)
    const target = seedChannel(first, 4)
    const result = bindAgentSessionToChannel({ store: first, history, targetChannel: target })
    assert.equal(result.kind, 'linked')
    first.db.close()

    const reopened = new NexusStore(options)
    assert.equal(reopened.getAgentSessionLink('codex', history.agentSessionId).channelIndex, 4)
    assert.equal(reopened.getTmuxChannel('proj', 4).metadata.agentSessionId, history.agentSessionId)
    assert.equal(reopened.getTmuxChannel('proj', 4).launcher, 'codex')
    reopened.db.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
