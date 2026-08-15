import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('frontend/src/WorkspaceSelector.tsx', 'utf8')

assert.match(source, /useState<'quick' \| 'browse'>\('quick'\)/)
assert.match(source, /authFetch\('\/api\/projects'/)
assert.match(source, /nexus_recent_paths/)
assert.match(source, /workspace\.recentDirs/)
assert.match(source, /workspace\.browseOtherDir/)
assert.match(source, /setSelectorStep\('browse'\)/)
assert.match(source, /setSelectorStep\('quick'\)/)

console.log('workspace selector quick paths passed')
