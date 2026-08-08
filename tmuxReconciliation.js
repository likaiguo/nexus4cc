export function reconcileTmuxProjectSnapshot({ store, project, channels, workspaceRoot, inferLauncher }) {
  store.upsertTmuxProject({
    name: project.name,
    cwd: project.path || workspaceRoot,
    displayName: project.name,
    status: 'active',
  }, { preserveExistingLauncher: true })

  for (const channel of channels) {
    store.upsertTmuxChannel({
      project: project.name,
      channelIndex: channel.index,
      name: channel.name,
      cwd: channel.cwd || project.path || workspaceRoot,
      launcher: inferLauncher({ windowName: channel.name, paneCommand: channel.paneCommand }),
      status: 'active',
      metadata: { source: 'tmux-reconcile', paneCommand: channel.paneCommand || '' },
    }, { preserveExistingLauncher: true })
    if (channel.active) store.setTmuxProjectLastChannel(project.name, channel.index)
  }

  return { projectCount: 1, channelCount: channels.length }
}

export function missingTmuxProjects(projects, liveProjectNames) {
  return projects.filter(project => !liveProjectNames.has(project.name))
}

export function missingTmuxChannels(channels, liveChannelKeys) {
  return channels.filter(channel => !liveChannelKeys.has(`${channel.project}:${channel.channelIndex}`))
}
