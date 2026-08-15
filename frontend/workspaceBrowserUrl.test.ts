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
const workspaceBrowserSource = fs.readFileSync('frontend/src/WorkspaceBrowser.tsx', 'utf8')
const workspaceCodeEditorSource = fs.readFileSync('frontend/src/WorkspaceCodeEditor.tsx', 'utf8')
const indexCssSource = fs.readFileSync('frontend/src/index.css', 'utf8')

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1)
  const end = source.indexOf(endMarker, start)
  assert.notEqual(end, -1)
  return source.slice(start, end)
}

test('terminal initializes workspace browser from URL state', () => {
  assert.match(terminalSource, /parseWorkspaceBrowserLocation/)
  assert.ok(terminalSource.includes('initialWorkspaceLocationRef = useRef<WorkspaceBrowserLocation | null>(null)'))
  assert.ok(terminalSource.includes('const [showWorkspace, setShowWorkspace] = useState(() => initialWorkspaceLocation.isWorkspaceOpen)'))
  assert.ok(terminalSource.includes("const [workspaceInitialPath, setWorkspaceInitialPath] = useState(() => initialWorkspaceLocation.workspacePath || '')"))
})

test('terminal opens and closes workspace browser through URL helpers', () => {
  const openSource = sourceBetween(terminalSource, 'const openWorkspaceBrowser = useCallback', 'const closeWorkspaceBrowser = useCallback')
  assert.ok(openSource.includes('setWorkspaceInitialPath(initialPath)'))
  assert.ok(openSource.includes('setShowWorkspace(true)'))
  assert.ok(openSource.includes('pushWorkspaceBrowserUrl(initialPath || null)'))

  const closeSource = sourceBetween(terminalSource, 'const closeWorkspaceBrowser = useCallback', 'const handleWorkspacePathChange = useCallback')
  assert.ok(closeSource.includes("setWorkspaceInitialPath('')"))
  assert.ok(closeSource.includes('setShowWorkspace(false)'))
  assert.ok(closeSource.includes('clearWorkspaceBrowserUrl()'))

  assert.ok(terminalSource.includes('onOpenWorkspace: () => openWorkspaceBrowser()'))
  assert.ok(terminalSource.includes('onClick={(e) => { e.stopPropagation(); openWorkspaceBrowser(); }}'))
  assert.ok(terminalSource.includes('onClose={closeWorkspaceBrowser}'))
})

test('terminal passes URL path and receives normalized workspace path changes', () => {
  const pathChangeSource = sourceBetween(terminalSource, 'const handleWorkspacePathChange = useCallback', 'const markChannelSeenRemote = useCallback')
  assert.ok(pathChangeSource.includes('setWorkspaceInitialPath(path)'))
  assert.ok(pathChangeSource.includes('replaceWorkspaceBrowserUrl(path)'))
  assert.ok(terminalSource.includes('initialPath={workspaceInitialPath}'))
  assert.ok(terminalSource.includes('onPathChange={handleWorkspacePathChange}'))
})

test('terminal synchronizes workspace browser state on browser history navigation', () => {
  const popstateSource = sourceBetween(terminalSource, 'useEffect(() => {\n    const handlePopState', 'const markChannelSeenRemote = useCallback')
  assert.ok(popstateSource.includes('parseWorkspaceBrowserLocation(window.location.href)'))
  assert.ok(popstateSource.includes('setShowWorkspace(workspaceLocation.isWorkspaceOpen)'))
  assert.ok(popstateSource.includes("setWorkspaceInitialPath(workspaceLocation.workspacePath || '')"))
  assert.ok(popstateSource.includes("window.removeEventListener('popstate', handlePopState)"))
})

test('workspace browser reports server-normalized paths after directory loads', () => {
  assert.match(workspaceBrowserSource, /onPathChange\?: \(path: string\) => void/)
  assert.match(workspaceBrowserSource, /onPathChange\?\.\(data\.path\)/)
  assert.match(workspaceBrowserSource, /\}, \[authFetch, token, onPathChange\]\)/)
})

test('workspace browser exposes Git changes with direct file and directory actions', () => {
  assert.match(workspaceBrowserSource, /\/api\/workspace\/changes\?path=/)
  assert.match(workspaceBrowserSource, /openEditor\(change\.name, 'preview', change\.path\)/)
  assert.match(workspaceBrowserSource, /setCurrentPath\(change\.directory\)/)
  assert.match(workspaceBrowserSource, /workspace\.openContainingDir/)
  assert.match(workspaceBrowserSource, /workspace\.viewChangedFile/)
})

test('workspace browser uses code editor helper and component for editable files', () => {
  assert.match(workspaceBrowserSource, /import WorkspaceCodeEditor from '\.\/WorkspaceCodeEditor'/)
  assert.match(workspaceBrowserSource, /detectWorkspaceEditorFileType/)
  assert.match(workspaceBrowserSource, /isWorkspaceTextFile\(name\)/)
  assert.match(workspaceBrowserSource, /isMarkdownWorkspaceFile\(name\)/)
  assert.match(workspaceBrowserSource, /<WorkspaceCodeEditor/)
})

test('workspace browser opens editable files in preview mode by default', () => {
  assert.match(workspaceBrowserSource, /type EditorMode = 'preview' \| 'edit'/)
  assert.match(workspaceBrowserSource, /const \[editorMode, setEditorMode\] = useState<EditorMode>\('preview'\)/)

  const openEditorSource = sourceBetween(workspaceBrowserSource, 'async function openEditor', '  // 保存文件')
  assert.match(openEditorSource, /mode: EditorMode = 'preview'/)
  assert.match(openEditorSource, /setEditorMode\(mode\)/)

  const doubleClickSource = sourceBetween(workspaceBrowserSource, 'function handleDoubleClick', '  // 判断是否为文本文件')
  assert.match(doubleClickSource, /viewFile\(entry\.name\)/)
})

test('workspace browser routes text view actions to highlighted preview and keeps unsupported files direct', () => {
  const viewFileSource = sourceBetween(workspaceBrowserSource, 'function viewFile', '  // 下载文件')
  assert.match(viewFileSource, /if \(isTextFile\(name\)\)/)
  assert.match(viewFileSource, /openEditor\(name, 'preview'\)/)
  assert.match(viewFileSource, /openFile\(name\)/)

  assert.match(workspaceBrowserSource, /onClick=\{\(\) => viewFile\(selectedEntry\.name\)\}/)
  assert.match(workspaceBrowserSource, /onClick=\{\(\) => \{ viewFile\(contextMenu\.entry\.name\); setContextMenu\(null\) \}\}/)
})

test('workspace browser shows save only in edit mode and reuses CodeMirror for read-only code preview', () => {
  const editorOverlaySource = sourceBetween(workspaceBrowserSource, '      {/* 文件编辑器 */}', 'function getFileIcon')
  assert.match(editorOverlaySource, /!\s*isEditorPreviewMode && \(/)
  assert.match(editorOverlaySource, /onClick=\{saveFile\}/)
  assert.match(editorOverlaySource, /setEditorMode\(isEditorPreviewMode \? 'edit' : 'preview'\)/)
  assert.match(editorOverlaySource, /readOnly=\{isEditorPreviewMode\}/)
  assert.match(editorOverlaySource, /editable=\{!isEditorPreviewMode\}/)
  assert.match(editorOverlaySource, /onChange=\{isEditorPreviewMode \? undefined : \(value\) =>/)
  assert.match(editorOverlaySource, /isEditorMarkdownPreview \?/)
  assert.match(workspaceCodeEditorSource, /editable\?: boolean/)
  assert.match(workspaceCodeEditorSource, /editable = true/)
  assert.match(workspaceCodeEditorSource, /editable=\{editable\}/)
  assert.match(workspaceCodeEditorSource, /readOnly=\{readOnly\}/)
})

test('workspace editor surfaces are scrollable and preserve normal one-finger touch scrolling', () => {
  const editorOverlaySource = sourceBetween(workspaceBrowserSource, '      {/* 文件编辑器 */}', 'function getFileIcon')
  const editorContentSource = sourceBetween(editorOverlaySource, '          {/* Editor Content */}', '          {/* Editor Footer */}')
  assert.match(editorContentSource, /className="relative flex-1 p-4 overflow-hidden"/)
  assert.doesNotMatch(editorContentSource, /className="relative flex-1 p-4 overflow-hidden[^"]*touch-none/)
  assert.match(editorOverlaySource, /className="workspace-code-editor w-full h-full bg-nexus-bg-2 border border-nexus-border rounded overflow-auto"/)
  assert.match(editorOverlaySource, /className="w-full h-full bg-nexus-bg-2 border border-nexus-border rounded p-4 overflow-auto"/)

  assert.match(workspaceCodeEditorSource, /readOnly \? \[EditorState\.readOnly\.of\(true\)\] : \[\]/)
  assert.match(workspaceCodeEditorSource, /lineWrapping \? \[EditorView\.lineWrapping\] : \[\]/)
  assert.match(workspaceCodeEditorSource, /overflow: 'auto'/)
  assert.match(workspaceCodeEditorSource, /minWidth: lineWrapping \? '100%' : 'max-content'/)
  assert.match(indexCssSource, /\.workspace-code-editor \.cm-scroller\s*\{\s*overflow: auto !important;/)
  assert.match(indexCssSource, /\.workspace-code-editor \.cm-content\s*\{\s*min-width: max-content;/)
})

test('workspace browser provides bounded zoom controls and pinch zoom through shared font sizing', () => {
  assert.match(workspaceBrowserSource, /const EDITOR_FONT_SIZE_DEFAULT = 14/)
  assert.match(workspaceBrowserSource, /const EDITOR_FONT_SIZE_MIN = 8/)
  assert.match(workspaceBrowserSource, /const EDITOR_FONT_SIZE_MAX = 32/)
  assert.match(workspaceBrowserSource, /const EDITOR_FONT_SIZE_STEP = 2/)
  assert.match(workspaceBrowserSource, /function clampEditorFontSize\(size: number\): number/)
  assert.match(workspaceBrowserSource, /setEditorFontSize\(clampEditorFontSize\(Math\.round\(pinchStartFontSize \* Math\.sqrt\(ratio\)\)\)\)/)
  assert.match(workspaceBrowserSource, /setEditorFontSize\(size => clampEditorFontSize\(size \+ delta\)\)/)

  const editorOverlaySource = sourceBetween(workspaceBrowserSource, '      {/* 文件编辑器 */}', 'function getFileIcon')
  assert.match(editorOverlaySource, /aria-label="Floating editor controls"/)
  assert.match(editorOverlaySource, /aria-label="Zoom out"/)
  assert.match(editorOverlaySource, /aria-label="Reset font size"/)
  assert.match(editorOverlaySource, /aria-label="Zoom in"/)
  assert.match(editorOverlaySource, /changeEditorFontSize\(-EDITOR_FONT_SIZE_STEP\)/)
  assert.match(editorOverlaySource, /changeEditorFontSize\(EDITOR_FONT_SIZE_STEP\)/)
  assert.match(editorOverlaySource, /disabled=\{editorFontSize <= EDITOR_FONT_SIZE_MIN\}/)
  assert.match(editorOverlaySource, /disabled=\{editorFontSize >= EDITOR_FONT_SIZE_MAX\}/)
})

test('workspace browser floating controls are draggable and scroll active editor surface', () => {
  assert.match(workspaceBrowserSource, /const EDITOR_FLOATING_TOOLBAR_DEFAULT_POSITION = \{ x: 8, y: 144 \}/)
  assert.match(workspaceBrowserSource, /const EDITOR_FLOATING_TOOLBAR_MIN_GAP = 8/)
  assert.match(workspaceBrowserSource, /const EDITOR_FLOATING_TOOLBAR_WIDTH = 42/)
  assert.match(workspaceBrowserSource, /function clampFloatingToolbarPosition\(position: FloatingToolbarPosition, bounds\?: FloatingToolbarBounds\): FloatingToolbarPosition/)
  assert.match(workspaceBrowserSource, /width - EDITOR_FLOATING_TOOLBAR_WIDTH - EDITOR_FLOATING_TOOLBAR_MIN_GAP/)
  assert.match(workspaceBrowserSource, /height - EDITOR_FLOATING_TOOLBAR_HEIGHT - EDITOR_FLOATING_TOOLBAR_MIN_GAP/)
  assert.match(workspaceBrowserSource, /const editorScrollSurfaceRef = useRef<HTMLDivElement \| null>\(null\)/)
  assert.match(workspaceBrowserSource, /const editorContentRef = useRef<HTMLDivElement \| null>\(null\)/)
  assert.match(workspaceBrowserSource, /startX: number/)
  assert.match(workspaceBrowserSource, /startPosition: FloatingToolbarPosition/)
  assert.match(workspaceBrowserSource, /const suppressFloatingToolbarClickRef = useRef\(false\)/)
  assert.match(workspaceBrowserSource, /const \[floatingToolbarPosition, setFloatingToolbarPosition\] = useState<FloatingToolbarPosition>\(EDITOR_FLOATING_TOOLBAR_DEFAULT_POSITION\)/)
  assert.match(workspaceBrowserSource, /function getActiveEditorScrollSurfaces\(\): HTMLElement\[\]/)
  assert.match(workspaceBrowserSource, /Array\.from\(wrapper\.querySelectorAll<HTMLElement>\('\.cm-scroller'\)\)/)
  assert.match(workspaceBrowserSource, /surfaces\.push\(wrapper\)/)
  assert.match(workspaceBrowserSource, /function scrollEditorSurface\(position: 'top' \| 'bottom'\)/)
  assert.match(workspaceBrowserSource, /for \(const surface of getActiveEditorScrollSurfaces\(\)\)/)
  assert.match(workspaceBrowserSource, /surface\.scrollTop = top/)
  assert.match(workspaceBrowserSource, /surface\.scrollTo\(\{ top, behavior: 'auto' \}\)/)
  assert.match(workspaceBrowserSource, /function getFloatingToolbarBounds\(\): FloatingToolbarBounds \| undefined/)
  assert.match(workspaceBrowserSource, /editorContentRef\.current\?\.getBoundingClientRect\(\)/)
  assert.match(workspaceBrowserSource, /const deltaX = e\.clientX - drag\.startX/)
  assert.match(workspaceBrowserSource, /Math\.hypot\(deltaX, deltaY\) > 4/)
  assert.match(workspaceBrowserSource, /if \(!drag\.moved\) \{\s*try \{\s*e\.currentTarget\.setPointerCapture\(e\.pointerId\)/)
  assert.doesNotMatch(sourceBetween(workspaceBrowserSource, '  function handleFloatingToolbarPointerDown', '  function handleFloatingToolbarPointerMove'), /setPointerCapture/)

  const editorOverlaySource = sourceBetween(workspaceBrowserSource, '      {/* 文件编辑器 */}', 'function getFileIcon')
  assert.match(editorOverlaySource, /ref=\{editorContentRef\}/)
  assert.match(editorOverlaySource, /style=\{\{ left: `\$\{floatingToolbarPosition\.x\}px`, top: `\$\{floatingToolbarPosition\.y\}px` \}\}/)
  assert.match(editorOverlaySource, /border border-nexus-accent\/70 bg-nexus-bg/)
  assert.match(editorOverlaySource, /shadow-\[0_12px_32px_rgba\(0,0,0,0\.5\)\]/)
  assert.match(editorOverlaySource, /ring-1 ring-white\/10/)
  assert.match(editorOverlaySource, /border border-nexus-border bg-nexus-bg-2 text-nexus-text/)
  assert.match(editorOverlaySource, /hover:border-nexus-accent hover:bg-nexus-accent hover:text-white/)
  assert.match(editorOverlaySource, /onPointerDown=\{handleFloatingToolbarPointerDown\}/)
  assert.match(editorOverlaySource, /onPointerMove=\{handleFloatingToolbarPointerMove\}/)
  assert.match(editorOverlaySource, /onPointerUp=\{handleFloatingToolbarPointerEnd\}/)
  assert.match(editorOverlaySource, /aria-label="Jump to top"/)
  assert.match(editorOverlaySource, /aria-label="Jump to bottom"/)
  assert.match(editorOverlaySource, /scrollEditorSurface\('top'\)/)
  assert.match(editorOverlaySource, /scrollEditorSurface\('bottom'\)/)
  assert.match(editorOverlaySource, /ref=\{editorScrollSurfaceRef\}/)
  assert.doesNotMatch(editorOverlaySource, /aria-label="Editor font size controls"/)
})

test('workspace browser saves with file metadata and keeps editor open on save errors', () => {
  const saveSource = sourceBetween(workspaceBrowserSource, 'async function saveFile()', '  // 双击处理')
  assert.match(saveSource, /mtimeMs: editingFile\.mtimeMs/)
  assert.match(saveSource, /setEditorError\(e\.message \|\| 'Failed to save file'\)/)
  assert.doesNotMatch(saveSource, /setError\(e\.message \|\| 'Failed to save file'\)/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
