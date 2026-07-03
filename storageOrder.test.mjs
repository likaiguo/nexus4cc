import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { NexusStore, mergeItemsWithSavedOrder } from './storage.js'

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

function withStore(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-order-'))
  try {
    const store = new NexusStore({
      dataDir: dir,
      toolbarConfigFile: join(dir, 'toolbar-config.json'),
      tasksFile: join(dir, 'tasks.json'),
      logger: { warn() {}, error() {} },
    })
    fn(store)
    store.db.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('mergeItemsWithSavedOrder keeps saved items first and appends new live items', () => {
  const items = [{ name: 'new' }, { name: 'b' }, { name: 'a' }]
  assert.deepEqual(
    mergeItemsWithSavedOrder(items, ['a', 'missing', 'b'], item => item.name).map(item => item.name),
    ['a', 'b', 'new'],
  )
})

test('saveProjectOrder filters stale and duplicate projects', () => withStore(store => {
  const saved = store.saveProjectOrder(['b', 'stale', 'a', 'b'], ['a', 'b', 'c'])
  assert.deepEqual(saved, ['b', 'a'])
  assert.deepEqual(store.orderProjects([{ name: 'c' }, { name: 'b' }, { name: 'a' }]).map(project => project.name), ['b', 'a', 'c'])
}))

test('saveChannelOrder filters stale and duplicate indexes', () => withStore(store => {
  const saved = store.saveChannelOrder('proj', [2, 99, 1, 2], [1, 2, 3])
  assert.deepEqual(saved, [2, 1])
  assert.deepEqual(store.orderChannels('proj', [{ index: 3 }, { index: 2 }, { index: 1 }]).map(channel => channel.index), [2, 1, 3])
}))

test('renameProjectOrder migrates project and channel order scopes', () => withStore(store => {
  store.saveProjectOrder(['old', 'other'], ['old', 'other'])
  store.saveChannelOrder('old', [3, 1], [1, 3])
  store.renameProjectOrder('old', 'new')
  assert.deepEqual(store.getProjectOrder(), ['new', 'other'])
  assert.deepEqual(store.getChannelOrder('old'), [])
  assert.deepEqual(store.getChannelOrder('new'), [3, 1])
}))

test('quick phrases support CRUD, ordering, validation, and usage tracking', () => withStore(store => {
  const first = store.createQuickPhrase({ title: ' First  phrase ', text: 'echo one', appendEnter: false })
  const second = store.createQuickPhrase({ title: 'Second', text: 'echo two' })

  assert.equal(first.title, 'First phrase')
  assert.equal(first.appendEnter, false)
  assert.equal(second.appendEnter, true)
  assert.deepEqual(store.listQuickPhrases().map(phrase => phrase.id), [first.id, second.id])

  const updated = store.updateQuickPhrase(first.id, { title: 'Updated', text: 'echo 1', appendEnter: true })
  assert.equal(updated.title, 'Updated')
  assert.equal(updated.text, 'echo 1')
  assert.equal(updated.appendEnter, true)

  assert.deepEqual(store.reorderQuickPhrases([second.id]).map(phrase => phrase.id), [second.id, first.id])

  const used = store.markQuickPhraseUsed(second.id)
  assert.equal(used.useCount, 1)
  assert.ok(used.lastUsedAt)

  assert.equal(store.deleteQuickPhrase(first.id), 1)
  assert.deepEqual(store.listQuickPhrases().map(phrase => phrase.id), [second.id])
  assert.throws(() => store.createQuickPhrase({ title: '', text: 'echo nope' }), /title required/)
  assert.throws(() => store.createQuickPhrase({ title: 'Nope', text: '   ' }), /text required/)
}))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
