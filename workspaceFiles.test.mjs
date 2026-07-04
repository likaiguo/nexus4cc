import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  WorkspaceFileError,
  isLikelyBinary,
  readEditableWorkspaceFile,
  saveEditableWorkspaceFile,
} from './workspaceFiles.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL: ${name}\n        ${msg}`)
  }
}

function withWorkspace(fn) {
  const root = mkdtempSync(join(tmpdir(), 'nexus-workspace-files-'))
  try {
    fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('readEditableWorkspaceFile returns content and metadata', () => withWorkspace(root => {
  const filePath = join(root, 'app.js')
  writeFileSync(filePath, 'console.log("ok")\n', 'utf8')

  const result = readEditableWorkspaceFile('app.js', root)
  assert.equal(result.path, filePath)
  assert.equal(result.content, 'console.log("ok")\n')
  assert.equal(result.size, Buffer.byteLength(result.content))
  assert.equal(typeof result.mtimeMs, 'number')
}))

test('readEditableWorkspaceFile rejects oversized files', () => withWorkspace(root => {
  writeFileSync(join(root, 'large.txt'), 'abcdef', 'utf8')

  assert.throws(
    () => readEditableWorkspaceFile('large.txt', root, { maxBytes: 5 }),
    err => err instanceof WorkspaceFileError && err.status === 413 && err.code === 'file_too_large',
  )
}))

test('readEditableWorkspaceFile rejects binary-looking files', () => withWorkspace(root => {
  writeFileSync(join(root, 'binary.bin'), Buffer.from([0x00, 0x01, 0x02, 0x03]))

  assert.equal(isLikelyBinary(Buffer.from([0x00, 0x61])), true)
  assert.throws(
    () => readEditableWorkspaceFile('binary.bin', root),
    err => err instanceof WorkspaceFileError && err.status === 415 && err.code === 'binary_file',
  )
}))

test('saveEditableWorkspaceFile writes content when metadata is current', () => withWorkspace(root => {
  writeFileSync(join(root, 'notes.md'), '# Old\n', 'utf8')
  const opened = readEditableWorkspaceFile('notes.md', root)

  const saved = saveEditableWorkspaceFile({
    path: 'notes.md',
    workspaceRoot: root,
    content: '# New\n',
    mtimeMs: opened.mtimeMs,
  })

  assert.equal(saved.ok, true)
  assert.equal(readEditableWorkspaceFile('notes.md', root).content, '# New\n')
  assert.equal(typeof saved.mtimeMs, 'number')
}))

test('saveEditableWorkspaceFile rejects stale metadata', () => withWorkspace(root => {
  const filePath = join(root, 'notes.md')
  writeFileSync(filePath, '# Old\n', 'utf8')
  const opened = readEditableWorkspaceFile('notes.md', root)
  writeFileSync(filePath, '# External\n', 'utf8')
  utimesSync(filePath, new Date(), new Date(opened.mtimeMs + 10_000))

  assert.throws(
    () => saveEditableWorkspaceFile({
      path: 'notes.md',
      workspaceRoot: root,
      content: '# New\n',
      mtimeMs: opened.mtimeMs,
    }),
    err => err instanceof WorkspaceFileError && err.status === 409 && err.code === 'file_conflict',
  )
}))

test('workspace path resolution still permits nested relative files', () => withWorkspace(root => {
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src', 'query.sql'), 'select 1;\n', 'utf8')

  const result = readEditableWorkspaceFile('src/query.sql', root)
  assert.equal(result.content, 'select 1;\n')
}))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
