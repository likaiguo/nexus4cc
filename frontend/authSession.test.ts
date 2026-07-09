import assert from 'node:assert/strict'
import {
  AUTH_TOKEN_STORAGE_KEY,
  fetchWithAuth,
  handleUnauthorizedResponse,
  isAuthWebSocketClose,
  removeSavedAuthToken,
  shouldReconnectTerminalWebSocket,
  validateSavedAuthToken,
} from './src/authSession'

let passed = 0
let failed = 0
const tests: Array<{ name: string; fn: () => void | Promise<void> }> = []

function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn })
}

function response(status: number, ok = status >= 200 && status < 300): Response {
  return { status, ok } as Response
}

test('saved token validation accepts backend-approved token', async () => {
  const result = await validateSavedAuthToken('token-a', async (input, init) => {
    assert.equal(input, '/api/config')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer token-a')
    return response(200)
  })
  assert.equal(result, 'valid')
})

test('saved token validation reports unauthorized for 401', async () => {
  const result = await validateSavedAuthToken('expired', async () => response(401, false))
  assert.equal(result, 'unauthorized')
})

test('saved token validation preserves token on network failure', async () => {
  const result = await validateSavedAuthToken('offline', async () => {
    throw new TypeError('network down')
  })
  assert.equal(result, 'unreachable')
})

test('unauthorized response invokes auth-expiry callback exactly once', () => {
  let calls = 0
  const handled = handleUnauthorizedResponse(response(401, false), () => { calls++ })
  assert.equal(handled, true)
  assert.equal(calls, 1)
})

test('non-401 response does not invoke auth-expiry callback', () => {
  let calls = 0
  const handled = handleUnauthorizedResponse(response(503, false), () => { calls++ })
  assert.equal(handled, false)
  assert.equal(calls, 0)
})

test('auth fetch returns response while reporting unauthorized', async () => {
  let calls = 0
  const res = await fetchWithAuth('/api/projects', undefined, () => { calls++ }, async () => response(401, false))
  assert.equal(res.status, 401)
  assert.equal(calls, 1)
})

test('auth token removal targets only the auth storage key', () => {
  const removed: string[] = []
  removeSavedAuthToken({ removeItem: key => removed.push(key) })
  assert.deepEqual(removed, [AUTH_TOKEN_STORAGE_KEY])
})

test('websocket unauthorized close is not reconnectable', () => {
  assert.equal(isAuthWebSocketClose(4001), true)
  assert.equal(shouldReconnectTerminalWebSocket(4001), false)
  assert.equal(shouldReconnectTerminalWebSocket(1006), true)
})

async function main() {
  for (const entry of tests) {
    try {
      await entry.fn()
      passed++
      console.log(`  PASS: ${entry.name}`)
    } catch (err: unknown) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  FAIL: ${entry.name}\n        ${msg}`)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(msg)
  process.exit(1)
})
