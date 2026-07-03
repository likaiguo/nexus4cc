import assert from 'node:assert/strict'
import { buildSessionArchiveInput, detectAgentSessionId, plainTerminalText } from './sessionArchive.js'

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

test('detectAgentSessionId prefers metadata value', () => {
  assert.equal(
    detectAgentSessionId({
      launcher: 'codex',
      capturedText: 'session id: 00000000-0000-4000-8000-000000000000',
      metadata: { agentSessionId: '019f2602-1270-76f2-905a-a393432987fb' },
    }),
    '019f2602-1270-76f2-905a-a393432987fb',
  )
})

test('detectAgentSessionId finds launcher-related UUID in transcript', () => {
  assert.equal(
    detectAgentSessionId({
      launcher: 'claude',
      capturedText: 'Claude session ID: 11111111-1111-4111-8111-111111111111',
    }),
    '11111111-1111-4111-8111-111111111111',
  )
})

test('detectAgentSessionId ignores unrelated UUID for shell sessions', () => {
  assert.equal(
    detectAgentSessionId({
      launcher: 'bash',
      capturedText: 'commit 22222222-2222-4222-8222-222222222222',
    }),
    '',
  )
})

test('plainTerminalText removes ANSI and OSC controls from archived transcript', () => {
  const raw = '\x1b[48;2;33;58;43mgreen\x1b[0m plain\x1b]0;secret-title\x07\r\nnext'
  assert.equal(plainTerminalText(raw), 'green plain\nnext')
})

test('buildSessionArchiveInput includes archive metadata for storage', () => {
  const archive = buildSessionArchiveInput({
    channel: {
      project: 'proj',
      channelIndex: 4,
      name: 'cfuse',
      cwd: '/work/proj',
      launcher: 'cfuse',
      profile: 'sonnet',
      metadata: { source: 'test' },
      createdAt: '2026-07-04T00:00:00.000Z',
    },
    capturedText: 'cfuse session id: 33333333-3333-4333-8333-333333333333',
    status: 'closed',
    closedAt: '2026-07-04T00:20:00.000Z',
  })

  assert.equal(archive.project, 'proj')
  assert.equal(archive.channelIndex, 4)
  assert.equal(archive.windowName, 'cfuse')
  assert.equal(archive.launcher, 'cfuse')
  assert.equal(archive.status, 'closed')
  assert.equal(archive.startedAt, '2026-07-04T00:00:00.000Z')
  assert.equal(archive.closedAt, '2026-07-04T00:20:00.000Z')
  assert.equal(archive.metadata.agentSessionId, '33333333-3333-4333-8333-333333333333')
  assert.equal(archive.metadata.source, 'test')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
