import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import GhostShield from './GhostShield'
import { Icon } from './icons'
import { WindowStatus, STATUS_DOT_COLOR, STATUS_DOT_PULSE, STATUS_DOT_TITLE } from './windowStatus'

const STORAGE_KEY = 'nexus_token'

/** Parse API error response into a user-friendly message.
 *  For 401, clears the token and reloads (auto-logout). */
async function parseApiError(r: Response, fallback?: string): Promise<string> {
  if (r.status === 401) {
    localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
    return '' // unreachable after reload
  }
  try {
    const data = await r.json()
    if (data?.error) return data.error
  } catch { /* response body not JSON */ }
  const statusMessages: Record<number, string> = {
    400: '请求参数有误',
    403: '无访问权限',
    404: '资源不存在',
    409: '操作冲突，可能已存在',
    500: '服务器内部错误',
    502: '网关错误，服务可能未启动',
    503: '服务暂时不可用',
  }
  return statusMessages[r.status] ?? fallback ?? `请求失败 (${r.status})`
}

/** Friendly message when fetch() itself throws (network unreachable). */
function parseNetworkError(e: unknown): string {
  if (e instanceof TypeError) return '无法连接服务器，请检查服务是否已启动'
  if (e instanceof Error) return e.message
  return '未知错误'
}

interface Channel {
  index: number
  name: string
  active: boolean
  cwd: string
}

interface Project {
  name: string
  path: string
  active: boolean
  channelCount: number
}

type ReorderKind = 'project' | 'channel'

interface ReorderDragState {
  kind: ReorderKind
  id: string
  startX: number
  startY: number
  pointerId: number
  dragging: boolean
}

interface Props {
  token: string
  currentProject: string
  currentChannelIndex?: number
  onClose: () => void
  onSwitchProject: (projectName: string, lastChannel?: number) => void
  onSwitchChannel: (channelIndex: number) => void
  onNewProject: () => void
  onNewChannel: () => void
  /** Refresh callback — exposed for sidebar toggle integration */
  onRefresh?: () => void
  /** Called when user double-clicks a channel — should close any open file editor */
  onCloseEditor?: () => void
  layout?: 'modal' | 'sidebar'
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    // 初始同步（SSR 安全）
    setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items
  const next = items.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

// Full-fleet channel status: { "<session>": { "<index>": WindowStatus } }
type ChannelStatusMap = Record<string, Record<string, WindowStatus>>

// Aggregate a project's channels into a single marker by priority:
// needs-confirm > done > active > neutral.
function aggregateProjectStatus(statuses: WindowStatus[]): WindowStatus {
  if (statuses.includes('needs-confirm')) return 'needs-confirm'
  if (statuses.includes('done')) return 'done'
  if (statuses.includes('active')) return 'active'
  return 'idle'
}

export interface SessionManagerV2Handle {
  refresh: () => void
}

export default forwardRef<SessionManagerV2Handle, Props>(function SessionManagerV2({
  token,
  currentProject,
  currentChannelIndex,
  onClose,
  onSwitchProject,
  onSwitchChannel,
  onNewProject,
  onNewChannel,
  onRefresh: _onRefresh,
  onCloseEditor,
  layout = 'modal',
}: Props, ref) {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const isSidebar = layout === 'sidebar'
  const [projects, setProjects] = useState<Project[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mobile/modal gesture state
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingChannelRef = useRef<Channel | null>(null)
  const [pressChannel, setPressChannel] = useState<number | null>(null)
  const [channelMenu, setChannelMenu] = useState<{ channel: Channel; x: number; y: number } | null>(null)
  const [projectMenu, setProjectMenu] = useState<{ project: Project; x: number; y: number } | null>(null)
  const projectsRef = useRef<Project[]>([])
  const channelsRef = useRef<Channel[]>([])
  const reorderDragRef = useRef<ReorderDragState | null>(null)
  const suppressClickRef = useRef(false)
  const [draggingProject, setDraggingProject] = useState<string | null>(null)
  const [draggingChannel, setDraggingChannel] = useState<number | null>(null)

  // Sidebar right-click menu state
  const [sidebarChannelMenu, setSidebarChannelMenu] = useState<{ channel: Channel; x: number; y: number } | null>(null)
  const [sidebarProjectMenu, setSidebarProjectMenu] = useState<{ project: Project; x: number; y: number } | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => { channelsRef.current = channels }, [channels])

  // --- Data fetching ---

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const r = await fetch('/api/projects', { headers })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.loadFailed'))); return }
      setProjects(await r.json())
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    } finally {
      setLoadingProjects(false)
    }
  }, [token])

  const fetchChannels = useCallback(async (projectName: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingChannels(true)
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(projectName)}/channels`, { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setChannels((data as any).channels || [])
    } catch (e: unknown) {
      // Transient failure (e.g. backend briefly busy): keep the last known
      // list instead of clearing it, so channels don't flicker/vanish.
      console.error('Load channels failed:', e)
    } finally {
      if (!opts?.silent) setLoadingChannels(false)
    }
  }, [token])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => {
    if (currentProject) fetchChannels(currentProject)
  }, [currentProject, fetchChannels])

  // Full-fleet channel attention status (all projects, all channels).
  const [channelStatus, setChannelStatus] = useState<ChannelStatusMap>({})
  const fetchChannelStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/channel-status', { headers })
      if (!r.ok) return
      setChannelStatus(await r.json())
    } catch { /* transient — keep last known */ }
  }, [token])
  useEffect(() => {
    fetchChannelStatus()
    const id = setInterval(fetchChannelStatus, 4000)
    return () => clearInterval(id)
  }, [fetchChannelStatus])

  // Reported status for a single channel of a project (falls back to idle).
  const statusOf = useCallback((projectName: string, index: number): WindowStatus => {
    return channelStatus[projectName]?.[String(index)] ?? 'idle'
  }, [channelStatus])

  // Aggregate marker for a project across its channels.
  const projectStatusOf = useCallback((projectName: string): WindowStatus => {
    const m = channelStatus[projectName]
    if (!m) return 'idle'
    return aggregateProjectStatus(Object.values(m))
  }, [channelStatus])

  // Status dot shared by project rows and channel rows.
  const renderDot = useCallback((status: WindowStatus) => (
    <span
      className={`w-2 h-2 rounded-full shrink-0 mt-0.5${STATUS_DOT_PULSE[status] ? ' nexus-attn-pulse' : ''}`}
      style={{ background: STATUS_DOT_COLOR[status] }}
      title={t(STATUS_DOT_TITLE[status])}
    />
  ), [t])

  // Clear sticky attention when the user enters a channel (optimistic + server).
  const markChannelSeen = useCallback((projectName: string, index: number) => {
    setChannelStatus(prev => {
      const cur = prev[projectName]?.[String(index)]
      if (cur !== 'needs-confirm' && cur !== 'done') return prev
      return { ...prev, [projectName]: { ...prev[projectName], [String(index)]: 'active' } }
    })
    fetch('/api/channel-status/seen', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: projectName, index }),
    }).catch(() => {})
  }, [token])

  const handleRefresh = useCallback(() => {
    fetchProjects()
    if (currentProject) fetchChannels(currentProject)
  }, [fetchProjects, fetchChannels, currentProject])

  useImperativeHandle(ref, () => ({ refresh: handleRefresh }), [handleRefresh])

  // --- Actions ---

  const saveProjectOrder = useCallback(async (nextProjects: Project[]) => {
    try {
      const r = await fetch('/api/project-order', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextProjects.map(project => project.name) }),
      })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.loadFailed'))); fetchProjects(); return }
      const data = await r.json()
      if (Array.isArray(data?.projects)) setProjects(data.projects)
    } catch (e: unknown) {
      setError(parseNetworkError(e))
      fetchProjects()
    }
  }, [token, fetchProjects, t])

  const saveChannelOrder = useCallback(async (projectName: string, nextChannels: Channel[]) => {
    if (!projectName) return
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(projectName)}/channel-order`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextChannels.map(channel => channel.index) }),
      })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.loadFailed'))); fetchChannels(projectName); return }
      const data = await r.json()
      if (Array.isArray(data?.channels)) setChannels(data.channels)
    } catch (e: unknown) {
      setError(parseNetworkError(e))
      fetchChannels(projectName)
    }
  }, [token, fetchChannels, t])

  const beginReorderPointer = (kind: ReorderKind, id: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    setChannelMenu(null)
    setProjectMenu(null)
    setSidebarChannelMenu(null)
    setSidebarProjectMenu(null)
    reorderDragRef.current = {
      kind,
      id,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      dragging: false,
    }
    suppressClickRef.current = false
    if (kind === 'channel') setPressChannel(Number(id))
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const updateReorderPointer = (kind: ReorderKind, id: string, e: React.PointerEvent<HTMLElement>) => {
    const drag = reorderDragRef.current
    if (!drag || drag.kind !== kind || drag.id !== id || drag.pointerId !== e.pointerId) return
    const dx = Math.abs(e.clientX - drag.startX)
    const dy = Math.abs(e.clientY - drag.startY)
    if (!drag.dragging) {
      if (dy < 8 || dy < dx) return
      drag.dragging = true
      suppressClickRef.current = true
      if (kind === 'project') setDraggingProject(id)
      else setDraggingChannel(Number(id))
    }
    e.preventDefault()
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-reorder-kind][data-reorder-id]') as HTMLElement | null
    if (!target || target.dataset.reorderKind !== kind) return
    const targetId = target.dataset.reorderId
    if (!targetId || targetId === drag.id) return
    if (kind === 'project') {
      setProjects(prev => {
        const from = prev.findIndex(project => project.name === drag.id)
        const to = prev.findIndex(project => project.name === targetId)
        const next = moveItem(prev, from, to)
        projectsRef.current = next
        return next
      })
    } else {
      setChannels(prev => {
        const from = prev.findIndex(channel => String(channel.index) === drag.id)
        const to = prev.findIndex(channel => String(channel.index) === targetId)
        const next = moveItem(prev, from, to)
        channelsRef.current = next
        return next
      })
    }
  }

  const endReorderPointer = (kind: ReorderKind, id: string, e: React.PointerEvent<HTMLElement>) => {
    const drag = reorderDragRef.current
    if (!drag || drag.kind !== kind || drag.id !== id || drag.pointerId !== e.pointerId) return false
    reorderDragRef.current = null
    setPressChannel(null)
    setDraggingProject(null)
    setDraggingChannel(null)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    if (!drag.dragging) return false
    e.preventDefault()
    suppressClickRef.current = true
    if (kind === 'project') {
      saveProjectOrder(projectsRef.current.slice())
    } else {
      saveChannelOrder(currentProject, channelsRef.current.slice())
    }
    window.setTimeout(() => { suppressClickRef.current = false }, 0)
    return true
  }

  const cancelReorderPointer = (kind: ReorderKind, id: string, e: React.PointerEvent<HTMLElement>) => {
    const drag = reorderDragRef.current
    if (!drag || drag.kind !== kind || drag.id !== id || drag.pointerId !== e.pointerId) return
    reorderDragRef.current = null
    setPressChannel(null)
    setDraggingProject(null)
    setDraggingChannel(null)
    if (drag.dragging) {
      if (kind === 'project') fetchProjects()
      else if (currentProject) fetchChannels(currentProject)
    }
  }

  const clearReorderState = () => {
    reorderDragRef.current = null
    setPressChannel(null)
    setDraggingProject(null)
    setDraggingChannel(null)
  }

  const handleProjectClick = async (project: Project) => {
    if (suppressClickRef.current) return
    if (project.name === currentProject) return
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(project.name)}/activate`, { method: 'POST', headers })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.switchFailed'))); return }
      const data = await r.json()
      onSwitchProject(project.name, data.lastChannel)
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    }
  }

  const doSwitchChannel = async (channel: Channel, shouldClose: boolean) => {
    markChannelSeen(currentProject, channel.index)
    try {
      const r = await fetch(`/api/sessions/${channel.index}/attach?session=${encodeURIComponent(currentProject)}`, {
        method: 'POST',
        headers,
      })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.switchFailed'))); return }
      onSwitchChannel(channel.index)
      if (shouldClose) onClose()
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    }
  }

  const handleRenameChannel = async (channel: Channel) => {
    setChannelMenu(null)
    setSidebarChannelMenu(null)
    const newName = window.prompt(`${t('common.rename')} Channel:`, channel.name)
    if (!newName || newName === channel.name) return
    try {
      const r = await fetch(`/api/sessions/${channel.index}/rename?session=${encodeURIComponent(currentProject)}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.renameFailed'))); return }
      fetchChannels(currentProject)
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    }
  }

  const handleCloseChannel = async (channel: Channel) => {
    setChannelMenu(null)
    setSidebarChannelMenu(null)
    try {
      const r = await fetch(`/api/sessions/${channel.index}?session=${encodeURIComponent(currentProject)}`, {
        method: 'DELETE',
        headers,
      })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.closeFailed'))); return }
      fetchChannels(currentProject)
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    }
  }

  const handleRenameProject = async (project: Project) => {
    setProjectMenu(null)
    setSidebarProjectMenu(null)
    const newName = window.prompt(`${t('common.rename')} Project:`, project.name)
    if (!newName || newName === project.name) return
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(project.name)}/rename`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.renameFailed'))); return }
      fetchProjects()
      if (project.name === currentProject) onSwitchProject(newName)
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    }
  }

  const handleCloseProject = async (project: Project) => {
    setProjectMenu(null)
    setSidebarProjectMenu(null)
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(project.name)}`, { method: 'DELETE', headers })
      if (!r.ok) { setError(await parseApiError(r, t('sessionMgr.closeFailed'))); return }
      fetchProjects()
      if (project.name === currentProject) {
        const remaining = projects.filter(p => p.name !== project.name)
        if (remaining.length > 0) handleProjectClick(remaining[0])
      }
    } catch (e: unknown) {
      setError(parseNetworkError(e))
    }
  }

  // --- Modal mode: position-based menus ---

  const showModalChannelMenu = (channel: Channel, e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getRowMenuPosition(e)
    setChannelMenu({ channel, x, y })
  }

  const showModalProjectMenu = (project: Project, e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getRowMenuPosition(e)
    setProjectMenu({ project, x, y })
  }

  const getRowMenuPosition = (e: React.MouseEvent | React.TouchEvent) => {
    // Get the row div (parent of the button), not the button itself
    const row = (e.currentTarget as HTMLElement).closest('[data-menu-row]') as HTMLElement
    const rect = row ? row.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuWidth = 160
    const menuHeight = 80
    let x = rect.right - menuWidth
    let y = rect.bottom + 4
    if (x + menuWidth > window.innerWidth - 16) x = window.innerWidth - menuWidth - 16
    if (x < 16) x = 16
    if (y + menuHeight > window.innerHeight - 16) y = rect.top - menuHeight - 4
    return { x, y }
  }

  // --- Sidebar mode: right-click context menu ---

  const handleSidebarContext = (e: React.MouseEvent, channel?: Channel, project?: Project) => {
    e.preventDefault()
    clearReorderState()
    const clickX = e.clientX
    const clickY = e.clientY
    if (channel) {
      const menuWidth = 150
      let x = clickX + 4
      let y = clickY + 4
      if (y + 90 > window.innerHeight) y = clickY - 90
      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth
      if (x < 0) x = 0
      setSidebarChannelMenu({ channel, x, y })
    } else if (project) {
      const menuWidth = 170
      let x = clickX + 4
      let y = clickY + 4
      if (y + 110 > window.innerHeight) y = clickY - 110
      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth
      if (x < 0) x = 0
      setSidebarProjectMenu({ project, x, y })
    }
  }

  // --- Mobile tap gestures ---

  const handleChannelTouchEnd = (channel: Channel) => {
    if (suppressClickRef.current) { setPressChannel(null); return }
    setTimeout(() => setPressChannel(null), 100)
    if (channel.index === currentChannelIndex) { onClose(); return }
    pendingChannelRef.current = channel
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      doSwitchChannel(channel, true)
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        if (pendingChannelRef.current) doSwitchChannel(pendingChannelRef.current, false)
      }, 250)
    }
  }

  const activeChannelMenu = isSidebar ? null : channelMenu

  const formatPath = (p: string) => {
    if (!p) return ''
    // Truncate long paths for display
    const parts = p.split('/').filter(Boolean)
    if (parts.length > 3) {
      return '...' + '/' + parts.slice(-2).join('/')
    }
    return p
  }

  const menuButtonClass = (mode: 'sidebar' | 'modal') =>
    mode === 'sidebar'
      ? 'bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 shrink-0'
      : 'bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex items-center justify-center opacity-60 transition-opacity duration-150 shrink-0'

  // ====== Shared content ======
  const content = (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {error && (
        <div className="bg-red-500/15 text-nexus-error px-4 py-2.5 text-sm flex items-center justify-between border-b border-nexus-border">
          {error}
          <button className="bg-transparent border-none text-nexus-error cursor-pointer p-0.5" onPointerDown={() => setError(null)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Project 列表 */}
        <div className="flex-1 py-2 flex flex-col min-h-0" >
          <div className="px-3 pb-1.5 border-b border-nexus-border mb-1.5">
            <div className="text-xs font-semibold text-nexus-text tracking-wide flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📁</span>
                {t('sessionMgr.projects')}
              </div>
              {isSidebar && (
                <button
                  className="bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
                  onClick={handleRefresh}
                  title={t('sessionMgr.refresh') || 'Refresh'}
                >
                  <Icon name="refresh" size={14} />
                </button>
              )}
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-1.5 min-h-0"
          >
            {loadingProjects ? (
              <div className="text-nexus-muted text-sm px-3 py-2">{t('common.loading')}</div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-3 py-4 text-nexus-muted">
                <div className="text-[28px] mb-1.5 opacity-50">📁</div>
                <div className="text-sm">{t('sessionMgr.noProjects')}</div>
              </div>
            ) : projects.map(project => {
              const isActive = project.name === currentProject
              return (
                <div
                  key={project.name}
                  data-menu-row
                  data-reorder-kind="project"
                  data-reorder-id={project.name}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded cursor-pointer mb-0.5 select-none touch-none group/item ${isActive ? 'bg-blue-500/15' : ''} ${draggingProject === project.name ? 'bg-nexus-border opacity-80' : ''}`}
                  onPointerDown={(e) => {
                    beginReorderPointer('project', project.name, e)
                  }}
                  onPointerMove={(e) => updateReorderPointer('project', project.name, e)}
                  onPointerUp={(e) => {
                    const dragged = endReorderPointer('project', project.name, e)
                    if (!dragged && project.name !== currentProject) handleProjectClick(project)
                  }}
                  onPointerCancel={(e) => cancelReorderPointer('project', project.name, e)}
                  onContextMenu={isSidebar ? (e) => { e.preventDefault(); handleSidebarContext(e, undefined, project) } : undefined}
                >
                  {renderDot(projectStatusOf(project.name))}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-nexus-text truncate leading-tight" title={project.name}>{project.name}</div>
                    {project.path && (
                      <div className="text-[11px] text-nexus-text-2 font-mono truncate mt-0.5" title={project.path}>
                        {formatPath(project.path)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-nexus-text-2 font-mono shrink-0">({project.channelCount})</span>
                  {!isSidebar && (
                    <button
                      className={menuButtonClass('modal')}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        showModalProjectMenu(project, e)
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      title={t('sessionMgr.moreOptions')}
                    >
                      <Icon name="more" size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button className="flex items-center justify-center gap-1.5 mx-3 my-1.5 px-2.5 py-1.5 bg-transparent border border-dashed border-nexus-border rounded text-nexus-text-2 text-sm cursor-pointer" onPointerDown={onNewProject}>
            <Icon name="plus" size={14} />
            <span>{t('sessionMgr.newProject')}</span>
          </button>
        </div>

        {/* Channel 列表 */}
        <div className="flex-1 py-2 flex flex-col min-h-0" >
          <div className="px-3 pb-1.5 border-b border-nexus-border mb-1.5">
            <div className="text-xs font-semibold text-nexus-text tracking-wide flex items-center gap-1.5">
              <span className="text-sm">#</span>
              {t('sessionMgr.channels')}
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-1.5 min-h-0"
          >
            {loadingChannels ? (
              <div className="text-nexus-muted text-sm px-3 py-2">{t('common.loading')}</div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-3 py-4 text-nexus-muted">
                <div className="text-[28px] mb-1.5 opacity-50">#</div>
                <div className="text-sm">{t('sessionMgr.noChannels')}</div>
              </div>
            ) : channels.map(channel => {
              const isActive = channel.index === currentChannelIndex
              const status = statusOf(currentProject, channel.index)
              return (
                <div
                  key={channel.index}
                  data-menu-row
                  data-reorder-kind="channel"
                  data-reorder-id={String(channel.index)}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded cursor-pointer mb-0.5 select-none touch-none transition-colors duration-75 group/item ${isActive ? 'bg-nexus-bg-2' : ''} ${!isDesktop && pressChannel === channel.index ? 'bg-nexus-border' : ''} ${draggingChannel === channel.index ? 'bg-nexus-border opacity-80' : ''}`}
                  style={{ WebkitTouchCallout: 'none' }}
                  onPointerDown={(e) => {
                    beginReorderPointer('channel', String(channel.index), e)
                  }}
                  onPointerMove={(e) => updateReorderPointer('channel', String(channel.index), e)}
                  onPointerUp={(e) => {
                    const dragged = endReorderPointer('channel', String(channel.index), e)
                    if (!dragged && isDesktop) doSwitchChannel(channel, false)
                  }}
                  onPointerCancel={(e) => cancelReorderPointer('channel', String(channel.index), e)}
                  onContextMenu={isSidebar ? (e) => { e.preventDefault(); handleSidebarContext(e, channel, undefined) } : undefined}
                  onTouchEnd={(e) => { if (!isDesktop) { e.preventDefault(); handleChannelTouchEnd(channel) } }}
                >
                  {renderDot(status)}
                  <span className="text-nexus-text-2 text-[13px] font-medium select-none shrink-0 mt-0">#</span>
                  <span className="flex-1 text-sm text-nexus-text truncate leading-tight min-w-0" title={channel.name}>{channel.name}</span>
                  {!isSidebar && (
                    <button
                      className={menuButtonClass('modal')}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        showModalChannelMenu(channel, e)
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      title={t('sessionMgr.moreOptions')}
                    >
                      <Icon name="more" size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button className="flex items-center justify-center gap-1.5 mx-3 my-1.5 px-2.5 py-1.5 bg-transparent border border-dashed border-nexus-border rounded text-nexus-text-2 text-sm cursor-pointer" onPointerDown={onNewChannel}>
            <Icon name="plus" size={14} />
            <span>{t('sessionMgr.newChannel')}</span>
          </button>

          {/* Modal mode: channel menu overlay */}
          {activeChannelMenu && (
            <>
              <div className="fixed inset-0 z-[150]" onPointerDown={() => { setChannelMenu(null) }} />
              <div
                className="fixed bg-nexus-bg border border-nexus-border rounded-lg py-1 min-w-[120px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-[151]"
                style={{ left: activeChannelMenu.x, top: activeChannelMenu.y }}
              >
                <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-text text-sm cursor-pointer w-full text-left" onPointerDown={() => handleRenameChannel(activeChannelMenu.channel)}>
                  <Icon name="pencil" size={14} />
                  <span>{t('common.rename')}</span>
                </button>
                <div className="h-px bg-nexus-border my-1" />
                <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-error text-sm cursor-pointer w-full text-left" onPointerDown={() => handleCloseChannel(activeChannelMenu.channel)}>
                  <Icon name="x" size={14} />
                  <span>{t('common.close')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ====== Sidebar mode ======
  if (isSidebar) {
    return (
      <div
        className="grid grid-rows-[1fr_auto_1fr] bg-nexus-bg text-nexus-text h-full"
      >
        {error && (
          <div className="bg-red-500/15 text-nexus-error px-4 py-2.5 text-sm flex items-center justify-between border-b border-nexus-border shrink-0">
            {error}
            <button className="bg-transparent border-none text-nexus-error cursor-pointer p-0.5" onPointerDown={() => setError(null)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {/* Projects section: 50% height, internal scroll */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-3 pr-10 py-1.5 border-b border-nexus-border shrink-0">
            <div className="text-xs font-semibold text-nexus-text tracking-wide flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📁</span>
                {t('sessionMgr.projects')}
              </div>
              <button
                className="bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
                onClick={handleRefresh}
                title={t('sessionMgr.refresh') || 'Refresh'}
              >
                <Icon name="refresh" size={14} />
              </button>
            </div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto px-1.5 py-1"
          >
            {loadingProjects ? (
              <div className="text-nexus-muted text-sm px-3 py-2">{t('common.loading')}</div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-3 py-2 text-nexus-muted">
                <div className="text-sm">{t('sessionMgr.noProjects')}</div>
              </div>
            ) : projects.map(project => {
              const isActive = project.name === currentProject
              return (
                <div
                  key={project.name}
                  data-menu-row
                  data-reorder-kind="project"
                  data-reorder-id={project.name}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded cursor-pointer mb-0.5 select-none touch-none group/item ${isActive ? 'bg-blue-500/15' : ''} ${draggingProject === project.name ? 'bg-nexus-border opacity-80' : ''}`}
                  onPointerDown={(e) => {
                    beginReorderPointer('project', project.name, e)
                  }}
                  onPointerMove={(e) => updateReorderPointer('project', project.name, e)}
                  onPointerUp={(e) => {
                    const dragged = endReorderPointer('project', project.name, e)
                    if (!dragged && project.name !== currentProject) handleProjectClick(project)
                  }}
                  onPointerCancel={(e) => cancelReorderPointer('project', project.name, e)}
                  onContextMenu={(e) => { e.preventDefault(); handleSidebarContext(e, undefined, project) }}
                >
                  {renderDot(projectStatusOf(project.name))}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-nexus-text truncate leading-tight" title={project.name}>{project.name}</div>
                    {project.path && (
                      <div className="text-[11px] text-nexus-text-2 font-mono truncate mt-0.5" title={project.path}>
                        {formatPath(project.path)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-nexus-text-2 font-mono shrink-0">({project.channelCount})</span>
                </div>
              )
            })}
          </div>
          <button className="flex items-center justify-center gap-1.5 mx-3 py-1 px-2.5 bg-transparent border border-dashed border-nexus-border rounded text-nexus-text-2 text-sm cursor-pointer shrink-0" onPointerDown={onNewProject}>
            <Icon name="plus" size={14} />
            <span>{t('sessionMgr.newProject')}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex-shrink-0 h-px bg-nexus-border" />

        {/* Channels section: 50% height, internal scroll */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-3 pr-10 py-1.5 border-b border-nexus-border shrink-0">
            <div className="text-xs font-semibold text-nexus-text tracking-wide flex items-center gap-1.5">
              <span className="text-sm">#</span>
              {t('sessionMgr.channels')}
            </div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto px-1.5 py-1"
          >
            {loadingChannels ? (
              <div className="text-nexus-muted text-sm px-3 py-2">{t('common.loading')}</div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-3 py-2 text-nexus-muted">
                <div className="text-sm">{t('sessionMgr.noChannels')}</div>
              </div>
            ) : channels.map(channel => {
              const isActive = channel.index === currentChannelIndex
              const status = statusOf(currentProject, channel.index)
              return (
                <div
                  key={channel.index}
                  data-menu-row
                  data-reorder-kind="channel"
                  data-reorder-id={String(channel.index)}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded cursor-pointer mb-0.5 select-none touch-none transition-colors duration-75 group/item ${isActive ? 'bg-nexus-bg-2' : ''} ${draggingChannel === channel.index ? 'bg-nexus-border opacity-80' : ''}`}
                  style={{ WebkitTouchCallout: 'none' }}
                  onPointerDown={(e) => {
                    beginReorderPointer('channel', String(channel.index), e)
                  }}
                  onPointerMove={(e) => updateReorderPointer('channel', String(channel.index), e)}
                  onPointerUp={(e) => {
                    const dragged = endReorderPointer('channel', String(channel.index), e)
                    if (!dragged) doSwitchChannel(channel, false)
                  }}
                  onPointerCancel={(e) => cancelReorderPointer('channel', String(channel.index), e)}
                  onDoubleClick={() => { onCloseEditor?.(); doSwitchChannel(channel, false) }}
                  onContextMenu={(e) => { e.preventDefault(); handleSidebarContext(e, channel, undefined) }}
                >
                  {renderDot(status)}
                  <span className="text-nexus-text-2 text-[13px] font-medium select-none shrink-0 mt-0">#</span>
                  <span className="flex-1 text-sm text-nexus-text truncate leading-tight min-w-0" title={channel.name}>{channel.name}</span>
                </div>
              )
            })}
          </div>
          <button className="flex items-center justify-center gap-1.5 mx-3 py-1 px-2.5 bg-transparent border border-dashed border-nexus-border rounded text-nexus-text-2 text-sm cursor-pointer shrink-0" onPointerDown={onNewChannel}>
            <Icon name="plus" size={14} />
            <span>{t('sessionMgr.newChannel')}</span>
          </button>
        </div>

        {/* Sidebar right-click menu - channel */}
        {sidebarChannelMenu && (
          <>
            <div className="fixed inset-0 z-[150]" onPointerDown={() => setSidebarChannelMenu(null)} />
            <div
              className="fixed bg-nexus-bg border border-nexus-border rounded-lg py-1 min-w-[120px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-[151]"
              style={{ left: sidebarChannelMenu.x, top: sidebarChannelMenu.y }}
            >
              <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-text text-sm cursor-pointer w-full text-left" onPointerDown={() => handleRenameChannel(sidebarChannelMenu.channel)}>
                <Icon name="pencil" size={14} />
                <span>{t('common.rename')}</span>
              </button>
              <div className="h-px bg-nexus-border my-1" />
              <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-error text-sm cursor-pointer w-full text-left" onPointerDown={() => handleCloseChannel(sidebarChannelMenu.channel)}>
                <Icon name="x" size={14} />
                <span>{t('common.close')}</span>
              </button>
            </div>
          </>
        )}

        {/* Sidebar right-click menu - project */}
        {sidebarProjectMenu && (
          <>
            <div className="fixed inset-0 z-[150]" onPointerDown={() => setSidebarProjectMenu(null)} />
            <div
              className="fixed bg-nexus-bg border border-nexus-border rounded-lg py-1 min-w-[120px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-[151]"
              style={{ left: sidebarProjectMenu.x, top: sidebarProjectMenu.y }}
            >
              <div className="px-4 py-1.5 text-xs font-semibold text-nexus-text-2 border-b border-nexus-border mb-0">
                {sidebarProjectMenu.project.name}
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-text text-sm cursor-pointer w-full text-left" onPointerDown={() => handleRenameProject(sidebarProjectMenu.project)}>
                <Icon name="pencil" size={14} />
                <span>{t('common.rename')}</span>
              </button>
              <div className="h-px bg-nexus-border my-1" />
              <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-error text-sm cursor-pointer w-full text-left" onPointerDown={() => handleCloseProject(sidebarProjectMenu.project)}>
                <Icon name="x" size={14} />
                <span>{t('sessionMgr.closeProject')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ====== Modal mode ======
  return (
    <div className={isDesktop ? 'fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-5' : 'fixed inset-0 bg-black/60 z-[100]'}>
      <GhostShield />
      <div className={isDesktop
        ? 'bg-nexus-bg border border-nexus-border rounded-xl flex flex-col text-nexus-text w-full max-w-[400px] max-h-[85vh] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden'
        : 'fixed inset-0 bg-nexus-bg flex flex-col text-nexus-text'
      }>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-nexus-border shrink-0">
          <span className="text-base font-semibold">{t('sessionMgr.title')}</span>
          <div className="flex items-center gap-2">
            <button className="bg-transparent border-none text-nexus-text-2 cursor-pointer p-1 flex items-center justify-center" onPointerDown={handleRefresh} title={t('sessionMgr.refresh') || '刷新'}>
              <Icon name="refresh" size={16} />
            </button>
            <button className="bg-transparent border-none text-nexus-text-2 cursor-pointer text-2xl leading-none px-1 flex items-center justify-center" onPointerDown={onClose}>
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {content}

        {/* Modal mode: project menu overlay */}
        {projectMenu && (
          <>
            <div className="fixed inset-0 z-[150]" onPointerDown={() => setProjectMenu(null)} />
            <div
              className="fixed bg-nexus-bg border border-nexus-border rounded-lg py-1 min-w-[120px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-[151]"
              style={{ left: projectMenu.x, top: projectMenu.y }}
            >
              <div className="px-4 py-1.5 text-xs font-semibold text-nexus-text-2 border-b border-nexus-border mb-0">{projectMenu.project.name}</div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-text text-sm cursor-pointer w-full text-left" onPointerDown={() => handleRenameProject(projectMenu.project)}>
                <Icon name="pencil" size={14} />
                <span>{t('common.rename')}</span>
              </button>
              <div className="h-px bg-nexus-border my-1" />
              <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-nexus-error text-sm cursor-pointer w-full text-left" onPointerDown={() => handleCloseProject(projectMenu.project)}>
                <Icon name="x" size={14} />
                <span>{t('sessionMgr.closeProject')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
})
