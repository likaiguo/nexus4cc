import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthFetch } from './AuthSessionProvider'
import { Icon } from './icons'
import type { SessionHistoryItem } from './sessionHistory'
import {
  SessionBindingConflictError,
  requestSessionBinding,
  requestSessionLinkTargets,
  type SessionBindingConflict,
  type SessionLinkTarget,
} from './sessionHistoryBinding'

interface Props {
  readonly token: string
  readonly currentProject: string
  readonly currentChannelIndex: number
  readonly selected: SessionHistoryItem | null
  readonly disabled: boolean
  readonly onLinked: () => Promise<unknown>
}

function targetLabel(target: SessionLinkTarget, currentChannelIndex: number, currentLabel: string): string {
  const current = target.channelIndex === currentChannelIndex ? ` · ${currentLabel}` : ''
  return `${target.channelIndex}: ${target.name}${current}`
}

export function SessionHistoryLinkControls({
  token,
  currentProject,
  currentChannelIndex,
  selected,
  disabled,
  onLinked,
}: Props) {
  const { t } = useTranslation()
  const authFetch = useAuthFetch()
  const [targets, setTargets] = useState<readonly SessionLinkTarget[]>([])
  const [targetChannelIndex, setTargetChannelIndex] = useState(currentChannelIndex)
  const [loadingTargets, setLoadingTargets] = useState(true)
  const [linking, setLinking] = useState(false)
  const [conflicts, setConflicts] = useState<readonly SessionBindingConflict[]>([])
  const [message, setMessage] = useState<{ readonly kind: 'error' | 'success'; readonly text: string } | null>(null)

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true)
    setMessage(null)
    try {
      const rows = await requestSessionLinkTargets(authFetch, token, currentProject)
      setTargets(rows)
      setTargetChannelIndex(previous => rows.some(row => row.channelIndex === previous)
        ? previous
        : rows.find(row => row.channelIndex === currentChannelIndex)?.channelIndex ?? rows[0]?.channelIndex ?? currentChannelIndex)
    } catch (cause: unknown) {
      if (!(cause instanceof Error)) throw cause
      setTargets([])
      setMessage({ kind: 'error', text: t('sessionArchives.linkTargetsFailed') })
    } finally {
      setLoadingTargets(false)
    }
  }, [authFetch, currentChannelIndex, currentProject, t, token])

  useEffect(() => { void loadTargets() }, [loadTargets])
  useEffect(() => {
    setConflicts([])
    setMessage(null)
  }, [selected?.key, targetChannelIndex])

  async function linkSelected(force: boolean): Promise<void> {
    if (!selected?.agentSessionId) return
    setLinking(true)
    setMessage(null)
    try {
      const linked = await requestSessionBinding(authFetch, {
        token,
        project: currentProject,
        historyKey: selected.key,
        targetChannelIndex,
        force,
      })
      setConflicts([])
      setMessage({
        kind: 'success',
        text: t('sessionArchives.linkSuccess', { project: linked.project, channel: linked.channelIndex }),
      })
      await onLinked()
    } catch (cause: unknown) {
      if (cause instanceof SessionBindingConflictError) {
        setConflicts(cause.conflicts)
        return
      }
      if (!(cause instanceof Error)) throw cause
      setMessage({ kind: 'error', text: t('sessionArchives.linkFailed') })
    } finally {
      setLinking(false)
    }
  }

  const canLink = Boolean(selected?.agentSessionId) && targets.length > 0 && !disabled && !linking && !loadingTargets

  return (
    <div className="px-3 py-2 border-b border-nexus-border bg-nexus-bg-2/40">
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <label className="flex-1 min-w-0 text-[11px] text-nexus-text-2" htmlFor="session-history-link-target">
          <span className="block mb-1">{t('sessionArchives.linkTarget')}</span>
          <select
            id="session-history-link-target"
            className="w-full min-h-11 rounded-md border border-nexus-border bg-nexus-bg px-2.5 text-xs text-nexus-text outline-none focus:border-nexus-accent"
            value={targetChannelIndex}
            onChange={event => setTargetChannelIndex(Number(event.target.value))}
            disabled={loadingTargets || linking || targets.length === 0}
          >
            {targets.map(target => (
              <option key={`${target.project}:${target.channelIndex}`} value={target.channelIndex}>
                {targetLabel(target, currentChannelIndex, t('sessionArchives.currentChannel'))}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="min-h-11 px-3 rounded-md border border-nexus-accent bg-transparent text-nexus-accent text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 shrink-0"
          onClick={() => void linkSelected(false)}
          disabled={!canLink}
        >
          <Icon name="pin" size={14} />
          {linking ? t('sessionArchives.linking') : t('sessionArchives.linkChannel')}
        </button>
      </div>
      <p className="m-0 mt-1.5 text-[11px] text-nexus-muted">{t('sessionArchives.linkHelp')}</p>
      {selected && !selected.agentSessionId && (
        <div role="status" className="mt-1.5 text-xs text-nexus-muted">{t('sessionArchives.linkUnavailable')}</div>
      )}
      {conflicts.length > 0 && (
        <div role="alert" className="mt-2 rounded-md border border-nexus-warning/50 bg-nexus-warning/10 px-2.5 py-2 text-xs text-nexus-text">
          <div>{t('sessionArchives.linkConflict')}</div>
          <ul className="my-1.5 pl-4 text-[11px] text-nexus-text-2">
            {conflicts.map(conflict => (
              <li key={`${conflict.kind}:${conflict.project}:${conflict.channelIndex}`}>
                {conflict.kind === 'session-linked-elsewhere'
                  ? t('sessionArchives.sessionLinkedElsewhere', { project: conflict.project, channel: conflict.channelIndex })
                  : t('sessionArchives.targetLinkedToOther', { project: conflict.project, channel: conflict.channelIndex })}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="min-h-10 px-3 rounded bg-nexus-warning text-black border-none cursor-pointer" onClick={() => void linkSelected(true)} disabled={linking}>
              {t('sessionArchives.confirmRelink')}
            </button>
            <button type="button" className="min-h-10 px-3 rounded border border-nexus-border bg-transparent text-nexus-text cursor-pointer" onClick={() => setConflicts([])} disabled={linking}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {message && (
        <div role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs ${message.kind === 'error' ? 'text-nexus-error' : 'text-nexus-success'}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
