import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { copyMissingLegacyData, resolveNexusDataDir } from './dataDir.js'

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

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-data-dir-'))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('resolveNexusDataDir defaults under user home', () => {
  assert.equal(
    resolveNexusDataDir({ env: {}, homeDir: '/home/alice' }),
    '/home/alice/.nexus4cc/data',
  )
})

test('resolveNexusDataDir honors absolute environment override', () => {
  assert.equal(
    resolveNexusDataDir({ env: { NEXUS_DATA_DIR: '/srv/nexus-data' }, homeDir: '/home/alice' }),
    '/srv/nexus-data',
  )
})

test('resolveNexusDataDir expands tilde override', () => {
  assert.equal(
    resolveNexusDataDir({ env: { NEXUS_DATA_DIR: '~/custom-nexus' }, homeDir: '/home/alice' }),
    '/home/alice/custom-nexus',
  )
})

test('copyMissingLegacyData copies missing items and preserves source', () => withTempDir(root => {
  const legacy = join(root, 'legacy')
  const next = join(root, 'next')
  writeFileSync(join(root, 'placeholder'), '', 'utf8')
  rmSync(legacy, { recursive: true, force: true })
  rmSync(next, { recursive: true, force: true })
  writeFileSync(join(root, 'unused'), '', 'utf8')
  mkdirSync(join(legacy, 'configs'), { recursive: true })
  writeFileSync(join(legacy, 'nexus.sqlite'), 'db', 'utf8')
  writeFileSync(join(legacy, 'toolbar-config.json'), 'toolbar', 'utf8')
  writeFileSync(join(legacy, 'configs', 'anthropic.json'), '{}', 'utf8')

  const result = copyMissingLegacyData({ legacyDataDir: legacy, dataDir: next, logger: { warn() {} } })
  assert.deepEqual(result.failed, [])
  assert.equal(readFileSync(join(next, 'nexus.sqlite'), 'utf8'), 'db')
  assert.equal(readFileSync(join(next, 'toolbar-config.json'), 'utf8'), 'toolbar')
  assert.equal(readFileSync(join(next, 'configs', 'anthropic.json'), 'utf8'), '{}')
  assert.equal(existsSync(join(legacy, 'nexus.sqlite')), true)
}))

test('copyMissingLegacyData does not overwrite destination items', () => withTempDir(root => {
  const legacy = join(root, 'legacy')
  const next = join(root, 'next')
  mkdirSync(legacy, { recursive: true })
  mkdirSync(next, { recursive: true })
  writeFileSync(join(legacy, 'tasks.json'), 'legacy', 'utf8')
  writeFileSync(join(next, 'tasks.json'), 'next', 'utf8')

  copyMissingLegacyData({ legacyDataDir: legacy, dataDir: next, logger: { warn() {} } })
  assert.equal(readFileSync(join(next, 'tasks.json'), 'utf8'), 'next')
}))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
