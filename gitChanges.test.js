import assert from 'node:assert/strict'
import { isCodeChangePath, parseGitStatus } from './gitChanges.js'

const changes = parseGitStatus(' M frontend/src/App.tsx\0R  frontend/src/New.tsx\0frontend/src/Old.tsx\0?? notes with spaces.md\0')

assert.deepEqual(changes, [
  { indexStatus: ' ', worktreeStatus: 'M', relativePath: 'frontend/src/App.tsx' },
  { indexStatus: 'R', worktreeStatus: ' ', relativePath: 'frontend/src/New.tsx' },
  { indexStatus: '?', worktreeStatus: '?', relativePath: 'notes with spaces.md' },
])

assert.equal(isCodeChangePath('frontend/src/App.tsx'), true)
assert.equal(isCodeChangePath('server.js'), true)
assert.equal(isCodeChangePath('.omo/evidence/page.js'), false)
assert.equal(isCodeChangePath('frontend/dist/assets/index.js'), false)
assert.equal(isCodeChangePath('README.md'), false)

console.log('gitChanges parser passed')
