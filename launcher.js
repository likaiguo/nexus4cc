export const KNOWN_LAUNCHERS = new Set(['claude', 'codex', 'cfuse', 'bash'])

export function normalizeLauncher(value, fallback = 'bash') {
  const launcher = String(value || '').trim().toLowerCase()
  return launcher || fallback
}

export function shellQuote(value) {
  return `'${String(value ?? '').replace(/'/g, `'\\''`)}'`
}

export function collectProxyVars(env = process.env, claudeProxy = '') {
  return {
    ...(env.HTTP_PROXY ? { HTTP_PROXY: env.HTTP_PROXY } : {}),
    ...(env.HTTPS_PROXY ? { HTTPS_PROXY: env.HTTPS_PROXY } : {}),
    ...(env.ALL_PROXY ? { ALL_PROXY: env.ALL_PROXY } : {}),
    ...(env.http_proxy ? { http_proxy: env.http_proxy } : {}),
    ...(env.https_proxy ? { https_proxy: env.https_proxy } : {}),
    ...(claudeProxy ? { ALL_PROXY: claudeProxy, HTTPS_PROXY: claudeProxy, HTTP_PROXY: claudeProxy, NEXUS_PROXY: claudeProxy } : {}),
  }
}

export function buildProxyPrefix(proxyVars = {}) {
  const exports = Object.entries(proxyVars)
    .filter(([key, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `export ${key}=${shellQuote(value)}`)
    .join('; ')
  return exports ? `${exports}; ` : ''
}

export function buildInteractiveShellCmd(interactiveShell = 'bash', prefix = '') {
  return `${prefix}exec ${interactiveShell} -i`
}

export function buildLauncherCommand({
  launcher = 'bash',
  profile = '',
  cwd = '',
  agentSessionId = '',
  proxyVars = {},
  interactiveShell = 'bash',
  runScript = '',
} = {}) {
  const normalized = normalizeLauncher(launcher)
  const known = KNOWN_LAUNCHERS.has(normalized)
  const effective = known ? normalized : 'bash'
  const prefix = buildProxyPrefix(proxyVars)
  const shellCmd = buildInteractiveShellCmd(interactiveShell)
  const fallbackShell = `echo; echo ${shellQuote('[Nexus] Launcher exited or failed; opening shell')}; ${shellCmd}`

  if (effective === 'bash') {
    return {
      launcher: normalized,
      effectiveLauncher: 'bash',
      command: buildInteractiveShellCmd(interactiveShell, prefix),
      fallback: !known,
    }
  }

  const resumeId = String(agentSessionId || '').trim()

  if (effective === 'codex') {
    return {
      launcher: normalized,
      effectiveLauncher: 'codex',
      command: `${prefix}${resumeId ? `codex resume ${shellQuote(resumeId)}` : 'codex'} || ${fallbackShell}`,
      fallback: false,
    }
  }

  if (effective === 'cfuse') {
    return {
      launcher: normalized,
      effectiveLauncher: 'cfuse',
      command: `${prefix}${resumeId ? `cfuse --resume ${shellQuote(resumeId)}` : 'cfuse'} || ${fallbackShell}`,
      fallback: false,
    }
  }

  if (effective === 'claude' && resumeId) {
    return {
      launcher: normalized,
      effectiveLauncher: 'claude',
      command: `${prefix}claude --resume ${shellQuote(resumeId)} || ${fallbackShell}`,
      fallback: false,
    }
  }

  if (profile && runScript) {
    return {
      launcher: normalized,
      effectiveLauncher: 'claude',
      command: `${prefix}bash ${shellQuote(runScript)} ${shellQuote(profile)} ${shellQuote(cwd)} || ${fallbackShell}`,
      fallback: false,
    }
  }

  return {
    launcher: normalized,
    effectiveLauncher: 'claude',
    command: `${prefix}claude --dangerously-skip-permissions || ${fallbackShell}`,
    fallback: false,
  }
}

export function inferLauncher({ windowName = '', paneCommand = '' } = {}) {
  const haystack = `${windowName} ${paneCommand}`.toLowerCase()
  if (/\bcodex\b/.test(haystack)) return 'codex'
  if (/\bcfuse\b/.test(haystack)) return 'cfuse'
  if (/\bclaude\b/.test(haystack)) return 'claude'
  if (/\b(zsh|bash|sh|fish)\b/.test(haystack)) return 'bash'
  return 'bash'
}
