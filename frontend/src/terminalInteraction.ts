export interface ScrollbackScrollState {
  readonly scrollTop: number
  readonly previousScrollTop: number
  readonly clientHeight: number
  readonly scrollHeight: number
  readonly hasSelection: boolean
  readonly openedAtMs: number
  readonly nowMs: number
  readonly bottomThreshold?: number
  readonly directionThreshold?: number
  readonly openGraceMs?: number
}

export interface ReorderDragStateInput {
  readonly startedFromHandle: boolean
  readonly deltaX: number
  readonly deltaY: number
  readonly threshold?: number
}

export interface TextRange {
  readonly startOffset: number
  readonly endOffset: number
}

export function clampCursor(cursor: number, text: string): number {
  return Math.max(0, Math.min(cursor, text.length))
}

export function findLastTextRange(text: string, selectedText: string): TextRange | null {
  const needle = selectedText.trim()
  if (!needle) return null
  const startOffset = text.lastIndexOf(needle)
  if (startOffset < 0) return null
  return {
    startOffset,
    endOffset: startOffset + needle.length,
  }
}

export function shouldCloseScrollbackOnScroll(state: ScrollbackScrollState): boolean {
  if (state.hasSelection) return false
  const openGraceMs = state.openGraceMs ?? 400
  if (state.nowMs - state.openedAtMs < openGraceMs) return false

  const bottomThreshold = state.bottomThreshold ?? 30
  const directionThreshold = state.directionThreshold ?? 4
  const isAtBottom = state.scrollTop + state.clientHeight >= state.scrollHeight - bottomThreshold
  const isMovingTowardLiveOutput = state.scrollTop > state.previousScrollTop + directionThreshold
  return isAtBottom && isMovingTowardLiveOutput
}

export function shouldStartReorderDrag(input: ReorderDragStateInput): boolean {
  if (!input.startedFromHandle) return false
  const threshold = input.threshold ?? 8
  const absX = Math.abs(input.deltaX)
  const absY = Math.abs(input.deltaY)
  return absY >= threshold && absY > absX
}
