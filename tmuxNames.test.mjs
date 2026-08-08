import assert from 'node:assert/strict'
import { isSafeTmuxSessionName } from './tmuxNames.js'

assert.equal(isSafeTmuxSessionName('nexus-service_2.0~qa'), true)
assert.equal(isSafeTmuxSessionName('project;touch-/tmp/injected'), false)
assert.equal(isSafeTmuxSessionName('project name'), false)
assert.equal(isSafeTmuxSessionName('../project'), false)
assert.equal(isSafeTmuxSessionName(''), false)
assert.equal(isSafeTmuxSessionName('a'.repeat(51)), false)

console.log('tmux name validation test passed')
