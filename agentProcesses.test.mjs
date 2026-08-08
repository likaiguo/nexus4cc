import assert from 'node:assert/strict'
import { findLiveAgentProcess, parseProcessTable } from './agentProcesses.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (error) {
    failed++
    console.error(`  FAIL: ${name}\n        ${error instanceof Error ? error.message : String(error)}`)
  }
}

test('one process-table snapshot resolves a descendant Codex session', () => {
  const sessionId = '019fd289-2746-79f3-b8d4-3d67b368aded'
  const processes = parseProcessTable([
    '100 1 Thu Aug  6 01:00:00 2026 zsh -i',
    '110 100 Thu Aug  6 01:00:01 2026 node wrapper.js',
    `120 110 Thu Aug  6 01:00:02 2026 /usr/local/bin/codex resume ${sessionId}`,
  ].join('\n'))

  assert.deepEqual(findLiveAgentProcess({ panePid: 100, processes }), {
    launcher: 'codex',
    sessionId,
    startedAt: '2026-08-05T17:00:02.000Z',
  })
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
