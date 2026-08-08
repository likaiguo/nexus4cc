import { existsSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_TERM = 'xterm-256color'
const DEFAULT_LANG = 'C.UTF-8'

function terminfoCandidates(homeDir) {
  return [
    homeDir ? join(homeDir, '.brew', 'share', 'terminfo') : '',
    '/Applications/iTerm.app/Contents/Resources/terminfo',
    '/opt/homebrew/share/terminfo',
    '/usr/local/share/terminfo',
    '/usr/share/terminfo',
  ].filter(Boolean)
}

export function resolveTerminalEnvironment(environment = process.env, { pathExists = existsSync } = {}) {
  const explicitTerminfoDirs = String(environment.TERMINFO_DIRS || '').trim()
  const terminfoDirs = explicitTerminfoDirs || terminfoCandidates(environment.HOME).filter(pathExists).join(':')

  return {
    TERM: String(environment.TERM || DEFAULT_TERM),
    LANG: String(environment.LANG || DEFAULT_LANG),
    TERMINFO_DIRS: terminfoDirs,
  }
}
