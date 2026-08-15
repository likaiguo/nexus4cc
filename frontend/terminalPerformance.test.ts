import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  readTerminalScreenReaderMode,
  TERMINAL_SCREEN_READER_STORAGE_KEY,
  writeTerminalScreenReaderMode,
} from './src/terminalPerformance.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`  PASS: ${name}`)
  } catch (cause: unknown) {
    failed += 1
    const message = cause instanceof Error ? cause.message : String(cause)
    console.error(`  FAIL: ${name}\n        ${message}`)
  }
}

const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
const settingsSource = fs.readFileSync('frontend/src/GeneralSettings.tsx', 'utf8')
const zh = JSON.parse(fs.readFileSync('frontend/src/locales/zh-CN/translation.json', 'utf8'))
const en = JSON.parse(fs.readFileSync('frontend/src/locales/en/translation.json', 'utf8'))

test('screen reader compatibility is disabled until explicitly persisted', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }

  assert.equal(readTerminalScreenReaderMode(storage), false)
  writeTerminalScreenReaderMode(true, storage)
  assert.equal(values.get(TERMINAL_SCREEN_READER_STORAGE_KEY), 'true')
  assert.equal(readTerminalScreenReaderMode(storage), true)
  writeTerminalScreenReaderMode(false, storage)
  assert.equal(readTerminalScreenReaderMode(storage), false)
})

test('desktop special keys rely on xterm output instead of forcing a full viewport refresh', () => {
  const start = terminalSource.indexOf('function onGlobalKeyDown(')
  const end = terminalSource.indexOf("window.addEventListener('keydown', onGlobalKeyDown", start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const handler = terminalSource.slice(start, end)

  assert.match(handler, /wsRef\.current\?\.send\(seq\)/)
  assert.doesNotMatch(handler, /term\.refresh\(/)
})

test('terminal screen reader mirror is opt in and defaults to the xterm performance mode', () => {
  assert.match(terminalSource, /readTerminalScreenReaderMode/)
  assert.match(terminalSource, /screenReaderMode: readTerminalScreenReaderMode\(\)/)
  assert.doesNotMatch(terminalSource, /screenReaderMode:\s*true/)
})

test('general settings exposes the screen reader compatibility toggle in both locales', () => {
  assert.match(settingsSource, /screenReaderMode: boolean/)
  assert.match(settingsSource, /onScreenReaderModeChange: \(enabled: boolean\) => void/)
  assert.match(settingsSource, /settings\.terminalScreenReader/)
  assert.equal(typeof zh.settings.terminalScreenReader, 'string')
  assert.equal(typeof zh.settings.terminalScreenReaderDesc, 'string')
  assert.equal(typeof en.settings.terminalScreenReader, 'string')
  assert.equal(typeof en.settings.terminalScreenReaderDesc, 'string')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
