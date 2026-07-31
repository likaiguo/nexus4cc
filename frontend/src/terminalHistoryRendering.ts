const HTML_ESCAPE_PATTERN = /[&<>]/g
const GRAPHEME_CONTINUATION_PATTERN = /[\p{Mark}\p{Emoji_Modifier}\uFE0E\uFE0F]/u
const EMOJI_PRESENTATION_PATTERN = /\p{Emoji_Presentation}/u
const ZERO_WIDTH_JOINER = '\u200d'
const GRAPHEME_SEGMENTER = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

function escapeHtmlCharacter(character: string): string {
  switch (character) {
    case '&':
      return '&amp;'
    case '<':
      return '&lt;'
    case '>':
      return '&gt;'
    default:
      return character
  }
}

function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_PATTERN, escapeHtmlCharacter)
}

function isRegionalIndicator(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0
  return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
}

function isSingleRegionalIndicator(grapheme: string): boolean {
  return Array.from(grapheme).length === 1 && isRegionalIndicator(grapheme)
}

function isHangulLeadingJamo(codePoint: number): boolean {
  return (codePoint >= 0x1100 && codePoint <= 0x115f)
    || (codePoint >= 0xa960 && codePoint <= 0xa97c)
}

function isHangulVowelJamo(codePoint: number): boolean {
  return (codePoint >= 0x1160 && codePoint <= 0x11a7)
    || (codePoint >= 0xd7b0 && codePoint <= 0xd7c6)
}

function isHangulTrailingJamo(codePoint: number): boolean {
  return (codePoint >= 0x11a8 && codePoint <= 0x11ff)
    || (codePoint >= 0xd7cb && codePoint <= 0xd7fb)
}

function continuesDecomposedHangul(grapheme: string, character: string): boolean {
  const current = Array.from(grapheme, item => item.codePointAt(0) ?? 0)
  const next = character.codePointAt(0) ?? 0
  return (
    current.length === 1
    && isHangulLeadingJamo(current[0] ?? 0)
    && isHangulVowelJamo(next)
  ) || (
    current.length === 2
    && isHangulLeadingJamo(current[0] ?? 0)
    && isHangulVowelJamo(current[1] ?? 0)
    && isHangulTrailingJamo(next)
  )
}

function isFullWidthCodePoint(codePoint: number): boolean {
  return codePoint >= 0x1100 && (
    codePoint <= 0x115f
    || codePoint === 0x2329
    || codePoint === 0x232a
    || (codePoint >= 0x2e80 && codePoint <= 0x3247 && codePoint !== 0x303f)
    || (codePoint >= 0x3250 && codePoint <= 0x4dbf)
    || (codePoint >= 0x4e00 && codePoint <= 0xa4c6)
    || (codePoint >= 0xa960 && codePoint <= 0xa97c)
    || (codePoint >= 0xac00 && codePoint <= 0xd7a3)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0xfe10 && codePoint <= 0xfe19)
    || (codePoint >= 0xfe30 && codePoint <= 0xfe6b)
    || (codePoint >= 0xff01 && codePoint <= 0xff60)
    || (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    || (codePoint >= 0x1b000 && codePoint <= 0x1b001)
    || (codePoint >= 0x1f200 && codePoint <= 0x1f251)
    || (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
}

function isWideTerminalGrapheme(grapheme: string): boolean {
  const codePoint = grapheme.codePointAt(0) ?? 0
  return isFullWidthCodePoint(codePoint)
    || EMOJI_PRESENTATION_PATTERN.test(grapheme)
    || grapheme.includes('\uFE0F')
}

function fallbackTerminalGraphemes(text: string): readonly string[] {
  const graphemes: string[] = []
  let current = ''
  let joinsNext = false

  for (const character of text) {
    const isFlagPair = isSingleRegionalIndicator(current) && isRegionalIndicator(character)
    const continuesCurrent = current.length > 0 && (
      joinsNext
      || character === ZERO_WIDTH_JOINER
      || GRAPHEME_CONTINUATION_PATTERN.test(character)
      || isFlagPair
      || continuesDecomposedHangul(current, character)
    )

    if (!continuesCurrent) {
      if (current) graphemes.push(current)
      current = character
    } else {
      current += character
    }

    joinsNext = character === ZERO_WIDTH_JOINER
  }

  if (current) graphemes.push(current)
  return graphemes
}

function terminalGraphemes(text: string): readonly string[] {
  if (!GRAPHEME_SEGMENTER) return fallbackTerminalGraphemes(text)
  return Array.from(GRAPHEME_SEGMENTER.segment(text), item => item.segment)
}

export function terminalTextToHtml(text: string): string {
  return terminalGraphemes(text).map(grapheme => {
    const escaped = escapeHtml(grapheme)
    return isWideTerminalGrapheme(grapheme)
      ? `<span class="terminal-wide-char">${escaped}</span>`
      : escaped
  }).join('')
}
