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
  assert.ok(openSource.includes('replaceWorkspaceBrowserUrl(initialPath || null)'))

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

test('workspace browser reports server-normalized paths after directory loads', () => {
  assert.match(workspaceBrowserSource, /onPathChange\?: \(path: string\) => void/)
  assert.match(workspaceBrowserSource, /onPathChange\?\.\(data\.path\)/)
  assert.match(workspaceBrowserSource, /\}, \[token, onPathChange\]\)/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
