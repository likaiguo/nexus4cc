import assert from 'node:assert/strict'
import { appendCustomKeyToSection, applyRecommendation, mergePresetWithCustom, toolbarDeviceType, TOOLBAR_PRESETS } from './src/toolbarPresets'
import { ALL_KEYS, FACTORY_CONFIG, type ToolbarConfig } from './src/toolbarDefaults'
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
    'paste-text', 'terminal-history', 'scroll-btm', 'copy-term', 'fit',
  ])
})

test('toolbar separates terminal Ctrl+V from app-level text paste', () => {
  const ctrlV = ALL_KEYS.find(key => key.id === 'ctrl-v')
  const pasteText = ALL_KEYS.find(key => key.id === 'paste-text')
  assert.equal(ctrlV?.label, '^V')
  assert.equal(ctrlV?.seq, '\x16')
  assert.equal(ctrlV?.action, undefined)
  assert.equal(ctrlV?.desc, 'toolbarKeys.literalNext')
  assert.equal(pasteText?.label, 'Paste')
  assert.equal(pasteText?.seq, '')
  assert.equal(pasteText?.action, 'pasteClipboard')
  assert.equal(pasteText?.desc, 'toolbarKeys.pasteText')
})

test('toolbar presets add paste text and terminal history without changing fixed rows', () => {
  for (const preset of TOOLBAR_PRESETS) {
    assert.ok(preset.config.expanded.includes('paste-text'), `${preset.id} includes paste-text`)
    assert.ok(preset.config.expanded.includes('terminal-history'), `${preset.id} includes terminal-history`)
  }
  assert.deepEqual(TOOLBAR_PRESETS.find(preset => preset.id === 'mobile-minimal')?.config.pinned, [
    'esc', 'ctrl-c', 'ctrl-v', 'enter', 'tab', 'slash', 'up', 'down', 'left', 'right',
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
  assert.match(
    toolbarSource,
    /onOpenTerminalHistory &&[\s\S]*onOpenTerminalHistory\(\); setShowQuickMenu\(false\)[\s\S]*t\('toolbar\.terminalHistory'\)/,
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

test('repeatable mobile shortcuts use pointer lifecycle repeat handling', () => {
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  assert.match(toolbarSource, /const REPEATABLE_KEY_IDS = new Set\(\['up', 'down', 'left', 'right'\]\)/)
  assert.match(toolbarSource, /const KEY_REPEAT_INITIAL_DELAY_MS = 320/)
  assert.match(toolbarSource, /const KEY_REPEAT_INTERVAL_MS = 75/)
  assert.match(toolbarSource, /function handleShortcutPointerDown\(e: React\.PointerEvent<HTMLButtonElement>, key: KeyDef\)/)
  assert.match(toolbarSource, /handleKey\(key\)/)
  assert.match(toolbarSource, /if \(!isRepeatableKey\(key\)\) return/)
  assert.match(toolbarSource, /async function handleKey\(key: KeyDef, options: \{ reportUsage\?: boolean \} = \{\}\)/)
  assert.match(toolbarSource, /if \(reportUsage\) reportShortcutUsage\(key\)/)
  assert.match(toolbarSource, /onPointerDown=\{\(e\) => handleShortcutPointerDown\(e, key\)\}/)
  assert.match(toolbarSource, /onPointerUp=\{stopKeyRepeat\}/)
  assert.match(toolbarSource, /onPointerCancel=\{stopKeyRepeat\}/)
  assert.match(toolbarSource, /onPointerLeave=\{stopKeyRepeat\}/)
  assert.match(toolbarSource, /onLostPointerCapture=\{stopKeyRepeat\}/)
  assert.match(toolbarSource, /window\.addEventListener\('blur', stopKeyRepeat\)/)
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
  assert.match(terminalSource, /const showComposerPanel = composerMode === 'composer'/)
  assert.match(terminalSource, /const showMobileComposerPanel = !isWidePC && showComposerPanel/)
  assert.match(terminalSource, /const showDesktopComposerPanel = isWidePC && showComposerPanel/)
  assert.doesNotMatch(terminalSource, /composerMode === 'composer' \|\| hasComposerDraft/)
  assert.match(terminalSource, /composerControls: \{[\s\S]*onOpen: openComposer[\s\S]*onToggleHistory: handleComposerHistoryToggle/)
  assert.match(
    terminalSource,
    /function applyComposerHistory\(item: InputHistoryItem\) \{[\s\S]*composerModeRef\.current = 'composer'[\s\S]*setComposerMode\('composer'\)[\s\S]*setComposerDraftWithCursor\(item\.text, item\.text\.length\)/,
  )
})

test('composer key handling sends on Enter and keeps Shift Enter as newline', () => {
  const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
  const handlerStart = terminalSource.indexOf('function handleComposerKeyDown')
  const handlerSource = terminalSource.slice(handlerStart, handlerStart + 520)
  assert.match(handlerSource, /if \(composerImeRef\.current \|\| e\.nativeEvent\.isComposing\) return/)
  assert.match(handlerSource, /if \(e\.key !== 'Enter'\) return/)
  assert.match(handlerSource, /if \(e\.shiftKey\) \{[\s\S]*updateComposerSelection\(\)[\s\S]*return[\s\S]*\}/)
  assert.match(handlerSource, /e\.preventDefault\(\)[\s\S]*handleComposerSend\(\)/)
  assert.doesNotMatch(handlerSource, /!e\.altKey/)
})

test('direct terminal Shift Enter sends line-feed and Ctrl/Cmd+V stays native', () => {
  const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
  assert.match(terminalSource, /seq = e\.shiftKey \? '\\n' : '\\r'/)
  assert.match(terminalSource, /if \(clipboardMod && clipboardKey === 'v'\) return/)
  assert.doesNotMatch(terminalSource, /document\.addEventListener\('paste', handlePaste\)/)
  assert.doesNotMatch(terminalSource, /navigator\.clipboard\.read\(\)/)
})

test('terminal history is explicit on PC/mobile and restores input path on close', () => {
  const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  assert.match(terminalSource, /const openTerminalHistory = useCallback\(\(\) => \{[\s\S]*triggerScrollbackRef\.current\(\)/)
  assert.match(terminalSource, /onOpenTerminalHistory: openTerminalHistory/)
  assert.match(terminalSource, /scrollbackRestoreRef\.current = \{ composer: composerModeRef\.current === 'composer', keyboardVisible: keyboardVisibleRef\.current \}/)
  assert.match(terminalSource, /if \(restore\?\.composer && composerModeRef\.current === 'composer'\) \{[\s\S]*composerTextareaRef\.current\?\.focus\(\)/)
  assert.match(terminalSource, /if \(deltaY > 0\) \{[\s\S]*swipeUpAccumRef\.current \+= deltaY/)
  assert.match(toolbarSource, /title=\{t\('toolbar\.terminalHistory'\)\}/)
  assert.match(toolbarSource, /aria-label=\{t\('toolbar\.terminalHistory'\)\}/)
})

test('app-level paste sheet is text-only and upload stays explicit', () => {
  const toolbarSource = fs.readFileSync('frontend/src/Toolbar.tsx', 'utf8')
  const pasteStart = toolbarSource.indexOf('const pasteBoxEl = showPasteBox')
  const pasteSource = toolbarSource.slice(pasteStart, pasteStart + 1800)
  assert.match(pasteSource, /t\('toolbar\.pasteText'\)/)
  assert.match(pasteSource, /t\('toolbar\.pasteTextPlaceholder'\)/)
  assert.match(pasteSource, /t\('toolbar\.sendText'\)/)
  assert.doesNotMatch(pasteSource, /onUploadFile/)
  assert.doesNotMatch(pasteSource, /accept="\*\/\*"/)
  assert.match(toolbarSource, /navigator\.clipboard\.readText\(\)/)
  assert.doesNotMatch(toolbarSource, /navigator\.clipboard\.read\(\)/)
  assert.match(toolbarSource, /title=\{t\('toolbar\.uploadFiles'\)\}/)
})

test('terminal copy sheet uses selectable static text instead of textarea', () => {
  const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
  const copySheetStart = terminalSource.indexOf('{copySheetText !== null && (')
  const copySheetSource = terminalSource.slice(copySheetStart, copySheetStart + 2400)
  assert.match(copySheetSource, /<pre\s+ref=\{copySheetContentRef\}/)
  assert.match(copySheetSource, /onClick=\{handleCopySheetCopy\}/)
  assert.match(copySheetSource, /copySheetCopied \? 'Copied' : 'Copy'/)
  assert.match(copySheetSource, /Select text, then tap Copy/)
  assert.doesNotMatch(copySheetSource, /<textarea/)
})

test('history mode exposes selection-aware floating copy action', () => {
  const terminalSource = fs.readFileSync('frontend/src/Terminal.tsx', 'utf8')
  assert.match(terminalSource, /function selectionInsideElement\(root: HTMLElement \| null\)/)
  assert.match(terminalSource, /const \[historySelection, setHistorySelection\]/)
  assert.match(terminalSource, /document\.addEventListener\('selectionchange', updateSelection\)/)
  assert.match(terminalSource, /selectionInsideElement\(scrollbackContentRef\.current\)/)
  assert.match(terminalSource, /if \(selectionInsideElement\(scrollbackContentRef\.current\)\) return/)
  assert.match(terminalSource, /ref=\{scrollbackContentRef\}/)
  assert.match(terminalSource, /historySelection && \(/)
  assert.match(terminalSource, /handleCopyHistorySelection\(\)/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
