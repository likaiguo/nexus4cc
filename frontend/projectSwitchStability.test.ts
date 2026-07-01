import assert from 'node:assert/strict'
import fs from 'node:fs'

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

const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')

test('desktop sidebar forwards project lastChannel into handleSwitchSession', () => {
  assert.match(
    terminalSource,
    /onSwitchProject=\{\(name, lastChannel\) => handleSwitchSession\(name, lastChannel\)\}/,
  )
  assert.doesNotMatch(
    terminalSource,
    /onSwitchProject=\{\(name\) => handleSwitchSession\(name\)\}/,
  )
})

test('project switch resolves against live windows before applying state', () => {
  const fnStart = terminalSource.indexOf('function handleSwitchSession(')
  assert.notEqual(fnStart, -1)
  const fnEnd = terminalSource.indexOf('const handleAttentionJump', fnStart)
  assert.notEqual(fnEnd, -1)
  const switchSource = terminalSource.slice(fnStart, fnEnd)

  assert.match(switchSource, /const switchSeq = \+\+projectSwitchSeqRef\.current/)
  assert.match(switchSource, /const activatedChannel = await activateProject\(newSession\)\.catch\(\(\) => null\)/)
  assert.match(switchSource, /const wins = await fetchWindowList\(newSession\)/)
  assert.match(switchSource, /const targetChannel = resolveChannelIndex\(wins, preferredChannel\)/)
  assert.match(switchSource, /await attachResolvedChannel\(newSession, targetChannel\)/)
  assert.match(switchSource, /applyResolvedLocation\(newSession, targetChannel, wins, \{ syncUrl \}\)/)
  assert.doesNotMatch(switchSource, /setWindows\(\[\]\)/)
  assert.doesNotMatch(switchSource, /localStorage\.removeItem\(WINDOW_KEY\)/)
})

test('resolved location can skip url sync but still commits loaded window state', () => {
  assert.match(
    terminalSource,
    /const applyResolvedLocation = useCallback\(\(project: string, channelIndex: number, resolvedWindows\?: TmuxWindow\[\], options: \{ syncUrl\?: boolean \} = \{\}\)/,
  )
  assert.match(terminalSource, /const \{ syncUrl: shouldSyncUrl = true \} = options/)
  assert.match(terminalSource, /windowsLoadedRef\.current = true[\s\S]*setWindowsLoaded\(true\)/)
  assert.match(terminalSource, /if \(shouldSyncUrl\) syncLocationUrl\(project, idx\)/)
})

test('sidebar expand and collapse are transition-protected', () => {
  assert.match(terminalSource, /import \{[^}]*startTransition[^}]*\} from 'react'/)
  assert.match(
    terminalSource,
    /const setSidebarCollapsedPersisted = useCallback\(\(collapsed: boolean\) => \{[\s\S]*localStorage\.setItem\('nexus_sidebar_collapsed', String\(collapsed\)\)[\s\S]*startTransition\(\(\) => \{[\s\S]*setSidebarCollapsed\(collapsed\)[\s\S]*\}\)[\s\S]*\}, \[\]\)/,
  )
  assert.match(terminalSource, /setSidebarCollapsedPersisted\(false\)/)
  assert.match(terminalSource, /setSidebarCollapsedPersisted\(true\)/)
  assert.doesNotMatch(terminalSource, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); setSidebarCollapsed\(false\)/)
  assert.doesNotMatch(terminalSource, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); setSidebarCollapsed\(true\)/)
})

test('inline desktop sidebar manager has a local Suspense boundary', () => {
  const sidebarStart = terminalSource.indexOf('/* Expanded Sidebar: session manager + fixed bottom bar */')
  assert.notEqual(sidebarStart, -1)
  const sidebarSource = terminalSource.slice(sidebarStart, sidebarStart + 1800)

  assert.match(sidebarSource, /<Suspense fallback=\{<div className="px-3 py-3 text-xs text-nexus-text-2">\{t\('common\.loading'\)\}<\/div>\}>/)
  assert.match(sidebarSource, /<SessionManagerV2/)
  assert.match(sidebarSource, /layout="sidebar"/)
  assert.match(sidebarSource, /<\/Suspense>/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
