import { cpSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { isAbsolute, join, normalize, resolve } from 'path'

export const NEXUS_DATA_DIR_ENV = 'NEXUS_DATA_DIR'
export const DEFAULT_DATA_HOME_NAME = '.nexus4cc'
export const LEGACY_DATA_ITEMS = Object.freeze([
  'nexus.sqlite',
  'nexus.sqlite-wal',
  'nexus.sqlite-shm',
  'toolbar-config.json',
  'tasks.json',
  'configs',
])

function expandHomePath(value, homeDir) {
  if (value === '~') return homeDir
  if (value?.startsWith('~/')) return join(homeDir, value.slice(2))
  return value
}

function samePath(a, b) {
  return normalize(resolve(a)) === normalize(resolve(b))
}

export function resolveNexusDataDir({ env = process.env, homeDir = homedir() } = {}) {
  const configured = String(env[NEXUS_DATA_DIR_ENV] || '').trim()
  if (configured) {
    const expanded = expandHomePath(configured, homeDir)
    return isAbsolute(expanded) ? normalize(expanded) : normalize(resolve(expanded))
  }
  return normalize(join(homeDir || process.cwd(), DEFAULT_DATA_HOME_NAME, 'data'))
}

export function copyMissingLegacyData({ legacyDataDir, dataDir, logger = console } = {}) {
  if (!legacyDataDir || !dataDir || samePath(legacyDataDir, dataDir)) {
    if (dataDir && !existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
    return { copied: [], skipped: [], failed: [] }
  }

  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const result = { copied: [], skipped: [], failed: [] }
  for (const item of LEGACY_DATA_ITEMS) {
    const src = join(legacyDataDir, item)
    const dest = join(dataDir, item)
    if (!existsSync(src)) {
      result.skipped.push({ item, reason: 'source-missing' })
      continue
    }
    if (existsSync(dest)) {
      result.skipped.push({ item, reason: 'destination-exists' })
      continue
    }
    try {
      cpSync(src, dest, { recursive: true, errorOnExist: false })
      result.copied.push(item)
    } catch (err) {
      result.failed.push({ item, error: err.message })
      logger?.warn?.(`[Nexus] Failed to copy legacy data item ${item}: ${err.message}`)
    }
  }
  return result
}
