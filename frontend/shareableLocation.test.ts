import assert from 'node:assert/strict'
import {
  buildClearedWorkspaceBrowserUrl,
  buildProjectChannelUrl,
  buildWorkspaceBrowserUrl,
  normalizeChannelIndex,
  parseProjectChannelLocation,
  parseWorkspaceBrowserLocation,
  pushWorkspaceBrowserUrl,
} from './src/shareableLocation'

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

test('parseProjectChannelLocation reads project and numeric channel', () => {
  assert.deepEqual(parseProjectChannelLocation('https://nexus.local/?project=alpha&channel=2'), {
    project: 'alpha',
    channel: 2,
    hasProject: true,
    hasChannel: true,
    channelMalformed: false,
  })
})

test('parseProjectChannelLocation decodes Unicode and reserved project characters', () => {
  const url = 'https://nexus.local/?project=%E9%A1%B9%E7%9B%AE%20a%2Fb%3Fc&channel=10'
  assert.equal(parseProjectChannelLocation(url).project, '项目 a/b?c')
})

test('parseProjectChannelLocation flags malformed channel', () => {
  const parsed = parseProjectChannelLocation('https://nexus.local/?project=alpha&channel=-1')
  assert.equal(parsed.channel, null)
  assert.equal(parsed.channelMalformed, true)
})

test('parseProjectChannelLocation treats missing params as absent', () => {
  assert.deepEqual(parseProjectChannelLocation('https://nexus.local/?panel=files'), {
    project: null,
    channel: null,
    hasProject: false,
    hasChannel: false,
    channelMalformed: false,
  })
})

test('buildProjectChannelUrl preserves unrelated params and hash', () => {
  const url = buildProjectChannelUrl({
    baseUrl: 'https://nexus.local/app?panel=files#bottom',
    project: 'alpha',
    channel: 3,
  })
  assert.equal(url, 'https://nexus.local/app?panel=files&project=alpha&channel=3#bottom')
})

test('buildProjectChannelUrl encodes Unicode and reserved project characters', () => {
  const url = buildProjectChannelUrl({
    baseUrl: 'https://nexus.local/',
    project: '项目 a/b?c',
    channel: 4,
  })
  const parsed = new URL(url)
  assert.equal(parsed.searchParams.get('project'), '项目 a/b?c')
  assert.equal(parsed.searchParams.get('channel'), '4')
})

test('buildProjectChannelUrl strips credential-like query params', () => {
  const url = buildProjectChannelUrl({
    baseUrl: 'https://nexus.local/?token=secret&ws_token=secret2&password=pw&access_token=a&panel=files',
    project: 'alpha',
    channel: 1,
  })
  const parsed = new URL(url)
  assert.equal(parsed.searchParams.get('token'), null)
  assert.equal(parsed.searchParams.get('ws_token'), null)
  assert.equal(parsed.searchParams.get('password'), null)
  assert.equal(parsed.searchParams.get('access_token'), null)
  assert.equal(parsed.searchParams.get('panel'), 'files')
})

test('normalizeChannelIndex floors valid numbers and falls back for invalid values', () => {
  assert.equal(normalizeChannelIndex(2.9), 2)
  assert.equal(normalizeChannelIndex('5'), 5)
  assert.equal(normalizeChannelIndex(-1), 0)
  assert.equal(normalizeChannelIndex('bad'), 0)
})

test('buildWorkspaceBrowserUrl opens workspace panel and preserves project channel state', () => {
  const url = buildWorkspaceBrowserUrl({
    baseUrl: 'https://nexus.local/?project=alpha&channel=2#term',
    path: '/workspace/app',
  })
  assert.equal(url, 'https://nexus.local/?project=alpha&channel=2&panel=workspace&workspacePath=%2Fworkspace%2Fapp#term')
})

test('buildWorkspaceBrowserUrl strips credentials from main page URL', () => {
  const url = buildWorkspaceBrowserUrl({
    baseUrl: 'https://nexus.local/?token=secret&ws_token=secret2&password=pw&project=alpha',
    path: '/workspace',
  })
  const parsed = new URL(url)
  assert.equal(parsed.searchParams.get('token'), null)
  assert.equal(parsed.searchParams.get('ws_token'), null)
  assert.equal(parsed.searchParams.get('password'), null)
  assert.equal(parsed.searchParams.get('project'), 'alpha')
  assert.equal(parsed.searchParams.get('panel'), 'workspace')
  assert.equal(parsed.searchParams.get('workspacePath'), '/workspace')
})

test('parseWorkspaceBrowserLocation reads workspace panel and decoded path', () => {
  assert.deepEqual(
    parseWorkspaceBrowserLocation('https://nexus.local/?panel=workspace&workspacePath=%2Fworkspace%2F%E9%A1%B9%E7%9B%AE'),
    {
      panel: 'workspace',
      workspacePath: '/workspace/项目',
      isWorkspaceOpen: true,
      hasWorkspacePath: true,
    },
  )
})

test('buildClearedWorkspaceBrowserUrl removes workspace panel without changing project channel', () => {
  const url = buildClearedWorkspaceBrowserUrl('https://nexus.local/?project=alpha&channel=2&panel=workspace&workspacePath=%2Fworkspace')
  assert.equal(url, 'https://nexus.local/?project=alpha&channel=2')
})

test('pushWorkspaceBrowserUrl creates an in-app history entry', () => {
  const calls: Array<{ state: unknown; title: string; url: string }> = []
  const fakeWindow = {
    location: { href: 'https://nexus.local/?project=alpha&channel=2' },
    history: {
      state: { existing: true },
      pushState(state: unknown, title: string, url: string) {
        calls.push({ state, title, url })
      },
    },
  } as unknown as Window

  const url = pushWorkspaceBrowserUrl('/workspace/app', fakeWindow)
  assert.equal(url, 'https://nexus.local/?project=alpha&channel=2&panel=workspace&workspacePath=%2Fworkspace%2Fapp')
  assert.deepEqual(calls, [
    {
      state: { existing: true },
      title: '',
      url: 'https://nexus.local/?project=alpha&channel=2&panel=workspace&workspacePath=%2Fworkspace%2Fapp',
    },
  ])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
