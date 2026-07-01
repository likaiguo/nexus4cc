import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err: unknown) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL: ${name}\n        ${msg}`)
  }
}

const appSource = readFileSync(new URL('./src/App.tsx', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('./src/GeneralSettings.tsx', import.meta.url), 'utf8')
const terminalSource = readFileSync(new URL('./src/Terminal.tsx', import.meta.url), 'utf8')

test('login page fetches auth status before default password prefill', () => {
  assert.match(appSource, /fetch\('\/api\/auth\/status'\)/)
  assert.match(appSource, /isAuthStatus\(data\) \|\| !data\.defaultPassword/)
  assert.match(appSource, /setPassword\(data\.password \|\| DEFAULT_LOGIN_PASSWORD\)/)
})

test('login page keeps default password display behind default-password state', () => {
  assert.match(appSource, /usesDefaultPassword &&/)
  assert.match(appSource, /defaultPasswordHint/)
})

test('login page provides password visibility toggle with eye icons', () => {
  assert.match(appSource, /type=\{passwordVisible \? 'text' : 'password'\}/)
  assert.match(appSource, /setPasswordVisible\(value => !value\)/)
  assert.match(appSource, /passwordVisible \? 'eyeOff' : 'eye'/)
})

test('settings page posts password changes to authenticated password endpoint', () => {
  assert.match(settingsSource, /fetch\('\/api\/auth\/password'/)
  assert.match(settingsSource, /Authorization: `Bearer \$\{token\}`/)
  assert.match(settingsSource, /JSON\.stringify\(\{ currentPassword, newPassword \}\)/)
})

test('settings page validates password confirmation before submitting', () => {
  assert.match(settingsSource, /newPassword !== confirmPassword/)
  assert.match(settingsSource, /passwordMismatch/)
})

test('desktop collapsed sidebar settings button opens general settings', () => {
  assert.match(terminalSource, /setShowGeneralSettings\(true\)/)
  assert.match(terminalSource, /title=\{t\('toolbar\.settings'\)\}/)
  assert.doesNotMatch(terminalSource, /title="配置管理"/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
