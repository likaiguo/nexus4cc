import { useState, useRef, useEffect, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import GhostShield from './GhostShield'
import useOverlayGuard from './useOverlayGuard'
import { Icon } from './icons'
import type { Terminal } from '@xterm/xterm'
import { KeyDef, ToolbarConfig, ALL_KEYS, FACTORY_CONFIG } from './toolbarDefaults'
import { TOOLBAR_PRESETS, appendCustomKeyToSection, applyRecommendation, mergePresetWithCustom, toolbarDeviceType, type ShortcutRecommendation, type ToolbarDeviceType } from './toolbarPresets'
import type { ThemeMode } from './Terminal'

interface Props {
  token: string
  sendToWs: (data: string) => void
  scrollToBottom: () => void
  termRef: RefObject<Terminal | null>
  themeMode: ThemeMode
  onToggleTheme: () => void
  onOpenSettings?: () => void
  onOpenSessions?: () => void
  onUpload?: () => void
  onUploadFile?: (file: File) => void
  onUploadFiles?: (files: FileList) => void
  onOpenFiles?: () => void
  onOpenWorkspace?: () => void
  onOpenQuickPhrases?: () => void
  onOpenSessionArchives?: () => void
  onFitTerminal?: () => void
  onOpenTerminalHistory?: () => void
  onShowCopySheet?: (text: string) => void
  composerControls?: {
    active: boolean
    hasDraft: boolean
    appendEnter: boolean
    historyOpen: boolean
    onOpen: () => void
    onClose: () => void
    onToggleAppendEnter: () => void
    onToggleHistory: () => void
    onClear: () => void
  }
  attentionEntry?: {
    count: number
    onOpen: () => void
  }
  locationShare?: {
    copied: boolean
    onCopy: () => void
  }
  /** When true: renders as a compact sidebar section (no theme/settings, flex-wrap key grid) */
  embedded?: boolean
  /** Controlled collapsed state (optional). If provided, component acts as controlled. */
  collapsed?: boolean
  /** Callback when collapsed state changes (for controlled mode) */
  onCollapsedChange?: (collapsed: boolean) => void
}

// Convert a user-typed label (e.g. "^X", "M-b", "Esc") to the raw seq bytes.
// Returns null if unrecognized.
function labelToSeq(label: string): string | null {
  const l = label.trim()
  if (!l) return null
  // Named specials
  const specials: Record<string, string> = {
    'Esc': '\x1b', 'esc': '\x1b', 'ESC': '\x1b',
    '↵': '\r', 'Enter': '\r', 'enter': '\r', '⏎': '\r',
    '⌫': '\x7f', 'Backspace': '\x7f', 'BS': '\x7f',
    '⇥': '\t', 'Tab': '\t', 'tab': '\t',
    '^⇥': '\x1b[Z', 'S-Tab': '\x1b[Z',
    '↑': '\x1b[A', '↓': '\x1b[B', '→': '\x1b[C', '←': '\x1b[D',
    'Del': '\x1b[3~', 'Home': '\x1b[H', 'End': '\x1b[F',
    'PgUp': '\x1b[5~', 'PgDn': '\x1b[6~',
  }
  if (specials[l] !== undefined) return specials[l]
  // ^X → Ctrl+X byte (0x01..0x1a for A-Z)
  const ctrlMatch = /^\^([a-zA-Z])$/.exec(l)
  if (ctrlMatch) {
    const letter = ctrlMatch[1].toUpperCase()
    return String.fromCharCode(letter.charCodeAt(0) - 64)
  }
  // M-x or Mx → Alt+x → ESC + x
  const altMatch = /^M-?([a-zA-Z0-9])$/.exec(l)
  if (altMatch) return '\x1b' + altMatch[1].toLowerCase()
  // Single plain char
  if (l.length === 1) return l
  // Fallback: let JSON decode escape sequences (\x18 etc.)
  try { return JSON.parse('"' + l.replace(/"/g, '\\"') + '"') } catch { return null }
}

const CONFIG_KEY = 'nexus_toolbar_v2'
const USER_DEFAULT_KEY = 'nexus_toolbar_default'
const COLLAPSED_KEY = 'nexus_toolbar_collapsed'

// PC 端断点
const PC_BREAKPOINT = 1024
const REPEATABLE_KEY_IDS = new Set(['up', 'down', 'left', 'right'])
const KEY_REPEAT_INITIAL_DELAY_MS = 320
const KEY_REPEAT_INTERVAL_MS = 75

function loadConfig(): ToolbarConfig {
  try {
    const s = localStorage.getItem(CONFIG_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  try {
    const d = localStorage.getItem(USER_DEFAULT_KEY)
    if (d) return JSON.parse(d)
  } catch {}
  return { pinned: [...FACTORY_CONFIG.pinned], expanded: [...FACTORY_CONFIG.expanded] }
}

function configKeyFor(deviceType: ToolbarDeviceType) {
  return `${CONFIG_KEY}_${deviceType}`
}

function loadDefault(): ToolbarConfig {
  try {
    const d = localStorage.getItem(USER_DEFAULT_KEY)
    if (d) return JSON.parse(d)
  } catch {}
  return { pinned: [...FACTORY_CONFIG.pinned], expanded: [...FACTORY_CONFIG.expanded] }
}

// ---- 拖拽状态 ----
interface DragState {
  section: 'pinned' | 'expanded' | 'all'
  fromIdx: number
  toIdx: number
  startY: number
  currentY: number
}

const ITEM_HEIGHT = 48 // px，每行编辑项高度

export default function Toolbar({ token, sendToWs, scrollToBottom, termRef: _termRef, themeMode, onToggleTheme, onOpenSettings, onUploadFile, onUploadFiles, onOpenFiles, onOpenWorkspace, onOpenQuickPhrases, onOpenSessionArchives, onFitTerminal, onOpenTerminalHistory, onShowCopySheet, composerControls, attentionEntry, locationShare, embedded, collapsed: controlledCollapsed, onCollapsedChange }: Props) {
  const { t } = useTranslation()
  const [config, setConfig]           = useState<ToolbarConfig>(loadConfig)
  const [deviceType, setDeviceType] = useState<ToolbarDeviceType>(() => toolbarDeviceType(window.innerWidth))
  const [recommendations, setRecommendations] = useState<ShortcutRecommendation[]>([])
  const isControlled = controlledCollapsed !== undefined
  const [collapsedInternal, setCollapsedInternal] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (saved !== null) return saved === 'true'
    // Default: keep mobile at the three-row quick layout; expanded shortcuts are opt-in.
    return window.innerWidth < PC_BREAKPOINT ? true : window.innerWidth >= 1024
  })
  const collapsed = isControlled ? controlledCollapsed : collapsedInternal

  function setCollapsed(value: boolean | ((prev: boolean) => boolean)) {
    const next = typeof value === 'function' ? value(collapsed) : value
    if (isControlled) {
      onCollapsedChange?.(next)
    } else {
      setCollapsedInternal(next)
    }
    localStorage.setItem(COLLAPSED_KEY, String(next))
  }

  const [editing, setEditing]         = useState(false)
  const [showPasteBox, setShowPasteBox] = useState(false)
  const pasteBoxRef   = useRef<HTMLTextAreaElement>(null)
  const pasteInitialRef = useRef('')
  const pasteFileRef  = useRef<HTMLInputElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [drag, setDrag]               = useState<DragState | null>(null)
  const [savedFlash, setSavedFlash]   = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [menuPos, setMenuPos]         = useState({ bottom: 60, right: 8 })
  const [uploadMenuPos, setUploadMenuPos] = useState({ bottom: 60, right: 44 })
  const menuBtnRef                    = useRef<HTMLButtonElement>(null)
  const uploadBtnRef                  = useRef<HTMLButtonElement>(null)
  const [isPC, setIsPC]               = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const editScrollRef = useRef<HTMLDivElement>(null)
  const isDraggingMouse = useRef(false)
  const repeatTimeoutRef = useRef<number | null>(null)
  const repeatIntervalRef = useRef<number | null>(null)

  // Guard xterm textarea when editing panel is open (prevents keyboard popup)
  useOverlayGuard(_termRef, editing)

  const existsUserDefault = !!localStorage.getItem(USER_DEFAULT_KEY)

  // 检测 PC/移动端
  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth
      setIsPC(width >= PC_BREAKPOINT)
      setDeviceType(toolbarDeviceType(width))
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // 启动时从服务端拉取配置，覆盖 localStorage 缓存
  useEffect(() => {
    try {
      const cached = localStorage.getItem(configKeyFor(deviceType))
      if (cached) setConfig(JSON.parse(cached))
    } catch {}
    fetch(`/api/toolbar-config?device_type=${deviceType}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.pinned && data.expanded) {
          setConfig(data)
          localStorage.setItem(configKeyFor(deviceType), JSON.stringify(data))
          localStorage.setItem(CONFIG_KEY, JSON.stringify(data))
        }
      })
    .catch(() => {})
    fetch(`/api/toolbar-layouts?device_type=${deviceType}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data?.recommendations)) setRecommendations(data.recommendations) })
      .catch(() => {})
  }, [token, deviceType])

  // 根元素：阻止 touchstart 默认行为，防止键盘弹出。
  // 但滚动区及其子元素（含拖拽手柄）跳过 preventDefault，
  // 让浏览器正常处理滚动，也让 React 合成事件能到达 drag handle。
  // editing 变化时重新注册，因为元素会切换（container ↔ editPanel）。
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const prevent = (e: TouchEvent) => {
      if (editScrollRef.current?.contains(e.target as Node)) return
      e.preventDefault()
    }
    el.addEventListener('touchstart', prevent, { passive: false })
    return () => el.removeEventListener('touchstart', prevent)
  }, [editing])

  // 鼠标拖拽全局监听 — 在 drag 变化时重新注册，确保闭包引用最新的 onDragMove/onDragEnd
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDraggingMouse.current) return
      onDragMove(e.clientY)
    }
    function onMouseUp() {
      if (!isDraggingMouse.current) return
      isDraggingMouse.current = false
      onDragEnd()
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [drag])

  useEffect(() => {
    if (showPasteBox) setTimeout(() => {
      const el = pasteBoxRef.current
      if (!el) return
      el.value = pasteInitialRef.current
      // Place cursor at end so the user can keep typing
      const len = el.value.length
      el.focus()
      el.setSelectionRange(len, len)
    }, 50)
  }, [showPasteBox])

  function saveConfig(c: ToolbarConfig) {
    localStorage.setItem(configKeyFor(deviceType), JSON.stringify(c))
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
    fetch('/api/toolbar-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(c),
    }).catch(() => {})
    fetch('/api/toolbar-layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_type: deviceType, name: 'Custom layout', config: c }),
    }).catch(() => {})
  }

  function updateConfig(next: ToolbarConfig) { setConfig(next); saveConfig(next) }

  function reportShortcutUsage(key: KeyDef) {
    fetch('/api/shortcut-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key_id: key.id, device_type: deviceType }),
    }).catch(() => {})
  }

  function applyPreset(presetId: string) {
    const preset = TOOLBAR_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    updateConfig(mergePresetWithCustom(preset.config, config))
  }

  function pinRecommendation(keyId: string) {
    updateConfig(applyRecommendation(config, keyId))
    setRecommendations(prev => prev.filter(r => r.keyId !== keyId))
  }

  function stopKeyRepeat() {
    if (repeatTimeoutRef.current !== null) {
      window.clearTimeout(repeatTimeoutRef.current)
      repeatTimeoutRef.current = null
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = null
    }
  }

  useEffect(() => {
    window.addEventListener('blur', stopKeyRepeat)
    return () => {
      window.removeEventListener('blur', stopKeyRepeat)
      stopKeyRepeat()
    }
  }, [])

  function sendShortcutSequence(key: KeyDef) {
    if (key.seq) sendToWs(key.seq)
  }

  async function handleKey(key: KeyDef, options: { reportUsage?: boolean } = {}) {
    const { reportUsage = true } = options
    if (reportUsage) reportShortcutUsage(key)
    if (key.action === 'scrollToBottom') {
      scrollToBottom()
    } else if (key.action === 'pasteClipboard') {
      // Text paste is an app-level action. Image/file upload stays behind
      // explicit upload controls instead of hiding behind paste.
      pasteInitialRef.current = ''
      if (navigator.clipboard) {
        try {
          const text = await navigator.clipboard.readText()
          if (text) pasteInitialRef.current = text
        } catch {}
      }
      setShowPasteBox(true)
    } else if (key.action === 'openTerminalHistory') {
      onOpenTerminalHistory?.()
    } else if (key.action === 'fit') {
      onFitTerminal?.()
    } else if (key.action === 'copyTerminal') {
      try {
        const term = _termRef.current
        if (!term) return
        const buffer = (term as any).buffer?.active
        if (!buffer) return
        const lines: string[] = []
        for (let i = buffer.viewportY; i < buffer.length; i++) {
          const line = buffer.getLine(i)
          if (line) lines.push(line.translateToString(true))
        }
        const text = lines.join('\n')
        if (onShowCopySheet) {
          onShowCopySheet(text)
        }
      } catch {
        // ignore
      }
    } else {
      sendShortcutSequence(key)
    }
  }

  function isRepeatableKey(key: KeyDef) {
    return !key.action && REPEATABLE_KEY_IDS.has(key.id)
  }

  function handleShortcutPointerDown(e: React.PointerEvent<HTMLButtonElement>, key: KeyDef) {
    e.preventDefault()
    e.stopPropagation()
    stopKeyRepeat()
    handleKey(key)
    if (!isRepeatableKey(key)) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    repeatTimeoutRef.current = window.setTimeout(() => {
      repeatTimeoutRef.current = null
      sendShortcutSequence(key)
      repeatIntervalRef.current = window.setInterval(() => {
        sendShortcutSequence(key)
      }, KEY_REPEAT_INTERVAL_MS)
    }, KEY_REPEAT_INITIAL_DELAY_MS)
  }

  function removeKey(_section: 'pinned' | 'expanded' | 'all', id: string) {
    updateConfig({
      ...config,
      pinned: config.pinned.filter(k => k !== id),
      expanded: config.expanded.filter(k => k !== id),
    })
  }

  function addKey(section: 'pinned' | 'expanded' | 'all', id: string) {
    if (config.pinned.includes(id) || config.expanded.includes(id)) return
    if (section === 'pinned') {
      updateConfig({ ...config, pinned: [...config.pinned, id] })
    } else if (section === 'expanded') {
      updateConfig({ ...config, expanded: [...config.expanded, id] })
    } else {
      // 'all' — unified mode: append to pinned
      updateConfig({ ...config, pinned: [...config.pinned, id] })
    }
  }

  function resetConfig() {
    const d = loadDefault()
    updateConfig({ ...d, custom: config.custom })
  }

  function saveAsDefault() {
    localStorage.setItem(USER_DEFAULT_KEY, JSON.stringify(config))
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  // ---- 拖拽逻辑 ----
  function onDragStart(section: 'pinned' | 'expanded' | 'all', idx: number, clientY: number) {
    setDrag({ section, fromIdx: idx, toIdx: idx, startY: clientY, currentY: clientY })
  }

  function getSectionIds(section: 'pinned' | 'expanded' | 'all'): string[] {
    return section === 'all' ? [...config.pinned, ...config.expanded] : config[section]
  }

  function onDragMove(clientY: number) {
    if (!drag) return
    const delta = clientY - drag.startY
    const shift = Math.round(delta / ITEM_HEIGHT)
    const ids = getSectionIds(drag.section)
    const len = ids.length
    const toIdx = Math.max(0, Math.min(len - 1, drag.fromIdx + shift))
    setDrag(prev => prev ? { ...prev, currentY: clientY, toIdx } : null)
  }

  function onDragEnd() {
    if (!drag || drag.fromIdx === drag.toIdx) { setDrag(null); return }
    if (drag.section === 'all') {
      const all = [...config.pinned, ...config.expanded]
      const [item] = all.splice(drag.fromIdx, 1)
      all.splice(drag.toIdx, 0, item)
      updateConfig({ ...config, pinned: all, expanded: [] })
    } else {
      const arr = [...config[drag.section]]
      const [item] = arr.splice(drag.fromIdx, 1)
      arr.splice(drag.toIdx, 0, item)
      updateConfig({ ...config, [drag.section]: arr })
    }
    setDrag(null)
  }

  // 拖拽中预览排列
  function getDisplayIds(section: 'pinned' | 'expanded' | 'all'): string[] {
    const base = getSectionIds(section)
    if (!drag || drag.section !== section) return base
    const arr = [...base]
    const [item] = arr.splice(drag.fromIdx, 1)
    arr.splice(drag.toIdx, 0, item)
    return arr
  }

  const allKeys = [...ALL_KEYS, ...(config.custom ?? [])]
  const KEY_MAP = Object.fromEntries(allKeys.map(k => [k.id, k]))
  const usedIds = new Set([...config.pinned, ...config.expanded])
  const availableKeys = allKeys.filter(k => !usedIds.has(k.id))
  const customKeys = config.custom ?? []

  // ---- Custom key form state ----
  const [newLabel, setNewLabel] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [formError, setFormError] = useState('')

  function addCustomKey(section: 'pinned' | 'expanded') {
    const label = newLabel.trim()
    if (!label) { setFormError('label required'); return }
    const seq = labelToSeq(label)
    if (seq === null) { setFormError('unrecognized label — see hints below'); return }
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const keyDef: KeyDef = {
      id,
      label,
      seq,
      desc: newDesc.trim() || label,
      category: 'control',
    }
    updateConfig(appendCustomKeyToSection(config, keyDef, section))
    setNewLabel(''); setNewDesc(''); setFormError('')
  }

  function deleteCustomKey(id: string) {
    updateConfig({
      ...config,
      pinned: config.pinned.filter(k => k !== id),
      expanded: config.expanded.filter(k => k !== id),
      custom: customKeys.filter(k => k.id !== id),
    })
  }

  // ---- 编辑面板 ----
  if (editing) {
    const editContent = (
      <>
        {/* 头部 */}
        <div className={isPC ? 'flex items-center justify-between px-5 py-4 border-b border-nexus-border shrink-0' : 'flex items-center justify-between px-2.5 py-2 border-b border-nexus-border shrink-0'}>
          <div>
            <span className={isPC ? 'text-nexus-text text-base font-semibold' : 'text-nexus-text text-sm font-semibold'}>{t('toolbar.toolbarEdit')}</span>
            <div className={isPC ? 'text-nexus-muted text-xs mt-1' : 'text-nexus-muted text-[10px] mt-0.5'}>
              {existsUserDefault ? t('toolbar.resetToSaved') : t('toolbar.resetToFactory')}
            </div>
          </div>
          <div className="flex gap-2">
            <button onPointerDown={(e) => { e.preventDefault(); resetConfig() }} className={isPC ? editBtnSmPCClass : editBtnSmClass}>{t('toolbar.reset')}</button>
            <button
              onPointerDown={(e) => { e.preventDefault(); saveAsDefault() }}
              className={savedFlash ? (isPC ? 'text-nexus-success border-nexus-success ' + editBtnSmPCClass : 'text-nexus-success border-nexus-success ' + editBtnSmClass) : (isPC ? editBtnSmPCClass : editBtnSmClass)}
            >
              {savedFlash ? t('common.saved') : t('toolbar.saveAsDefault')}
            </button>
            <button onPointerDown={(e) => { e.preventDefault(); setEditing(false) }} className={isPC ? editBtnPrimaryPCClass : editBtnPrimaryClass}>{t('toolbar.done')}</button>
          </div>
        </div>

        {/* 列表 */}
        <div ref={editScrollRef} className={isPC ? 'overflow-y-auto flex-1 py-2' : 'overflow-y-auto flex-1'}>
          <div className={isPC ? 'px-5 py-2.5 border-b border-nexus-border' : 'px-2.5 py-2 border-b border-nexus-border'}>
            <div className={isPC ? 'text-nexus-text-2 text-xs mb-2 tracking-wide uppercase' : 'text-nexus-text-2 text-[11px] mb-1.5 tracking-wide uppercase'}>
              {t('toolbar.presets')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOOLBAR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  className={isPC ? addBtnPCClass : addBtnClass}
                  onPointerDown={(e) => { e.preventDefault(); applyPreset(preset.id) }}
                >
                  {t(preset.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {recommendations.some(r => r.recommendedAction === 'pin') && (
            <div className={isPC ? 'px-5 py-2.5 border-b border-nexus-border' : 'px-2.5 py-2 border-b border-nexus-border'}>
              <div className={isPC ? 'text-nexus-text-2 text-xs mb-2 tracking-wide uppercase' : 'text-nexus-text-2 text-[11px] mb-1.5 tracking-wide uppercase'}>
                {t('toolbar.recommendations')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recommendations.filter(r => r.recommendedAction === 'pin').slice(0, 6).map(rec => {
                  const key = KEY_MAP[rec.keyId]
                  if (!key) return null
                  return (
                    <button
                      key={rec.keyId}
                      className={isPC ? addBtnPCClass : addBtnClass}
                      onPointerDown={(e) => { e.preventDefault(); pinRecommendation(rec.keyId) }}
                      title={`${t(key.desc)} (${rec.useCount})`}
                    >
                      + {key.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(['pinned', 'expanded'] as const).map(section => (
            <div key={section} className="mb-1">
              <div className={isPC ? 'text-nexus-text-2 text-xs px-5 py-2.5 pb-1.5 tracking-wide uppercase' : 'text-nexus-text-2 text-[11px] px-2.5 py-1.5 pb-[3px] tracking-wide uppercase'}>
                {section === 'pinned' ? t('toolbar.fixedRow') : t('toolbar.expandSection')}
              </div>
              {getDisplayIds(section).map((id, idx) => {
                const key = KEY_MAP[id]
                if (!key) return null
                const isDragging = drag?.section === section && drag.toIdx === idx && drag.fromIdx !== idx
                const isSource   = drag?.section === section && drag.fromIdx === idx && drag.fromIdx !== drag.toIdx
                return (
                  <div
                    key={id}
                    className={[
                      isPC ? 'flex items-center px-5 h-12 gap-3 border-b border-nexus-border box-border' : 'flex items-center px-2.5 h-12 gap-2 border-b border-nexus-border box-border',
                      isDragging ? 'bg-[color-mix(in_srgb,var(--nexus-accent)_12%,transparent)] border-nexus-accent' : '',
                      isSource ? 'opacity-[0.35]' : ''
                    ].filter(Boolean).join(' ')}
                  >
                    {/* 拖拽手柄 */}
                      <div
                        className="text-nexus-text-2 text-base cursor-grab py-2 px-1 shrink-0 touch-none flex items-center"
                        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onDragStart(section, idx, e.touches[0].clientY) }}
                        onTouchMove={(e) => { e.stopPropagation(); onDragMove(e.touches[0].clientY) }}
                        onTouchEnd={() => onDragEnd()}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          isDraggingMouse.current = true
                          onDragStart(section, idx, e.clientY)
                        }}
                      >
                        <Icon name="grip" size={16} />
                      </div>
                      <span className="text-nexus-text font-mono text-sm min-w-[60px] shrink-0">{key.label}</span>
                      <span className="text-nexus-text-2 text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{t(key.desc)}</span>
                      <button
                        className="bg-transparent border-none text-nexus-error cursor-pointer text-xl px-2 py-1 shrink-0 leading-none flex items-center justify-center"
                        onPointerDown={(e) => { e.preventDefault(); removeKey(section, id) }}
                        title={t('toolbar.remove')}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}

          {/* 自定义按键 */}
          <div className="mb-1">
            <div className={isPC ? 'text-nexus-text-2 text-xs px-5 py-2.5 pb-1.5 tracking-wide uppercase' : 'text-nexus-text-2 text-[11px] px-2.5 py-1.5 pb-[3px] tracking-wide uppercase'}>
              Custom Keys
            </div>
            {customKeys.map(key => {
              const inPinned = config.pinned.includes(key.id)
              const inExpanded = config.expanded.includes(key.id)
              return (
                <div key={key.id} className={isPC ? 'flex items-center px-5 h-12 gap-3 border-b border-nexus-border box-border' : 'flex items-center px-2.5 h-12 gap-2 border-b border-nexus-border box-border'}>
                  <span className={isPC ? 'text-nexus-text font-mono text-sm min-w-[60px] shrink-0' : 'text-nexus-text font-mono text-[13px] min-w-[48px] shrink-0'}>{key.label}</span>
                  <span className={isPC ? 'text-nexus-text-2 text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap' : 'text-nexus-text-2 text-[11px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap'}>{key.desc}</span>
                  <div className="flex gap-1 shrink-0">
                    {!inPinned && !inExpanded && (
                      <>
                        <button className={isPC ? addBtnPCClass : addBtnClass} onPointerDown={(e) => { e.preventDefault(); addKey('pinned', key.id) }}>{t('toolbar.pinToFixed')}</button>
                        <button className={isPC ? addBtnPCClass : addBtnClass} onPointerDown={(e) => { e.preventDefault(); addKey('expanded', key.id) }}>{t('toolbar.pinToExpand')}</button>
                      </>
                    )}
                    {inExpanded && (
                      <button className={isPC ? addBtnPCClass : addBtnClass} onPointerDown={(e) => { e.preventDefault(); updateConfig({ ...config, expanded: config.expanded.filter(k => k !== key.id), pinned: [...config.pinned, key.id] }) }}>→ {t('toolbar.pinToFixed')}</button>
                    )}
                    {inPinned && (
                      <button className={isPC ? addBtnPCClass : addBtnClass} onPointerDown={(e) => { e.preventDefault(); updateConfig({ ...config, pinned: config.pinned.filter(k => k !== key.id), expanded: [...config.expanded, key.id] }) }}>→ {t('toolbar.pinToExpand')}</button>
                    )}
                    <button
                      className={isPC ? 'bg-transparent border-none text-nexus-error cursor-pointer text-xl px-2 py-1 shrink-0 leading-none flex items-center justify-center' : 'bg-transparent border-none text-nexus-error cursor-pointer text-lg px-0.5 shrink-0 leading-none flex items-center justify-center'}
                      onPointerDown={(e) => { e.preventDefault(); deleteCustomKey(key.id) }}
                      title="Delete"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
            {/* 新增表单 */}
            <div className={isPC ? 'flex flex-col gap-2 px-5 py-3 border-b border-nexus-border' : 'flex flex-col gap-1.5 px-2.5 py-2 border-b border-nexus-border'}>
              <div className="flex gap-2">
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Key (e.g. ^X)"
                  className="flex-1 min-w-0 bg-nexus-bg-2 border border-nexus-border rounded px-2 py-1.5 text-nexus-text text-sm outline-none font-mono"
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 min-w-0 bg-nexus-bg-2 border border-nexus-border rounded px-2 py-1.5 text-nexus-text text-sm outline-none"
                />
                <button
                  onPointerDown={(e) => { e.preventDefault(); addCustomKey('pinned') }}
                  className="px-3 py-1.5 rounded bg-nexus-accent text-white text-sm font-medium cursor-pointer border-none shrink-0"
                >
                  {t('toolbar.pinToFixed')}
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); addCustomKey('expanded') }}
                  className={isPC ? addBtnPCClass : addBtnClass}
                >
                  {t('toolbar.pinToExpand')}
                </button>
              </div>
              {formError && <div className="text-nexus-error text-xs">{formError}</div>}
              <div className="text-nexus-text-2 text-[11px] leading-relaxed">
                <div>Notation:</div>
                <div>• <code>^</code> = Ctrl，如 <code>^X</code> = Ctrl+X（tmux prefix）</div>
                <div>• <code>M-</code> = Alt，如 <code>M-b</code> = Alt+b</div>
                <div>• 特殊键：<code>Esc</code> <code>↵</code> <code>⌫</code> <code>⇥</code> <code>↑</code> <code>↓</code> <code>←</code> <code>→</code> <code>Del</code> <code>Home</code> <code>End</code> <code>PgUp</code> <code>PgDn</code></div>
                <div>• 单个可打印字符直接输入即可</div>
              </div>
            </div>
          </div>

          {/* 可添加 */}
          {availableKeys.length > 0 && (
            <div className="mb-1">
              <div className={isPC ? 'text-nexus-text-2 text-xs px-5 py-2.5 pb-1.5 tracking-wide uppercase' : 'text-nexus-text-2 text-[11px] px-2.5 py-1.5 pb-[3px] tracking-wide uppercase'}>{t('toolbar.addAvailable')}</div>
              {availableKeys.map(key => (
                <div key={key.id} className={isPC ? 'flex items-center px-5 h-12 gap-3 border-b border-nexus-border box-border' : 'flex items-center px-2.5 h-12 gap-2 border-b border-nexus-border box-border'}>
                  <span className={isPC ? 'text-nexus-text font-mono text-sm min-w-[60px] shrink-0' : 'text-nexus-text font-mono text-[13px] min-w-[48px] shrink-0'}>{key.label}</span>
                  <span className={isPC ? 'text-nexus-text-2 text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap' : 'text-nexus-text-2 text-[11px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap'}>{t(key.desc)}</span>
                  <div className="flex gap-1 ml-auto shrink-0">
                    <button className={isPC ? addBtnPCClass : addBtnClass} onPointerDown={(e) => { e.preventDefault(); addKey('pinned', key.id) }}>{t('toolbar.pinToFixed')}</button>
                    <button className={isPC ? addBtnPCClass : addBtnClass} onPointerDown={(e) => { e.preventDefault(); addKey('expanded', key.id) }}>{t('toolbar.pinToExpand')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )

    if (isPC) {
      return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-5">
          <GhostShield />
          <div ref={rootRef} className="bg-nexus-bg border border-nexus-border rounded-xl shrink-0 flex flex-col w-full max-w-[600px] max-h-[70vh] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
            {editContent}
          </div>
        </div>
      )
    }

    return (
      <div ref={rootRef} className="bg-nexus-bg border-t border-nexus-border shrink-0 flex flex-col max-h-[55vh]">
        <GhostShield />
        {editContent}
      </div>
    )
  }

  // ---- Text paste sheet ----
  const pasteBoxEl = showPasteBox && createPortal(
    <>
      <div className="fixed inset-0 z-[700]" onClick={() => setShowPasteBox(false)} />
      <div className="fixed bottom-0 left-0 right-0 z-[701] bg-nexus-bg border-t border-nexus-border rounded-t-xl p-3.5 pb-6 shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
        onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-nexus-text text-sm font-semibold">{t('toolbar.pasteText')}</span>
          <button onPointerDown={(e) => { e.preventDefault(); setShowPasteBox(false) }}
            className="bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex">
            <Icon name="x" size={20} />
          </button>
        </div>
        <textarea
          ref={pasteBoxRef}
          rows={3}
          placeholder={t('toolbar.pasteTextPlaceholder')}
          className="w-full box-border bg-nexus-bg-2 border border-nexus-border rounded-lg text-nexus-text text-sm p-2.5 resize-none outline-none font-inherit block"
        />
        <button
          className="w-full mt-2 py-2.5 rounded-lg bg-nexus-accent text-white text-sm font-medium cursor-pointer border-none"
          onClick={() => {
            const text = pasteBoxRef.current?.value ?? ''
            if (text) { sendToWs(text); setShowPasteBox(false) }
          }}
        >
          {t('toolbar.sendText')}
        </button>
      </div>
    </>,
    document.body
  )

  // 隐藏的文件输入框（移动端和PC端都需要）
  // iOS Safari 对 className="hidden"（display:none）的 <input type="file"> 调 .click()
  // 会完全无响应 —— 系统必须判定 input 是"真实可交互元素"才会弹相册/文件选择器。
  // 改用 left:-9999px 把 input 挪出屏幕外，保留 interactive 语义，iOS 就会弹 picker。
  const hiddenFileInputStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: -9999,
    width: 44,
    height: 44,
    opacity: 0.01,
    fontSize: 16,
  }
  const fileInputsEl = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={hiddenFileInputStyle}
        onChange={(e) => {
          const files = e.target.files
          if (!files || files.length === 0) { e.target.value = ''; return }
          if (onUploadFiles) {
            onUploadFiles(files)
          } else if (onUploadFile) {
            for (const file of files) onUploadFile(file)
          }
          e.target.value = ''
        }}
      />
      <input
        ref={pasteFileRef}
        type="file"
        accept="*/*"
        multiple
        style={hiddenFileInputStyle}
        onChange={(e) => {
          const files = e.target.files
          if (!files || files.length === 0) { e.target.value = ''; return }
          if (onUploadFiles) {
            onUploadFiles(files)
          } else if (onUploadFile) {
            for (const file of files) onUploadFile(file)
          }
          e.target.value = ''
        }}
      />
    </>
  )

  // ---- 嵌入侧边栏模式（PC端） ----
  if (embedded) {
    const allEmbedded = [...config.pinned, ...config.expanded]
    return (
      <div ref={rootRef} className="border-t border-nexus-border shrink-0 bg-nexus-bg">
        {/* Section header */}
        <div className="flex items-center px-2 py-1 gap-0.5">
          <span className="text-[10px] text-nexus-muted flex-1 tracking-wide uppercase">{t('toolbar.shortcuts')}</span>
          <button
            className={iconBtnPCClass}
            onPointerDown={(e) => { e.preventDefault(); setEditing(true) }}
            title={t('toolbar.editShortcuts')}
          ><Icon name="pencil" size={18} /></button>
          <button
            className={iconBtnPCClass}
            onPointerDown={(e) => { e.preventDefault(); setCollapsed(v => { const n = !v; localStorage.setItem(COLLAPSED_KEY, String(n)); return n }) }}
            title={collapsed ? t('toolbar.expand') : t('toolbar.collapse')}
          ><Icon name={collapsed ? 'chevronUp' : 'chevronDown'} size={18} /></button>
        </div>
        {/* Key grid — unified pinned+expanded; collapsed clips to one row */}
        <div
          className="grid gap-[3px] px-2"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))',
            ...(collapsed ? { maxHeight: '28px', overflow: 'hidden' } : { paddingBottom: '0.5rem' }),
          }}
        >
          {allEmbedded.map(id => {
            const key = KEY_MAP[id]
            if (!key) return null
            return (
              <button
                key={id}
                className={keyEmbeddedClass}
                onPointerDown={(e) => handleShortcutPointerDown(e, key)}
                onPointerUp={stopKeyRepeat}
                onPointerCancel={stopKeyRepeat}
                onPointerLeave={stopKeyRepeat}
                onLostPointerCapture={stopKeyRepeat}
                title={t(key.desc)}
              >{key.label}</button>
            )
          })}
        </div>
        {/* Bottom actions: upload + settings */}
          <div className="flex items-center justify-between px-2 py-1.5 border-t border-nexus-border">
            <div className="flex items-center gap-0.5">
              {onOpenQuickPhrases && (
                <button
                  className={iconBtnPCClass}
                  onPointerDown={(e) => { e.preventDefault(); onOpenQuickPhrases() }}
                  title={t('quickPhrases.title')}
                  aria-label={t('quickPhrases.title')}
                ><Icon name="message" size={18} /></button>
              )}
              {onOpenSessionArchives && (
                <button
                  className={iconBtnPCClass}
                  onPointerDown={(e) => { e.preventDefault(); onOpenSessionArchives() }}
                  title={t('sessionArchives.title')}
                  aria-label={t('sessionArchives.title')}
                ><Icon name="archive" size={18} /></button>
              )}
              {onOpenWorkspace && (
                <button
                  className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenWorkspace() }}
                title={t('toolbar.workspace')}
              ><Icon name="folder" size={18} /></button>
            )}
            {composerControls && (
              <button
                className={`${iconBtnPCClass} ${composerControls.active || composerControls.hasDraft ? 'text-nexus-accent bg-nexus-bg-2' : ''}`}
                onPointerDown={(e) => { e.preventDefault(); composerControls.onOpen() }}
                title={composerControls.hasDraft ? t('composer.openDraft') : t('composer.open')}
                aria-label={composerControls.hasDraft ? t('composer.openDraft') : t('composer.open')}
              ><Icon name="edit" size={18} /></button>
            )}
            {onOpenTerminalHistory && (
              <button
                className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenTerminalHistory() }}
                title={t('toolbar.terminalHistory')}
                aria-label={t('toolbar.terminalHistory')}
              ><Icon name="history" size={18} /></button>
            )}
            <button
              className={iconBtnPCClass}
              onClick={() => { fileInputRef.current?.click() }}
              title={t('toolbar.uploadFiles')}
            ><Icon name="paperclip" size={18} /></button>
          </div>
          <div className="flex items-center gap-0.5">
            {onOpenFiles && (
              <button
                className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenFiles() }}
                title={t('toolbar.fileList')}
              ><Icon name="image" size={18} /></button>
            )}
            {locationShare && (
              <button
                className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); locationShare.onCopy() }}
                title={locationShare.copied ? t('toolbar.locationCopied') : t('toolbar.copyLocation')}
                aria-label={locationShare.copied ? t('toolbar.locationCopied') : t('toolbar.copyLocation')}
              ><Icon name={locationShare.copied ? 'check' : 'copy'} size={18} /></button>
            )}
            {onOpenSettings && (
              <button
                className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenSettings() }}
                title={t('toolbar.settings')}
              ><Icon name="settings" size={18} /></button>
            )}
          </div>
        </div>
        {fileInputsEl}
        {pasteBoxEl}
      </div>
    )
  }

  // ---- 正常工具栏 ----
  if (isPC) {
    return (
      <div ref={rootRef} className="bg-nexus-bg border-t border-nexus-border select-none shrink-0 w-full">
        {fileInputsEl}
        {/* PC: 控制按钮 + 固定键同一行 */}
        <div className="flex items-center px-3 py-1 gap-1.5 h-11 box-border">
          <button className={iconBtnPCClass} onPointerDown={(e) => { e.preventDefault(); setEditing(true) }} title={t('toolbar.editShortcuts')}><Icon name="pencil" size={18} /></button>
          <button className={iconBtnPCClass} onPointerDown={(e) => { e.preventDefault(); onToggleTheme() }} title={t('toolbar.toggleTheme')}>
            <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          {/* 固定键：始终显示，占据中间空间 */}
          <div className="flex gap-1.5 flex-wrap flex-1 ml-2 items-center">
            {config.pinned.map(id => {
              const key = KEY_MAP[id]
              if (!key) return null
              return (
                <button
                  key={id}
                  className={keyPCClass}
                  onPointerDown={(e) => handleShortcutPointerDown(e, key)}
                  onPointerUp={stopKeyRepeat}
                  onPointerCancel={stopKeyRepeat}
                  onPointerLeave={stopKeyRepeat}
                  onLostPointerCapture={stopKeyRepeat}
                >
                  {key.label}
                </button>
              )
            })}
            </div>
            {/* 右侧按钮组 */}
            {onOpenQuickPhrases && (
              <button
                className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenQuickPhrases() }}
                title={t('quickPhrases.title')}
                aria-label={t('quickPhrases.title')}
              >
                <Icon name="message" size={18} />
              </button>
            )}
            {onOpenSessionArchives && (
              <button
                className={iconBtnPCClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenSessionArchives() }}
                title={t('sessionArchives.title')}
                aria-label={t('sessionArchives.title')}
              >
                <Icon name="archive" size={18} />
              </button>
            )}
            {onOpenWorkspace && (
              <button className={iconBtnPCClass} onPointerDown={(e) => { e.preventDefault(); onOpenWorkspace() }} title={t('toolbar.workspace')}>
                <Icon name="folder" size={18} />
            </button>
          )}
          {composerControls && (
            <button
              className={`${iconBtnPCClass} relative ${composerControls.active || composerControls.hasDraft ? 'text-nexus-accent bg-nexus-bg-2' : ''}`}
              onPointerDown={(e) => { e.preventDefault(); composerControls.onOpen() }}
              title={composerControls.hasDraft ? t('composer.openDraft') : t('composer.open')}
              aria-label={composerControls.hasDraft ? t('composer.openDraft') : t('composer.open')}
            >
              <Icon name="edit" size={18} />
              {composerControls.hasDraft && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nexus-accent" />
              )}
            </button>
          )}
          {onOpenTerminalHistory && (
            <button
              className={iconBtnPCClass}
              onPointerDown={(e) => { e.preventDefault(); onOpenTerminalHistory() }}
              title={t('toolbar.terminalHistory')}
              aria-label={t('toolbar.terminalHistory')}
            >
              <Icon name="history" size={18} />
            </button>
          )}
          <button
            ref={uploadBtnRef}
            className={`${iconBtnPCClass} relative`}
            onPointerDown={(e) => {
              e.preventDefault()
              if (!showUploadMenu) {
                const rect = uploadBtnRef.current?.getBoundingClientRect()
                if (rect) {
                  setUploadMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right })
                }
              }
              setShowUploadMenu(v => !v)
            }}
            title={t('toolbar.uploadFiles')}
          >
            <Icon name="paperclip" size={18} />
          </button>
          {showUploadMenu && createPortal(
            <>
              <GhostShield />
              <div className="fixed inset-0 z-[300]" onPointerDown={() => setShowUploadMenu(false)} />
              <div className="fixed bg-nexus-menu-bg border border-nexus-border rounded-lg py-1 min-w-[120px] z-[400] shadow-[0_4px_16px_rgba(0,0,0,0.3)]" style={{ bottom: uploadMenuPos.bottom, right: uploadMenuPos.right }}>
                <button className={quickMenuItemClass} onClick={() => { setShowUploadMenu(false); fileInputRef.current?.click() }}>
                  <Icon name="image" size={16} />
                  <span>{t('toolbar.photos')}</span>
                </button>
                <button className={quickMenuItemClass} onClick={() => { setShowUploadMenu(false); pasteFileRef.current?.click() }}>
                  <Icon name="folder" size={16} />
                  <span>{t('toolbar.files')}</span>
                </button>
              </div>
            </>,
            document.body
          )}
          {onOpenSettings && (
            <button className={iconBtnPCClass} onPointerDown={(e) => { e.preventDefault(); onOpenSettings() }} title={t('toolbar.settings')}>
              <Icon name="settings" size={18} />
            </button>
          )}
          {locationShare && (
            <button
              className={iconBtnPCClass}
              onPointerDown={(e) => { e.preventDefault(); locationShare.onCopy() }}
              title={locationShare.copied ? t('toolbar.locationCopied') : t('toolbar.copyLocation')}
              aria-label={locationShare.copied ? t('toolbar.locationCopied') : t('toolbar.copyLocation')}
            >
              <Icon name={locationShare.copied ? 'check' : 'copy'} size={18} />
            </button>
          )}
          <button className={iconBtnPCClass} onPointerDown={(e) => { e.preventDefault(); setCollapsed(v => { const n = !v; localStorage.setItem(COLLAPSED_KEY, String(n)); return n }) }} title={collapsed ? t('toolbar.expand') : t('toolbar.collapse')}>
            <Icon name={collapsed ? 'chevronUp' : 'chevronDown'} size={18} />
          </button>
        </div>
        {/* 展开区：非折叠时显示第二行 */}
        {!collapsed && (
          <div className="pb-2">
            {chunk(config.expanded, 16).map((row, i) => (
              <div key={i} className="flex flex-wrap gap-1.5 px-3 py-1">
                {row.map(id => {
                  const key = KEY_MAP[id]
                  if (!key) return null
                  return (
                    <button
                      key={id}
                      className={keyPCClass}
                      onPointerDown={(e) => handleShortcutPointerDown(e, key)}
                      onPointerUp={stopKeyRepeat}
                      onPointerCancel={stopKeyRepeat}
                      onPointerLeave={stopKeyRepeat}
                      onLostPointerCapture={stopKeyRepeat}
                    >
                      {key.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        {pasteBoxEl}
      </div>
    )
  }

  const pinnedSplitIndex = Math.ceil(config.pinned.length / 2)
  const mobilePinnedRows = [
    config.pinned.slice(0, pinnedSplitIndex),
    config.pinned.slice(pinnedSplitIndex),
  ]

  return (
    <div ref={rootRef} className="bg-nexus-bg border-t border-nexus-border select-none shrink-0">
      {fileInputsEl}
      <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden px-1.5 py-[3px] min-h-[36px]">
        <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-1 w-max flex-shrink-0">
            {onOpenQuickPhrases && (
              <button
                className={iconBtnClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenQuickPhrases() }}
                title={t('quickPhrases.title')}
                aria-label={t('quickPhrases.title')}
              >
                <Icon name="message" size={18} />
              </button>
            )}
            {onOpenSessionArchives && (
              <button
                className={iconBtnClass}
                onPointerDown={(e) => { e.preventDefault(); onOpenSessionArchives() }}
                title={t('sessionArchives.title')}
                aria-label={t('sessionArchives.title')}
              >
                <Icon name="archive" size={18} />
              </button>
            )}
            {onOpenWorkspace && (
              <button
                className={iconBtnClass}
              onPointerDown={(e) => { e.preventDefault(); onOpenWorkspace() }}
              title={t('toolbar.workspace')}
              aria-label={t('toolbar.workspace')}
            >
              <Icon name="folder" size={18} />
            </button>
          )}
          <button
            className={iconBtnClass}
            onPointerDown={(e) => { e.preventDefault(); setCollapsed(v => !v) }}
            title={collapsed ? t('toolbar.expand') : t('toolbar.collapse')}
            aria-label={collapsed ? t('toolbar.expand') : t('toolbar.collapse')}
          >
            <Icon name={collapsed ? 'chevronUp' : 'chevronDown'} size={18} />
          </button>
          {composerControls && (
            <button
              className={`${iconBtnClass} relative ${composerControls.active || composerControls.hasDraft ? 'text-nexus-accent bg-nexus-bg-2' : ''}`}
              onPointerDown={(e) => { e.preventDefault(); composerControls.onOpen() }}
              title={composerControls.hasDraft ? t('composer.openDraft') : t('composer.open')}
              aria-label={composerControls.hasDraft ? t('composer.openDraft') : t('composer.open')}
            >
              <Icon name="edit" size={18} />
              {composerControls.hasDraft && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nexus-accent" />
              )}
            </button>
          )}
          {attentionEntry && attentionEntry.count > 0 && (
            <button
              className={`${iconBtnClass} relative text-nexus-error bg-red-500/10`}
              onPointerDown={(e) => { e.preventDefault(); attentionEntry.onOpen() }}
              title={t('attention.entryLabel', { count: attentionEntry.count })}
              aria-label={t('attention.entryLabel', { count: attentionEntry.count })}
            >
              <Icon name="alert" size={18} />
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-nexus-error text-white text-[10px] leading-4 text-center">
                {attentionEntry.count > 99 ? '99+' : attentionEntry.count}
              </span>
            </button>
          )}
          {/* quick menu */}
          <div className="relative">
            <button
              ref={menuBtnRef}
              className={iconBtnClass}
              onPointerDown={(e) => {
                e.preventDefault()
                if (!showQuickMenu) {
                  const tbH = rootRef.current?.offsetHeight ?? 56
                  setMenuPos({ bottom: tbH + 4, right: 4 })
                }
                setShowQuickMenu(v => !v)
              }}
              title={t('toolbar.more')}
              aria-label={t('toolbar.more')}
            ><Icon name="settings" size={18} /></button>
            {showQuickMenu && createPortal(
              <>
                <GhostShield />
                <div className="fixed inset-0 z-[300]" onPointerDown={() => setShowQuickMenu(false)} />
                <div className="fixed bg-nexus-menu-bg border border-nexus-border rounded-lg py-1 min-w-[160px] z-[400] shadow-[0_-4px_16px_rgba(0,0,0,0.3)]" style={{ bottom: menuPos.bottom, right: menuPos.right }}>
                  <div className="flex items-center gap-1 px-2 py-1 border-b border-nexus-border">
                    <button
                      className={iconBtnClass}
                      onPointerDown={(e) => { e.preventDefault(); setCollapsed(true); setShowQuickMenu(false) }}
                      title={t('toolbar.collapse')}
                      aria-label={t('toolbar.collapse')}
                    >
                      <Icon name="chevronUp" size={16} />
                    </button>
                  </div>
                  {composerControls && (
                    <>
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); composerControls.onOpen(); setShowQuickMenu(false) }}>
                        <Icon name="edit" size={16} />
                        <span>{composerControls.active ? t('composer.focusComposer') : t('composer.open')}</span>
                      </button>
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); composerControls.onClose(); setShowQuickMenu(false) }}>
                        <Icon name="arrowDown" size={16} />
                        <span>{t('composer.directMode')}</span>
                      </button>
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); composerControls.onToggleAppendEnter(); setShowQuickMenu(false) }}>
                        <Icon name={composerControls.appendEnter ? 'check' : 'x'} size={16} />
                        <span>{t('composer.appendEnter')}</span>
                      </button>
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); composerControls.onToggleHistory(); setShowQuickMenu(false) }}>
                        <Icon name="history" size={16} />
                        <span>{composerControls.historyOpen ? t('composer.hideHistory') : t('composer.history')}</span>
                      </button>
                      <button
                        className={`${quickMenuItemClass} ${composerControls.hasDraft ? '' : 'opacity-45'}`}
                        onPointerDown={(e) => {
                          e.preventDefault()
                          if (composerControls.hasDraft) composerControls.onClear()
                          setShowQuickMenu(false)
                        }}
                      >
                        <Icon name="trash" size={16} />
                        <span>{t('composer.clear')}</span>
                      </button>
                      <div className="h-px bg-nexus-border my-1" />
                      </>
                    )}
                    {onOpenQuickPhrases && (
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onOpenQuickPhrases(); setShowQuickMenu(false) }}>
                        <Icon name="message" size={16} />
                        <span>{t('quickPhrases.title')}</span>
                      </button>
                    )}
                    {onOpenSessionArchives && (
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onOpenSessionArchives(); setShowQuickMenu(false) }}>
                        <Icon name="archive" size={16} />
                        <span>{t('sessionArchives.title')}</span>
                      </button>
                    )}
                    {onOpenWorkspace && (
                      <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onOpenWorkspace(); setShowQuickMenu(false) }}>
                        <Icon name="folder" size={16} />
                      <span>{t('toolbar.workspace')}</span>
                    </button>
                  )}
                  {onOpenTerminalHistory && (
                    <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onOpenTerminalHistory(); setShowQuickMenu(false) }}>
                      <Icon name="history" size={16} />
                      <span>{t('toolbar.terminalHistory')}</span>
                    </button>
                  )}
                  <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); setShowQuickMenu(false) }}>
                    <Icon name="image" size={16} />
                    <span>{t('toolbar.photos')}</span>
                  </button>
                  <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); pasteFileRef.current?.click(); setShowQuickMenu(false) }}>
                    <Icon name="folder" size={16} />
                    <span>{t('toolbar.files')}</span>
                  </button>
                  {locationShare && (
                    <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); locationShare.onCopy(); setShowQuickMenu(false) }}>
                      <Icon name={locationShare.copied ? 'check' : 'copy'} size={16} />
                      <span>{locationShare.copied ? t('toolbar.locationCopied') : t('toolbar.copyLocation')}</span>
                    </button>
                  )}
                  <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onToggleTheme(); setShowQuickMenu(false) }}>
                    <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={16} />
                    <span>{themeMode === 'dark' ? t('toolbar.switchLight') : t('toolbar.switchDark')}</span>
                  </button>
                  <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); setEditing(true); setShowQuickMenu(false) }}>
                    <Icon name="pencil" size={16} /><span>{t('toolbar.editShortcuts')}</span>
                  </button>
                  {onOpenFiles && (
                    <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onOpenFiles(); setShowQuickMenu(false) }}>
                      <Icon name="image" size={16} />
                      <span>{t('toolbar.fileList')}</span>
                    </button>
                  )}
                  {onOpenSettings && (
                    <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); onOpenSettings(); setShowQuickMenu(false) }}>
                      <Icon name="settings" size={16} />
                      <span>{t('toolbar.settings')}</span>
                    </button>
                  )}
                  <button className={quickMenuItemClass} onPointerDown={(e) => { e.preventDefault(); setCollapsed(v => !v); setShowQuickMenu(false) }}>
                    <Icon name={collapsed ? 'chevronUp' : 'chevronDown'} size={16} />
                    <span>{collapsed ? t('toolbar.expand') : t('toolbar.collapse')}</span>
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>

      {mobilePinnedRows.map((row, rowIndex) => (
        <div key={rowIndex} className="overflow-x-auto overflow-y-hidden px-1 py-0.5 min-h-[34px]">
          <div
            className="grid gap-1"
            style={shortcutGridStyle(row.length)}
          >
            {row.map(id => {
              const key = KEY_MAP[id]
              if (!key) return null
              return (
                <button
                  key={id}
                  className={keyClass}
                  onPointerDown={(e) => handleShortcutPointerDown(e, key)}
                  onPointerUp={stopKeyRepeat}
                  onPointerCancel={stopKeyRepeat}
                  onPointerLeave={stopKeyRepeat}
                  onLostPointerCapture={stopKeyRepeat}
                  title={t(key.desc)}
                >
                  {key.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {!collapsed && (
        <div className="pb-1">
          {chunk(config.expanded, 8).map((row, i) => (
            <div key={i} className="overflow-x-auto overflow-y-hidden px-1 py-0.5">
              <div
                className="grid gap-1"
                style={shortcutGridStyle(row.length)}
              >
                {row.map(id => {
                  const key = KEY_MAP[id]
                  if (!key) return null
                  return (
                    <button
                      key={id}
                      className={keyClass}
                      onPointerDown={(e) => handleShortcutPointerDown(e, key)}
                      onPointerUp={stopKeyRepeat}
                      onPointerCancel={stopKeyRepeat}
                      onPointerLeave={stopKeyRepeat}
                      onLostPointerCapture={stopKeyRepeat}
                      title={t(key.desc)}
                    >
                      {key.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {pasteBoxEl}
    </div>
  )
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function shortcutGridStyle(count: number) {
  const keyCount = Math.max(count, 1)
  return {
    gridTemplateColumns: `repeat(${keyCount}, minmax(34px, 1fr))`,
    width: '80%',
    minWidth: `${keyCount * 38}px`,
  }
}

// Tailwind class constants for reuse
const keyClass = 'bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text cursor-pointer text-xs font-mono min-w-[34px] py-1.5 px-1.5 text-center touch-manipulation flex-shrink-0 transition-all duration-100 active:scale-95 active:bg-nexus-bg active:border-nexus-accent'
const keyPCClass = 'bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text cursor-pointer text-sm font-mono min-w-[48px] py-2 px-2.5 text-center touch-manipulation flex-shrink-0 transition-all duration-100 active:scale-95 active:bg-nexus-bg active:border-nexus-accent'
const keyEmbeddedClass = 'bg-nexus-bg-2 border border-nexus-border rounded text-nexus-text cursor-pointer text-[11px] font-mono min-w-[30px] py-1 px-[5px] text-center touch-manipulation flex-shrink-0 transition-all duration-100 active:scale-95 active:bg-nexus-bg active:border-nexus-accent'
const iconBtnClass = 'bg-transparent border-none text-nexus-text-2 cursor-pointer text-sm py-1 px-2 rounded flex items-center justify-center transition-all duration-100 active:scale-90 active:text-nexus-text active:bg-nexus-bg-2'
const iconBtnPCClass = 'bg-transparent border-none text-nexus-text-2 cursor-pointer text-[13px] py-[3px] px-1.5 rounded flex-shrink-0 flex items-center justify-center transition-all duration-100 active:scale-90 active:text-nexus-text active:bg-nexus-bg-2'
const quickMenuItemClass = 'flex items-center gap-2.5 bg-transparent border-none text-nexus-text cursor-pointer text-sm py-2.5 px-3.5 w-full text-left touch-manipulation transition-all duration-100 active:bg-nexus-bg-2 active:pl-4'
const editBtnSmClass = 'bg-transparent border border-nexus-border rounded text-nexus-text-2 cursor-pointer text-xs py-1 px-2.5 transition-all duration-100 active:scale-95 active:bg-nexus-bg-2'
const editBtnSmPCClass = 'bg-transparent border border-nexus-border rounded text-nexus-text-2 cursor-pointer text-[13px] py-1.5 px-3.5 transition-all duration-100 active:scale-95 active:bg-nexus-bg-2'
const editBtnPrimaryClass = 'bg-nexus-accent border-none rounded text-white cursor-pointer text-xs font-semibold py-1 px-3 transition-all duration-100 active:scale-95 active:bg-blue-600'
const editBtnPrimaryPCClass = 'bg-nexus-accent border-none rounded text-white cursor-pointer text-[13px] font-semibold py-1.5 px-4 transition-all duration-100 active:scale-95 active:bg-blue-600'
const addBtnClass = 'bg-nexus-bg-2 border border-nexus-border rounded text-nexus-accent cursor-pointer text-[11px] py-1 px-2 transition-all duration-100 active:scale-95 active:bg-nexus-bg'
const addBtnPCClass = 'bg-nexus-bg-2 border border-nexus-border rounded text-nexus-accent cursor-pointer text-xs py-1.5 px-3 transition-all duration-100 active:scale-95 active:bg-nexus-bg'
