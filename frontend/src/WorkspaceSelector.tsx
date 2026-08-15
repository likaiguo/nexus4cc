import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import GhostShield from './GhostShield'
import { Icon } from './icons'
import { useAuthFetch } from './AuthSessionProvider'
import { mergeRecentWorkspacePaths, parseRecentWorkspacePaths } from './workspaceRecents'

interface BrowseResult {
  path: string
  parent: string | null
  dirs: { name: string; path: string }[]
}

interface Config {
  id: string
  label: string
}

interface Props {
  token: string
  onClose: () => void
  onConfirm: (path: string, shellType: 'claude' | 'codex' | 'bash', profile?: string) => void
}

// 检测是否为 PC 端（>= 768px）
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isDesktop
}

export default function WorkspaceSelector({ token, onClose, onConfirm }: Props) {
  const { t } = useTranslation()
  const authFetch = useAuthFetch()
  const isDesktop = useIsDesktop()
  const [selectedPath, setSelectedPath] = useState(() => localStorage.getItem('nexus_last_path') || '/workspace')
  const [inputPath, setInputPath] = useState(() => localStorage.getItem('nexus_last_path') || '/workspace')
  const [shellType, setShellType] = useState<'claude' | 'codex' | 'bash'>('claude')
  const [configs, setConfigs] = useState<Config[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>(() => localStorage.getItem('nexus_last_profile') || '')
  const [selectorStep, setSelectorStep] = useState<'quick' | 'browse'>('quick')
  const [recentPaths, setRecentPaths] = useState(() => {
    const lastPath = localStorage.getItem('nexus_last_path') || '/workspace'
    return mergeRecentWorkspacePaths([lastPath], parseRecentWorkspacePaths(localStorage.getItem('nexus_recent_paths')))
  })

  // 文件浏览器状态
  const [browsePath, setBrowsePath] = useState<string | null>(null)
  const [browseDirs, setBrowseDirs] = useState<{ name: string; path: string }[]>([])
  const [browseParent, setBrowseParent] = useState<string | null>(null)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  async function browseDir(path: string | null) {
    setBrowseLoading(true)
    setBrowseError(null)
    try {
      const url = path ? `/api/browse?path=${encodeURIComponent(path)}` : '/api/browse'
      const r = await authFetch(url, { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data: BrowseResult = await r.json()
      setBrowsePath(data.path)
      setBrowseDirs(data.dirs)
      setBrowseParent(data.parent)
    } catch (e: unknown) {
      setBrowseError(e instanceof Error ? e.message : '浏览失败')
    } finally {
      setBrowseLoading(false)
    }
  }

  useEffect(() => {
    void fetchConfigs()
    void fetchRecentProjects()
  }, [])

  async function fetchRecentProjects() {
    try {
      const r = await authFetch('/api/projects', { headers })
      if (!r.ok) return
      const data: unknown = await r.json()
      if (!Array.isArray(data)) return
      const projectPaths = data.flatMap(project => {
        if (typeof project !== 'object' || project === null || !('path' in project)) return []
        return typeof project.path === 'string' ? [project.path] : []
      })
      setRecentPaths(paths => mergeRecentWorkspacePaths(paths, projectPaths))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[WorkspaceSelector] Failed to load recent projects:', message)
    }
  }

  async function fetchConfigs() {
    try {
      const r = await authFetch('/api/configs', { headers })
      if (r.ok) {
        const data = await r.json()
        setConfigs(data)
        if (!localStorage.getItem('nexus_last_profile') && data.length > 0) {
          setSelectedProfile(data[0].id)
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[WorkspaceSelector] Failed to load profiles:', message)
    }
  }

  function handleSelect(path: string) {
    setSelectedPath(path)
    setInputPath(path)
  }

  function handleInputChange(value: string) {
    setInputPath(value)
    setSelectedPath(value)
  }

  function handleProfileChange(id: string) {
    setSelectedProfile(id)
    if (id) localStorage.setItem('nexus_last_profile', id)
  }

  function handleConfirm() {
    const path = inputPath.trim()
    if (!path) return
    const profile = shellType === 'claude' && selectedProfile ? selectedProfile : undefined
    const nextRecentPaths = mergeRecentWorkspacePaths([path], recentPaths)
    localStorage.setItem('nexus_last_path', path)
    localStorage.setItem('nexus_recent_paths', JSON.stringify(nextRecentPaths))
    if (profile) localStorage.setItem('nexus_last_profile', profile)
    onConfirm(path, shellType, profile)
  }

  function openDirectoryBrowser() {
    setSelectorStep('browse')
    if (browsePath === null) void browseDir(selectedPath || null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  // 截断路径显示：只显示最后几个片段
  function formatBrowsePath(p: string | null): string {
    if (!p) return '/'
    const parts = p.split('/').filter(Boolean)
    if (parts.length <= 3) return '/' + parts.join('/')
    return '.../' + parts.slice(-2).join('/')
  }

  return (
    <div className={isDesktop ? 'fixed inset-0 bg-black/70 z-[450] flex items-center justify-center p-5' : 'fixed inset-0 bg-black/60 z-[450]'}>
      <GhostShield />
      <div className={isDesktop ? 'bg-nexus-bg border border-nexus-border rounded-xl flex flex-col text-nexus-text w-full max-w-[600px] max-h-[85vh] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden' : 'fixed inset-0 bg-nexus-bg flex flex-col text-nexus-text'}>
        {/* 顶部：标题 + 关闭 */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-nexus-border shrink-0">
          <span className="text-base font-semibold">{t('workspace.title')}</span>
          <button
            type="button"
            className="bg-transparent border-none text-nexus-text-2 cursor-pointer text-2xl leading-none px-1 flex items-center justify-center"
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* 当前选择 */}
          <div className="px-4 py-3 border-b border-nexus-border">
            <div className="text-[11px] text-nexus-text-2 tracking-wider uppercase mb-0">{t('workspace.currentSelection')}</div>
            <div className="text-sm text-nexus-accent font-mono px-3 py-2 bg-nexus-bg-2 rounded-md break-all mt-2">{selectedPath || '~'}</div>
          </div>

          {/* 手动输入 */}
          <div className="px-4 py-3 border-b border-nexus-border">
            <div className="text-[11px] text-nexus-text-2 tracking-wider uppercase mb-0">{t('workspace.inputPath')}</div>
            <div className={isDesktop ? 'flex flex-row items-center gap-4 mt-2' : 'flex flex-col gap-1 mt-2'}>
              <input
                className={isDesktop ? 'bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text text-sm px-3 py-2.5 outline-none flex-1 box-border' : 'bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text text-sm px-2.5 py-2 outline-none w-full box-border'}
                value={inputPath}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('workspace.pathPlaceholder')}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div className="text-nexus-muted text-[11px] mt-1.5">{t('workspace.pathHelp')}</div>
          </div>

          {/* Shell 类型选择 */}
          <div className="px-4 py-3 border-b border-nexus-border">
            <div className="text-[11px] text-nexus-text-2 tracking-wider uppercase mb-0">{t('workspace.shellType')}</div>
            <div className="flex flex-col gap-2.5 mt-2">
              <label className="flex items-center gap-2 text-nexus-text text-sm cursor-pointer">
                <input
                  type="radio"
                  name="shellType"
                  value="claude"
                  checked={shellType === 'claude'}
                  onChange={() => setShellType('claude')}
                />
                <span>{t('workspace.shellClaude')}</span>
              </label>
              <label className="flex items-center gap-2 text-nexus-text text-sm cursor-pointer">
                <input
                  type="radio"
                  name="shellType"
                  value="bash"
                  checked={shellType === 'bash'}
                  onChange={() => setShellType('bash')}
                />
                <span>{t('workspace.shellZsh')}</span>
              </label>
              <label className="flex items-center gap-2 text-nexus-text text-sm cursor-pointer">
                <input
                  type="radio"
                  name="shellType"
                  value="codex"
                  checked={shellType === 'codex'}
                  onChange={() => setShellType('codex')}
                />
                <span>{t('workspace.shellCodex')}</span>
              </label>
            </div>
          </div>

          {/* Profile 选择 (仅 claude 模式) */}
          {shellType === 'claude' && (
            <div className="px-4 py-3 border-b border-nexus-border">
              <div className="text-[11px] text-nexus-text-2 tracking-wider uppercase mb-0">{t('workspace.profileLabel')}</div>
              <select
                className="bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text text-sm px-2.5 py-2 w-full outline-none mt-2"
                value={selectedProfile}
                onChange={(e) => handleProfileChange(e.target.value)}
              >
                <option value="">{t('workspace.profileDefault')}</option>
                {configs.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.label}
                  </option>
                ))}
              </select>
              <div className="text-nexus-muted text-[11px] mt-1.5">{t('workspace.profileHelp')}</div>
            </div>
          )}

          <div className="px-4 py-3 border-b border-nexus-border">
            {selectorStep === 'quick' ? (
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-nexus-text-2 tracking-wider uppercase mb-2">
                    <Icon name="history" size={13} />
                    <span>{t('workspace.recentDirs')}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[104px] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
                    {recentPaths.length === 0 && (
                      <div className="text-nexus-muted text-sm py-2">{t('workspace.noRecentDirs')}</div>
                    )}
                    {recentPaths.map(path => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => handleSelect(path)}
                        className={`w-full min-w-0 flex items-center gap-2 px-3 py-2 rounded-md border text-left ${selectedPath === path ? 'border-nexus-accent bg-nexus-bg-2' : 'border-nexus-border bg-transparent hover:bg-nexus-bg-2'}`}
                        title={path}
                      >
                        <Icon name="folder" size={15} className="shrink-0" />
                        <span className="text-nexus-text text-sm font-mono truncate">{path}</span>
                        {selectedPath === path && <Icon name="check" size={14} className="shrink-0 text-nexus-accent" />}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openDirectoryBrowser}
                  className="min-h-[88px] flex sm:flex-col items-center justify-center gap-2 px-4 py-3 rounded-md border border-nexus-border bg-nexus-bg-2 text-nexus-text hover:border-nexus-accent"
                >
                  <Icon name="folderOpen" size={22} />
                  <span className="text-sm font-medium">{t('workspace.browseOtherDir')}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectorStep('quick')}
                    className="flex items-center gap-1.5 text-sm text-nexus-text-2 hover:text-nexus-text whitespace-nowrap"
                  >
                    <Icon name="chevronLeft" size={15} />
                    <span>{t('workspace.backToRecent')}</span>
                  </button>
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
                    <span className="text-[11px] text-nexus-accent font-mono flex-1 sm:flex-none sm:max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap" title={browsePath || ''}>{formatBrowsePath(browsePath)}</span>
                    {browsePath && (
                      <button
                        className="bg-transparent border border-nexus-border rounded text-nexus-text-2 cursor-pointer text-[11px] px-2 py-0.5 shrink-0"
                        onClick={() => handleSelect(browsePath)}
                      >{t('workspace.selectThisDir')}</button>
                    )}
                    <button className="bg-transparent border border-nexus-border rounded text-nexus-text-2 cursor-pointer text-[11px] px-2 py-0.5 shrink-0" onClick={() => void browseDir('/')}>{t('workspace.rootDir')}</button>
                  </div>
                </div>
                {browseError && <div className="text-nexus-error text-xs mb-2">{browseError}</div>}
                {browseLoading && <div className="text-nexus-muted text-sm py-2">{t('common.loading')}</div>}
                {!browseLoading && (
                  <div className="flex flex-col gap-0.5">
                    {browseParent && (
                      <button
                        type="button"
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer bg-transparent border-b border-nexus-border mb-1 text-left"
                        onClick={() => void browseDir(browseParent)}
                      >
                        <Icon name="chevronUp" size={15} className="shrink-0" />
                        <span className="text-nexus-text-2 text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap">..</span>
                        <span className="text-[11px] text-nexus-muted font-mono">{browseParent.split('/').slice(-1)[0] || '/'}</span>
                      </button>
                    )}
                    {browseDirs.length === 0 && <div className="text-nexus-muted text-sm py-2">{t('workspace.noSubDirs')}</div>}
                    {browseDirs.map(dir => (
                      <div
                        key={dir.path}
                        className={`flex items-center rounded-md ${selectedPath === dir.path ? 'bg-nexus-bg-2 border border-nexus-accent' : 'bg-transparent border border-transparent hover:bg-nexus-bg-2'}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelect(dir.path)}
                          onDoubleClick={() => void browseDir(dir.path)}
                          className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-left"
                          title={t('workspace.dirClickHint')}
                        >
                          <Icon name="folder" size={15} className="shrink-0" />
                          <span className="text-nexus-text text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{dir.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void browseDir(dir.path) }}
                          className="p-2 mr-1 text-nexus-text-2 hover:text-nexus-accent"
                          title={t('workspace.enterDir')}
                          aria-label={t('workspace.enterDir')}
                        >
                          <Icon name="chevronRight" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 px-4 py-3 border-t border-nexus-border shrink-0 justify-end">
          <button type="button" className="bg-transparent border border-nexus-border rounded-md text-nexus-text-2 cursor-pointer text-sm px-4 py-2" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="bg-nexus-accent border-none rounded-md text-white cursor-pointer text-sm font-semibold px-4 py-2" onClick={handleConfirm}>{t('common.create')}</button>
        </div>
      </div>
    </div>
  )
}
