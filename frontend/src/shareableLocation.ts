export interface ProjectChannelLocation {
  project: string | null
  channel: number | null
  hasProject: boolean
  hasChannel: boolean
  channelMalformed: boolean
}

export interface BuildProjectChannelUrlOptions {
  baseUrl: string | URL
  project: string
  channel: number
}

const PROJECT_PARAM = 'project'
const CHANNEL_PARAM = 'channel'

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'auth',
  'authorization',
  'access_token',
  'id_token',
  'refresh_token',
  'password',
  'pass',
  'jwt',
  'api_key',
  'apikey',
  'ws_token',
  'websocket_token',
])

export function parseProjectChannelLocation(input: string | URL = window.location.href): ProjectChannelLocation {
  const url = toUrl(input)
  const rawProject = url.searchParams.get(PROJECT_PARAM)
  const rawChannel = url.searchParams.get(CHANNEL_PARAM)
  const hasProject = rawProject !== null
  const hasChannel = rawChannel !== null
  const trimmedChannel = rawChannel?.trim() ?? ''
  const channel = parseChannelIndex(trimmedChannel)

  return {
    project: rawProject && rawProject.trim() ? rawProject : null,
    channel,
    hasProject,
    hasChannel,
    channelMalformed: hasChannel && channel === null,
  }
}

export function buildProjectChannelUrl({ baseUrl, project, channel }: BuildProjectChannelUrlOptions): string {
  const url = toUrl(baseUrl)
  stripSensitiveParams(url.searchParams)
  url.searchParams.set(PROJECT_PARAM, project)
  url.searchParams.set(CHANNEL_PARAM, String(normalizeChannelIndex(channel)))
  return url.toString()
}

export function replaceProjectChannelUrl(project: string, channel: number, win: Window = window): string {
  const nextUrl = buildProjectChannelUrl({
    baseUrl: win.location.href,
    project,
    channel,
  })
  const currentUrl = win.location.href
  if (nextUrl !== currentUrl) {
    win.history.replaceState(win.history.state, '', nextUrl)
  }
  return nextUrl
}

export function normalizeChannelIndex(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function parseChannelIndex(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0) return null
  return n
}

function stripSensitiveParams(params: URLSearchParams) {
  for (const key of [...params.keys()]) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) params.delete(key)
  }
}

function toUrl(input: string | URL): URL {
  if (input instanceof URL) return new URL(input.toString())
  return new URL(input, 'http://localhost/')
}
