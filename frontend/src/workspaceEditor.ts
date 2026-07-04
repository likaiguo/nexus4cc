import type { Extension } from '@codemirror/state'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'

export type WorkspaceEditorLanguage =
  | 'css'
  | 'html'
  | 'javascript'
  | 'json'
  | 'markdown'
  | 'plain'
  | 'python'
  | 'sql'
  | 'typescript'

export interface WorkspaceEditorFileType {
  editable: boolean
  language: WorkspaceEditorLanguage
}

const EDITABLE_EXTENSIONS = new Map<string, WorkspaceEditorLanguage>([
  ['bash', 'plain'],
  ['cjs', 'javascript'],
  ['conf', 'plain'],
  ['css', 'css'],
  ['env', 'plain'],
  ['htm', 'html'],
  ['html', 'html'],
  ['ini', 'plain'],
  ['js', 'javascript'],
  ['json', 'json'],
  ['jsx', 'javascript'],
  ['log', 'plain'],
  ['markdown', 'markdown'],
  ['md', 'markdown'],
  ['mjs', 'javascript'],
  ['py', 'python'],
  ['sh', 'plain'],
  ['sql', 'sql'],
  ['toml', 'plain'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['txt', 'plain'],
  ['xml', 'html'],
  ['yaml', 'plain'],
  ['yml', 'plain'],
  ['zsh', 'plain'],
])

const EDITABLE_FILENAMES = new Map<string, WorkspaceEditorLanguage>([
  ['.dockerignore', 'plain'],
  ['.env', 'plain'],
  ['.env.local', 'plain'],
  ['.env.production', 'plain'],
  ['.gitignore', 'plain'],
  ['dockerfile', 'plain'],
  ['makefile', 'plain'],
])

export function detectWorkspaceEditorFileType(name: string): WorkspaceEditorFileType {
  const baseName = basename(name).toLowerCase()
  const namedLanguage = EDITABLE_FILENAMES.get(baseName)
  if (namedLanguage) return { editable: true, language: namedLanguage }

  const ext = extension(baseName)
  if (!ext) return { editable: true, language: 'plain' }

  const language = EDITABLE_EXTENSIONS.get(ext)
  if (!language) return { editable: false, language: 'plain' }
  return { editable: true, language }
}

export function isWorkspaceTextFile(name: string): boolean {
  return detectWorkspaceEditorFileType(name).editable
}

export function isMarkdownWorkspaceFile(name: string): boolean {
  return detectWorkspaceEditorFileType(name).language === 'markdown'
}

export function workspaceLanguageExtension(language: WorkspaceEditorLanguage): Extension[] {
  switch (language) {
    case 'css':
      return [css()]
    case 'html':
      return [html()]
    case 'javascript':
      return [javascript({ jsx: true })]
    case 'json':
      return [json()]
    case 'markdown':
      return [markdown()]
    case 'python':
      return [python()]
    case 'sql':
      return [sql()]
    case 'typescript':
      return [javascript({ jsx: true, typescript: true })]
    case 'plain':
      return []
  }
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

function extension(name: string): string {
  const index = name.lastIndexOf('.')
  if (index <= 0 || index === name.length - 1) return ''
  return name.slice(index + 1)
}
