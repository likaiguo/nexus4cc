import { agentSessionLinkMatchesChannel } from './agentSessions.js'

function channelRef(channel) {
  return {
    project: channel.project,
    channelIndex: channel.channelIndex,
  }
}

function sameChannel(left, right) {
  return left?.project === right?.project && Number(left?.channelIndex) === Number(right?.channelIndex)
}

function metadataWithoutSessionId(metadata, agentSessionId) {
  if (String(metadata?.agentSessionId || '') !== agentSessionId) return metadata || {}
  const next = { ...(metadata || {}) }
  delete next.agentSessionId
  delete next.manualAgentSessionLink
  next.manualUnlinkedAgentSessionId = agentSessionId
  return next
}

export function suppressesAgentSessionLink(channel, agentSessionId) {
  return Boolean(agentSessionId)
    && String(channel?.metadata?.manualUnlinkedAgentSessionId || '') === String(agentSessionId)
}

function bindingConflicts({ store, history, targetChannel }) {
  const conflicts = []
  const existingLink = store.getAgentSessionLink(history.launcher, history.agentSessionId)
  const previousChannel = existingLink
    ? store.getTmuxChannel(existingLink.project, existingLink.channelIndex)
    : null
  if (existingLink && !sameChannel(existingLink, targetChannel) && agentSessionLinkMatchesChannel(existingLink, previousChannel)) {
    conflicts.push({ kind: 'session-linked-elsewhere', ...channelRef(previousChannel) })
  }
  const targetSessionId = String(targetChannel?.metadata?.agentSessionId || '')
  if (targetSessionId && targetSessionId !== history.agentSessionId) {
    conflicts.push({
      kind: 'target-linked-to-other',
      ...channelRef(targetChannel),
      agentSessionId: targetSessionId,
    })
  }
  return { conflicts, existingLink, previousChannel, targetSessionId }
}

export function bindAgentSessionToChannel({ store, history, targetChannel, force = false } = {}) {
  const agentSessionId = String(history?.agentSessionId || '').trim()
  const launcher = String(history?.launcher || '').trim()
  if (!store || !agentSessionId || !launcher) throw new Error('resumable agent history required')
  if (!targetChannel || targetChannel.status !== 'active') throw new Error('active target channel required')

  const conflictState = bindingConflicts({ store, history, targetChannel })
  if (conflictState.conflicts.length > 0 && !force) {
    return { kind: 'conflict', conflicts: conflictState.conflicts }
  }

  if (conflictState.previousChannel && !sameChannel(conflictState.previousChannel, targetChannel)) {
    store.upsertTmuxChannel({
      ...conflictState.previousChannel,
      metadata: metadataWithoutSessionId(conflictState.previousChannel.metadata, agentSessionId),
    })
  }

  const targetMetadata = {
    ...(targetChannel.metadata || {}),
    agentSessionId,
    manualAgentSessionLink: true,
  }
  delete targetMetadata.manualUnlinkedAgentSessionId
  const updated = store.upsertTmuxChannel({
    ...targetChannel,
    launcher,
    profile: String(history.profile || targetChannel.profile || ''),
    metadata: targetMetadata,
  })
  store.upsertAgentSessionLink({
    launcher,
    agentSessionId,
    project: updated.project,
    channelIndex: updated.channelIndex,
    cwd: updated.cwd,
    source: 'manual-history-link',
  })
  return {
    kind: 'linked',
    linkedChannel: { ...channelRef(updated), status: 'active' },
    replacedAgentSessionId: conflictState.targetSessionId === agentSessionId ? '' : conflictState.targetSessionId,
  }
}
