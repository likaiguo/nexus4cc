import assert from 'node:assert/strict'
import { appendCustomKeyToSection, applyRecommendation, mergePresetWithCustom, toolbarDeviceType } from './src/toolbarPresets'
import { FACTORY_CONFIG, type ToolbarConfig } from './src/toolbarDefaults'
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

test('toolbarDeviceType maps narrow screens to mobile', () => {
  assert.equal(toolbarDeviceType(390), 'mobile')
})

test('toolbarDeviceType maps desktop breakpoint to desktop', () => {
  assert.equal(toolbarDeviceType(768), 'desktop')
})

test('mergePresetWithCustom preserves custom key definitions', () => {
  const preset: ToolbarConfig = { pinned: ['esc'], expanded: ['enter'] }
  const current: ToolbarConfig = {
    pinned: ['left'],
    expanded: [],
    custom: [{ id: 'custom-a', label: 'A', seq: 'a', desc: 'A', category: 'control' }],
  }
  assert.deepEqual(mergePresetWithCustom(preset, current), {
    pinned: ['esc'],
    expanded: ['enter'],
    custom: current.custom,
  })
})

test('applyRecommendation pins an expanded key and removes it from expanded', () => {
  const config: ToolbarConfig = { pinned: ['esc'], expanded: ['enter', 'tab'] }
  assert.deepEqual(applyRecommendation(config, 'tab'), {
    pinned: ['esc', 'tab'],
    expanded: ['enter'],
  })
})

test('applyRecommendation leaves already pinned key unchanged', () => {
  const config: ToolbarConfig = { pinned: ['esc'], expanded: ['enter'] }
  assert.equal(applyRecommendation(config, 'esc'), config)
})

test('factory pinned shortcuts keep the original fixed row order', () => {
  assert.deepEqual(FACTORY_CONFIG.pinned, [
    'esc', 'ctrl-a', 'left', 'up', 'down', 'right', 'ctrl-e', 'backspace',
    'backslash', 'slash', 'ctrl-c', 'ctrl-v', 'enter', 'tab',
  ])
})

test('factory expanded shortcuts keep the original expanded order', () => {
  assert.deepEqual(FACTORY_CONFIG.expanded, [
    'alt-b', 'alt-f', 'ctrl-d', 'ctrl-u', 'ctrl-j', 'ctrl-k', 'ctrl-l', 'ctrl-y', 'ctrl-z',
    'ctrl-r', 'ctrl-b', 'ctrl-o', 'ctrl-t', 'ctrl-f', 'ctrl-g', 'shift-tab', 'bang', 'at',
    'scroll-btm', 'copy-term', 'fit',
  ])
})

test('appendCustomKeyToSection appends custom shortcuts to fixed row tail', () => {
  const config: ToolbarConfig = {
    pinned: ['esc', 'tab'],
    expanded: ['enter'],
    custom: [{ id: 'custom-a', label: 'A', seq: 'a', desc: 'A', category: 'control' }],
  }
  const key = { id: 'custom-b', label: 'B', seq: 'b', desc: 'B', category: 'control' as const }
  assert.deepEqual(appendCustomKeyToSection(config, key, 'pinned'), {
    pinned: ['esc', 'tab', 'custom-b'],
    expanded: ['enter'],
    custom: [...(config.custom ?? []), key],
  })
})

test('appendCustomKeyToSection appends custom shortcuts to expanded tail', () => {
  const config: ToolbarConfig = {
    pinned: ['esc', 'tab'],
    expanded: ['enter'],
    custom: [{ id: 'custom-a', label: 'A', seq: 'a', desc: 'A', category: 'control' }],
  }
  const key = { id: 'custom-b', label: 'B', seq: 'b', desc: 'B', category: 'control' as const }
  assert.deepEqual(appendCustomKeyToSection(config, key, 'expanded'), {
    pinned: ['esc', 'tab'],
    expanded: ['enter', 'custom-b'],
    custom: [...(config.custom ?? []), key],
  })
})

test('mobile system actions expose workspace and keep edit shortcuts in quick menu', () => {
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  const mobileSource = toolbarSource.slice(
    toolbarSource.indexOf('const mobilePinnedRows'),
    toolbarSource.indexOf('{mobilePinnedRows.map'),
  )
  assert.match(toolbarSource, /<div className="flex-1 min-w-0" \/>/)
  assert.match(toolbarSource, /<div className="flex items-center gap-1 w-max flex-shrink-0">/)
  assert.match(toolbarSource, /<div className="relative">\s*<button\s+ref=\{menuBtnRef\}/)
  assert.doesNotMatch(toolbarSource, /<div className="relative ml-auto">\s*<button\s+ref=\{menuBtnRef\}/)
  assert.match(
    toolbarSource,
    /onOpenWorkspace &&[\s\S]*t\('toolbar\.workspace'\)[\s\S]*t\('toolbar\.expand'\)[\s\S]*composerControls &&[\s\S]*attentionEntry && attentionEntry\.count > 0[\s\S]*ref=\{menuBtnRef\}/,
  )
  assert.doesNotMatch(
    mobileSource,
    /onPointerDown=\{\(e\) => \{ e\.preventDefault\(\); setEditing\(true\) \}\}[\s\S]{0,220}title=\{t\('toolbar\.editShortcuts'\)\}/,
  )
  assert.match(toolbarSource, /setEditing\(true\); setShowQuickMenu\(false\)/)
})

test('mobile shortcut rows reserve right thumb space', () => {
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  assert.match(toolbarSource, /function shortcutGridStyle\(count: number\)/)
  assert.match(toolbarSource, /width: '80%'/)
  assert.match(toolbarSource, /minWidth: `\$\{keyCount \* 38\}px`/)
  assert.match(toolbarSource, /gridTemplateColumns: `repeat\(\$\{keyCount\}, minmax\(34px, 1fr\)\)`/)
  assert.match(toolbarSource, /style=\{shortcutGridStyle\(row\.length\)\}/)
  assert.doesNotMatch(toolbarSource, /className="grid gap-1 min-w-full"/)
  assert.doesNotMatch(toolbarSource, /<div className="flex items-center gap-1 w-max min-w-full">/)
  assert.match(toolbarSource, /const keyClass = '.*min-w-\[34px\].*px-1\.5/)
})

test('mobile expanded shortcut rows use the same thumb-space grid', () => {
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  const expandedStart = toolbarSource.indexOf('chunk(config.expanded, 8)')
  const expandedSource = toolbarSource.slice(
    Math.max(0, expandedStart - 160),
    expandedStart + 900,
  )
  assert.match(expandedSource, /chunk\(config\.expanded, 8\)\.map/)
  assert.match(expandedSource, /className="grid gap-1"/)
  assert.match(expandedSource, /style=\{shortcutGridStyle\(row\.length\)\}/)
  assert.doesNotMatch(expandedSource, /className="grid gap-1 min-w-full"/)
  assert.doesNotMatch(expandedSource, /flex flex-wrap gap-1 px-1\.5/)
})

test('mobile quick menu includes a first-row collapse action', () => {
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  assert.match(
    toolbarSource,
    /<div className="flex items-center gap-1 px-2 py-1 border-b border-nexus-border">[\s\S]*setCollapsed\(true\); setShowQuickMenu\(false\)[\s\S]*<Icon name="chevronUp" size=\{16\} \/>/,
  )
})

test('composer draft can be collapsed and history replay opens composer', () => {
  const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
  assert.match(terminalSource, /const showMobileComposerPanel = !isWidePC && composerMode === 'composer'/)
  assert.doesNotMatch(terminalSource, /composerMode === 'composer' \|\| hasComposerDraft/)
  assert.match(
    terminalSource,
    /function applyComposerHistory\(item: InputHistoryItem\) \{[\s\S]*composerModeRef\.current = 'composer'[\s\S]*setComposerMode\('composer'\)[\s\S]*setComposerDraftWithCursor\(item\.text, item\.text\.length\)/,
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
