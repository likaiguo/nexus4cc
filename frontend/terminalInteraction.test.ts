import assert from 'node:assert/strict'
import {
  clampCursor,
  findLastTextRange,
  shouldCloseScrollbackOnScroll,
  shouldCaptureGlobalTerminalKey,
  shouldStartReorderDrag,
} from './src/terminalInteraction.ts'

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

test('scrollback does not close during the open grace period', () => {
  assert.equal(shouldCloseScrollbackOnScroll({
    scrollTop: 950,
    previousScrollTop: 900,
    clientHeight: 100,
    scrollHeight: 1000,
    hasSelection: false,
    openedAtMs: 1000,
    nowMs: 1100,
  }), false)
})

test('scrollback does not close while scrolling toward older output', () => {
  assert.equal(shouldCloseScrollbackOnScroll({
    scrollTop: 500,
    previousScrollTop: 600,
    clientHeight: 300,
    scrollHeight: 1200,
    hasSelection: false,
    openedAtMs: 1000,
    nowMs: 2000,
  }), false)
})

test('scrollback does not close while history text is selected', () => {
  assert.equal(shouldCloseScrollbackOnScroll({
    scrollTop: 900,
    previousScrollTop: 850,
    clientHeight: 300,
    scrollHeight: 1200,
    hasSelection: true,
    openedAtMs: 1000,
    nowMs: 2000,
  }), false)
})

test('scrollback closes only after an intentional downward scroll reaches the live-output end', () => {
  assert.equal(shouldCloseScrollbackOnScroll({
    scrollTop: 900,
    previousScrollTop: 840,
    clientHeight: 300,
    scrollHeight: 1200,
    hasSelection: false,
    openedAtMs: 1000,
    nowMs: 2000,
  }), true)
})

test('history selection restore targets the latest matching text in scrollback', () => {
  const text = [
    'prompt> printf "NEXUS_QA_HISTORY_ALPHA"',
    'NEXUS_QA_HISTORY_ALPHA highlighted selection target',
    'prompt>',
  ].join('\n')
  assert.deepEqual(findLastTextRange(text, 'NEXUS_QA_HISTORY_ALPHA'), {
    startOffset: text.lastIndexOf('NEXUS_QA_HISTORY_ALPHA'),
    endOffset: text.lastIndexOf('NEXUS_QA_HISTORY_ALPHA') + 'NEXUS_QA_HISTORY_ALPHA'.length,
  })
})

test('list scrolling does not start reorder when the row body handles the pointer', () => {
  assert.equal(shouldStartReorderDrag({
    startedFromHandle: false,
    deltaX: 0,
    deltaY: 40,
  }), false)
})

test('drag handle starts reorder only after vertical threshold wins over horizontal movement', () => {
  assert.equal(shouldStartReorderDrag({
    startedFromHandle: true,
    deltaX: 4,
    deltaY: 10,
  }), true)
  assert.equal(shouldStartReorderDrag({
    startedFromHandle: true,
    deltaX: 20,
    deltaY: 10,
  }), false)
})

test('clampCursor keeps composer selection inside text bounds', () => {
  assert.equal(clampCursor(-5, 'abc'), 0)
  assert.equal(clampCursor(2, 'abc'), 2)
  assert.equal(clampCursor(9, 'abc'), 3)
})

test('global terminal key capture leaves focused application controls untouched', () => {
  const bodyElement = { kind: 'body' }
  const historyButton = { kind: 'history-button' }

  assert.equal(shouldCaptureGlobalTerminalKey({
    activeElement: historyButton,
    bodyElement,
    terminalContainsFocus: false,
  }), false)
  assert.equal(shouldCaptureGlobalTerminalKey({
    activeElement: bodyElement,
    bodyElement,
    terminalContainsFocus: false,
  }), true)
  assert.equal(shouldCaptureGlobalTerminalKey({
    activeElement: historyButton,
    bodyElement,
    terminalContainsFocus: true,
  }), true)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
