// Channel/window status detection — shared heuristics used by both the
// frontend (live dot for the active session) and the backend poller
// (full-fleet attention state). Keep the regexes here as the single source
// of truth so the two consumers don't drift.

export type WindowStatus = 'active' | 'needs-confirm' | 'done' | 'idle' | 'shell' | 'unknown'

// --- Pure heuristics (also derived server-side) ---

// Strip ANSI escape sequences so line matching works on plain text.
export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;?]*[mGKHFJABCDsulhr]/g, '').replace(/\r/g, '')
}

// Detect an interactive confirmation prompt (Claude permission / yes-no gates).
// Calibrated against Claude Code TUI output, e.g.:
//   "Do you want to proceed?"
//   "❯ 1. Yes"  /  "› 1. Yes, and don't ask again"
//   "(y/n)"
export function detectNeedsConfirm(output: string): boolean {
  const text = stripAnsi(output)
  return (
    /❯\s*\d+\.\s/.test(text) ||
    /›\s*\d+\.\s/.test(text) ||
    /\bDo you want to proceed\b/i.test(text) ||
    /\bWould you like to proceed\b/i.test(text) ||
    /\(y\/n\)/i.test(text) ||
    /\[y\/N\]/i.test(text) ||
    /❯\s*\d+\.\s*Yes\b/i.test(text)
  )
}

// A shell prompt as the last non-empty line means we're back at the shell.
export function detectShellPrompt(lastLine: string): boolean {
  return /[$#]\s*$/.test(lastLine)
}

// Last non-empty, ANSI-stripped line of a buffer.
export function lastNonEmptyLine(output: string): string {
  const lines = stripAnsi(output).split('\n').map(l => l.trimEnd()).filter(l => l.length > 0)
  return lines[lines.length - 1] || ''
}

// Live status for the currently-attached session (frontend fast path).
// The full state machine — including the sticky needs-confirm / done — lives
// server-side; this only classifies the real-time signal.
export function getWindowStatus(data?: { output: string; idleMs: number; connected: boolean }): WindowStatus {
  if (!data || !data.connected) return 'unknown'
  if (detectNeedsConfirm(data.output)) return 'needs-confirm'
  if (data.idleMs < 4000) return 'active'
  const lastLine = lastNonEmptyLine(data.output)
  if (detectShellPrompt(lastLine)) return 'shell'
  return 'idle'
}

export const STATUS_DOT_COLOR: Record<WindowStatus, string> = {
  'active': '#22c55e',         // green — live conversation / running
  'needs-confirm': '#ef4444',  // red — awaiting user confirmation (pulses, see CSS)
  'done': '#3b82f6',           // blue — session finished
  'idle': '#9ca3af',           // grey — idle
  'shell': '#6b7280',          // dark grey — exited to shell
  'unknown': '#475569',        // disconnected
}

// Which statuses render with the attention pulse animation.
export const STATUS_DOT_PULSE: Record<WindowStatus, boolean> = {
  'active': false, 'needs-confirm': true, 'done': false, 'idle': false, 'shell': false, 'unknown': false,
}

export const STATUS_DOT_TITLE: Record<WindowStatus, string> = {
  'active': 'windowStatus.active',
  'needs-confirm': 'windowStatus.needsConfirm',
  'done': 'windowStatus.done',
  'idle': 'windowStatus.idle',
  'shell': 'windowStatus.shellExited',
  'unknown': 'windowStatus.disconnected',
}
