import assert from 'node:assert/strict'
import {
  SessionBindingConflictError,
  mapSessionLinkTargets,
  requestSessionBinding,
} from './src/sessionHistoryBinding.ts'

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

await test('channel response mapping keeps valid project targets', () => {
  assert.deepEqual(mapSessionLinkTargets({
    project: 'proj',
    channels: [
      { index: 2, name: 'codex', active: true, cwd: '/work/proj' },
      { index: 'bad', name: 'invalid' },
    ],
  }), [{ project: 'proj', channelIndex: 2, name: 'codex', active: true, cwd: '/work/proj' }])
})

await test('manual binding posts the selected history and channel', async () => {
  let requestBody = ''
  const fakeFetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requestBody = typeof init?.body === 'string' ? init.body : ''
    return Response.json({ linkedChannel: { project: 'proj', channelIndex: 2, status: 'active' } })
  }

  const linked = await requestSessionBinding(fakeFetch, {
    token: 'token',
    project: 'proj',
    historyKey: 'agent:codex:session-selected',
    targetChannelIndex: 2,
    force: false,
  })

  assert.deepEqual(JSON.parse(requestBody), {
    project: 'proj',
    historyKey: 'agent:codex:session-selected',
    targetChannelIndex: 2,
    force: false,
  })
  assert.deepEqual(linked, { project: 'proj', channelIndex: 2, status: 'active' })
})

await test('manual binding exposes typed conflicts for explicit confirmation', async () => {
  const fakeFetch = async (): Promise<Response> => Response.json({
    code: 'agent_session_link_conflict',
    conflicts: [{ kind: 'target-linked-to-other', project: 'proj', channelIndex: 2 }],
  }, { status: 409 })

  await assert.rejects(
    () => requestSessionBinding(fakeFetch, {
      token: 'token',
      project: 'proj',
      historyKey: 'agent:codex:session-selected',
      targetChannelIndex: 2,
      force: false,
    }),
    (error: unknown) => error instanceof SessionBindingConflictError
      && error.conflicts[0]?.kind === 'target-linked-to-other',
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
