import assert from 'node:assert/strict'
import {
  asRecord,
  completeSessionContinuation,
  dialogFocusWrapIndex,
  mapSessionHistoryItems,
  requestSessionContinuation,
} from './src/sessionHistory.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err: unknown) {
    failed++
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL: ${name}\n        ${message}`)
  }
}

await test('history response mapping keeps valid rows and rejects rows without keys', () => {
  const items = mapSessionHistoryItems({
    items: [
      {
        key: 'agent:codex:thread-1',
        source: 'native',
        agentSessionId: 'thread-1',
        launcher: 'codex',
        cwd: '/work/project',
        title: 'Persistent history',
        linkedChannel: { project: 'project', channelIndex: 3, status: 'active' },
      },
      { title: 'missing key' },
    ],
  })

  assert.equal(items.length, 1)
  assert.equal(items[0]?.key, 'agent:codex:thread-1')
  assert.deepEqual(items[0]?.linkedChannel, { project: 'project', channelIndex: 3, status: 'active' })
})

await test('history response mapping treats a non-array payload as empty', () => {
  assert.deepEqual(mapSessionHistoryItems({ items: 'invalid' }), [])
})

await test('history dialog wraps keyboard focus at both modal boundaries', () => {
  assert.equal(dialogFocusWrapIndex({ focusedIndex: 2, focusableCount: 3, backward: false }), 0)
  assert.equal(dialogFocusWrapIndex({ focusedIndex: 0, focusableCount: 3, backward: true }), 2)
  assert.equal(dialogFocusWrapIndex({ focusedIndex: 1, focusableCount: 3, backward: false }), null)
  assert.equal(dialogFocusWrapIndex({ focusedIndex: -1, focusableCount: 3, backward: true }), 2)
})

await test('continue reply calls the history API and returns its resolved channel', async () => {
  let requestedPath = ''
  let requestedInit: RequestInit | undefined
  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requestedPath = String(input)
    requestedInit = init
    return Response.json({ project: 'restored-project', index: 4 })
  }

  const target = await requestSessionContinuation(fakeFetch, {
    token: 'test-token',
    project: 'current-project',
    historyKey: 'agent:codex:session-1',
  })

  assert.equal(requestedPath, '/api/agent-session-history/reply')
  assert.equal(requestedInit?.method, 'POST')
  assert.equal(new Headers(requestedInit?.headers).get('Authorization'), 'Bearer test-token')
  const requestBody = typeof requestedInit?.body === 'string' ? requestedInit.body : ''
  assert.deepEqual(asRecord(JSON.parse(requestBody)), {
    project: 'current-project',
    historyKey: 'agent:codex:session-1',
  })
  assert.deepEqual(target, { project: 'restored-project', channelIndex: 4 })
})

await test('completed continuation closes history then switches channel with Composer enabled', () => {
  const observations: string[] = []

  completeSessionContinuation(
    { project: 'restored-project', channelIndex: 4 },
    {
      closePanel: () => observations.push('closed'),
      switchSession: (project, channelIndex, options) => {
        observations.push(`${project}:${channelIndex}:composer=${options.openComposerAfterSwitch}`)
      },
    },
  )

  assert.deepEqual(observations, ['closed', 'restored-project:4:composer=true'])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
