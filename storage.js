import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'

const DB_FILENAME = 'nexus.sqlite'
const SCHEMA_VERSION = 1
const DEFAULT_DEVICE_TYPE = 'legacy'
const VALID_DEVICE_TYPES = new Set(['legacy', 'mobile', 'desktop'])
const VALID_KEY_ACTIONS = new Set(['scrollToBottom', 'pasteClipboard', 'copyTerminal', 'fit'])
const MAX_INPUT_HISTORY_TEXT = 10000
const MAX_DRAFT_TEXT = 20000
const MAX_ATTENTION_SUMMARY = 500
const VALID_ATTENTION_STATUS = new Set(['new', 'seen', 'resolved', 'dismissed'])
const VALID_ATTENTION_TYPES = new Set(['needs-confirm', 'done', 'task-success', 'task-error'])
const VALID_TMUX_RECORD_STATUS = new Set(['active', 'closed'])
export const DEFAULT_SETTINGS = Object.freeze({
  composerMode: 'direct',
  composerAppendEnter: true,
  inputHistoryEnabled: true,
  inputHistoryRetentionDays: 30,
})

function nowIso() {
  return new Date().toISOString()
}

export function safeParseJson(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function readJsonFile(file, fallback = null) {
  try {
    if (!existsSync(file)) return fallback
    return safeParseJson(readFileSync(file, 'utf8'), fallback)
  } catch {
    return fallback
  }
}

function toJson(value, fallback) {
  try {
    return JSON.stringify(value ?? fallback)
  } catch {
    return JSON.stringify(fallback)
  }
}

function clampLimit(value, fallback, max) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), max)
}

function normalizeSettingValue(key, value) {
  if (key === 'composerMode') return value === 'composer' ? 'composer' : 'direct'
  if (key === 'composerAppendEnter' || key === 'inputHistoryEnabled') return Boolean(value)
  if (key === 'inputHistoryRetentionDays') {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return DEFAULT_SETTINGS.inputHistoryRetentionDays
    return Math.min(Math.floor(n), 3650)
  }
  return value
}

function normalizeSettings(patch = {}) {
  const out = {}
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) out[key] = normalizeSettingValue(key, patch[key])
  }
  return out
}

function taskCreatedAt(task) {
  return task?.createdAt || task?.created_at || new Date(0).toISOString()
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeChannelIndex(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.floor(n) : 0
}

function normalizeProjectName(value) {
  return String(value || '').trim()
}

function normalizeLauncher(value, fallback = 'bash') {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return fallback
  return raw
}

function normalizeRecordStatus(value, fallback = 'active') {
  const raw = String(value || '').trim().toLowerCase()
  return VALID_TMUX_RECORD_STATUS.has(raw) ? raw : fallback
}

function normalizeOrderList(values, liveValues = null, normalize = value => String(value)) {
  if (!Array.isArray(values)) throw new Error('order must be an array')
  const liveSet = new Set(Array.isArray(liveValues) ? liveValues.map(normalize) : [])
  const requireLiveMatch = Array.isArray(liveValues)
  const seen = new Set()
  const out = []
  for (const raw of values) {
    const value = normalize(raw)
    if (value === '' || seen.has(value)) continue
    if (requireLiveMatch && !liveSet.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export function mergeItemsWithSavedOrder(items, savedOrder, getKey) {
  if (!Array.isArray(items) || items.length === 0) return []
  const saved = Array.isArray(savedOrder) ? savedOrder.map(String) : []
  if (saved.length === 0) return items.slice()

  const byKey = new Map()
  for (const item of items) {
    byKey.set(String(getKey(item)), item)
  }

  const ordered = []
  const used = new Set()
  for (const key of saved) {
    if (!byKey.has(key) || used.has(key)) continue
    ordered.push(byKey.get(key))
    used.add(key)
  }
  for (const item of items) {
    const key = String(getKey(item))
    if (!used.has(key)) ordered.push(item)
  }
  return ordered
}

function draftScope(project, channelIndex) {
  return `${String(project || '')}:${normalizeChannelIndex(channelIndex)}`
}

function attentionDedupeKey({ type, project = '', channelIndex = null, taskId = '' }) {
  return [
    String(type || '').trim(),
    String(project || '').trim(),
    channelIndex === null || channelIndex === undefined || channelIndex === '' ? '' : String(normalizeChannelIndex(channelIndex)),
    String(taskId || '').trim(),
  ].join(':')
}

function normalizeAttentionType(type) {
  const value = String(type || '').trim()
  if (!VALID_ATTENTION_TYPES.has(value)) throw new Error('invalid attention event type')
  return value
}

function normalizeAttentionStatus(status, fallback = 'new') {
  const value = String(status || fallback).trim()
  return VALID_ATTENTION_STATUS.has(value) ? value : fallback
}

function normalizeAttentionSummary(summary) {
  return String(summary || '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '')
    .trim()
    .slice(-MAX_ATTENTION_SUMMARY)
}

function normalizeToolbarConfig(config) {
  if (!config || !Array.isArray(config.pinned) || !Array.isArray(config.expanded)) return null
  const normalized = {
    pinned: config.pinned.filter(Boolean).map(String),
    expanded: config.expanded.filter(Boolean).map(String),
  }
  if (Array.isArray(config.custom)) normalized.custom = config.custom
  return normalized
}

function normalizeDeviceType(deviceType) {
  const value = String(deviceType || DEFAULT_DEVICE_TYPE).toLowerCase()
  return VALID_DEVICE_TYPES.has(value) ? value : DEFAULT_DEVICE_TYPE
}

function validateCustomKeys(custom = []) {
  if (!Array.isArray(custom)) throw new Error('custom must be an array')
  const seen = new Set()
  for (const key of custom) {
    if (!key || typeof key !== 'object') throw new Error('custom key must be an object')
    const id = String(key.id || '').trim()
    const label = String(key.label || '').trim()
    const seq = typeof key.seq === 'string' ? key.seq : ''
    const action = key.action ? String(key.action) : ''
    if (!id || seen.has(id)) throw new Error('custom key id must be unique')
    if (!label) throw new Error('custom key label is required')
    if (action && !VALID_KEY_ACTIONS.has(action)) throw new Error('invalid custom key action')
    if (!action && typeof key.seq !== 'string') throw new Error('custom key seq is required')
    if (!action && seq.length > 128) throw new Error('custom key seq is too long')
    seen.add(id)
  }
}

export class NexusStore {
  constructor({ dataDir, toolbarConfigFile, tasksFile, maxTasks = 200, logger = console }) {
    this.dataDir = dataDir
    this.toolbarConfigFile = toolbarConfigFile
    this.tasksFile = tasksFile
    this.maxTasks = maxTasks
    this.logger = logger
    this.dbPath = join(dataDir, DB_FILENAME)
    this.ready = false

    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('busy_timeout = 5000')
    this.db.pragma('foreign_keys = ON')
    this.migrateSchema()
    this.migrateLegacyFiles()
    this.ready = true
  }

  migrateSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS toolbar_layouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_type TEXT NOT NULL DEFAULT '${DEFAULT_DEVICE_TYPE}',
        name TEXT NOT NULL DEFAULT 'Default',
        pinned_json TEXT NOT NULL,
        expanded_json TEXT NOT NULL,
        custom_json TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_toolbar_layouts_active
        ON toolbar_layouts(device_type, is_active, updated_at);

      CREATE TABLE IF NOT EXISTS shortcut_usage (
        device_type TEXT NOT NULL,
        key_id TEXT NOT NULL,
        use_count INTEGER NOT NULL DEFAULT 0,
        first_used_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        PRIMARY KEY (device_type, key_id)
      );

      CREATE TABLE IF NOT EXISTS input_history (
        id TEXT PRIMARY KEY,
        project TEXT,
        channel_index INTEGER,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_input_history_recent
        ON input_history(used_at DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_input_history_scope
        ON input_history(project, channel_index, used_at DESC);

      CREATE TABLE IF NOT EXISTS composer_drafts (
        scope_key TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        channel_index INTEGER NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        cursor_pos INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_order (
        project TEXT PRIMARY KEY,
        position INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_project_order_position
        ON project_order(position);

      CREATE TABLE IF NOT EXISTS channel_order (
        project TEXT NOT NULL,
        channel_index INTEGER NOT NULL,
        position INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (project, channel_index)
      );
      CREATE INDEX IF NOT EXISTS idx_channel_order_scope_position
        ON channel_order(project, position);

      CREATE TABLE IF NOT EXISTS tmux_projects (
        name TEXT PRIMARY KEY,
        cwd TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL DEFAULT '',
        launcher TEXT NOT NULL DEFAULT 'bash',
        original_launcher TEXT NOT NULL DEFAULT '',
        profile TEXT NOT NULL DEFAULT '',
        last_channel_index INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        restored_at TEXT,
        CHECK (status IN ('active', 'closed'))
      );
      CREATE INDEX IF NOT EXISTS idx_tmux_projects_status
        ON tmux_projects(status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS tmux_channels (
        project TEXT NOT NULL,
        channel_index INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        cwd TEXT NOT NULL DEFAULT '',
        launcher TEXT NOT NULL DEFAULT 'bash',
        original_launcher TEXT NOT NULL DEFAULT '',
        profile TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        restored_at TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (project, channel_index),
        CHECK (status IN ('active', 'closed'))
      );
      CREATE INDEX IF NOT EXISTS idx_tmux_channels_status
        ON tmux_channels(status, project, channel_index);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_created
        ON tasks(created_at DESC);

      CREATE TABLE IF NOT EXISTS attention_events (
        id TEXT PRIMARY KEY,
        dedupe_key TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        project TEXT,
        channel_index INTEGER,
        task_id TEXT,
        summary TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        seen_at TEXT,
        resolved_at TEXT,
        dismissed_at TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        CHECK (status IN ('new', 'seen', 'resolved', 'dismissed'))
      );
      CREATE INDEX IF NOT EXISTS idx_attention_events_status
        ON attention_events(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_attention_events_scope
        ON attention_events(project, channel_index, updated_at DESC);
    `)

    this.db.prepare(`
      INSERT INTO schema_meta (key, value, updated_at)
      VALUES ('schema_version', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(String(SCHEMA_VERSION), nowIso())
  }

  migrateLegacyFiles() {
    this.migrateToolbarConfigFromJson()
    this.migrateTasksFromJson()
  }

  getMigrationFlag(key) {
    return this.db.prepare('SELECT value FROM schema_meta WHERE key = ?').get(key)?.value
  }

  setMigrationFlag(key, value = '1') {
    this.db.prepare(`
      INSERT INTO schema_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, nowIso())
  }

  migrateToolbarConfigFromJson() {
    if (this.getMigrationFlag('migrated_toolbar_config_v1') === '1') return
    const existing = this.getToolbarConfig(DEFAULT_DEVICE_TYPE)
    if (existing) {
      this.setMigrationFlag('migrated_toolbar_config_v1')
      return
    }
    const config = normalizeToolbarConfig(readJsonFile(this.toolbarConfigFile, null))
    if (!config) {
      this.setMigrationFlag('migrated_toolbar_config_v1', existsSync(this.toolbarConfigFile) ? 'invalid' : 'missing')
      return
    }
    this.saveToolbarConfig(config, DEFAULT_DEVICE_TYPE, 'Migrated legacy layout')
    this.setMigrationFlag('migrated_toolbar_config_v1')
  }

  migrateTasksFromJson() {
    if (this.getMigrationFlag('migrated_tasks_v1') === '1') return
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM tasks').get()?.count ?? 0
    if (count > 0) {
      this.setMigrationFlag('migrated_tasks_v1')
      return
    }
    const tasks = readJsonFile(this.tasksFile, null)
    if (!Array.isArray(tasks)) {
      this.setMigrationFlag('migrated_tasks_v1', existsSync(this.tasksFile) ? 'invalid' : 'missing')
      return
    }
    this.replaceTasks(tasks, this.maxTasks)
    this.setMigrationFlag('migrated_tasks_v1')
  }

  getToolbarConfig(deviceType = DEFAULT_DEVICE_TYPE) {
    const row = this.db.prepare(`
      SELECT pinned_json, expanded_json, custom_json
      FROM toolbar_layouts
      WHERE device_type = ? AND is_active = 1
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `).get(deviceType)
    if (!row && deviceType !== DEFAULT_DEVICE_TYPE) return this.getToolbarConfig(DEFAULT_DEVICE_TYPE)
    if (!row) return null
    const config = {
      pinned: safeParseJson(row.pinned_json, []),
      expanded: safeParseJson(row.expanded_json, []),
    }
    const custom = safeParseJson(row.custom_json, [])
    if (Array.isArray(custom) && custom.length > 0) config.custom = custom
    return normalizeToolbarConfig(config)
  }

  saveToolbarConfig(config, deviceType = DEFAULT_DEVICE_TYPE, name = 'Custom layout') {
    deviceType = normalizeDeviceType(deviceType)
    const normalized = normalizeToolbarConfig(config)
    if (!normalized) throw new Error('invalid toolbar config')
    validateCustomKeys(normalized.custom ?? [])
    const ts = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE toolbar_layouts SET is_active = 0, updated_at = ? WHERE device_type = ? AND is_active = 1')
        .run(ts, deviceType)
      this.db.prepare(`
        INSERT INTO toolbar_layouts
          (device_type, name, pinned_json, expanded_json, custom_json, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        deviceType,
        name,
        toJson(normalized.pinned, []),
        toJson(normalized.expanded, []),
        toJson(normalized.custom ?? [], []),
        ts,
        ts,
      )
    })
    tx()
    return normalized
  }

  listToolbarLayouts(deviceType = DEFAULT_DEVICE_TYPE) {
    deviceType = normalizeDeviceType(deviceType)
    return this.db.prepare(`
      SELECT id, device_type, name, pinned_json, expanded_json, custom_json, is_active, created_at, updated_at
      FROM toolbar_layouts
      WHERE device_type = ?
      ORDER BY is_active DESC, updated_at DESC, id DESC
    `).all(deviceType).map(row => ({
      id: row.id,
      deviceType: row.device_type,
      name: row.name,
      pinned: safeParseJson(row.pinned_json, []),
      expanded: safeParseJson(row.expanded_json, []),
      custom: safeParseJson(row.custom_json, []),
      active: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  recordShortcutUsage({ keyId, deviceType = DEFAULT_DEVICE_TYPE }) {
    const id = String(keyId || '').trim()
    if (!id) throw new Error('keyId required')
    const dev = normalizeDeviceType(deviceType)
    const ts = nowIso()
    this.db.prepare(`
      INSERT INTO shortcut_usage (device_type, key_id, use_count, first_used_at, last_used_at)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(device_type, key_id) DO UPDATE SET
        use_count = use_count + 1,
        last_used_at = excluded.last_used_at
    `).run(dev, id, ts, ts)
    return this.db.prepare('SELECT device_type, key_id, use_count, first_used_at, last_used_at FROM shortcut_usage WHERE device_type = ? AND key_id = ?')
      .get(dev, id)
  }

  getShortcutRecommendations(deviceType = DEFAULT_DEVICE_TYPE, limit = 8) {
    const dev = normalizeDeviceType(deviceType)
    const layout = this.getToolbarConfig(dev)
    const pinned = new Set(layout?.pinned ?? [])
    return this.db.prepare(`
      SELECT key_id, use_count, last_used_at
      FROM shortcut_usage
      WHERE device_type = ?
      ORDER BY use_count DESC, last_used_at DESC
      LIMIT ?
    `).all(dev, clampLimit(limit, 8, 50)).map(row => ({
      keyId: row.key_id,
      useCount: row.use_count,
      lastUsedAt: row.last_used_at,
      recommendedAction: pinned.has(row.key_id) ? 'keep' : 'pin',
    }))
  }

  listTasks(limit = this.maxTasks) {
    const rows = this.db.prepare(`
      SELECT raw_json
      FROM tasks
      ORDER BY created_at ASC
      LIMIT ?
    `).all(clampLimit(limit, this.maxTasks, Math.max(this.maxTasks, 1000)))
    return rows.map(row => safeParseJson(row.raw_json, null)).filter(Boolean)
  }

  replaceTasks(tasks, maxTasks = this.maxTasks) {
    if (!Array.isArray(tasks)) throw new Error('tasks must be an array')
    const trimmed = tasks.length > maxTasks ? tasks.slice(-maxTasks) : tasks
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM tasks').run()
      const stmt = this.db.prepare(`
        INSERT INTO tasks (id, status, created_at, updated_at, raw_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const task of trimmed) {
        if (!task?.id) continue
        const createdAt = taskCreatedAt(task)
        stmt.run(String(task.id), task.status || '', createdAt, task.updatedAt || task.completedAt || nowIso(), toJson(task, {}))
      }
    })
    tx()
    return trimmed
  }

  deleteTask(id) {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(String(id))
  }

  getSettings() {
    const rows = this.db.prepare('SELECT key, value_json FROM settings').all()
    const stored = {}
    for (const row of rows) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, row.key)) continue
      stored[row.key] = normalizeSettingValue(row.key, safeParseJson(row.value_json, DEFAULT_SETTINGS[row.key]))
    }
    return { ...DEFAULT_SETTINGS, ...stored }
  }

  updateSettings(patch) {
    const normalized = normalizeSettings(patch)
    const ts = nowIso()
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `)
    const tx = this.db.transaction(() => {
      for (const [key, value] of Object.entries(normalized)) stmt.run(key, toJson(value, DEFAULT_SETTINGS[key]), ts)
    })
    tx()
    return this.getSettings()
  }

  cleanupInputHistory(retentionDays = this.getSettings().inputHistoryRetentionDays) {
    const days = Number(retentionDays)
    if (!Number.isFinite(days) || days <= 0) return 0
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    return this.db.prepare('DELETE FROM input_history WHERE created_at < ?').run(cutoff).changes
  }

  clearInputHistory() {
    return this.db.prepare('DELETE FROM input_history').run().changes
  }

  listInputHistory({ project, channelIndex, limit = 50 } = {}) {
    const bounded = clampLimit(limit, 50, 200)
    if (project !== undefined && project !== null && project !== '') {
      const rows = this.db.prepare(`
        SELECT id, project, channel_index, text, created_at, used_at,
          CASE WHEN project = ? AND channel_index = ? THEN 0 ELSE 1 END AS priority
        FROM input_history
        ORDER BY priority ASC, used_at DESC, created_at DESC
        LIMIT ?
      `).all(String(project), normalizeChannelIndex(channelIndex), bounded)
      return rows.map(this.mapInputHistoryRow)
    }
    return this.db.prepare(`
      SELECT id, project, channel_index, text, created_at, used_at
      FROM input_history
      ORDER BY used_at DESC, created_at DESC
      LIMIT ?
    `).all(bounded).map(this.mapInputHistoryRow)
  }

  mapInputHistoryRow(row) {
    return {
      id: row.id,
      project: row.project || '',
      channelIndex: row.channel_index ?? 0,
      text: row.text,
      createdAt: row.created_at,
      usedAt: row.used_at,
    }
  }

  addInputHistory({ project = '', channelIndex = 0, text }) {
    const settings = this.getSettings()
    if (!settings.inputHistoryEnabled) return null
    const value = String(text || '').slice(0, MAX_INPUT_HISTORY_TEXT)
    if (!value.trim()) return null
    const ts = nowIso()
    const id = makeId('hist')
    this.db.prepare(`
      INSERT INTO input_history (id, project, channel_index, text, created_at, used_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, String(project || ''), normalizeChannelIndex(channelIndex), value, ts, ts)
    this.cleanupInputHistory(settings.inputHistoryRetentionDays)
    return { id, project: String(project || ''), channelIndex: normalizeChannelIndex(channelIndex), text: value, createdAt: ts, usedAt: ts }
  }

  deleteInputHistory(id) {
    if (!id) return this.clearInputHistory()
    return this.db.prepare('DELETE FROM input_history WHERE id = ?').run(String(id)).changes
  }

  getComposerDraft({ project = '', channelIndex = 0 }) {
    const row = this.db.prepare(`
      SELECT project, channel_index, text, cursor_pos, updated_at
      FROM composer_drafts
      WHERE scope_key = ?
    `).get(draftScope(project, channelIndex))
    if (!row) return { project: String(project || ''), channelIndex: normalizeChannelIndex(channelIndex), text: '', cursorPos: 0, updatedAt: null }
    return {
      project: row.project,
      channelIndex: row.channel_index,
      text: row.text,
      cursorPos: row.cursor_pos,
      updatedAt: row.updated_at,
    }
  }

  saveComposerDraft({ project = '', channelIndex = 0, text = '', cursorPos = 0 }) {
    const value = String(text || '').slice(0, MAX_DRAFT_TEXT)
    const idx = normalizeChannelIndex(channelIndex)
    const cursor = Math.max(0, Math.min(Number(cursorPos) || 0, value.length))
    const ts = nowIso()
    this.db.prepare(`
      INSERT INTO composer_drafts (scope_key, project, channel_index, text, cursor_pos, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        text = excluded.text,
        cursor_pos = excluded.cursor_pos,
        updated_at = excluded.updated_at
    `).run(draftScope(project, idx), String(project || ''), idx, value, cursor, ts)
    return { project: String(project || ''), channelIndex: idx, text: value, cursorPos: cursor, updatedAt: ts }
  }

  clearComposerDraft({ project = '', channelIndex = 0 }) {
    return this.db.prepare('DELETE FROM composer_drafts WHERE scope_key = ?')
      .run(draftScope(project, channelIndex)).changes
  }

  getProjectOrder() {
    return this.db.prepare(`
      SELECT project
      FROM project_order
      ORDER BY position ASC, updated_at ASC
    `).all().map(row => row.project)
  }

  saveProjectOrder(order = [], liveProjects = []) {
    const normalized = normalizeOrderList(order, liveProjects, normalizeProjectName)
    const ts = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM project_order').run()
      const stmt = this.db.prepare(`
        INSERT INTO project_order (project, position, updated_at)
        VALUES (?, ?, ?)
      `)
      normalized.forEach((project, index) => stmt.run(project, index, ts))
    })
    tx()
    return normalized
  }

  orderProjects(projects = []) {
    const ordered = mergeItemsWithSavedOrder(projects, this.getProjectOrder(), project => project.name)
    const liveNames = projects.map(project => project.name)
    this.pruneProjectOrder(liveNames)
    return ordered
  }

  pruneProjectOrder(liveProjects = []) {
    const normalized = normalizeOrderList(liveProjects, null, normalizeProjectName)
    if (normalized.length === 0) {
      return this.db.prepare('DELETE FROM project_order').run().changes
    }
    const placeholders = normalized.map(() => '?').join(',')
    return this.db.prepare(`DELETE FROM project_order WHERE project NOT IN (${placeholders})`).run(...normalized).changes
  }

  getChannelOrder(project = '') {
    const projectName = normalizeProjectName(project)
    if (!projectName) return []
    return this.db.prepare(`
      SELECT channel_index
      FROM channel_order
      WHERE project = ?
      ORDER BY position ASC, updated_at ASC
    `).all(projectName).map(row => row.channel_index)
  }

  saveChannelOrder(project = '', order = [], liveIndexes = []) {
    const projectName = normalizeProjectName(project)
    if (!projectName) throw new Error('project required')
    const normalized = normalizeOrderList(order, liveIndexes, value => String(normalizeChannelIndex(value)))
      .map(value => normalizeChannelIndex(value))
    const ts = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM channel_order WHERE project = ?').run(projectName)
      const stmt = this.db.prepare(`
        INSERT INTO channel_order (project, channel_index, position, updated_at)
        VALUES (?, ?, ?, ?)
      `)
      normalized.forEach((channelIndex, index) => stmt.run(projectName, channelIndex, index, ts))
    })
    tx()
    return normalized
  }

  orderChannels(project = '', channels = []) {
    const projectName = normalizeProjectName(project)
    const ordered = mergeItemsWithSavedOrder(channels, this.getChannelOrder(projectName), channel => channel.index)
    const liveIndexes = channels.map(channel => channel.index)
    this.pruneChannelOrder(projectName, liveIndexes)
    return ordered
  }

  pruneChannelOrder(project = '', liveIndexes = []) {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    const normalized = normalizeOrderList(liveIndexes, null, value => String(normalizeChannelIndex(value)))
      .map(value => normalizeChannelIndex(value))
    if (normalized.length === 0) {
      return this.db.prepare('DELETE FROM channel_order WHERE project = ?').run(projectName).changes
    }
    const placeholders = normalized.map(() => '?').join(',')
    return this.db.prepare(`DELETE FROM channel_order WHERE project = ? AND channel_index NOT IN (${placeholders})`)
      .run(projectName, ...normalized).changes
  }

  renameProjectOrder(oldProject = '', newProject = '') {
    const oldName = normalizeProjectName(oldProject)
    const newName = normalizeProjectName(newProject)
    if (!oldName || !newName || oldName === newName) return 0
    const ts = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM project_order WHERE project = ?').run(newName)
      this.db.prepare('DELETE FROM channel_order WHERE project = ?').run(newName)
      this.db.prepare(`
        UPDATE project_order
        SET project = ?, updated_at = ?
        WHERE project = ?
      `).run(newName, ts, oldName)
      this.db.prepare(`
        UPDATE channel_order
        SET project = ?, updated_at = ?
        WHERE project = ?
      `).run(newName, ts, oldName)
    })
    tx()
    return 1
  }

  mapTmuxProjectRow(row) {
    if (!row) return null
    return {
      name: row.name,
      cwd: row.cwd || '',
      displayName: row.display_name || row.name,
      launcher: row.launcher || 'bash',
      originalLauncher: row.original_launcher || '',
      profile: row.profile || '',
      lastChannelIndex: row.last_channel_index ?? null,
      status: row.status || 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      restoredAt: row.restored_at || null,
    }
  }

  mapTmuxChannelRow(row) {
    if (!row) return null
    return {
      project: row.project,
      channelIndex: row.channel_index,
      name: row.name || '',
      cwd: row.cwd || '',
      launcher: row.launcher || 'bash',
      originalLauncher: row.original_launcher || '',
      profile: row.profile || '',
      status: row.status || 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      restoredAt: row.restored_at || null,
      metadata: safeParseJson(row.metadata_json, {}),
    }
  }

  getTmuxProject(name = '') {
    const project = normalizeProjectName(name)
    if (!project) return null
    return this.mapTmuxProjectRow(this.db.prepare('SELECT * FROM tmux_projects WHERE name = ?').get(project))
  }

  getTmuxChannel(project = '', channelIndex = 0) {
    const projectName = normalizeProjectName(project)
    if (!projectName) return null
    return this.mapTmuxChannelRow(this.db.prepare('SELECT * FROM tmux_channels WHERE project = ? AND channel_index = ?')
      .get(projectName, normalizeChannelIndex(channelIndex)))
  }

  upsertTmuxProject(project = {}, opts = {}) {
    const name = normalizeProjectName(project.name)
    if (!name) throw new Error('project name required')
    const existing = this.getTmuxProject(name)
    const preserve = Boolean(opts.preserveExistingLauncher)
    const ts = nowIso()
    const launcher = preserve && existing?.launcher
      ? existing.launcher
      : normalizeLauncher(project.launcher ?? existing?.launcher, 'bash')
    const originalLauncher = preserve && existing?.originalLauncher
      ? existing.originalLauncher
      : String(project.originalLauncher ?? existing?.originalLauncher ?? '')
    const profile = preserve && existing?.profile
      ? existing.profile
      : String(project.profile ?? existing?.profile ?? '')
    const row = {
      name,
      cwd: String(project.cwd ?? existing?.cwd ?? ''),
      displayName: String(project.displayName ?? existing?.displayName ?? name),
      launcher,
      originalLauncher,
      profile,
      lastChannelIndex: project.lastChannelIndex !== undefined ? normalizeChannelIndex(project.lastChannelIndex) : existing?.lastChannelIndex,
      status: normalizeRecordStatus(project.status ?? existing?.status ?? 'active'),
      createdAt: existing?.createdAt || ts,
      updatedAt: ts,
      restoredAt: project.restoredAt ?? existing?.restoredAt ?? null,
    }
    this.db.prepare(`
      INSERT INTO tmux_projects (
        name, cwd, display_name, launcher, original_launcher, profile, last_channel_index,
        status, created_at, updated_at, restored_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        cwd = excluded.cwd,
        display_name = excluded.display_name,
        launcher = excluded.launcher,
        original_launcher = excluded.original_launcher,
        profile = excluded.profile,
        last_channel_index = excluded.last_channel_index,
        status = excluded.status,
        updated_at = excluded.updated_at,
        restored_at = excluded.restored_at
    `).run(
      row.name,
      row.cwd,
      row.displayName,
      row.launcher,
      row.originalLauncher,
      row.profile,
      row.lastChannelIndex,
      row.status,
      row.createdAt,
      row.updatedAt,
      row.restoredAt,
    )
    return this.getTmuxProject(name)
  }

  upsertTmuxChannel(channel = {}, opts = {}) {
    const project = normalizeProjectName(channel.project)
    if (!project) throw new Error('project required')
    const channelIndex = normalizeChannelIndex(channel.channelIndex ?? channel.index)
    const existing = this.getTmuxChannel(project, channelIndex)
    const preserve = Boolean(opts.preserveExistingLauncher)
    const ts = nowIso()
    const launcher = preserve && existing?.launcher
      ? existing.launcher
      : normalizeLauncher(channel.launcher ?? existing?.launcher, 'bash')
    const originalLauncher = preserve && existing?.originalLauncher
      ? existing.originalLauncher
      : String(channel.originalLauncher ?? existing?.originalLauncher ?? '')
    const profile = preserve && existing?.profile
      ? existing.profile
      : String(channel.profile ?? existing?.profile ?? '')
    const row = {
      project,
      channelIndex,
      name: String(channel.name ?? existing?.name ?? ''),
      cwd: String(channel.cwd ?? existing?.cwd ?? ''),
      launcher,
      originalLauncher,
      profile,
      status: normalizeRecordStatus(channel.status ?? existing?.status ?? 'active'),
      createdAt: existing?.createdAt || ts,
      updatedAt: ts,
      restoredAt: channel.restoredAt ?? existing?.restoredAt ?? null,
      metadata: channel.metadata ?? existing?.metadata ?? {},
    }
    this.db.prepare(`
      INSERT INTO tmux_channels (
        project, channel_index, name, cwd, launcher, original_launcher, profile,
        status, created_at, updated_at, restored_at, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project, channel_index) DO UPDATE SET
        name = excluded.name,
        cwd = excluded.cwd,
        launcher = excluded.launcher,
        original_launcher = excluded.original_launcher,
        profile = excluded.profile,
        status = excluded.status,
        updated_at = excluded.updated_at,
        restored_at = excluded.restored_at,
        metadata_json = excluded.metadata_json
    `).run(
      row.project,
      row.channelIndex,
      row.name,
      row.cwd,
      row.launcher,
      row.originalLauncher,
      row.profile,
      row.status,
      row.createdAt,
      row.updatedAt,
      row.restoredAt,
      toJson(row.metadata, {}),
    )
    return this.getTmuxChannel(project, channelIndex)
  }

  listTmuxProjects({ status = 'active' } = {}) {
    if (status === 'all') {
      return this.db.prepare('SELECT * FROM tmux_projects ORDER BY updated_at DESC, name ASC')
        .all().map(row => this.mapTmuxProjectRow(row))
    }
    return this.db.prepare('SELECT * FROM tmux_projects WHERE status = ? ORDER BY updated_at DESC, name ASC')
      .all(normalizeRecordStatus(status, 'active')).map(row => this.mapTmuxProjectRow(row))
  }

  listTmuxChannels(project = '', { status = 'active' } = {}) {
    const projectName = normalizeProjectName(project)
    const filters = []
    const args = []
    if (projectName) {
      filters.push('project = ?')
      args.push(projectName)
    }
    if (status !== 'all') {
      filters.push('status = ?')
      args.push(normalizeRecordStatus(status, 'active'))
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    return this.db.prepare(`
      SELECT *
      FROM tmux_channels
      ${where}
      ORDER BY project ASC, channel_index ASC
    `).all(...args).map(row => this.mapTmuxChannelRow(row))
  }

  closeTmuxProject(project = '') {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    const ts = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE tmux_projects SET status = 'closed', updated_at = ? WHERE name = ?").run(ts, projectName)
      this.db.prepare("UPDATE tmux_channels SET status = 'closed', updated_at = ? WHERE project = ?").run(ts, projectName)
    })
    tx()
    return 1
  }

  closeTmuxChannel(project = '', channelIndex = 0) {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    return this.db.prepare("UPDATE tmux_channels SET status = 'closed', updated_at = ? WHERE project = ? AND channel_index = ?")
      .run(nowIso(), projectName, normalizeChannelIndex(channelIndex)).changes
  }

  renameTmuxProject(oldProject = '', newProject = '') {
    const oldName = normalizeProjectName(oldProject)
    const newName = normalizeProjectName(newProject)
    if (!oldName || !newName || oldName === newName) return 0
    const ts = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM tmux_projects WHERE name = ?').run(newName)
      this.db.prepare('DELETE FROM tmux_channels WHERE project = ?').run(newName)
      this.db.prepare('UPDATE tmux_projects SET name = ?, display_name = ?, updated_at = ? WHERE name = ?')
        .run(newName, newName, ts, oldName)
      this.db.prepare('UPDATE tmux_channels SET project = ?, updated_at = ? WHERE project = ?')
        .run(newName, ts, oldName)
    })
    tx()
    return 1
  }

  renameTmuxChannel(project = '', channelIndex = 0, name = '') {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    return this.db.prepare('UPDATE tmux_channels SET name = ?, updated_at = ? WHERE project = ? AND channel_index = ?')
      .run(String(name || ''), nowIso(), projectName, normalizeChannelIndex(channelIndex)).changes
  }

  setTmuxProjectLastChannel(project = '', channelIndex = 0) {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    return this.db.prepare('UPDATE tmux_projects SET last_channel_index = ?, updated_at = ? WHERE name = ?')
      .run(normalizeChannelIndex(channelIndex), nowIso(), projectName).changes
  }

  markTmuxProjectRestored(project = '') {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    const ts = nowIso()
    return this.db.prepare('UPDATE tmux_projects SET restored_at = ?, updated_at = ? WHERE name = ?')
      .run(ts, ts, projectName).changes
  }

  markTmuxChannelRestored(project = '', channelIndex = 0) {
    const projectName = normalizeProjectName(project)
    if (!projectName) return 0
    const ts = nowIso()
    return this.db.prepare('UPDATE tmux_channels SET restored_at = ?, updated_at = ? WHERE project = ? AND channel_index = ?')
      .run(ts, ts, projectName, normalizeChannelIndex(channelIndex)).changes
  }

  mapAttentionEventRow(row) {
    return {
      id: row.id,
      dedupeKey: row.dedupe_key,
      type: row.type,
      project: row.project || '',
      channelIndex: row.channel_index,
      taskId: row.task_id || '',
      summary: row.summary || '',
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      seenAt: row.seen_at || null,
      resolvedAt: row.resolved_at || null,
      dismissedAt: row.dismissed_at || null,
      metadata: safeParseJson(row.metadata_json, {}),
    }
  }

  upsertAttentionEvent({ type, project = '', channelIndex = null, taskId = '', summary = '', metadata = {}, status = 'new', dedupeKey = '' }) {
    const eventType = normalizeAttentionType(type)
    const normalizedStatus = normalizeAttentionStatus(status, 'new')
    const key = dedupeKey || attentionDedupeKey({ type: eventType, project, channelIndex, taskId })
    const ts = nowIso()
    const id = makeId('attn')
    const idx = channelIndex === null || channelIndex === undefined || channelIndex === '' ? null : normalizeChannelIndex(channelIndex)
    const boundedSummary = normalizeAttentionSummary(summary)
    this.db.prepare(`
      INSERT INTO attention_events (
        id, dedupe_key, type, project, channel_index, task_id, summary, status,
        created_at, updated_at, seen_at, resolved_at, dismissed_at, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
      ON CONFLICT(dedupe_key) DO UPDATE SET
        summary = excluded.summary,
        updated_at = excluded.updated_at,
        status = CASE
          WHEN attention_events.status IN ('resolved', 'dismissed') THEN attention_events.status
          WHEN attention_events.status = 'seen' THEN 'seen'
          ELSE excluded.status
        END,
        metadata_json = excluded.metadata_json
    `).run(
      id,
      key,
      eventType,
      String(project || ''),
      idx,
      String(taskId || ''),
      boundedSummary,
      normalizedStatus,
      ts,
      ts,
      toJson(metadata || {}, {}),
    )
    const row = this.db.prepare('SELECT * FROM attention_events WHERE dedupe_key = ?').get(key)
    return this.mapAttentionEventRow(row)
  }

  listAttentionEvents({ status = 'unresolved', project, channelIndex, limit = 100 } = {}) {
    const bounded = clampLimit(limit, 100, 500)
    const filters = []
    const args = []
    if (status === 'unresolved' || status === undefined || status === null || status === '') {
      filters.push("status IN ('new', 'seen')")
    } else if (status !== 'all') {
      filters.push('status = ?')
      args.push(normalizeAttentionStatus(status, 'new'))
    }
    if (project !== undefined && project !== null && project !== '') {
      filters.push('project = ?')
      args.push(String(project))
    }
    if (channelIndex !== undefined && channelIndex !== null && channelIndex !== '') {
      filters.push('channel_index = ?')
      args.push(normalizeChannelIndex(channelIndex))
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const rows = this.db.prepare(`
      SELECT *
      FROM attention_events
      ${where}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ?
    `).all(...args, bounded)
    return rows.map(row => this.mapAttentionEventRow(row))
  }

  countAttentionEvents({ status = 'unresolved' } = {}) {
    if (status === 'unresolved' || status === undefined || status === null || status === '') {
      return this.db.prepare("SELECT COUNT(*) AS count FROM attention_events WHERE status IN ('new', 'seen')").get().count
    }
    if (status === 'all') {
      return this.db.prepare('SELECT COUNT(*) AS count FROM attention_events').get().count
    }
    return this.db.prepare('SELECT COUNT(*) AS count FROM attention_events WHERE status = ?')
      .get(normalizeAttentionStatus(status, 'new')).count
  }

  markAttentionSeen({ project = '', channelIndex = null, id = '' } = {}) {
    const ts = nowIso()
    if (id) {
      return this.db.prepare(`
        UPDATE attention_events
        SET status = 'seen', seen_at = COALESCE(seen_at, ?), updated_at = ?
        WHERE id = ? AND status = 'new'
      `).run(ts, ts, String(id)).changes
    }
    if (project !== '' && channelIndex !== null && channelIndex !== undefined) {
      return this.db.prepare(`
        UPDATE attention_events
        SET status = 'seen', seen_at = COALESCE(seen_at, ?), updated_at = ?
        WHERE project = ? AND channel_index = ? AND status = 'new'
      `).run(ts, ts, String(project), normalizeChannelIndex(channelIndex)).changes
    }
    return 0
  }

  updateAttentionEventStatus(id, status) {
    const eventStatus = normalizeAttentionStatus(status)
    const ts = nowIso()
    const patch = {
      new: "status = 'new', updated_at = ?",
      seen: "status = 'seen', seen_at = COALESCE(seen_at, ?), updated_at = ?",
      resolved: "status = 'resolved', resolved_at = COALESCE(resolved_at, ?), updated_at = ?",
      dismissed: "status = 'dismissed', dismissed_at = COALESCE(dismissed_at, ?), updated_at = ?",
    }[eventStatus]
    const args = eventStatus === 'new' ? [ts, String(id)] : [ts, ts, String(id)]
    const changes = this.db.prepare(`UPDATE attention_events SET ${patch} WHERE id = ?`).run(...args).changes
    const row = this.db.prepare('SELECT * FROM attention_events WHERE id = ?').get(String(id))
    return row ? this.mapAttentionEventRow(row) : { ok: false, changes }
  }
}

export function createNexusStore(opts) {
  if (process.env.NEXUS_DISABLE_SQLITE === '1') {
    opts.logger?.warn?.('[Nexus] SQLite disabled by NEXUS_DISABLE_SQLITE=1; using legacy JSON storage')
    return null
  }
  try {
    return new NexusStore(opts)
  } catch (err) {
    opts.logger?.error?.('[Nexus] SQLite initialization failed; using legacy JSON storage:', err.message)
    return null
  }
}
