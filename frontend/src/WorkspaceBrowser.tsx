import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './icons'

interface FileEntry {
  name: string
  type: 'dir' | 'file'
  size?: number
  mtime: number
}

interface Props {
  token: string
  onClose: () => void
  initialPath?: string
  currentSession?: string
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function WorkspaceBrowser({ token, onClose, initialPath = '', currentSession }: Props) {
  const { t } = useTranslation()
  const [workspaceRoot, setWorkspaceRoot] = useState('')

  // 路径状态：null 表示正在初始化
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  // 初始化：获取 workspaceRoot 和初始路径
  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. 获取服务端配置
      let root = ''
      try {
        const r = await fetch('/api/config', { headers })
        if (r.ok) {
          const data = await r.json()
          root = data.workspaceRoot || ''
          if (!cancelled) setWorkspaceRoot(root)
        }
      } catch {
        // ignore
      }

      // 2. 确定初始路径（优先使用 initialPath，否则尝试 session cwd）
      let targetPath = initialPath
      if (!targetPath && currentSession) {
        try {
          const r = await fetch(`/api/session-cwd?session=${encodeURIComponent(currentSession)}`, { headers })
          if (r.ok) {
            const data = await r.json()
            targetPath = data?.cwd || root || '/'
          }
        } catch {
          // ignore
        }
      }
      if (!targetPath) targetPath = root || '/'

      if (!cancelled) {
        setCurrentPath(targetPath)
      }
    }

    init()
    return () => { cancelled = true }
  }, [currentSession, token, initialPath])

  // 选中条目
  const [selectedName, setSelectedName] = useState<string | null>(null)

  // 加载目录内容
  const loadEntries = useCallback(async (path: string) => {
    setLoading(true)
    setError('')
    setSelectedName(null) // 切换目录时清除选中
    try {
      const r = await fetch(`/api/workspace/files?path=${encodeURIComponent(path)}`, { headers })
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      // data.path 是服务端返回的规范化绝对路径
      setCurrentPath(data.path)
      setEntries(data.entries || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [token])

  // 当 currentPath 确定后加载内容
  useEffect(() => {
    if (currentPath !== null) {
      loadEntries(currentPath)
    }
  }, [currentPath, loadEntries])

  // 选中条目（单击）
  function handleSelect(name: string) {
    setSelectedName(name)
  }

  // 进入子目录
  function navigateTo(name: string) {
    if (!currentPath) return
    const newPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`
    setCurrentPath(newPath)
  }

  // 返回上级
  function navigateUp() {
    if (!currentPath) return
    const idx = currentPath.lastIndexOf('/')
    if (idx <= 0) {
      setCurrentPath('/')
    } else {
      setCurrentPath(currentPath.slice(0, idx))
    }
  }

  // 打开文件
  function openFile(name: string) {
    if (!currentPath || !workspaceRoot) return

    // 构造文件访问 URL
    // 如果 currentPath 在 workspaceRoot 下，使用 /workspace 路由
    if (currentPath.startsWith(workspaceRoot)) {
      let rel = currentPath.slice(workspaceRoot.length).replace(/^\/+/, '')
      const filePath = rel ? `/workspace/${rel}/${name}` : `/workspace/${name}`
      window.open(filePath, '_blank')
    } else {
      // 不在 workspace 下的文件，尝试直接打开（可能 404）
      const filePath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`
      window.open(filePath, '_blank')
    }
  }

  // 双击处理：目录进入，文件打开
  function handleDoubleClick(entry: FileEntry) {
    if (entry.type === 'dir') {
      navigateTo(entry.name)
    } else {
      openFile(entry.name)
    }
  }

  // 构建面包屑路径（使用绝对路径）
  const breadcrumbs = currentPath && currentPath !== '/' ? currentPath.split('/').filter(Boolean) : []

  // 跳转到指定面包屑路径
  function navigateToBreadcrumb(index: number) {
    const path = '/' + breadcrumbs.slice(0, index + 1).join('/')
    setCurrentPath(path)
  }

  // 检查是否有上级目录（简单判断：不是根目录且以 workspaceRoot 开头）
  const hasParent = currentPath !== '/' && currentPath !== ''

  // 排序：目录在前，文件在后，各自按名称排序
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'dir' ? -1 : 1
  })

  return (
    <div className="fixed inset-0 z-[450] bg-nexus-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-nexus-border flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon name="folder" size={20} />
          <span className="text-nexus-text font-semibold text-base truncate">
            {t('workspace.title')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-nexus-text-2 cursor-pointer p-1.5 flex items-center justify-center rounded-md shrink-0"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-nexus-border bg-nexus-bg-2 flex-shrink-0 overflow-x-auto">
        {/* 根目录按钮 */}
        <button
          onClick={() => setCurrentPath('/')}
          className={`text-sm whitespace-nowrap ${currentPath === '/' ? 'text-nexus-accent font-medium' : 'text-nexus-text-2 hover:text-nexus-text'}`}
        >
          /
        </button>
        {/* 面包屑路径：每个片段前显示 / 分隔符 */}
        {breadcrumbs.length > 0 && breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <span className="text-nexus-muted">/</span>}
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`text-sm whitespace-nowrap ${idx === breadcrumbs.length - 1 ? 'text-nexus-accent font-medium' : 'text-nexus-text-2 hover:text-nexus-text'}`}
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-nexus-muted text-center py-10 text-sm">
            {t('common.loading')}
          </div>
        ) : error ? (
          <div className="text-nexus-error text-center py-10 text-sm px-4">
            <Icon name="alert" size={24} className="mx-auto mb-2 opacity-60" />
            {error}
          </div>
        ) : sortedEntries.length === 0 && !hasParent ? (
          <div className="text-nexus-muted text-center py-10 text-sm px-4">
            <div className="text-5xl mb-3">📂</div>
            <div>{t('workspace.empty')}</div>
          </div>
        ) : (
          <div className="divide-y divide-nexus-border">
            {/* 上级目录 */}
            {hasParent && (
              <button
                onClick={() => handleSelect('..')}
                onDoubleClick={navigateUp}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  selectedName === '..' ? 'bg-nexus-bg-2' : 'hover:bg-nexus-bg-2'
                }`}
                title="Double-click to go up"
              >
                <span className="text-xl">⬆️</span>
                <span className="text-nexus-text text-sm">{t('workspace.parent')}</span>
              </button>
            )}
            {/* 目录和文件列表 */}
            {sortedEntries.map((entry) => (
              <button
                key={entry.name}
                onClick={() => handleSelect(entry.name)}
                onDoubleClick={() => handleDoubleClick(entry)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  selectedName === entry.name ? 'bg-nexus-bg-2' : 'hover:bg-nexus-bg-2'
                }`}
                title={entry.type === 'dir' ? 'Double-click to enter' : 'Double-click to open'}
              >
                <span className="text-xl shrink-0">
                  {entry.type === 'dir' ? '📁' : getFileIcon(entry.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-nexus-text text-sm overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                    {entry.name}
                  </div>
                </div>
                {entry.type === 'file' && entry.size !== undefined && (
                  <span className="text-nexus-muted text-xs shrink-0">
                    {formatSize(entry.size)}
                  </span>
                )}
                <span className="text-nexus-muted text-xs shrink-0">
                  {formatTime(entry.mtime)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-nexus-border text-nexus-muted text-xs text-center flex-shrink-0">
        {currentPath && t('workspace.footer', { count: entries.length })}
      </div>
    </div>
  )
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return '📄'
  const iconMap: Record<string, string> = {
    js: '📜', ts: '📜', jsx: '📜', tsx: '📜',
    py: '🐍', go: '🔵', rs: '🦀', java: '☕',
    c: '🔧', cpp: '🔧', h: '🔧', hpp: '🔧',
    json: '📋', yml: '📋', yaml: '📋', toml: '📋',
    md: '📝', txt: '📝', log: '📝',
    html: '🌐', css: '🎨', svg: '🎨',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️',
    zip: '📦', tar: '📦', gz: '📦', rar: '📦',
    sh: '⚙️', bash: '⚙️', zsh: '⚙️',
    dockerfile: '🐳', env: '🔐',
  }
  return iconMap[ext] || '📄'
}
