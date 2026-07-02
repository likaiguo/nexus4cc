import assert from 'node:assert/strict'
import { buildLauncherCommand, collectProxyVars, inferLauncher } from './launcher.js'

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

test('buildLauncherCommand builds Claude profile launcher', () => {
  const result = buildLauncherCommand({
    launcher: 'claude',
    profile: 'anthropic',
    cwd: '/work/project',
    runScript: '/app/nexus-run-claude.sh',
    interactiveShell: 'zsh',
  })
  assert.equal(result.effectiveLauncher, 'claude')
  assert.match(result.command, /bash '\/app\/nexus-run-claude\.sh' 'anthropic' '\/work\/project'/)
})

test('buildLauncherCommand builds Codex launcher with shell fallback', () => {
  const result = buildLauncherCommand({ launcher: 'codex', interactiveShell: 'zsh' })
  assert.equal(result.effectiveLauncher, 'codex')
  assert.match(result.command, /^codex \|\| /)
  assert.match(result.command, /exec zsh -i/)
})

test('buildLauncherCommand builds Bash launcher', () => {
  const result = buildLauncherCommand({ launcher: 'bash', proxyVars: { HTTP_PROXY: 'http://127.0.0.1:1' }, interactiveShell: 'bash' })
  assert.equal(result.effectiveLauncher, 'bash')
  assert.match(result.command, /export HTTP_PROXY='http:\/\/127\.0\.0\.1:1'; exec bash -i/)
})

test('buildLauncherCommand falls back for unknown launcher but preserves launcher value', () => {
  const result = buildLauncherCommand({ launcher: 'future-agent', interactiveShell: 'bash' })
  assert.equal(result.launcher, 'future-agent')
  assert.equal(result.effectiveLauncher, 'bash')
  assert.equal(result.fallback, true)
})

test('collectProxyVars lets CLAUDE_PROXY override proxy vars', () => {
  assert.deepEqual(
    collectProxyVars({ HTTP_PROXY: 'old', HTTPS_PROXY: 'old2' }, 'http://proxy'),
    { HTTP_PROXY: 'http://proxy', HTTPS_PROXY: 'http://proxy', ALL_PROXY: 'http://proxy', NEXUS_PROXY: 'http://proxy' },
  )
})

test('inferLauncher detects codex, claude, and shell commands', () => {
  assert.equal(inferLauncher({ paneCommand: 'codex' }), 'codex')
  assert.equal(inferLauncher({ windowName: 'claude-main' }), 'claude')
  assert.equal(inferLauncher({ paneCommand: 'zsh' }), 'bash')
  assert.equal(inferLauncher({ paneCommand: 'node' }), 'bash')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
