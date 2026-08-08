import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { inferLauncher } from './launcher.js'
import { NexusStore } from './storage.js'
import { missingTmuxChannels, missingTmuxProjects, reconcileTmuxProjectSnapshot } from './tmuxReconciliation.js'

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

function withStore(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-registry-'))
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

test('tmux registry upserts project and channel metadata', () => withStore(store => {
  store.upsertTmuxProject({ name: 'proj', cwd: '/work/proj', launcher: 'codex', lastChannelIndex: 2 })
  store.upsertTmuxChannel({ project: 'proj', channelIndex: 2, name: 'codex', cwd: '/work/proj', launcher: 'codex' })

  const project = store.getTmuxProject('proj')
  assert.equal(project.name, 'proj')
  assert.equal(project.cwd, '/work/proj')
  assert.equal(project.launcher, 'codex')
  assert.equal(project.lastChannelIndex, 2)
  assert.equal(project.status, 'active')
  assert.equal(store.getTmuxChannel('proj', 2).launcher, 'codex')
}))

test('tmux snapshot reconciliation is bounded to supplied channels and preserves native session metadata', () => withStore(store => {
  store.upsertTmuxChannel({
    project: 'proj', channelIndex: 0, name: 'codex', cwd: '/work', launcher: 'codex', profile: '',
    metadata: { source: 'nexus-create-channel', agentSessionId: 'codex-session' },
  })
  const result = reconcileTmuxProjectSnapshot({
    store,
    project: { name: 'proj', path: '/work/next' },
    channels: [{ index: 0, name: 'renamed', cwd: '/work/next', paneCommand: 'zsh', active: true }],
    workspaceRoot: '/workspace',
    inferLauncher,
  })

  assert.deepEqual(result, { projectCount: 1, channelCount: 1 })
  const row = store.getTmuxChannel('proj', 0)
  assert.equal(row.launcher, 'codex')
  assert.equal(row.cwd, '/work/next')
  assert.equal(row.name, 'renamed')
  assert.equal(row.metadata.agentSessionId, 'codex-session')
  assert.equal(row.metadata.source, 'tmux-reconcile')
  assert.equal(store.getTmuxProject('proj').lastChannelIndex, 0)
}))

test('tmux registry does not inherit a closed channel link when an index is reused', () => withStore(store => {
  store.upsertTmuxChannel({
    project: 'proj', channelIndex: 0, name: 'old', cwd: '/work/old', launcher: 'codex',
    metadata: { agentSessionId: 'old-session' },
  })
  store.closeTmuxChannel('proj', 0)
  store.upsertTmuxChannel(
    {
      project: 'proj', channelIndex: 0, name: 'new', cwd: '/work/new', launcher: 'bash', status: 'active',
      metadata: { source: 'tmux-reconcile', paneCommand: 'zsh' },
    },
    { preserveExistingLauncher: true },
  )

  const row = store.getTmuxChannel('proj', 0)
  assert.equal(row.launcher, 'bash')
  assert.equal(row.metadata.agentSessionId, undefined)
  assert.equal(row.metadata.source, 'tmux-reconcile')
}))

test('agent session links persist and follow project rename', () => withStore(store => {
  store.upsertTmuxProject({ name: 'old', cwd: '/work/project', launcher: 'codex', lastChannelIndex: 3 })
  store.upsertTmuxChannel({ project: 'old', channelIndex: 3, name: 'codex', cwd: '/work/project', launcher: 'codex' })
  const link = store.upsertAgentSessionLink({
    launcher: 'codex', agentSessionId: 'native-session', project: 'old', channelIndex: 3,
    cwd: '/work/project', source: 'process-start-match',
  })
  assert.equal(link.agentSessionId, 'native-session')
  assert.equal(store.getAgentSessionLink('codex', 'native-session').project, 'old')

  store.renameTmuxProject('old', 'new')
  assert.equal(store.getAgentSessionLink('codex', 'native-session').project, 'new')
  assert.equal(store.listAgentSessionLinks({ project: 'new' }).length, 1)
}))

test('session archives follow project rename so history remains visible', () => withStore(store => {
  store.upsertTmuxProject({ name: 'old', cwd: '/work/project', launcher: 'codex', lastChannelIndex: 3 })
  store.createSessionArchive({
    project: 'old', channelIndex: 3, windowName: 'codex', cwd: '/work/project', launcher: 'codex',
    status: 'closed', capturedText: 'persisted transcript', metadata: { agentSessionId: 'native-session' },
  })

  store.renameTmuxProject('old', 'new')

  assert.equal(store.listSessionArchives({ project: 'old' }).length, 0)
  assert.equal(store.listSessionArchives({ project: 'new' }).length, 1)
  assert.equal(store.listSessionArchives({ project: 'new' })[0].project, 'new')
}))

test('tmux registry close and rename operations keep restore state aligned', () => withStore(store => {
  store.upsertTmuxProject({ name: 'old', cwd: '/work', launcher: 'claude', lastChannelIndex: 1 })
  store.upsertTmuxChannel({ project: 'old', channelIndex: 1, name: 'one', cwd: '/work', launcher: 'claude' })
  store.renameTmuxProject('old', 'new')
  assert.equal(store.getTmuxProject('old'), null)
  assert.equal(store.getTmuxProject('new').name, 'new')
  assert.equal(store.getTmuxChannel('new', 1).project, 'new')

  store.renameTmuxChannel('new', 1, 'renamed')
  assert.equal(store.getTmuxChannel('new', 1).name, 'renamed')

  store.closeTmuxChannel('new', 1)
  assert.equal(store.listTmuxChannels('new').length, 0)
  assert.equal(store.listTmuxChannels('new', { status: 'all' })[0].status, 'closed')
}))

test('tmux registry schema is idempotent across store reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-registry-reopen-'))
  try {
    const opts = {
      dataDir: dir,
      toolbarConfigFile: join(dir, 'toolbar-config.json'),
      tasksFile: join(dir, 'tasks.json'),
      logger: { warn() {}, error() {} },
    }
    const first = new NexusStore(opts)
    first.upsertTmuxProject({ name: 'proj', cwd: '/work', launcher: 'bash' })
    first.db.close()
    const second = new NexusStore(opts)
    assert.equal(second.getTmuxProject('proj').cwd, '/work')
    second.db.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('session archives persist metadata and transcript details', () => withStore(store => {
  const archive = store.createSessionArchive({
    project: 'proj',
    channelIndex: 2,
    windowName: 'codex',
    cwd: '/work/proj',
    launcher: 'codex',
    profile: '',
    status: 'closed',
    capturedText: 'user prompt\nassistant answer',
    startedAt: '2026-07-04T00:00:00.000Z',
    closedAt: '2026-07-04T00:10:00.000Z',
    metadata: { agentSessionId: '019f2602-1270-76f2-905a-a393432987fb' },
  })

  assert.match(archive.id, /^archive_/)
  assert.equal(archive.project, 'proj')
  assert.equal(archive.channelIndex, 2)
  assert.equal(archive.windowName, 'codex')
  assert.equal(archive.cwd, '/work/proj')
  assert.equal(archive.launcher, 'codex')
  assert.equal(archive.status, 'closed')
  assert.equal(archive.transcriptSize, 'user prompt\nassistant answer'.length)
  assert.equal(archive.metadata.agentSessionId, '019f2602-1270-76f2-905a-a393432987fb')

  const archives = store.listSessionArchives({ project: 'proj' })
  assert.equal(archives.length, 1)
  assert.equal(archives[0].id, archive.id)
  assert.equal(archives[0].capturedText, undefined)
  assert.equal(archives[0].transcriptSize, 'user prompt\nassistant answer'.length)

  const detail = store.getSessionArchive(archive.id)
  assert.equal(detail.capturedText, 'user prompt\nassistant answer')
  assert.equal(detail.closedAt, '2026-07-04T00:10:00.000Z')
}))

test('restart reconciliation restores only projects and channels missing from one live snapshot', () => {
  const projects = [{ name: 'live' }, { name: 'missing' }]
  const channels = [
    { project: 'live', channelIndex: 0 },
    { project: 'missing', channelIndex: 1 },
  ]

  assert.deepEqual(missingTmuxProjects(projects, new Set(['live'])), [{ name: 'missing' }])
  assert.deepEqual(missingTmuxChannels(channels, new Set(['live:0'])), [{ project: 'missing', channelIndex: 1 }])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
