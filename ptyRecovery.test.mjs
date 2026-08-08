import assert from 'node:assert/strict'
import { handlePtyExit } from './ptyLifecycle.js'

const key = 'project:3'
const ptyMap = new Map([[key, { process: 'active' }]])
const closeCalls = []
const entry = {
  clients: new Set([
    { readyState: 1, close: (code, reason) => closeCalls.push({ code, reason }) },
    { readyState: 3, close: () => assert.fail('closed clients must not be closed again') },
  ]),
}
const logs = []

handlePtyExit({
  key,
  entry,
  ptyMap,
  exitCode: 1,
  logger: { log: message => logs.push(message) },
})

assert.equal(ptyMap.has(key), false)
assert.deepEqual(closeCalls, [{ code: 1011, reason: 'terminal process exited' }])
assert.deepEqual(logs, ['PTY project:3 exited with code 1'])

console.log('pty recovery test passed')
