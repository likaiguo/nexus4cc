const SAFE_TMUX_SESSION_NAME = /^[a-zA-Z0-9._~-]{1,50}$/

export function isSafeTmuxSessionName(value) {
  return SAFE_TMUX_SESSION_NAME.test(String(value || ''))
}
