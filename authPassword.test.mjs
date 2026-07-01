import assert from 'node:assert/strict'
import bcrypt from 'bcrypt'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  DEFAULT_LOGIN_PASSWORD,
  PASSWORD_HASH_ENV_KEY,
  createPasswordManager,
  loadEnvFile,
  setEnvValue,
} from './authPassword.js'

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL: ${name}\n        ${msg}`)
  }
}

async function withTempEnv(content, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-auth-'))
  const envPath = join(dir, '.env')
  try {
    writeFileSync(envPath, content, 'utf8')
    return await fn(envPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

await test('loadEnvFile overwrites auth values with local .env values', () => withTempEnv('ACC_PASSWORD_HASH=from-file\nPORT=59000\n', envPath => {
  const targetEnv = { ACC_PASSWORD_HASH: 'from-shell', PORT: '60000' }
  assert.equal(loadEnvFile(envPath, targetEnv), true)
  assert.equal(targetEnv.ACC_PASSWORD_HASH, 'from-file')
  assert.equal(targetEnv.PORT, '60000')
}))

await test('setEnvValue replaces an existing key and preserves surrounding content', () => {
  const content = '# comment\nJWT_SECRET=abc\nACC_PASSWORD_HASH=old\nPORT=59000\n'
  assert.equal(
    setEnvValue(content, PASSWORD_HASH_ENV_KEY, 'new'),
    '# comment\nJWT_SECRET=abc\nACC_PASSWORD_HASH=new\nPORT=59000\n',
  )
})

await test('status returns default password only when the hash matches the default', async () => {
  const defaultHash = await bcrypt.hash(DEFAULT_LOGIN_PASSWORD, 4)
  const customHash = await bcrypt.hash('custom-password', 4)

  const defaultManager = createPasswordManager({ envPath: '/tmp/unused', initialHash: defaultHash })
  assert.deepEqual(await defaultManager.status(), { defaultPassword: true, password: DEFAULT_LOGIN_PASSWORD })

  const customManager = createPasswordManager({ envPath: '/tmp/unused', initialHash: customHash })
  assert.deepEqual(await customManager.status(), { defaultPassword: false })
})

await test('updatePassword persists a new hash and immediately verifies the new password', async () => withTempEnv('', async envPath => {
  const currentHash = await bcrypt.hash('current-secret', 4)
  writeFileSync(envPath, `JWT_SECRET=abc\nACC_PASSWORD_HASH=${currentHash}\n`, 'utf8')
  const manager = createPasswordManager({ envPath, initialHash: currentHash })

  assert.deepEqual(await manager.updatePassword('current-secret', 'new-secret'), { ok: true })
  assert.equal(await manager.verify('current-secret'), false)
  assert.equal(await manager.verify('new-secret'), true)

  const nextHash = readFileSync(envPath, 'utf8').match(/^ACC_PASSWORD_HASH=(.+)$/m)?.[1]
  assert.equal(await bcrypt.compare('new-secret', nextHash), true)
}))

await test('updatePassword rejects wrong current password and keeps the old hash', async () => withTempEnv('', async envPath => {
  const currentHash = await bcrypt.hash('current-secret', 4)
  writeFileSync(envPath, `ACC_PASSWORD_HASH=${currentHash}\n`, 'utf8')
  const manager = createPasswordManager({ envPath, initialHash: currentHash })

  assert.deepEqual(await manager.updatePassword('bad-secret', 'new-secret'), {
    ok: false,
    status: 401,
    error: 'current password incorrect',
  })
  assert.equal(await manager.verify('current-secret'), true)
  assert.equal(await manager.verify('new-secret'), false)
}))

await test('updatePassword rejects short new passwords and keeps the old hash', async () => withTempEnv('', async envPath => {
  const currentHash = await bcrypt.hash('current-secret', 4)
  writeFileSync(envPath, `ACC_PASSWORD_HASH=${currentHash}\n`, 'utf8')
  const manager = createPasswordManager({ envPath, initialHash: currentHash })

  assert.deepEqual(await manager.updatePassword('current-secret', 'short'), {
    ok: false,
    status: 400,
    error: 'new password must be at least 6 characters',
  })
  assert.equal(await manager.verify('current-secret'), true)
  assert.equal(await manager.verify('short'), false)
}))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
