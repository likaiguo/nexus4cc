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

export interface WorkspaceBrowserLocation {
  panel: string | null
  workspacePath: string | null
  isWorkspaceOpen: boolean
  hasWorkspacePath: boolean
}

export interface BuildWorkspaceBrowserUrlOptions {
  baseUrl: string | URL
  path?: string | null
}

const PROJECT_PARAM = 'project'
const CHANNEL_PARAM = 'channel'
const PANEL_PARAM = 'panel'
const WORKSPACE_PATH_PARAM = 'workspacePath'
const WORKSPACE_PANEL = 'workspace'

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

export function parseWorkspaceBrowserLocation(input: string | URL = window.location.href): WorkspaceBrowserLocation {
  const url = toUrl(input)
  const panel = url.searchParams.get(PANEL_PARAM)
  const rawPath = url.searchParams.get(WORKSPACE_PATH_PARAM)
  const workspacePath = rawPath && rawPath.trim() ? rawPath : null

  return {
    panel,
    workspacePath,
    isWorkspaceOpen: panel === WORKSPACE_PANEL,
    hasWorkspacePath: rawPath !== null,
  }
}

export function buildWorkspaceBrowserUrl({ baseUrl, path }: BuildWorkspaceBrowserUrlOptions): string {
  const url = toUrl(baseUrl)
  stripSensitiveParams(url.searchParams)
  url.searchParams.set(PANEL_PARAM, WORKSPACE_PANEL)
  if (path && path.trim()) {
    url.searchParams.set(WORKSPACE_PATH_PARAM, path)
  } else {
    url.searchParams.delete(WORKSPACE_PATH_PARAM)
  }
  return url.toString()
}

export function buildClearedWorkspaceBrowserUrl(baseUrl: string | URL): string {
  const url = toUrl(baseUrl)
  stripSensitiveParams(url.searchParams)
  if (url.searchParams.get(PANEL_PARAM) === WORKSPACE_PANEL) {
    url.searchParams.delete(PANEL_PARAM)
  }
  url.searchParams.delete(WORKSPACE_PATH_PARAM)
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

export function replaceWorkspaceBrowserUrl(path?: string | null, win: Window = window): string {
  const nextUrl = buildWorkspaceBrowserUrl({
    baseUrl: win.location.href,
    path,
  })
  const currentUrl = win.location.href
  if (nextUrl !== currentUrl) {
    win.history.replaceState(win.history.state, '', nextUrl)
  }
  return nextUrl
}

export function pushWorkspaceBrowserUrl(path?: string | null, win: Window = window): string {
  const nextUrl = buildWorkspaceBrowserUrl({
    baseUrl: win.location.href,
    path,
  })
  const currentUrl = win.location.href
  if (nextUrl !== currentUrl) {
    win.history.pushState(win.history.state, '', nextUrl)
  }
  return nextUrl
}

export function clearWorkspaceBrowserUrl(win: Window = window): string {
  const nextUrl = buildClearedWorkspaceBrowserUrl(win.location.href)
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
