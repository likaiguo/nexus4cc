import assert from 'node:assert/strict'
import {
  detectWorkspaceEditorFileType,
  isMarkdownWorkspaceFile,
  isWorkspaceTextFile,
  workspaceLanguageExtension,
} from './src/workspaceEditor'

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

test('detectWorkspaceEditorFileType supports requested source languages', () => {
  assert.deepEqual(detectWorkspaceEditorFileType('query.sql'), { editable: true, language: 'sql' })
  assert.deepEqual(detectWorkspaceEditorFileType('script.py'), { editable: true, language: 'python' })
  assert.deepEqual(detectWorkspaceEditorFileType('app.js'), { editable: true, language: 'javascript' })
  assert.deepEqual(detectWorkspaceEditorFileType('app.ts'), { editable: true, language: 'typescript' })
  assert.deepEqual(detectWorkspaceEditorFileType('README.md'), { editable: true, language: 'markdown' })
})

test('detectWorkspaceEditorFileType supports common web and config text files', () => {
  assert.deepEqual(detectWorkspaceEditorFileType('package.json'), { editable: true, language: 'json' })
  assert.deepEqual(detectWorkspaceEditorFileType('index.html'), { editable: true, language: 'html' })
  assert.deepEqual(detectWorkspaceEditorFileType('styles.css'), { editable: true, language: 'css' })
  assert.deepEqual(detectWorkspaceEditorFileType('.env'), { editable: true, language: 'plain' })
  assert.deepEqual(detectWorkspaceEditorFileType('Dockerfile'), { editable: true, language: 'plain' })
})

test('extensionless files are editable plain text and binary-like extensions are not editable', () => {
  assert.deepEqual(detectWorkspaceEditorFileType('Makefile'), { editable: true, language: 'plain' })
  assert.deepEqual(detectWorkspaceEditorFileType('notes'), { editable: true, language: 'plain' })
  assert.deepEqual(detectWorkspaceEditorFileType('image.png'), { editable: false, language: 'plain' })
  assert.equal(isWorkspaceTextFile('query.sql'), true)
  assert.equal(isWorkspaceTextFile('archive.zip'), false)
})

test('markdown helper identifies markdown files only', () => {
  assert.equal(isMarkdownWorkspaceFile('README.md'), true)
  assert.equal(isMarkdownWorkspaceFile('notes.markdown'), true)
  assert.equal(isMarkdownWorkspaceFile('script.ts'), false)
})

test('workspaceLanguageExtension returns CodeMirror extensions for highlighted languages', () => {
  assert.ok(workspaceLanguageExtension('sql').length > 0)
  assert.ok(workspaceLanguageExtension('python').length > 0)
  assert.ok(workspaceLanguageExtension('javascript').length > 0)
  assert.ok(workspaceLanguageExtension('typescript').length > 0)
  assert.ok(workspaceLanguageExtension('markdown').length > 0)
  assert.equal(workspaceLanguageExtension('plain').length, 0)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
