import assert from 'node:assert/strict'
import { resolveTerminalEnvironment } from './terminalEnvironment.js'

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

test('terminal environment supplies a usable terminfo path for managed services', () => {
  const resolved = resolveTerminalEnvironment(
    { HOME: '/Users/tester' },
    { pathExists: path => path === '/usr/share/terminfo' },
  )

  assert.equal(resolved.TERM, 'xterm-256color')
  assert.equal(resolved.LANG, 'C.UTF-8')
  assert.equal(resolved.TERMINFO_DIRS, '/usr/share/terminfo')
})

test('terminal environment preserves explicit terminal configuration', () => {
  const resolved = resolveTerminalEnvironment({
    TERM: 'screen-256color',
    LANG: 'zh_CN.UTF-8',
    TERMINFO_DIRS: '/custom/terminfo',
  })

  assert.deepEqual(resolved, {
    TERM: 'screen-256color',
    LANG: 'zh_CN.UTF-8',
    TERMINFO_DIRS: '/custom/terminfo',
  })
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
