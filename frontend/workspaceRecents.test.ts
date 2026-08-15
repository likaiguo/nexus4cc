import assert from 'node:assert/strict'
import { mergeRecentWorkspacePaths, parseRecentWorkspacePaths } from './src/workspaceRecents'

assert.deepEqual(parseRecentWorkspacePaths('["/work/a","/work/a","",3]'), ['/work/a'])
assert.deepEqual(parseRecentWorkspacePaths('invalid'), [])

assert.deepEqual(
  mergeRecentWorkspacePaths(['/work/current', '/work/a'], ['/work/a', '/work/b', '/work/c'], 3),
  ['/work/current', '/work/a', '/work/b'],
)

console.log('workspace recent paths passed')
