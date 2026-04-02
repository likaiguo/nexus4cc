import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './icons'

interface DirEntry {
  name: string
  path: string
}

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

// 截断路径显示：只显示最后几个片段
function formatBrowsePath(p: string | null): string {
  if (!p) return '/'
  const parts = p.split('/').filter(Boolean)
  if (parts.length <= 3) return '/' + parts.join('/')
  return '.../' + parts.slice(-2).join('/')
}

export default function WorkspaceBrowser({ token, onClose, initialPath = '', currentSession }: Props) {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState(initialPath)

  // 目录浏览状态（来自 /api/browse）
  const [browseDirs, setBrowseDirs] = useState<DirEntry[]>([])
  const [browseParent, setBrowseParent] = useState<string | null>(null)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)

  // 文件列表状态（来自 /api/workspace/files）
  const [files, setFiles] = useState<FileEntry[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  // 选中的目录（单击选中）
  const [selectedDir, setSelectedDir] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  // 获取当前 session 的 CWD 作为初始路径
  useEffect(() => {
    if (!currentSession) return
    fetch(`/api/session-cwd?session=${encodeURIComponent(currentSession)}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.cwd) {
          setCurrentPath(data.cwd)
        }
      })
      .catch(() => {})
  }, [currentSession, token])

  // 浏览目录（复用 WorkspaceSelector 的 API）
  const browseDir = useCallback(async (path: string | null) => {
    setBrowseLoading(true)
    setBrowseError(null)
    try {
      const url = path ? `/api/browse?path=${encodeURIComponent(path)}` : '/api/browse'
      const r = await fetch(url, { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setCurrentPath(data.path)
      setBrowseDirs(data.dirs)
      setBrowseParent(data.parent)
      setSelectedDir(null) // 切换目录时清除选中
    } catch (e: unknown) {
      setBrowseError(e instanceof Error ? e.message : '浏览失败')
    } finally {
      setBrowseLoading(false)
    }
  }, [token])

  // 获取文件列表
  const fetchFiles = useCallback(async (path: string) => {
    setFilesLoading(true)
    try {
      const r = await fetch(`/api/workspace/files?path=${encodeURIComponent(path)}`, { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setFiles(data.entries || [])
    } catch {
      setFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [token])

  // 初始加载
  useEffect(() => {
    browseDir(initialPath || null)
  }, [])

  // 当前路径变化时重新加载
  useEffect(() => {
    if (currentPath) {
      browseDir(currentPath)
      fetchFiles(currentPath)
    }
  }, [currentPath])

  // 单击选中目录
  function handleSelectDir(path: string) {
    setSelectedDir(path)
  }

  // 双击进入目录
  function handleDoubleClickDir(path: string) {
    setSelectedDir(path)
    browseDir(path)
  }

  // 打开文件
  function openFile(name: string) {
    const filePath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`
    window.open(filePath, '_blank')
  }

  // 构建面包屑路径
  const breadcrumbs = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean)

  // 过滤出文件（非目录）
  const fileEntries = files.filter(f => f.type === 'file')

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
        <button
          onClick={() => browseDir('/')}
          className={`text-sm whitespace-nowrap ${currentPath === '/' ? 'text-nexus-accent font-medium' : 'text-nexus-text-2 hover:text-nexus-text'}`}
        >
          /
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span className="text-nexus-muted">/</span>
            <button
              onClick={() => browseDir('/' + breadcrumbs.slice(0, idx + 1).join('/'))}
              className={`text-sm whitespace-nowrap ${idx === breadcrumbs.length - 1 ? 'text-nexus-accent font-medium' : 'text-nexus-text-2 hover:text-nexus-text'}`}
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {browseLoading ? (
          <div className="text-nexus-muted text-center py-10 text-sm">
            {t('common.loading')}
          </div>
        ) : browseError ? (
          <div className="text-nexus-error text-center py-10 text-sm px-4">
            <Icon name="alert" size={24} className="mx-auto mb-2 opacity-60" />
            {browseError}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* 目录浏览器 - 复用 WorkspaceSelector 的交互模式 */}
            <div className="px-4 py-3 border-b border-nexus-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-nexus-text-2 tracking-wider uppercase">{t('workspace.browseDir')}</span>
                  <span className="text-[11px] text-nexus-accent font-mono max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap" title={currentPath}>{formatBrowsePath(currentPath)}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="bg-transparent border border-nexus-border rounded text-nexus-text-2 cursor-pointer text-[11px] px-2 py-0.5 shrink-0"
                    onClick={() => browseDir('/')}
                  >{t('workspace.rootDir')}</button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                {/* 向上一级 */}
                {browseParent && (
                  <div
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer bg-transparent border-b border-nexus-border mb-1 hover:bg-nexus-bg-2"
                    onClick={() => browseDir(browseParent)}
                  >
                    <span className="text-sm shrink-0">↑</span>
                    <span className="text-nexus-text-2 text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap">..</span>
                    <span className="text-[11px] text-nexus-muted font-mono">{browseParent.split('/').slice(-1)[0] || '/'}</span>
                  </div>
                )}

                {/* 子目录列表 - 单击选中，双击进入 */}
                {browseDirs.length === 0 && (
                  <div className="text-nexus-muted text-sm py-2">{t('workspace.noSubDirs')}</div>
                )}
                {browseDirs.map(dir => (
                  <div
                    key={dir.path}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer ${selectedDir === dir.path ? 'bg-nexus-bg-2 border border-nexus-accent' : 'bg-transparent hover:bg-nexus-bg-2'}`}
                    onClick={() => handleSelectDir(dir.path)}
                    onDoubleClick={() => handleDoubleClickDir(dir.path)}
                    title={t('workspace.dirClickHint')}
                  >
                    <span className="text-sm shrink-0">📁</span>
                    <span className="text-nexus-text text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{dir.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 文件列表 */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-nexus-text-2 tracking-wider uppercase">{t('workspace.files') || 'Files'}</span>
                {filesLoading && <span className="text-[11px] text-nexus-muted">{t('common.loading')}</span>}
              </div>

              {fileEntries.length === 0 && !filesLoading ? (
                <div className="text-nexus-muted text-sm py-4 text-center">
                  {t('workspace.noFiles') || 'No files in this directory'}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {fileEntries
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((file) => (
                      <button
                        key={file.name}
                        onClick={() => openFile(file.name)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-nexus-bg-2 transition-colors text-left rounded-md"
                      >
                        <span className="text-xl shrink-0">{getFileIcon(file.name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-nexus-text text-sm overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                            {file.name}
                          </div>
                        </div>
                        {file.size !== undefined && (
                          <span className="text-nexus-muted text-xs shrink-0">
                            {formatSize(file.size)}
                          </span>
                        )}
                        <span className="text-nexus-muted text-xs shrink-0">
                          {formatTime(file.mtime)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-nexus-border text-nexus-muted text-xs text-center flex-shrink-0">
        {t('workspace.footer', { count: browseDirs.length + fileEntries.length })}
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
