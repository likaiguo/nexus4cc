import { useTranslation } from 'react-i18next'
import { Icon } from './icons'
import { formatHistoryBytes, formatHistoryTime } from './sessionHistory'
import type { SessionHistoryItem } from './sessionHistory'

interface SessionHistoryListProps {
  readonly items: readonly SessionHistoryItem[]
  readonly selectedKey: string
  readonly loading: boolean
  readonly onSelect: (key: string) => void
}

export function SessionHistoryList({ items, selectedKey, loading, onSelect }: SessionHistoryListProps) {
  const { t } = useTranslation()
  if (loading) return <div className="p-3 text-xs text-nexus-text-2">{t('common.loading')}</div>
  if (items.length === 0) return <div className="p-4 text-xs text-nexus-text-2">{t('sessionArchives.empty')}</div>

  return items.map(item => {
    const isSelected = item.key === selectedKey
    const isActive = item.linkedChannel?.status === 'active'
    return (
      <button
        key={item.key}
        className="w-full min-h-[88px] text-left bg-transparent border-0 border-b border-nexus-border px-3 py-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-accent"
        style={{ background: isSelected ? 'var(--nexus-tab-active)' : 'transparent' }}
        onClick={() => onSelect(item.key)}
      >
        <div className="flex items-start gap-2 mb-1">
          <Icon name={item.source === 'native' ? 'message' : 'archive'} size={14} className="text-nexus-text-2 mt-0.5 shrink-0" />
          <span className="text-xs font-semibold text-nexus-text line-clamp-2 min-w-0 flex-1">{item.title || item.windowName || item.launcher}</span>
          <span className="text-[11px] text-nexus-text-2 font-mono shrink-0">{item.launcher}</span>
        </div>
        <div className="text-[11px] text-nexus-text-2 font-mono truncate">
          {item.linkedChannel ? `${item.linkedChannel.project}:${item.linkedChannel.channelIndex}` : item.cwd}
        </div>
        <div className="text-[11px] text-nexus-muted mt-1 flex items-center justify-between gap-2">
          <span className="truncate">{formatHistoryTime(item.updatedAt || item.closedAt || item.createdAt)}</span>
          <span className="shrink-0 flex items-center gap-1.5">
            {item.linkedChannel && (
              <span className={isActive ? 'text-nexus-success' : 'text-nexus-text-2'}>
                {isActive ? t('sessionArchives.activeLink') : t('sessionArchives.closedLink')}
              </span>
            )}
            {item.transcriptSize > 0 && <span>{formatHistoryBytes(item.transcriptSize)}</span>}
          </span>
        </div>
      </button>
    )
  })
}
